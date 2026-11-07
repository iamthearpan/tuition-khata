import { Adjustment, BillingMode, Payment, Student } from './types';
import { addMonths, dayAdd, daysInclusive, daysInMonth, monthKey, todayDay, ymd } from './dates';

export type RowStatus = 'paid' | 'waived' | 'partial' | 'overdue' | 'pending' | 'upcoming';

export interface MonthRow {
  month: string; // period key: YYYY-MM of the period's start
  start: string; // YYYY-MM-DD first day of the period
  end: string; // YYYY-MM-DD last day of the period
  fraction: number; // share of the monthly fee charged (1 = full)
  fee: number; // full monthly fee in force for this period (from fee history)
  adjust: number; // net discount(-) / fine(+) for the period
  expected: number; // max(0, fee * fraction + adjust)
  paid: number; // amount allocated to this period
  due: number;
  dueDate: string; // start + grace days
  status: RowStatus;
  overdue: boolean;
  billable: boolean; // the period has started and is within the billing window
}

export interface Ledger {
  rows: MonthRow[];
  totalExpected: number;
  totalPaid: number;
  totalDue: number; // billable periods only, never negative
  overdue: number; // part of totalDue that is past its due date
  advance: number; // money received beyond everything currently billed
  currentFee: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Fee in force for the period keyed `month`: latest change effective on/before it, else the starting fee. */
export function feeForMonth(student: Student, month: string): number {
  let fee = student.fee;
  const sorted = [...student.feeChanges].sort((a, b) => a.month.localeCompare(b.month));
  for (const c of sorted) {
    if (c.month <= month) fee = c.amount;
    else break;
  }
  return fee;
}

export function isStudentActive(s: Student, today: string): boolean {
  return !s.endDate || s.endDate >= today;
}

interface Period { key: string; start: string; end: string; fraction: number }

/** Billing periods of a student, up to `horizonKey`/today. Pure date arithmetic, no money. */
export function periodsFor(s: Student, today: string, maxKey: string): Period[] {
  const out: Period[] = [];
  const jd = Number(s.joinDate.split('-')[2]);
  const joinKey = s.joinDate.slice(0, 7);
  const stop = (start: string, key: string) =>
    (s.endDate && start > s.endDate) || (start > today && key > maxKey);

  if (s.billing === 'cycle') {
    for (let i = 0; i < 1200; i++) {
      const key = addMonths(joinKey, i);
      const [y, m] = key.split('-').map(Number);
      const start = ymd(y, m, Math.min(jd, daysInMonth(y, m)));
      if (stop(start, key)) break;
      const [ny, nm] = addMonths(key, 1).split('-').map(Number);
      const nextStart = ymd(ny, nm, Math.min(jd, daysInMonth(ny, nm)));
      out.push({ key, start, end: dayAdd(nextStart, -1), fraction: 1 });
    }
    return out;
  }

  for (let i = 0; i < 1200; i++) {
    const key = addMonths(joinKey, i);
    const [y, m] = key.split('-').map(Number);
    const dim = daysInMonth(y, m);
    const first = ymd(y, m, 1);
    const start = i === 0 ? s.joinDate : first;
    if (stop(start, key)) break;
    let end = ymd(y, m, dim);
    if (s.endDate && s.endDate < end) end = s.endDate;
    let fraction = 1;
    if (s.billing === 'prorate') fraction = Math.min(1, daysInclusive(start, end) / dim);
    out.push({ key, start, end, fraction });
  }
  return out;
}

/**
 * Period-by-period ledger.
 * 1. Periods start on the joining date (cycle mode) or follow calendar months (first/last month by days in
 *    "prorate" mode). Each period's fee comes from the fee history, so a later fee rise never touches the past.
 *    Discounts (-) and fines (+) recorded for a period change what it costs.
 * 2. A payment with `forMonth` goes to that period first; the overflow (and every payment without forMonth)
 *    joins a pool.
 * 3. The pool clears the oldest unpaid started periods first. Whatever is left is `advance`.
 * 4. A period is "overdue" once today is past start + graceDays.
 */
export function buildLedger(
  student: Student,
  payments: Payment[],
  adjustments: Adjustment[],
  now: Date = new Date(),
  graceDays = 7,
): Ledger {
  const today = todayDay(now);
  const mine = payments.filter(p => p.studentId === student.id).sort((a, b) => a.date.localeCompare(b.date));
  const adj = adjustments.filter(a => a.studentId === student.id);

  let maxKey = monthKey(now);
  for (const p of mine) if (p.forMonth && p.forMonth > maxKey) maxKey = p.forMonth;

  const rows: MonthRow[] = periodsFor(student, today, maxKey).map(p => {
    const fee = feeForMonth(student, p.key);
    const adjust = round2(adj.filter(a => a.month === p.key).reduce((s, a) => s + a.amount, 0));
    const expected = Math.max(0, round2(fee * p.fraction + adjust));
    return {
      month: p.key, start: p.start, end: p.end, fraction: p.fraction, fee, adjust, expected,
      paid: 0, due: expected, dueDate: dayAdd(p.start, graceDays), status: 'pending' as RowStatus,
      overdue: false, billable: p.start <= today,
    };
  });

  const byMonth = new Map(rows.map(r => [r.month, r]));
  let pool = 0;
  let totalPaid = 0;
  for (const p of mine) {
    totalPaid = round2(totalPaid + p.amount);
    const r = p.forMonth ? byMonth.get(p.forMonth) : undefined;
    if (r) {
      const take = Math.min(p.amount, round2(r.expected - r.paid));
      r.paid = round2(r.paid + take);
      pool = round2(pool + p.amount - take);
    } else {
      pool = round2(pool + p.amount);
    }
  }
  for (const r of rows) {
    if (!r.billable) continue;
    const take = Math.min(pool, round2(r.expected - r.paid));
    r.paid = round2(r.paid + take);
    pool = round2(pool - take);
  }

  let totalDue = 0;
  let overdue = 0;
  let totalExpected = 0;
  for (const r of rows) {
    r.due = round2(r.expected - r.paid);
    r.overdue = r.billable && r.due > 0 && today > r.dueDate;
    r.status =
      r.expected === 0 ? 'waived'
      : r.due === 0 ? 'paid'
      : !r.billable ? 'upcoming'
      : r.paid > 0 ? 'partial'
      : r.overdue ? 'overdue'
      : 'pending';
    if (r.billable) {
      totalDue = round2(totalDue + r.due);
      totalExpected = round2(totalExpected + r.expected);
      if (r.overdue) overdue = round2(overdue + r.due);
    }
  }

  return {
    rows, totalExpected, totalPaid, totalDue, overdue, advance: Math.max(0, pool),
    currentFee: feeForMonth(student, monthKey(now)),
  };
}

/** Ledgers for every student, grouping payments/adjustments once (fast with large data). */
export function buildAllLedgers(
  students: Student[],
  payments: Payment[],
  adjustments: Adjustment[],
  now: Date,
  graceDays: number,
): Map<string, Ledger> {
  const pBy = new Map<string, Payment[]>();
  for (const p of payments) {
    const l = pBy.get(p.studentId);
    if (l) l.push(p); else pBy.set(p.studentId, [p]);
  }
  const aBy = new Map<string, Adjustment[]>();
  for (const a of adjustments) {
    const l = aBy.get(a.studentId);
    if (l) l.push(a); else aBy.set(a.studentId, [a]);
  }
  const out = new Map<string, Ledger>();
  for (const s of students) out.set(s.id, buildLedger(s, pBy.get(s.id) ?? [], aBy.get(s.id) ?? [], now, graceDays));
  return out;
}

export function sumByCurrency<T>(
  items: T[],
  get: (t: T) => { currency: string; amount: number },
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const it of items) {
    const { currency, amount } = get(it);
    out[currency] = round2((out[currency] ?? 0) + amount);
  }
  return out;
}

export type { BillingMode };

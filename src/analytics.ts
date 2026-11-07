import { buildAllLedgers } from './calc';
import { addMonths, dayAdd, daysInclusive, monthIndex, todayDay, ymd } from './dates';
import { AppData } from './types';

export type RangeKey = 'd30' | 'week' | 'month' | 'half' | 'quarter' | 'year';
type Gran = 'day' | 'week' | 'month' | 'quarter' | 'year';

export const RANGES: { key: RangeKey; gran: Gran; count: number }[] = [
  { key: 'd30', gran: 'day', count: 30 },
  { key: 'week', gran: 'week', count: 12 },
  { key: 'month', gran: 'month', count: 12 },
  { key: 'half', gran: 'month', count: 6 },
  { key: 'quarter', gran: 'quarter', count: 8 },
  { key: 'year', gran: 'year', count: 5 },
];

export interface Bucket {
  start: string;
  end: string;
  label: string; // short axis label
  full: string; // long label
  collected: number;
  billed: number; // fees that fell due in the bucket (period start inside bucket)
  due: number; // still unpaid out of `billed`
  payments: number;
  newStudents: number;
  current: boolean;
}

export interface Named { id: string; name: string; amount: number; extra?: number }

export interface Analytics {
  buckets: Bucket[];
  gran: Gran;
  days: number; // days covered (from first activity or window start until today)
  collected: number;
  billed: number;
  due: number;
  rate: number; // collected / billed, 0..n
  perMonth: number;
  perWeek: number;
  perDay: number;
  billedPerMonth: number;
  paymentCount: number;
  avgPayment: number;
  payers: number;
  perPayer: number;
  newStudents: number;
  activeStudents: number;
  discounts: number;
  fines: number;
  best: Bucket | null;
  worst: Bucket | null;
  previous: number; // collected in the equally long window before
  change: number | null; // % vs previous, null when no previous data
  byBatch: Named[];
  topPayers: Named[];
  topDefaulters: Named[];
  ageing: { label: 'current' | 'd30' | 'd60' | 'd90' | 'd90p'; amount: number }[];
  outstandingNow: number;
  overdueNow: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function dow(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function bucketStart(day: string, gran: Gran): string {
  const [y, m] = day.split('-').map(Number);
  switch (gran) {
    case 'day': return day;
    case 'week': return dayAdd(day, -((dow(day) + 6) % 7)); // Monday
    case 'month': return ymd(y, m, 1);
    case 'quarter': return ymd(y, Math.floor((m - 1) / 3) * 3 + 1, 1);
    case 'year': return ymd(y, 1, 1);
  }
}

export function nextStart(start: string, gran: Gran): string {
  switch (gran) {
    case 'day': return dayAdd(start, 1);
    case 'week': return dayAdd(start, 7);
    case 'month': return addMonths(start.slice(0, 7), 1) + '-01';
    case 'quarter': return addMonths(start.slice(0, 7), 3) + '-01';
    case 'year': return `${Number(start.slice(0, 4)) + 1}-01-01`;
  }
}

function prevStart(start: string, gran: Gran): string {
  switch (gran) {
    case 'day': return dayAdd(start, -1);
    case 'week': return dayAdd(start, -7);
    case 'month': return addMonths(start.slice(0, 7), -1) + '-01';
    case 'quarter': return addMonths(start.slice(0, 7), -3) + '-01';
    case 'year': return `${Number(start.slice(0, 4)) - 1}-01-01`;
  }
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function labels(start: string, gran: Gran): { label: string; full: string } {
  const [y, m, d] = start.split('-').map(Number);
  switch (gran) {
    case 'day': return { label: d === 1 || d % 5 === 0 ? String(d) : '', full: `${d} ${MON[m - 1]} ${y}` };
    case 'week': return { label: `${d} ${MON[m - 1]}`, full: `Week of ${d} ${MON[m - 1]} ${y}` };
    case 'month': return { label: MON[m - 1], full: `${MON[m - 1]} ${y}` };
    case 'quarter': {
      const q = Math.floor((m - 1) / 3) + 1;
      return { label: `Q${q} '${String(y).slice(2)}`, full: `Q${q} ${y}` };
    }
    case 'year': return { label: String(y), full: String(y) };
  }
}

const localDay = (iso: string) => todayDay(new Date(iso));

export function analyze(
  data: AppData,
  rangeKey: RangeKey,
  currency: string,
  now: Date = new Date(),
): Analytics {
  const cfg = RANGES.find(r => r.key === rangeKey)!;
  const gran = cfg.gran;
  const today = todayDay(now);
  const students = data.students.filter(s => s.currency === currency);
  const ids = new Set(students.map(s => s.id));
  const payments = data.payments.filter(p => ids.has(p.studentId));
  const adjustments = data.adjustments.filter(a => ids.has(a.studentId));
  const ledgers = buildAllLedgers(students, payments, adjustments, now, data.settings.graceDays);

  // Buckets for the previous window and the current one (oldest first).
  const starts: string[] = [];
  let s = bucketStart(today, gran);
  for (let i = 0; i < cfg.count * 2; i++) { starts.unshift(s); s = prevStart(s, gran); }
  const mk = (st: string): Bucket => ({
    start: st, end: dayAdd(nextStart(st, gran), -1), ...labels(st, gran),
    collected: 0, billed: 0, due: 0, payments: 0, newStudents: 0, current: false,
  });
  const all = starts.map(mk);
  all[all.length - 1].current = true;
  const idx = (day: string): number => {
    if (day < all[0].start || day > all[all.length - 1].end) return -1;
    let lo = 0, hi = all.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (all[mid].start <= day) lo = mid; else hi = mid - 1;
    }
    return lo;
  };

  const payerTotals = new Map<string, number>();
  const windowStart = all[cfg.count].start;
  for (const p of payments) {
    const day = localDay(p.date);
    const i = idx(day);
    if (i < 0 || day > today) continue;
    all[i].collected = round2(all[i].collected + p.amount);
    all[i].payments += 1;
    if (i >= cfg.count) payerTotals.set(p.studentId, round2((payerTotals.get(p.studentId) ?? 0) + p.amount));
  }
  const dueByStudent = new Map<string, number>();
  let discounts = 0;
  let fines = 0;
  for (const st of students) {
    const i = idx(st.joinDate);
    if (i >= 0) all[i].newStudents += 1;
    const l = ledgers.get(st.id)!;
    for (const r of l.rows) {
      if (!r.billable) continue;
      const j = idx(r.start);
      if (j < 0) continue;
      all[j].billed = round2(all[j].billed + r.expected);
      all[j].due = round2(all[j].due + r.due);
      if (j >= cfg.count) {
        dueByStudent.set(st.id, round2((dueByStudent.get(st.id) ?? 0) + r.due));
        if (r.adjust < 0) discounts = round2(discounts - r.adjust);
        else fines = round2(fines + r.adjust);
      }
    }
  }

  const cur = all.slice(cfg.count);
  const prev = all.slice(0, cfg.count);
  const sum = (b: Bucket[], f: (x: Bucket) => number) => round2(b.reduce((a, x) => a + f(x), 0));
  const collected = sum(cur, b => b.collected);
  const billed = sum(cur, b => b.billed);
  const due = sum(cur, b => b.due);
  const previous = sum(prev, b => b.collected);
  const paymentCount = sum(cur, b => b.payments);

  // Averages use the days actually covered, so a new account is not diluted by empty history.
  let first = windowStart;
  let earliest: string | null = null;
  for (const st of students) if (!earliest || st.joinDate < earliest) earliest = st.joinDate;
  for (const p of payments) { const d = localDay(p.date); if (!earliest || d < earliest) earliest = d; }
  if (earliest && earliest > first) first = earliest;
  const days = Math.max(1, daysInclusive(first, today));
  const perDay = round2(collected / days);
  const weeks = Math.max(1, Math.ceil(days / 7));
  const months = Math.max(1, monthIndex(today.slice(0, 7)) - monthIndex(first.slice(0, 7)) + 1);
  const perWeek = round2(collected / weeks);
  const perMonth = round2(collected / months);
  const billedPerMonth = round2(billed / months);

  const withData = cur.filter(b => b.collected > 0);
  const best = withData.length ? withData.reduce((a, b) => (b.collected > a.collected ? b : a)) : null;
  const worst = withData.length > 1 ? withData.reduce((a, b) => (b.collected < a.collected ? b : a)) : null;

  const nameOf = new Map(students.map(x => [x.id, x.name]));
  const topPayers = [...payerTotals.entries()]
    .map(([id, amount]) => ({ id, name: nameOf.get(id) ?? '', amount }))
    .sort((a, b) => b.amount - a.amount).slice(0, 5);

  const batchName = new Map(data.batches.map(b => [b.id, b.name]));
  const batchAgg = new Map<string, Named>();
  for (const st of students) {
    const key = st.batchId && batchName.has(st.batchId) ? st.batchId : '';
    const e = batchAgg.get(key) ?? { id: key, name: key ? batchName.get(key)! : '', amount: 0, extra: 0 };
    e.amount = round2(e.amount + (payerTotals.get(st.id) ?? 0));
    e.extra = round2((e.extra ?? 0) + (dueByStudent.get(st.id) ?? 0));
    batchAgg.set(key, e);
  }
  const byBatch = [...batchAgg.values()].filter(b => b.amount > 0 || (b.extra ?? 0) > 0).sort((a, b) => b.amount - a.amount);

  // Ageing of everything currently unpaid (not limited to the window).
  const ageing: Analytics['ageing'] = [
    { label: 'current', amount: 0 }, { label: 'd30', amount: 0 }, { label: 'd60', amount: 0 },
    { label: 'd90', amount: 0 }, { label: 'd90p', amount: 0 },
  ];
  let outstandingNow = 0;
  let overdueNow = 0;
  const defaulters: Named[] = [];
  for (const st of students) {
    const l = ledgers.get(st.id)!;
    outstandingNow = round2(outstandingNow + l.totalDue);
    overdueNow = round2(overdueNow + l.overdue);
    if (l.totalDue > 0) defaulters.push({ id: st.id, name: st.name, amount: l.totalDue, extra: l.overdue });
    for (const r of l.rows) {
      if (!r.billable || r.due <= 0) continue;
      const late = daysInclusive(r.dueDate, today) - 1;
      const k = late <= 0 ? 0 : late <= 30 ? 1 : late <= 60 ? 2 : late <= 90 ? 3 : 4;
      ageing[k].amount = round2(ageing[k].amount + r.due);
    }
  }
  defaulters.sort((a, b) => b.amount - a.amount);

  const todayStr = today;
  const activeStudents = students.filter(x => !x.endDate || x.endDate >= todayStr).length;

  return {
    buckets: cur, gran, days, collected, billed, due,
    rate: billed > 0 ? collected / billed : 0,
    perMonth, perWeek, perDay, billedPerMonth,
    paymentCount, avgPayment: paymentCount ? round2(collected / paymentCount) : 0,
    payers: payerTotals.size, perPayer: payerTotals.size ? round2(collected / payerTotals.size) : 0,
    newStudents: sum(cur, b => b.newStudents), activeStudents, discounts, fines, best, worst,
    previous, change: previous > 0 && earliest != null && earliest <= prev[prev.length - 1].end ? Math.min(999, ((collected - previous) / previous) * 100) : null,
    byBatch, topPayers, topDefaulters: defaulters.slice(0, 5), ageing, outstandingNow, overdueNow,
  };
}

/** Currencies that actually have students, default one first. */
export function analyticsCurrencies(data: AppData): string[] {
  const set = new Set(data.students.map(s => s.currency));
  const list = [...set];
  const def = data.settings.defaultCurrency;
  list.sort((a, b) => (a === def ? -1 : b === def ? 1 : a.localeCompare(b)));
  return list.length ? list : [def];
}

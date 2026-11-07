import { buildLedger, feeForMonth, periodsFor } from '../src/calc';
import { formatAmount } from '../src/currency';
import { addMonths, dayAdd, daysInclusive } from '../src/dates';
import { parseBackup } from '../src/backup';
import { Adjustment, Payment, Student } from '../src/types';

const NOW = new Date(2026, 10, 7); // 7 Nov 2026

const stu = (o: Partial<Student> = {}): Student => ({
  id: 's1', name: 'A', phone: '', guardian: '', batchId: null, fee: 500, feeChanges: [],
  currency: 'INR', joinDate: '2026-09-01', endDate: null, billing: 'full', ...o,
});
let n = 0;
const pay = (amount: number, forMonth: string | null = null, date = '2026-11-01T06:00:00Z'): Payment =>
  ({ id: 'p' + n++, studentId: 's1', amount, date, forMonth, note: '' });
const adj = (month: string, amount: number): Adjustment => ({ id: 'a' + n++, studentId: 's1', month, amount, note: '' });
const L = (s: Student, p: Payment[] = [], a: Adjustment[] = []) => buildLedger(s, p, a, NOW, 7);

describe('billing starts from the joining date', () => {
  test('cycle: periods start on the joining day, future period is upcoming', () => {
    const l = L(stu({ billing: 'cycle', joinDate: '2026-09-20' }));
    expect(l.rows.map(r => r.start)).toEqual(['2026-09-20', '2026-10-20', '2026-11-20']);
    expect(l.rows[0].end).toBe('2026-10-19');
    expect(l.rows[2].status).toBe('upcoming');
    expect(l.totalDue).toBe(1000); // Nov 20 has not started yet
    expect(l.overdue).toBe(1000);
  });
  test('cycle: joined today is pending, not overdue', () => {
    const l = L(stu({ billing: 'cycle', joinDate: '2026-11-07' }));
    expect(l.totalDue).toBe(500);
    expect(l.overdue).toBe(0);
    expect(l.rows[0].status).toBe('pending');
  });
  test('overdue only after the grace days', () => {
    const l = buildLedger(stu({ billing: 'cycle', joinDate: '2026-11-07' }), [], [], new Date(2026, 10, 15), 7);
    expect(l.rows[0].status).toBe('overdue'); // due date was 14 Nov
  });
  test('future joining date has no periods', () => {
    expect(L(stu({ joinDate: '2026-12-01' })).rows.length).toBe(0);
  });
  test('prorate: first month by days', () => {
    const l = L(stu({ billing: 'prorate', fee: 600, joinDate: '2026-10-20' }));
    expect(l.rows[0].fraction).toBeCloseTo(12 / 31); // 20..31 Oct
    expect(l.totalDue).toBe(Math.round(((600 * 12) / 31) * 100) / 100 + 600);
  });
  test('full: first month in full', () => {
    expect(L(stu({ billing: 'full', fee: 600, joinDate: '2026-10-20' })).totalDue).toBe(1200);
  });
  test('billing has not begun before the joining date', () => {
    expect(L(stu({ billing: 'prorate', joinDate: '2026-11-20' })).totalDue).toBe(0);
  });
  test('cycle clamps day 31 to short months', () => {
    const p = periodsFor(stu({ billing: 'cycle', joinDate: '2026-01-31' }), '2026-03-01', '2026-03');
    expect(p[0]).toMatchObject({ start: '2026-01-31', end: '2026-02-27' });
    expect(p[1].start).toBe('2026-02-28');
  });
});

describe('fee history never rewrites the past', () => {
  const s = stu({ joinDate: '2026-01-01', feeChanges: [{ month: '2026-07', amount: 600 }] });
  test('fee per month', () => {
    expect(feeForMonth(s, '2026-06')).toBe(500);
    expect(feeForMonth(s, '2026-07')).toBe(600);
  });
  test('old months stay at the old fee', () => {
    const l = L(s);
    expect(l.rows[0].expected).toBe(500);
    expect(l.totalDue).toBe(6 * 500 + 5 * 600);
    expect(l.currentFee).toBe(600);
  });
});

describe('payments', () => {
  test('auto payment clears oldest first', () => {
    const l = L(stu(), [pay(700)]);
    expect(l.rows.map(r => r.due)).toEqual([0, 300, 500]);
    expect(l.totalDue).toBe(800);
  });
  test('payment aimed at a month goes there first', () => {
    const l = L(stu(), [pay(500, '2026-11')]);
    expect(l.rows.map(r => r.due)).toEqual([500, 500, 0]);
  });
  test('overflow of a targeted payment falls back to oldest dues', () => {
    const l = L(stu(), [pay(700, '2026-11')]);
    expect(l.rows.map(r => r.due)).toEqual([300, 500, 0]);
  });
  test('prepaying next month shows as paid and is not counted as due', () => {
    const l = L(stu({ joinDate: '2026-11-01' }), [pay(500, '2026-12')]);
    expect(l.rows.map(r => r.status)).toEqual(['pending', 'paid']);
    expect(l.totalDue).toBe(500);
  });
  test('overpayment becomes advance', () => {
    const l = L(stu(), [pay(2000)]);
    expect(l.totalDue).toBe(0);
    expect(l.advance).toBe(500);
  });
});

describe('discounts, fines, waivers, stopping', () => {
  test('discount and fine change the period amount', () => {
    const l = L(stu(), [], [adj('2026-09', -100), adj('2026-10', 50)]);
    expect(l.rows.map(r => r.expected)).toEqual([400, 550, 500]);
    expect(l.totalDue).toBe(1450);
  });
  test('full waiver', () => {
    const l = L(stu(), [], [adj('2026-10', -500)]);
    expect(l.rows[1].status).toBe('waived');
    expect(l.totalDue).toBe(1000);
  });
  test('stopping: no fees after the last class date', () => {
    const l = L(stu({ endDate: '2026-10-15' }));
    expect(l.rows.length).toBe(2);
    expect(l.totalDue).toBe(1000);
  });
  test('prorate: last month charged by days', () => {
    const l = L(stu({ billing: 'prorate', joinDate: '2026-09-01', endDate: '2026-10-15' }));
    expect(l.totalDue).toBe(500 + Math.round((500 * 15) / 31 * 100) / 100);
  });
});

describe('helpers', () => {
  test('currency grouping', () => {
    expect(formatAmount(1234567, 'INR')).toBe('₹12,34,567');
    expect(formatAmount(1234567, 'USD')).toBe('$1,234,567');
    expect(formatAmount(500.5, 'INR')).toBe('₹500.50');
  });
  test('date arithmetic', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(dayAdd('2026-02-28', 1)).toBe('2026-03-01');
    expect(daysInclusive('2026-11-20', '2026-11-30')).toBe(11);
  });
  test('legacy backups are upgraded', () => {
    const old = JSON.stringify({
      batches: [], payments: [{ id: 'p', studentId: 's', amount: 5, date: '2026-10-01T00:00:00Z', forMonth: '2026-10', note: '' }],
      students: [{ id: 's', name: 'X', fee: 500, currency: 'INR', joinMonth: '2026-09', active: true }],
    });
    const d = parseBackup(old)!;
    expect(d.students[0]).toMatchObject({ joinDate: '2026-09-01', billing: 'full', endDate: null, feeChanges: [] });
    expect(d.payments[0].forMonth).toBeNull();
    expect(d.settings.graceDays).toBe(7);
  });
  test('garbage backup rejected', () => {
    expect(parseBackup('nope')).toBeNull();
  });
});

import { buildReminderMessage, dueLines } from '../src/reminder';
import { STRINGS } from '../src/i18n';

describe('reminder', () => {
  const s = stu({ billing: 'full', joinDate: '2026-09-01' });
  const ledger = buildLedger(s, [], [], NOW, 7);
  test('lists every unpaid period with overdue flags', () => {
    const lines = dueLines(s, ledger, 'en', STRINGS.en);
    expect(lines.map(l => l.amount)).toEqual(['₹500', '₹500', '₹500']);
    expect(lines.map(l => l.overdue)).toEqual([true, true, false]);
  });
  test('message includes total, payment details and teacher', () => {
    const m = buildReminderMessage(STRINGS.en, s, ledger, 'en', 'Mrs Roy', 'UPI roy@bank', true);
    expect(m).toContain('₹1,500');
    expect(m).toContain('UPI roy@bank');
    expect(m).toContain('Mrs Roy');
    expect(m).toContain('overdue');
  });
  test('Bengali message builds', () => {
    expect(buildReminderMessage(STRINGS.bn, s, ledger, 'bn', '', '', false)).toContain('₹1,500');
  });
});

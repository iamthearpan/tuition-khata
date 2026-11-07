import { analyze, analyticsCurrencies, bucketStart } from '../src/analytics';
import { DEFAULT_SETTINGS } from '../src/backup';
import { AppData } from '../src/types';

const NOW = new Date(2026, 10, 7, 12); // 7 Nov 2026 (Saturday)
const iso = (d: string) => new Date(`${d}T12:00:00`).toISOString();

const data: AppData = {
  batches: [{ id: 'b1', name: 'Class 10', subject: '', fee: 1000, currency: 'INR' }],
  students: [
    { id: 's1', name: 'A', phone: '', guardian: '', batchId: 'b1', fee: 1000, feeChanges: [], currency: 'INR', joinDate: '2026-08-01', endDate: null, billing: 'full' },
    { id: 's2', name: 'B', phone: '', guardian: '', batchId: null, fee: 500, feeChanges: [], currency: 'INR', joinDate: '2026-10-01', endDate: null, billing: 'full' },
    { id: 's3', name: 'C', phone: '', guardian: '', batchId: null, fee: 20, feeChanges: [], currency: 'USD', joinDate: '2026-10-01', endDate: null, billing: 'full' },
  ],
  payments: [
    { id: 'p1', studentId: 's1', amount: 1000, date: iso('2026-08-05'), forMonth: null, note: '' },
    { id: 'p2', studentId: 's1', amount: 1000, date: iso('2026-09-05'), forMonth: null, note: '' },
    { id: 'p3', studentId: 's1', amount: 1000, date: iso('2026-10-06'), forMonth: null, note: '' },
    { id: 'p4', studentId: 's2', amount: 500, date: iso('2026-10-10'), forMonth: null, note: '' },
    { id: 'p5', studentId: 's3', amount: 20, date: iso('2026-10-10'), forMonth: null, note: '' },
  ],
  adjustments: [],
  settings: { ...DEFAULT_SETTINGS },
};

describe('analytics', () => {
  it('buckets start on Monday for weeks', () => {
    expect(bucketStart('2026-11-07', 'week')).toBe('2026-11-02');
    expect(bucketStart('2026-11-07', 'quarter')).toBe('2026-10-01');
  });

  it('monthly buckets total collections per currency', () => {
    const a = analyze(data, 'month', 'INR', NOW);
    expect(a.buckets).toHaveLength(12);
    expect(a.collected).toBe(3500);
    expect(a.buckets.find(b => b.full === 'Oct 2026')!.collected).toBe(1500);
    expect(analyze(data, 'month', 'USD', NOW).collected).toBe(20);
  });

  it('billed, due and rate come from the ledger', () => {
    const a = analyze(data, 'month', 'INR', NOW);
    // s1: Aug-Nov = 4000, s2: Oct-Nov = 1000
    expect(a.billed).toBe(5000);
    expect(a.due).toBe(1500);
    expect(a.rate).toBeCloseTo(0.7);
    expect(a.outstandingNow).toBe(1500);
    expect(a.topDefaulters.map(d => d.id)).toEqual(['s1', 's2']);
  });

  it('averages use the days actually covered', () => {
    const a = analyze(data, 'month', 'INR', NOW);
    expect(a.days).toBe(99); // 1 Aug .. 7 Nov
    expect(a.perMonth).toBe(875); // 4 calendar months, Aug-Nov
    expect(a.perWeek).toBeCloseTo(3500 / 15, 1);
    expect(a.avgPayment).toBe(875);
    expect(a.best!.full).toBe('Oct 2026');
  });

  it('other ranges and currencies list', () => {
    expect(analyze(data, 'week', 'INR', NOW).buckets).toHaveLength(12);
    expect(analyze(data, 'quarter', 'INR', NOW).collected).toBe(3500);
    expect(analyze(data, 'year', 'INR', NOW).buckets).toHaveLength(5);
    expect(analyze(data, 'd30', 'INR', NOW).collected).toBe(500);
    expect(analyticsCurrencies(data)).toEqual(['INR', 'USD']);
  });

  it('no comparison when the previous window predates the first record', () => {
    expect(analyze(data, 'month', 'INR', NOW).change).toBeNull();
  });

  it('empty data does not break', () => {
    const a = analyze({ ...data, students: [], payments: [] }, 'month', 'INR', NOW);
    expect(a.collected).toBe(0);
    expect(a.rate).toBe(0);
    expect(a.change).toBeNull();
  });
});

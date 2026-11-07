import { AppData, Payment, Settings, Student } from './types';

export const DEFAULT_SETTINGS: Settings = { lang: 'en', teacherName: '', defaultCurrency: 'INR', graceDays: 7, phoneCode: '91', paymentNote: '', driveEmail: '', autoBackup: '1', lastBackup: '' };

export const BACKUP_VERSION = 3;

/** Parse a backup export. Older (v1/v2) exports are upgraded to the current model. */
export function parseBackup(raw: string): AppData | null {
  try {
    const d = JSON.parse(raw);
    if (!d || !Array.isArray(d.batches) || !Array.isArray(d.students) || !Array.isArray(d.payments)) return null;
    const legacy = !d.version || d.version < 3;
    const students: Student[] = d.students.map((s: any) => ({
      id: String(s.id), name: String(s.name ?? ''), phone: String(s.phone ?? ''), guardian: String(s.guardian ?? ''),
      batchId: s.batchId ?? null, fee: Number(s.fee) || 0, currency: String(s.currency ?? 'INR'),
      feeChanges: Array.isArray(s.feeChanges) ? s.feeChanges : [],
      joinDate: s.joinDate ?? `${s.joinMonth ?? new Date().toISOString().slice(0, 7)}-01`,
      endDate: s.endDate ?? null,
      billing: s.billing ?? (legacy ? 'full' : 'cycle'),
    }));
    const payments: Payment[] = d.payments.map((p: any) => ({
      id: String(p.id), studentId: String(p.studentId), amount: Number(p.amount) || 0, date: String(p.date),
      forMonth: legacy ? null : p.forMonth ?? null, note: String(p.note ?? ''),
    }));
    return {
      batches: d.batches,
      students,
      payments,
      adjustments: Array.isArray(d.adjustments) ? d.adjustments : [],
      settings: { ...DEFAULT_SETTINGS, ...(d.settings ?? {}) },
    };
  } catch {
    return null;
  }
}

export function exportBackup(d: AppData): string {
  const { driveEmail: _e, autoBackup: _a, lastBackup: _l, ...settings } = d.settings;
  return JSON.stringify({ ...d, settings, version: BACKUP_VERSION });
}


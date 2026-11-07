export type Lang = 'bn' | 'en';

export interface Batch {
  id: string;
  name: string;
  subject: string;
  fee: number; // default monthly fee suggested for new students
  currency: string;
}

/** A fee change: from `month` (YYYY-MM) onward the monthly fee is `amount`. Earlier months are untouched. */
export interface FeeChange {
  month: string;
  amount: number;
}

/** cycle: months start on the joining day. prorate: calendar months, first/last month by days. full: calendar months, first month in full. */
export type BillingMode = 'cycle' | 'prorate' | 'full';

export interface Student {
  id: string;
  name: string;
  phone: string;
  guardian: string;
  batchId: string | null;
  fee: number; // STARTING monthly fee, effective from joinMonth
  feeChanges: FeeChange[]; // later changes (never rewrite the past)
  currency: string;
  joinDate: string; // YYYY-MM-DD, billing starts from this date
  endDate: string | null; // YYYY-MM-DD last day billed (null = still studying)
  billing: BillingMode;
}

export interface Payment {
  id: string;
  studentId: string;
  amount: number;
  date: string; // ISO date the money was received
  forMonth: string | null; // billing period (YYYY-MM of its start) it is meant for; null = oldest due first
  note: string;
}

/** Per-month change to what is owed. amount < 0 = discount/waiver, amount > 0 = extra charge. */
export interface Adjustment {
  id: string;
  studentId: string;
  month: string;
  amount: number;
  note: string;
}

export interface Settings {
  lang: Lang;
  teacherName: string;
  defaultCurrency: string;
  graceDays: number; // a period unpaid this many days after it starts is "overdue"
  paymentNote: string; // shown on reminders, e.g. UPI ID
  phoneCode: string; // country code added to phone numbers without one (WhatsApp)
  driveEmail: string; // Google account used for Drive backup ('' = not connected)
  autoBackup: string; // '1' = automatic daily backup, '0' = off
  lastBackup: string; // ISO time of the last successful Drive backup
}

export interface AppData {
  batches: Batch[];
  students: Student[];
  payments: Payment[];
  adjustments: Adjustment[];
  settings: Settings;
}

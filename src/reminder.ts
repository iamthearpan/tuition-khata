import { Ledger } from './calc';
import { formatAmount } from './currency';
import { Strings } from './i18n';
import { periodLabel } from './labels';
import { Lang, Student } from './types';

export interface DueLine { label: string; amount: string; overdue: boolean }

/** Unpaid, already-started periods (oldest first) as printable lines. */
export function dueLines(student: Student, ledger: Ledger, lang: Lang, t: Strings): DueLine[] {
  return ledger.rows
    .filter(r => r.billable && r.due > 0)
    .map(r => ({ label: periodLabel(r, student.billing, lang, t), amount: formatAmount(r.due, student.currency), overdue: r.overdue }));
}

export function buildReminderMessage(
  t: Strings, student: Student, ledger: Ledger, lang: Lang, teacher: string, pay: string, firm: boolean,
): string {
  const all = dueLines(student, ledger, lang, t);
  const shown = all.slice(0, 8).map(l => `• ${l.label}: ${l.amount}${l.overdue ? ` (${t.overdue})` : ''}`);
  if (all.length > 8) shown.push(`• ${t.cardMore(all.length - 8)}`);
  return t.reminderBody({ name: student.name, total: formatAmount(ledger.totalDue, student.currency), lines: shown, teacher, pay, firm });
}

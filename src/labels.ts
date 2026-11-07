import { BillingMode, Lang } from './types';
import { MonthRow, RowStatus } from './calc';
import { dayShort, monthLabel } from './dates';
import { Strings } from './i18n';
import { IconName } from './components/Icon';
import { colors } from './theme';

export function periodLabel(r: MonthRow, mode: BillingMode, lang: Lang, t: Strings): string {
  if (mode === 'cycle') return `${dayShort(r.start, lang)} – ${dayShort(r.end, lang)} ${r.end.slice(0, 4)}`;
  const base = monthLabel(r.month, lang);
  const d = Number(r.start.slice(8));
  return d > 1 && r.start.slice(0, 7) === r.month ? `${base} (${t.fromDay(String(d))})` : base;
}

export function statusMeta(st: RowStatus, t: Strings): {
  label: string; kind: 'paid' | 'due' | 'partial' | 'muted'; icon: IconName; fg: string; bg: string;
} {
  const amber = { fg: '#A96A05', bg: colors.accentLight };
  switch (st) {
    case 'paid': return { label: t.paidFull, kind: 'paid', icon: 'check', fg: colors.success, bg: colors.successLight };
    case 'waived': return { label: t.waived, kind: 'muted', icon: 'check', fg: colors.muted, bg: '#ECEFEE' };
    case 'partial': return { label: t.partial, kind: 'partial', icon: 'clock', ...amber };
    case 'overdue': return { label: t.overdue, kind: 'due', icon: 'clock', fg: colors.danger, bg: colors.dangerLight };
    case 'pending': return { label: t.pending, kind: 'partial', icon: 'clock', ...amber };
    default: return { label: t.upcoming, kind: 'muted', icon: 'calendar', fg: colors.muted, bg: '#ECEFEE' };
  }
}

/** Build a wa.me-ready number: keeps an explicit +country code, otherwise prepends the default code. */
export function waNumber(phone: string, defaultCode: string): string {
  const raw = phone.trim();
  if (raw.startsWith('+')) return raw.replace(/\D/g, '');
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('00')) return d.slice(2);
  d = d.replace(/^0+/, '');
  return d.length <= 10 ? defaultCode.replace(/\D/g, '') + d : d;
}

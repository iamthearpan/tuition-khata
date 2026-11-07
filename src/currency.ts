export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  locale: string;
}

// Indian Rupee first: the app is primarily for West Bengal / India.
export const CURRENCIES: CurrencyInfo[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', locale: 'en-BD' },
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'en-IE' },
  { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', locale: 'en-AE' },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal', locale: 'en-SA' },
  { code: 'NPR', symbol: 'Rs', name: 'Nepali Rupee', locale: 'en-NP' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG' },
];

export function currencyInfo(code: string): CurrencyInfo {
  return CURRENCIES.find(c => c.code === code) ?? CURRENCIES[0];
}

// Manual grouping so output is identical on every JS engine (Hermes Intl is
// not guaranteed on all builds). INR uses the Indian 2-2-3 lakh grouping.
export function formatAmount(amount: number, code: string): string {
  const info = currencyInfo(code);
  const negative = amount < 0;
  const fixed = Math.abs(amount).toFixed(2).replace(/\.00$/, '');
  const [intPart, dec] = fixed.split('.');
  let grouped: string;
  if (code === 'INR' || code === 'NPR' || code === 'BDT') {
    const last3 = intPart.slice(-3);
    const rest = intPart.slice(0, -3);
    grouped = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3 : last3;
  } else {
    grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  const sym = info.symbol.length > 2 ? info.symbol + ' ' : info.symbol;
  return (negative ? '-' : '') + sym + grouped + (dec ? '.' + dec : '');
}

/** Short form for chart axes: 1.2K, 3.5L (lakh), 2Cr for Indian-style currencies; 1.2K, 3.4M otherwise. */
export function compactAmount(n: number, code: string): string {
  const indian = code === 'INR' || code === 'NPR' || code === 'BDT';
  const fmt = (v: number) => (Math.round(v * 10) / 10).toString().replace(/\.0$/, '');
  const a = Math.abs(n);
  if (indian) {
    if (a >= 1e7) return fmt(n / 1e7) + 'Cr';
    if (a >= 1e5) return fmt(n / 1e5) + 'L';
  } else {
    if (a >= 1e9) return fmt(n / 1e9) + 'B';
    if (a >= 1e6) return fmt(n / 1e6) + 'M';
  }
  if (a >= 1e3) return fmt(n / 1e3) + 'K';
  return fmt(n);
}

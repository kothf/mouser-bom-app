import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Normalize a currency symbol or code to its ISO 4217 code (empty means USD). */
export function normalizeCurrencyCode(currency: string | undefined | null): string {
  const code = (currency || 'USD').trim().toUpperCase();
  if (code === '' || code === '$' || code === 'US$') return 'USD';
  if (code === '€') return 'EUR';
  if (code === '£') return 'GBP';
  if (code === '₪') return 'ILS';
  if (code === '¥') return 'JPY';
  if (code === 'C$' || code === 'CA$') return 'CAD';
  if (code === 'A$' || code === 'AU$') return 'AUD';
  return code;
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  const cleanCurr = (currency || 'USD').trim();
  const code = normalizeCurrencyCode(cleanCurr);

  // For very small component prices (e.g. $0.007 for bulk passives), show up to 4 decimals
  const isFractional = amount > 0 && amount < 0.05;

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: isFractional ? 3 : 2,
      maximumFractionDigits: isFractional ? 4 : 2,
    }).format(amount);
  } catch {
    const symbol =
      cleanCurr === 'EUR' || cleanCurr === '€'
        ? '€'
        : cleanCurr === 'GBP' || cleanCurr === '£'
        ? '£'
        : cleanCurr === 'ILS' || cleanCurr === '₪'
        ? '₪'
        : '$';
    return `${symbol}${amount.toFixed(isFractional ? 4 : 2)}`;
  }
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

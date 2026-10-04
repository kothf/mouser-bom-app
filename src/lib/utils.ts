import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  const cleanCurr = (currency || 'USD').trim();
  let code = cleanCurr.toUpperCase();

  // Normalize common symbols to standard ISO 4217 currency codes
  if (code === '$' || code === 'US$') code = 'USD';
  else if (code === '€') code = 'EUR';
  else if (code === '£') code = 'GBP';
  else if (code === '₪') code = 'ILS';
  else if (code === '¥') code = 'JPY';
  else if (code === 'C$' || code === 'CA$') code = 'CAD';
  else if (code === 'A$' || code === 'AU$') code = 'AUD';

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

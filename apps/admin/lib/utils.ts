import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CURRENCY_LOCALES: Record<string, string> = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'en-IE',
  GBP: 'en-GB',
  AED: 'en-AE',
};

export function formatCurrency(amount: number, currency = 'INR'): string {
  const curr = (currency || 'INR').toUpperCase();
  const locale = CURRENCY_LOCALES[curr] || 'en-US';
  const hasDecimals = amount % 1 !== 0;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: curr,
      maximumFractionDigits: hasDecimals ? 2 : 0,
      minimumFractionDigits: hasDecimals ? 2 : 0,
    }).format(amount);
  } catch {
    return `${curr} ${amount.toLocaleString()}`;
  }
}

/**
 * Resolves a media or avatar URL. If relative, ensures standard formatting
 * for Next.js proxy rewrites or static asset loading.
 */
export function resolveMediaUrl(url?: string | null): string {
  if (!url) return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }
  return url.startsWith('/') ? url : `/${url}`;
}

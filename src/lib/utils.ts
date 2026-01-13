import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
  }
  return `${mins}min`;
}

/**
 * Safely compute the minimum denomination from an array of values.
 * Returns null if array is empty or contains no finite numbers.
 * Handles edge cases: empty arrays, undefined, null, NaN, Infinity.
 */
export function getMinDenomination(values: unknown[]): number | null {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  const finiteNumbers = values
    .map((v) => (typeof v === 'string' ? parseFloat(v) : Number(v)))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (finiteNumbers.length === 0) {
    return null;
  }

  return Math.min(...finiteNumbers);
}

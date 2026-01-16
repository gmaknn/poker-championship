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

/**
 * Normalize avatar URL/path for consistent rendering.
 * Handles multiple formats:
 * - "avatars/xxx.png" => "/avatars/xxx.png" (adds leading slash)
 * - "/avatars/xxx.png" => unchanged
 * - "http://..." or "https://..." => unchanged
 * - null/empty => null
 * - other strings => fallback to dicebear or null
 */
export function normalizeAvatarSrc(avatar: string | null | undefined): string | null {
  if (!avatar || avatar.trim() === '') {
    return null;
  }

  const trimmed = avatar.trim();

  // Already a full URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Already has leading slash
  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  // Relative path without leading slash (e.g., "avatars/xxx.png")
  if (trimmed.startsWith('avatars/')) {
    return '/' + trimmed;
  }

  // Unknown format - return null (will fallback to initials)
  return null;
}

/**
 * Check if avatar URL/path is valid and can be rendered.
 * Uses normalizeAvatarSrc internally.
 */
export function isValidAvatarUrl(url: string | null | undefined): boolean {
  return normalizeAvatarSrc(url) !== null;
}

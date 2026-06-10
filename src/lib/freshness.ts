import type { TFunction } from 'i18next';

export type Freshness = 'fresh' | 'thisWeek' | 'older';

export function freshnessFor(postedAt: string | undefined): Freshness {
  if (!postedAt) return 'older';
  const posted = new Date(postedAt).getTime();
  if (Number.isNaN(posted)) return 'older';
  const diffMs = Date.now() - posted;
  const oneDay = 24 * 60 * 60 * 1000;
  if (diffMs <= oneDay) return 'fresh';
  if (diffMs <= 7 * oneDay) return 'thisWeek';
  return 'older';
}

/**
 * Render relative time using the project's i18n keys (listing.minutesAgo etc).
 * Caller should pass the namespaced t (so this works in both languages).
 */
export function relativeTime(postedAt: string | undefined, t: TFunction): string {
  if (!postedAt) return '';
  const posted = new Date(postedAt).getTime();
  if (Number.isNaN(posted)) return '';
  const diffMs = Date.now() - posted;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) {
    const mins = Math.max(1, Math.round(diffMs / minute));
    return t('listing.minutesAgo', { count: mins });
  }
  if (diffMs < day) {
    const hrs = Math.max(1, Math.round(diffMs / hour));
    return t('listing.hoursAgo', { count: hrs });
  }
  const days = Math.max(1, Math.round(diffMs / day));
  return t('listing.daysAgo', { count: days });
}

export const FRESHNESS_DOT: Record<Freshness, string> = {
  fresh: 'bg-emerald-500',
  thisWeek: 'bg-amber-400',
  older: 'bg-gray-400',
};

export const FRESHNESS_PILL: Record<Freshness, string> = {
  fresh: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  thisWeek: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  older: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
};

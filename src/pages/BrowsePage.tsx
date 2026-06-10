import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Industry, ScrapedListing } from '../lib/types';
import { loadAllListings, type AllListings } from '../lib/dataLoader';
import { ListingCard } from '../components/ListingCard';

type TypeFilter = 'all' | 'employer' | 'seeker';

const INDUSTRIES: Industry[] = [
  'fnb',
  'cleaning',
  'construction',
  'retail',
  'logistics',
  'childcare',
  'beauty',
  'security',
  'driver',
  'other',
];

export function BrowsePage() {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState<AllListings | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [industryFilter, setIndustryFilter] = useState<Industry | 'all'>('all');

  useEffect(() => {
    let active = true;
    loadAllListings().then((d) => {
      if (active) setData(d);
    });
    return () => {
      active = false;
    };
  }, []);

  const allListings: ScrapedListing[] = useMemo(() => {
    if (!data) return [];
    return [...data.employers, ...data.seekers].sort((a, b) => {
      const ta = new Date(a.posted_at).getTime() || 0;
      const tb = new Date(b.posted_at).getTime() || 0;
      return tb - ta;
    });
  }, [data]);

  const filtered = useMemo(() => {
    return allListings.filter((l) => {
      if (typeFilter !== 'all' && l.type !== typeFilter) return false;
      if (industryFilter !== 'all' && l.industry !== industryFilter) return false;
      return true;
    });
  }, [allListings, typeFilter, industryFilter]);

  const lastUpdated = useMemo(() => {
    if (!data) return null;
    const dates = [data.meta.employers?.scraped_at, data.meta.seekers?.scraped_at]
      .filter(Boolean)
      .map((d) => new Date(d as string).getTime())
      .filter((n) => !Number.isNaN(n));
    if (dates.length === 0) return null;
    const max = new Date(Math.max(...dates));
    try {
      return max.toLocaleString(i18n.language === 'cn' ? 'zh-CN' : 'en-SG');
    } catch {
      return max.toISOString();
    }
  }, [data, i18n.language]);

  // Loading state
  if (data === null) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center" role="status" aria-live="polite">
        <div className="inline-flex items-center gap-3 text-gray-500">
          <span className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <span className="text-base">{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  const typeButtons: { value: TypeFilter; label: string }[] = [
    { value: 'all', label: t('listing.allTypes') },
    { value: 'employer', label: t('listing.employers') },
    { value: 'seeker', label: t('listing.seekers') },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          {t('listing.browse')}
        </h1>
        <p className="text-base md:text-lg text-gray-600">
          {t('listing.browseSubtitle')}
        </p>

        {/* Meta strip */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            {t('listing.totalListings', { count: allListings.length })}
          </span>
          {lastUpdated && (
            <span className="inline-flex items-center gap-1.5">
              <span className="text-gray-400">·</span>
              {t('listing.lastUpdated')}: {lastUpdated}
            </span>
          )}
        </div>
      </header>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6 flex flex-col md:flex-row md:items-center gap-4">
        {/* Type filter */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {t('listing.filterByType')}
          </span>
          <div className="inline-flex bg-gray-100 rounded-xl p-1">
            {typeButtons.map((btn) => (
              <button
                key={btn.value}
                type="button"
                onClick={() => setTypeFilter(btn.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  typeFilter === btn.value
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Industry filter */}
        <div className="flex flex-col gap-1.5 md:ml-auto">
          <label htmlFor="industry-filter" className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {t('listing.filterByIndustry')}
          </label>
          <select
            id="industry-filter"
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value as Industry | 'all')}
            className="py-2 px-3 text-sm border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-white"
          >
            <option value="all">{t('listing.allTypes')}</option>
            {INDUSTRIES.map((ind) => (
              <option key={ind} value={ind}>
                {t(`industries.${ind}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Result count */}
      <div className="mb-4 text-sm text-gray-500">
        {t('listing.totalListings', { count: filtered.length })}
      </div>

      {/* Listings */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <div className="text-4xl mb-3">🗂️</div>
          <p className="text-base text-gray-500">{t('listing.noData')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}

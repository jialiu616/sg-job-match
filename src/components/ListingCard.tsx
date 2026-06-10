import { useTranslation } from 'react-i18next';
import type { ScrapedListing } from '../lib/types';
import {
  freshnessFor,
  relativeTime,
  FRESHNESS_DOT,
  FRESHNESS_PILL,
} from '../lib/freshness';

interface ListingCardProps {
  listing: ScrapedListing;
}

function contactIcon(type: ScrapedListing['contact_type']): string {
  switch (type) {
    case 'whatsapp':
      return '💚';
    case 'sms':
      return '✉️';
    case 'phone':
    default:
      return '📞';
  }
}

export function ListingCard({ listing }: ListingCardProps) {
  const { t } = useTranslation();

  const freshness = freshnessFor(listing.posted_at);
  const relTime = relativeTime(listing.posted_at, t);

  const title =
    listing.type === 'employer'
      ? listing.job_title || listing.title
      : listing.name || listing.title;

  const subtitle =
    listing.type === 'employer'
      ? listing.company_name && listing.company_name !== title
        ? listing.company_name
        : null
      : listing.bio || null;

  const typePill =
    listing.type === 'employer'
      ? 'bg-orange-100 text-orange-800 ring-1 ring-orange-200'
      : 'bg-blue-100 text-blue-800 ring-1 ring-blue-200';

  const typeLabel =
    listing.type === 'employer' ? t('listing.employers') : t('listing.seekers');

  const salaryLow =
    listing.type === 'employer' ? listing.budget_min : listing.expected_salary_min;
  const salaryHigh =
    listing.type === 'employer' ? listing.budget_max : listing.expected_salary_max;
  const hasSalary = !!(salaryLow || salaryHigh) && (salaryLow || 0) + (salaryHigh || 0) > 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all p-5 flex flex-col">
      {/* Top row: type + freshness */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${typePill}`}>
          {typeLabel}
        </span>
        <span className="inline-block bg-gray-100 text-gray-700 text-xs font-medium px-2.5 py-1 rounded-full">
          {t(`industries.${listing.industry}`)}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${FRESHNESS_PILL[freshness]}`}
        >
          <span className={`w-2 h-2 rounded-full ${FRESHNESS_DOT[freshness]}`} />
          {t(`listing.${freshness}`)}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold text-gray-900 leading-snug mb-1 line-clamp-2">
        {title}
      </h3>
      {subtitle && (
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{subtitle}</p>
      )}

      {/* Tags */}
      {listing.tags && listing.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {listing.tags.slice(0, 6).map((tag, idx) => (
            <span
              key={`${tag}-${idx}`}
              className="bg-gray-50 text-gray-600 text-xs px-2 py-0.5 rounded-md border border-gray-100"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Salary if present */}
      {hasSalary && (
        <div className="text-sm text-gray-700 mb-3">
          <span className="font-semibold text-gray-900">
            SGD {(salaryLow || 0).toLocaleString()} – {(salaryHigh || 0).toLocaleString()}
          </span>
          <span className="text-gray-400">/mo</span>
        </div>
      )}

      {/* Posted time */}
      {relTime && (
        <p className="text-xs text-gray-400 mb-3">
          {t('listing.postedAt')} · {relTime}
        </p>
      )}

      {/* Contact */}
      <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <span className="text-sm text-gray-800 font-medium">
          {contactIcon(listing.contact_type)} {listing.contact}
        </span>
        {listing.source_url && (
          <a
            href={listing.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            {t('listing.viewOriginal')}
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}

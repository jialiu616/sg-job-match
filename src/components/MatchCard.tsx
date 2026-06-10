import { useTranslation } from 'react-i18next';
import type { JobSeeker, Employer } from '../lib/types';
import {
  freshnessFor,
  relativeTime,
  FRESHNESS_DOT,
  FRESHNESS_PILL,
} from '../lib/freshness';

interface MatchCardProps {
  score: number;
  seeker?: JobSeeker;
  employer?: Employer;
  role: 'seeker' | 'employer';
}

export function MatchCard({ score, seeker, employer, role }: MatchCardProps) {
  const { t } = useTranslation();

  // If role is seeker, we show employer info (the match); if employer, show seeker info
  const isShowingEmployer = role === 'seeker';
  const subject = isShowingEmployer ? employer : seeker;

  const name = isShowingEmployer
    ? employer?.company_name ?? ''
    : seeker?.name ?? '';
  const industry = isShowingEmployer ? employer?.industry : seeker?.industry;
  const skills = isShowingEmployer
    ? employer?.required_skills ?? []
    : seeker?.skills ?? [];
  const salaryMin = isShowingEmployer ? employer?.budget_min : seeker?.expected_salary_min;
  const salaryMax = isShowingEmployer ? employer?.budget_max : seeker?.expected_salary_max;
  const phone = isShowingEmployer ? employer?.phone : seeker?.phone;
  const wechat = isShowingEmployer ? employer?.wechat : seeker?.wechat;
  const subtitle = isShowingEmployer ? employer?.job_title : seeker?.bio;

  const sourceUrl = subject?.source_url;
  const postedAt = subject?.posted_at;
  const freshness = freshnessFor(postedAt);
  const relTime = relativeTime(postedAt, t);

  const scoreColor =
    score >= 70 ? 'text-green-600' : score >= 40 ? 'text-yellow-600' : 'text-red-500';
  const barColor =
    score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-400';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5">
      {/* Header: Name + Score */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-gray-900 truncate">{name}</h3>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
        <div className="text-right ml-3 shrink-0">
          <div className={`text-2xl font-bold ${scoreColor}`}>{score}%</div>
          <div className="text-xs text-gray-400">{t('matches.score')}</div>
        </div>
      </div>

      {/* Score bar */}
      <div className="w-full h-2 bg-gray-100 rounded-full mb-4">
        <div
          className={`h-2 rounded-full ${barColor} transition-all`}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Industry + Freshness row */}
      {(industry || postedAt) && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {industry && (
            <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">
              {t(`industries.${industry}`)}
            </span>
          )}
          {postedAt && (
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${FRESHNESS_PILL[freshness]}`}
            >
              <span className={`w-2 h-2 rounded-full ${FRESHNESS_DOT[freshness]}`} />
              {t(`listing.${freshness}`)}
            </span>
          )}
          {relTime && (
            <span className="text-xs text-gray-400">· {relTime}</span>
          )}
        </div>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <div className="mb-3">
          <span className="text-xs font-medium text-gray-500 mr-2">{t('matches.skills')}:</span>
          <div className="inline-flex flex-wrap gap-1.5 mt-1">
            {skills.slice(0, 4).map((skill) => (
              <span
                key={skill}
                className="bg-gray-100 text-gray-700 text-sm px-2 py-0.5 rounded-md"
              >
                {skill}
              </span>
            ))}
            {skills.length > 4 && (
              <span className="text-sm text-gray-400">+{skills.length - 4}</span>
            )}
          </div>
        </div>
      )}

      {/* Salary range */}
      {salaryMin != null && salaryMax != null && (salaryMin > 0 || salaryMax > 0) && (
        <div className="mb-3">
          <span className="text-xs font-medium text-gray-500 mr-2">{t('matches.salary')}:</span>
          <span className="text-sm font-semibold text-gray-900">
            SGD {salaryMin.toLocaleString()} - {salaryMax.toLocaleString()}/mo
          </span>
        </div>
      )}

      {/* Contact */}
      <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          {phone ? (
            <>
              <span className="text-xs font-medium text-gray-500 mr-2">{t('matches.contact')}:</span>
              <span className="text-sm text-gray-800">📞 {phone}</span>
              {wechat && (
                <span className="text-sm text-gray-800 ml-3">💬 {wechat}</span>
              )}
            </>
          ) : (
            <span className="text-sm text-gray-400 italic">
              {t('listing.contactInOriginal')}
            </span>
          )}
        </div>
        {sourceUrl && (
          <a
            href={sourceUrl}
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}

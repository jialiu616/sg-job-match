import { useTranslation } from 'react-i18next';
import type { JobSeeker, Employer } from '../lib/types';

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
  const name = isShowingEmployer
    ? employer?.company_name ?? ''
    : seeker?.name ?? '';
  const industry = isShowingEmployer
    ? employer?.industry
    : seeker?.industry;
  const skills = isShowingEmployer
    ? employer?.required_skills ?? []
    : seeker?.skills ?? [];
  const salaryMin = isShowingEmployer ? employer?.budget_min : seeker?.expected_salary_min;
  const salaryMax = isShowingEmployer ? employer?.budget_max : seeker?.expected_salary_max;
  const phone = isShowingEmployer ? employer?.phone : seeker?.phone;
  const wechat = isShowingEmployer ? employer?.wechat : seeker?.wechat;
  const subtitle = isShowingEmployer ? employer?.job_title : seeker?.bio;

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

      {/* Industry badge */}
      {industry && (
        <div className="mb-3">
          <span className="text-xs font-medium text-gray-500 mr-2">{t('matches.industry')}:</span>
          <span className="inline-block bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
            {t(`industries.${industry}`)}
          </span>
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
      {salaryMin != null && salaryMax != null && (
        <div className="mb-3">
          <span className="text-xs font-medium text-gray-500 mr-2">{t('matches.salary')}:</span>
          <span className="text-sm font-semibold text-gray-900">
            SGD {salaryMin.toLocaleString()} - {salaryMax.toLocaleString()}/mo
          </span>
        </div>
      )}

      {/* Contact */}
      <div className="pt-3 border-t border-gray-100">
        <span className="text-xs font-medium text-gray-500 mr-2">{t('matches.contact')}:</span>
        <span className="text-sm text-gray-800">📞 {phone}</span>
        {wechat && (
          <span className="text-sm text-gray-800 ml-3">💬 {wechat}</span>
        )}
      </div>
    </div>
  );
}

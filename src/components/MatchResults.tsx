import { useTranslation } from 'react-i18next';
import type { MatchResult } from '../lib/matching';
import type { JobSeeker, Employer } from '../lib/types';
import { MatchCard } from './MatchCard';

interface MatchResultsProps {
  results: MatchResult[];
  role: 'seeker' | 'employer';
  seekers: JobSeeker[];
  employers: Employer[];
}

export function MatchResults({ results, role, seekers, employers }: MatchResultsProps) {
  const { t } = useTranslation();

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">🔍</div>
        <p className="text-lg text-gray-500">{t('matches.noMatches')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {results.map((result, idx) => {
        const seeker = seekers.find((s) => s.id === result.seekerId);
        const employer = employers.find((e) => e.id === result.employerId);
        return (
          <MatchCard
            key={`${result.seekerId}-${result.employerId}-${idx}`}
            score={result.score}
            seeker={seeker}
            employer={employer}
            role={role}
          />
        );
      })}
    </div>
  );
}

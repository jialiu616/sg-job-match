import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import { MatchResults } from '../components/MatchResults';
import { mockSeekers, mockEmployers } from '../lib/mockData';
import { matchSeekerToEmployers } from '../lib/matching';

export function MatchesPage() {
  const { t } = useTranslation();
  const { matchResults, role } = useAppContext();

  // If accessed directly without submitting a form, show demo results
  const hasResults = matchResults.length > 0;
  const displayResults = hasResults
    ? matchResults
    : matchSeekerToEmployers(mockSeekers[0], mockEmployers);
  const displayRole = role ?? 'seeker';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          {t('matches.title')}
        </h1>
        <p className="text-lg text-gray-600">{t('matches.subtitle')}</p>
      </div>

      <MatchResults
        results={displayResults}
        role={displayRole}
        seekers={mockSeekers}
        employers={mockEmployers}
      />
    </div>
  );
}

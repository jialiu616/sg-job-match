import { useTranslation } from 'react-i18next';
import { SeekerForm } from '../components/SeekerForm';

export function SeekerPage() {
  const { t } = useTranslation();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          {t('seeker.title')}
        </h1>
        <p className="text-lg text-gray-600">{t('seeker.subtitle')}</p>
      </div>
      <SeekerForm />
    </div>
  );
}

import { useTranslation } from 'react-i18next';
import { EmployerForm } from '../components/EmployerForm';

export function EmployerPage() {
  const { t } = useTranslation();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          {t('employer.title')}
        </h1>
        <p className="text-lg text-gray-600">{t('employer.subtitle')}</p>
      </div>
      <EmployerForm />
    </div>
  );
}

import { useTranslation } from 'react-i18next';

export function LanguageToggle() {
  const { i18n, t } = useTranslation();

  const toggle = () => {
    i18n.changeLanguage(i18n.language === 'cn' ? 'en' : 'cn');
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="text-sm font-medium border-2 border-blue-600 text-blue-600 rounded-full px-4 py-1.5 hover:bg-blue-600 hover:text-white transition-colors"
    >
      {t('common.language')}
    </button>
  );
}

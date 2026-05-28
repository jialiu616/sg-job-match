import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto px-4">
      {/* Hero Section */}
      <section className="py-12 md:py-20 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          {t('home.heroTitle')}
        </h1>
        <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          {t('home.heroSubtitle')}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md sm:max-w-lg mx-auto">
          <button
            onClick={() => navigate('/seeker')}
            className="w-full sm:w-auto flex-1 py-4 px-8 text-xl font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95"
          >
            {t('home.seekerBtn')}
          </button>
          <button
            onClick={() => navigate('/employer')}
            className="w-full sm:w-auto flex-1 py-4 px-8 text-xl font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95"
          >
            {t('home.employerBtn')}
          </button>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-10">
          {t('home.howItWorks')}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {/* Step 1 */}
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {t('home.step1')}
            </h3>
            <p className="text-base text-gray-600">{t('home.step1Desc')}</p>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {t('home.step2')}
            </h3>
            <p className="text-base text-gray-600">{t('home.step2Desc')}</p>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100">
            <div className="text-4xl mb-4">✅</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {t('home.step3')}
            </h3>
            <p className="text-base text-gray-600">{t('home.step3Desc')}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

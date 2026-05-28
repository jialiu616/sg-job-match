import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import cn from './cn.json';
import en from './en.json';

i18n.use(initReactI18next).init({
  resources: {
    cn: { translation: cn },
    en: { translation: en },
  },
  lng: 'cn',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;

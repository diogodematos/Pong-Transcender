import i18next from 'i18next';
import en from './translation/en.json';
import fr from './translation/fr.json';

i18next.init({
  resources: {
    en: { translation: en },
    fr: { translation: fr }
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false
  }
});
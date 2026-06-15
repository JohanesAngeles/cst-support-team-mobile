import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import it from './locales/it.json';
import zh from './locales/zh.json';
import ru from './locales/ru.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', countryCode: 'us' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', countryCode: 'es' },
  { code: 'fr', name: 'French',  nativeName: 'Français', countryCode: 'fr' },
  { code: 'de', name: 'German',  nativeName: 'Deutsch',  countryCode: 'de' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', countryCode: 'it' },
  { code: 'zh', name: 'Chinese', nativeName: '中文',      countryCode: 'cn' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский',  countryCode: 'ru' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

export const LANGUAGE_STORAGE_KEY = '@rrn_language';

// Detect device language, falling back to English
function getDeviceLanguage(): string {
  const locale = Localization.getLocales()[0]?.languageCode ?? 'en';
  const supported = SUPPORTED_LANGUAGES.map(l => l.code);
  return supported.includes(locale as LanguageCode) ? locale : 'en';
}

export function initI18n() {
  // Initialize synchronously with English so t() works on first render
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        es: { translation: es },
        fr: { translation: fr },
        de: { translation: de },
        it: { translation: it },
        zh: { translation: zh },
        ru: { translation: ru },
      },
      lng: 'en',
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
      compatibilityJSON: 'v4',
    });

  // Then asynchronously apply the stored / device language
  AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).then(stored => {
    const lang = stored ?? getDeviceLanguage();
    if (lang !== 'en') i18n.changeLanguage(lang);
  });

  return i18n;
}

export async function changeLanguage(code: LanguageCode) {
  await i18n.changeLanguage(code);
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, code);
}

export default i18n;

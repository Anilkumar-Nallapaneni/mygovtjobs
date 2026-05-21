import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/i18n/locales/en.json";
import { DEFAULT_LOCALE, INDIAN_LANGUAGES, LOCALE_STORAGE_KEY, languageMeta } from "@/i18n/languages";
import { registerAllLocales, ensureLocale } from "@/i18n/ensureLocale";
import { withStateNames } from "@/i18n/stateNames";

export { ensureLocale };

const LEGACY_LOCALE_KEYS = [
  "bharatnaukri-ui-language",
  "naukrisetu-listing-language",
  "naukrisetu-ui-language",
];

function readStoredLocale() {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && INDIAN_LANGUAGES.some((l) => l.code === stored)) return stored;
    for (const legacy of LEGACY_LOCALE_KEYS) {
      const legacyVal = localStorage.getItem(legacy);
      if (legacyVal && INDIAN_LANGUAGES.some((l) => l.code === legacyVal)) return legacyVal;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_LOCALE;
}

function applyDocumentLocale(code) {
  const meta = languageMeta(code);
  document.documentElement.lang = code;
  document.documentElement.dir = meta.dir;
}

const initialLocale = readStoredLocale();
applyDocumentLocale(initialLocale);

const resources = {
  [DEFAULT_LOCALE]: { translation: withStateNames(en, DEFAULT_LOCALE) },
};

i18n.use(initReactI18next).init({
  resources,
  lng: initialLocale,
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: INDIAN_LANGUAGES.map((l) => l.code),
  nonExplicitSupportedLngs: false,
  interpolation: { escapeValue: false },
  returnEmptyString: false,
  react: {
    useSuspense: false,
    bindI18n: "languageChanged loaded",
    bindI18nStore: "added removed",
  },
});

registerAllLocales();

if (i18n.language !== initialLocale) {
  void i18n.changeLanguage(initialLocale);
}

i18n.on("languageChanged", (lng) => {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, lng);
  } catch {
    /* ignore */
  }
  applyDocumentLocale(lng);
});

export default i18n;

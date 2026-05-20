import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/i18n/locales/en.json";
import { localeOverrides } from "@/i18n/localeOverrides";
import { DEFAULT_LOCALE, INDIAN_LANGUAGES, LOCALE_STORAGE_KEY, languageMeta } from "@/i18n/languages";

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

/** Pre-built full locale trees (see scripts/generate-locale-overrides.mjs). */
const resources = {};
for (const { code } of INDIAN_LANGUAGES) {
  const pack = localeOverrides[code] ?? localeOverrides.en ?? en;
  resources[code] = { translation: pack };
}

const initialLocale = readStoredLocale();
applyDocumentLocale(initialLocale);

i18n.use(initReactI18next).init({
  resources,
  lng: initialLocale,
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: INDIAN_LANGUAGES.map((l) => l.code),
  nonExplicitSupportedLngs: false,
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

i18n.on("languageChanged", (lng) => {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, lng);
  } catch {
    /* ignore */
  }
  applyDocumentLocale(lng);
});

export default i18n;

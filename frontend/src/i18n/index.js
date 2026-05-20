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

/** Reset persisted locale so each visit starts in English (user can switch in-session). */
function ensureDefaultLocaleOnLoad() {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, DEFAULT_LOCALE);
    for (const legacy of LEGACY_LOCALE_KEYS) localStorage.removeItem(legacy);
  } catch {
    /* ignore */
  }
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

ensureDefaultLocaleOnLoad();
applyDocumentLocale(DEFAULT_LOCALE);

i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LOCALE,
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

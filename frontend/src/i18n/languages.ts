/** Indian languages supported for full-site UI (ISO 639-1 + script labels). */
export const INDIAN_LANGUAGES = [
  { code: "en", label: "English", native: "English", dir: "ltr" },
  { code: "hi", label: "Hindi", native: "हिन्दी", dir: "ltr" },
  { code: "bn", label: "Bengali", native: "বাংলা", dir: "ltr" },
  { code: "te", label: "Telugu", native: "తెలుగు", dir: "ltr" },
  { code: "mr", label: "Marathi", native: "मराठी", dir: "ltr" },
  { code: "ta", label: "Tamil", native: "தமிழ்", dir: "ltr" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી", dir: "ltr" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ", dir: "ltr" },
  { code: "ml", label: "Malayalam", native: "മലയാളം", dir: "ltr" },
  { code: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ", dir: "ltr" },
  { code: "or", label: "Odia", native: "ଓଡ଼ିଆ", dir: "ltr" },
  { code: "as", label: "Assamese", native: "অসমীয়া", dir: "ltr" },
  { code: "ur", label: "Urdu", native: "اردو", dir: "rtl" },
  { code: "kok", label: "Konkani", native: "कोंकणी", dir: "ltr" },
  { code: "mni", label: "Manipuri", native: "মৈতৈলোন্", dir: "ltr" },
  { code: "ne", label: "Nepali", native: "नेपाली", dir: "ltr" },
  { code: "sd", label: "Sindhi", native: "سنڌي", dir: "rtl" },
  { code: "sa", label: "Sanskrit", native: "संस्कृतम्", dir: "ltr" },
  { code: "sat", label: "Santali", native: "ᱥᱟᱱᱛᱟᱲᱤ", dir: "ltr" },
  { code: "mai", label: "Maithili", native: "मैथिली", dir: "ltr" },
  { code: "doi", label: "Dogri", native: "डोगरी", dir: "ltr" },
  { code: "brx", label: "Bodo", native: "बड़ो", dir: "ltr" },
  { code: "ks", label: "Kashmiri", native: "کٲشُر", dir: "rtl" },
];

export const DEFAULT_LOCALE = "en";
export const LOCALE_STORAGE_KEY = "bharatnaukri-ui-locale";

export function languageMeta(code) {
  return INDIAN_LANGUAGES.find((l) => l.code === code) ?? INDIAN_LANGUAGES[0];
}

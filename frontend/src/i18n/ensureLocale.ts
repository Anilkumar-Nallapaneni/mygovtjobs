import i18n from "i18next";
import en from "@/i18n/locales/en.json";
import { localeOverrides } from "@/i18n/localeOverrides";
import { DEFAULT_LOCALE } from "@/i18n/languages";
import { withStateNames } from "@/i18n/stateNames";

/** Register a language pack if not already loaded. */
export async function ensureLocale(code) {
  if (i18n.hasResourceBundle(code, "translation")) return;

  const base = code === DEFAULT_LOCALE ? en : localeOverrides[code] ?? localeOverrides.en ?? en;
  const pack = withStateNames(base, code);
  i18n.addResourceBundle(code, "translation", pack, true, true);
}

/** Register every supported Indian language (used at startup). */
export function registerAllLocales() {
  const codes = Object.keys(localeOverrides);
  for (const code of codes) {
    if (i18n.hasResourceBundle(code, "translation")) continue;
    const base = code === DEFAULT_LOCALE ? en : localeOverrides[code] ?? en;
    i18n.addResourceBundle(code, "translation", withStateNames(base, code), true, true);
  }
}

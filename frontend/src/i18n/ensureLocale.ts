import i18n from "i18next";
import en from "@/i18n/locales/en.json";
import { localeOverrides } from "@/i18n/localeOverrides";
import { DEFAULT_LOCALE } from "@/i18n/languages";
import { deepMerge } from "@/i18n/mergeLocale";
import { withStateNames } from "@/i18n/stateNames";

function buildLocalePack(code: string) {
  const base = JSON.parse(JSON.stringify(en)) as Record<string, unknown>;
  const overrides =
    code === DEFAULT_LOCALE ? null : (localeOverrides[code] ?? localeOverrides.en ?? null);
  const merged = overrides ? deepMerge(base, overrides as Record<string, unknown>) : base;
  return withStateNames(merged, code);
}

/** Register a language pack if not already loaded. */
export async function ensureLocale(code: string) {
  if (i18n.hasResourceBundle(code, "translation")) return;
  i18n.addResourceBundle(code, "translation", buildLocalePack(code), true, true);
}

/** Register every supported Indian language (used at startup). */
export function registerAllLocales() {
  const codes = new Set([DEFAULT_LOCALE, ...Object.keys(localeOverrides)]);
  for (const code of codes) {
    if (i18n.hasResourceBundle(code, "translation")) continue;
    i18n.addResourceBundle(code, "translation", buildLocalePack(code), true, true);
  }
}

/** Map job `dates` / `fee` object keys to i18n paths under jobDetail.dates.* / jobDetail.fee.* */
export function dateKeySlug(key) {
  return String(key)
    .replace(/\s+/g, "")
    .replace(/[^a-zA-Z0-9]/g, "");
}

export function translateDateKey(t, key) {
  const slug = dateKeySlug(key);
  return t(`jobDetail.dates.${slug}`, { defaultValue: key });
}

export function translateFeeKey(t, key) {
  const slug = dateKeySlug(key);
  return t(`jobDetail.fee.${slug}`, { defaultValue: key });
}

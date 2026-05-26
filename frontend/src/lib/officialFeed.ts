/**
 * Shared loader for official-feed-items.json (single network call per session).
 */

let CACHE = null;
let INFLIGHT = null;
let CACHE_AT = 0;

const DEFAULT_MAX_AGE_MS = 15 * 60 * 1000;

/** @param {{ cache?: RequestCache, maxAgeMs?: number }} [opts] */
export async function loadOfficialFeed({ cache = "no-cache", maxAgeMs = DEFAULT_MAX_AGE_MS } = {}) {
  if (CACHE && Date.now() - CACHE_AT < maxAgeMs) return CACHE;
  if (!INFLIGHT) {
    INFLIGHT = (async () => {
      try {
        const cacheBust = cache === "no-cache" || cache === "no-store" || cache === "reload";
        const res = await fetch(`/data/official-feed-items.json${cacheBust ? `?t=${Date.now()}` : ""}`, {
          cache: cache as RequestCache,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        CACHE = json;
        CACHE_AT = Date.now();
        return json;
      } finally {
        INFLIGHT = null;
      }
    })();
  }
  return INFLIGHT;
}

/** Ticker-friendly rows from feed snapshot. */
export function feedItemsForTicker(json, max = 12) {
  const rows = Array.isArray(json?.items) ? json.items : [];
  return rows.slice(0, max).map((it, i) => ({
    title: it.title,
    dept: it.sourceName || it.dept || "Official",
    type: "new",
    state: it.state || "All India",
    vacancies: it.vacancies,
    time: Date.now() - (i + 1) * 90_000,
  }));
}

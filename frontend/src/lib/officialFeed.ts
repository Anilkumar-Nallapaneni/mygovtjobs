/**
 * Shared loader for official-feed-items.json (single network call per session).
 */

let CACHE = null;
let INFLIGHT = null;

/** @param {{ cache?: RequestCache }} [opts] */
export async function loadOfficialFeed({ cache = "default" } = {}) {
  if (CACHE) return CACHE;
  if (!INFLIGHT) {
    INFLIGHT = (async () => {
      try {
        const res = await fetch("/data/official-feed-items.json", {
          cache: cache as RequestCache,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        CACHE = json;
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

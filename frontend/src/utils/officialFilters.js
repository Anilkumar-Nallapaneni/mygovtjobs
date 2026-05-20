import { STATES } from "@/data/states";
import { CATS } from "@/data/categories";

/**
 * Maps a NotificationsSidebar item key (see `src/components/home/NotificationsSidebar.jsx`)
 * to a regex evaluated against the feed item's title / summary / dept.
 * `null` means "no topic narrowing".
 */
const TOPIC_PATTERNS = {
  /* Notifications column */
  latest:           null,
  "employment-news": /\bemployment\s*news\b|rojgar\s*samachar/i,
  "search-jobs":    /\b(recruit|vacanc|appointment|hiring)\b/i,
  "sarkari-job":    /\b(recruit|vacanc|notification|advertisement)\b/i,
  "sarkari-naukri": /\b(recruit|vacanc|notification|naukri)\b/i,
  anganwadi:        /anganwadi|icds/i,
  forest:           /\bforest\b|wildlife|ranger/i,
  education:        /\b(education|school|university|college|teacher|professor|faculty|ugc|aicte|cbse|ncert|kvs|nvs)\b/i,
  "mock-test":      /\b(mock|practice|preparation|free\s*test)\b/i,

  /* Latest Announcements column */
  "sarkari-result": /\b(result|merit|cut\s*off|cutoff|selection\s*list|provisional)\b/i,
  "admit-card":     /\b(admit\s*card|hall\s*ticket|call\s*letter)\b/i,
  "exam-results":   /\b(exam(?:ination)?\s*result|result\s*declared|scorecard)\b/i,
  "answer-key":     /\banswer\s*key\b/i,
  cutoff:           /\bcut[\s-]*off\b|cutoff/i,
  "written-marks":  /\b(written\s*(?:exam|test|marks)|main(?:s)?\s*marks)\b/i,
  interview:        /\binterview\b|viva|personality\s*test/i,
  "last-date":      /\b(last\s*date|extension|extended|deadline|closing)\b/i,

  /* Others column (mostly tooling — no feed mapping by default) */
  eligibility:      /\beligibility|qualification|age\s*limit\b/i,
  syllabus:         /\bsyllabus\b/i,
  "exam-pattern":   /\bexam\s*pattern|scheme\s*of\s*exam/i,
  selection:        /\bselection\s*process|selection\s*procedure/i,
  "previous-papers":/\bprevious\s*(?:year)?\s*(?:question)?\s*paper|sample\s*paper/i,
  games:            null,
  "image-resizer":  null,
  "pdf-to-word":    null,
  "image-to-pdf":   null,
  "word-to-pdf":    null,
  "ai-interview":   /\bai\s*interview|mock\s*interview\b/i,
};

/**
 * @returns string[] of distinct state.n values (e.g. "Bihar", "All India") that
 *          the feed's `state` field may match against. We compare loosely so
 *          a feed item set to "Bihar" filters when `stateId="br"`, and an
 *          item set to "All India" passes for any state-context filter only if
 *          `includeAllIndia` is true.
 */
function stateLabelsForId(stateId) {
  if (!stateId) return null;
  const st = STATES.find((s) => s.id === stateId);
  return st ? [st.n] : null;
}

/**
 * Build a haystack string used for state/category/topic matching.
 */
function haystack(item) {
  return `${item.title || ""} ${item.summary || ""} ${item.dept || ""} ${item.sourceName || ""} ${item.state || ""}`;
}

/**
 * Apply state + category + sidebar-topic filters to the official feed items.
 *
 *  - `stateId`   – STATES[].id   (null = no state narrowing)
 *  - `categoryId`– CATS[].id     (null = no category narrowing)
 *  - `topicKey`  – key from `NotificationsSidebar` (null = no topic narrowing)
 *  - `search`    – freeform query string from the navbar (optional)
 */
export function filterOfficialItems(items, { stateId, categoryId, topicKey, search } = {}) {
  if (!Array.isArray(items)) return [];

  const stateLabels = stateLabelsForId(stateId);
  const category = categoryId ? CATS.find((c) => c.id === categoryId) : null;
  const topicRe = topicKey ? TOPIC_PATTERNS[topicKey] ?? null : null;
  const searchRe = search?.trim() ? new RegExp(escapeRegex(search.trim()), "i") : null;

  const narrowed = items.filter((it) => {
    const hay = haystack(it);

    if (stateLabels) {
      const itState = (it.state || "").trim();
      const matches = stateLabels.some((label) => itState === label) || new RegExp(`\\b${escapeRegex(stateLabels[0])}\\b`, "i").test(hay);
      if (!matches) return false;
    }

    if (category) {
      const catRe = new RegExp(`\\b${escapeRegex(category.name)}\\b|\\b${escapeRegex(category.id)}\\b`, "i");
      if (!catRe.test(hay)) return false;
    }

    if (topicRe && !topicRe.test(hay)) return false;

    if (searchRe && !searchRe.test(hay)) return false;

    return true;
  });

  return narrowed;
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Returns a human-readable label describing what filters were applied,
 * for the section caption. Empty string when nothing is active.
 */
export function describeActiveFilters({ stateId, categoryId, topicKey, search } = {}) {
  const parts = [];
  if (stateId) {
    const st = STATES.find((s) => s.id === stateId);
    if (st) parts.push(st.n);
  }
  if (categoryId) {
    const c = CATS.find((x) => x.id === categoryId);
    if (c) parts.push(c.name);
  }
  if (topicKey) parts.push(prettyTopic(topicKey));
  if (search?.trim()) parts.push(`"${search.trim()}"`);
  return parts.join(" · ");
}

function prettyTopic(key) {
  return key
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export { TOPIC_PATTERNS };

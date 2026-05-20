/** Extract vacancies / last date from titles when DB fields are empty. */

const VACANCY_PATTERNS = [
  /[–—\-]\s*([\d,]+)\s*(?:posts?|vacanc(?:ies|y)|bharti)\b/i,
  /\b([\d,]+)\s+(?:posts?|vacanc(?:ies|y))\s+(?:of|for)\b/i,
  /(?:notice|addendum|advertisement|recruitment)[:\s]+([\d,]+)\s+posts?\b/i,
  /:\s*([\d,]+)\s+posts?\s+of\b/i,
  /\b([\d,]+)\s+posts?\s+of\b/i,
];

const LAST_DATE_PATTERNS = [
  // Range — use closing date
  {
    re: /(\d{1,2})[./\s-](\d{1,2})[./\s-](\d{4})\s*(?:TO|–|—|-)\s*(\d{1,2})[./\s-](\d{1,2})[./\s-](\d{4})/i,
    pick: (m) => [m[4], m[5], m[6]],
  },
  {
    re: /(?:extended\s+)?(?:upto|until|up\s+to|by)\s+(\d{1,2})[./-](\d{1,2})[./-](\d{4})/i,
    pick: (m) => [m[1], m[2], m[3]],
  },
  {
    re: /(?:last\s*date|apply\s+(?:by|before|till)|closing\s+date)[:\s]+(\d{1,2})[./-](\d{1,2})[./-](\d{4})/i,
    pick: (m) => [m[1], m[2], m[3]],
  },
  {
    re: /dated\s+(\d{1,2})[.\s/-](\d{1,2})[.\s/-](\d{4})/i,
    pick: (m) => [m[1], m[2], m[3]],
  },
  {
    re: /\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b/,
    pick: (m) => [m[1], m[2], m[3]],
  },
];

function parseIntVacancy(raw) {
  const n = parseInt(String(raw || '').replace(/,/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** @param {string} [d] @param {string} [m] @param {string} [y] */
function toIsoDate(d, m, y) {
  const day = parseInt(d, 10);
  const mon = parseInt(m, 10);
  const year = parseInt(y, 10);
  if (!day || !mon || !year || year < 2000 || year > 2100) return null;
  if (mon < 1 || mon > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function extractVacanciesFromTitle(title) {
  const t = String(title || '');
  for (const re of VACANCY_PATTERNS) {
    const m = t.match(re);
    if (m) {
      const n = parseIntVacancy(m[1]);
      if (n) return n;
    }
  }
  return 0;
}

export function extractLastDateFromTitle(title) {
  const t = String(title || '');
  for (const { re, pick } of LAST_DATE_PATTERNS) {
    const m = t.match(re);
    if (m) {
      const [d, mo, y] = pick(m);
      const iso = toIsoDate(d, mo, y);
      if (iso) return iso;
    }
  }
  return null;
}

export function normalizeIsoDate(value) {
  if (!value || value === '—') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/** Merge DB fields with title/detail fallbacks for display. */
export function enrichJobMetadata(job) {
  const title = job?.title || '';
  let vacancies = Number(job?.vacancies) || 0;

  if (!vacancies && Array.isArray(job?.posts) && job.posts.length) {
    vacancies = job.posts.reduce((s, p) => s + (Number(p.vacancies) || 0), 0);
  }
  if (!vacancies) {
    vacancies = extractVacanciesFromTitle(title);
  }

  let lastDate = job?.lastDate;
  if (!lastDate || lastDate === '—') {
    lastDate =
      extractLastDateFromTitle(title) ||
      normalizeIsoDate(job?.last_date) ||
      null;
  } else {
    lastDate = normalizeIsoDate(lastDate) || lastDate;
  }

  const publishedDate =
    normalizeIsoDate(job?.publishedDate) ||
    normalizeIsoDate(job?.published_at) ||
    normalizeIsoDate(job?.detail?.published) ||
    null;

  return {
    ...job,
    vacancies,
    lastDate: lastDate || '—',
    publishedDate,
    _metaFromTitle: Boolean(
      (!Number(job?.vacancies) && vacancies > 0) ||
        ((job?.lastDate === '—' || !job?.lastDate) && lastDate && lastDate !== '—')
    ),
  };
}

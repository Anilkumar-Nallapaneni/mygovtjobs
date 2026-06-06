import { isBlockedAggregatorHost, isPdfUrl } from "@/utils/officialDomains";
import type { DetailLink } from "@/utils/jobDetailStructured";

const APPLY_LABEL_RE =
  /apply\s*online|apply\s*here|apply\s*now|registration|register|candidate\s*login|recruitment\s*portal|official\s*website/i;
const APPLY_PATH_RE = /\/(apply|registration|register|login|recruit|career|careers|vacancy|vacancies|advt|notification|jobs|job)/i;
const URL_IN_TEXT_RE = /https?:\/\/[^\s<>"')\]]+/gi;

function cleanText(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function extractUrlsFromText(value: unknown): string[] {
  const text = cleanText(value);
  if (!text) return [];
  return (text.match(URL_IN_TEXT_RE) || []).map((url) => url.replace(/[.,;]+$/, ""));
}

export function normalizeDetailUrl(url: unknown): string | null {
  const raw = cleanText(url);
  if (!raw || raw === "#") return null;
  try {
    const parsed = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    if (isBlockedAggregatorHost(parsed.href)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function labelForUrl(url: string, label?: string) {
  const text = cleanText(label);
  if (text && !/^click here$/i.test(text)) return text;
  if (isPdfUrl(url)) return "Download Notification PDF";
  if (APPLY_LABEL_RE.test(text)) return text;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return `Visit ${host}`;
  } catch {
    return "Official Link";
  }
}

export function dedupeDetailLinks(links: DetailLink[]): DetailLink[] {
  const seen = new Set<string>();
  const out: DetailLink[] = [];
  for (const link of links) {
    const url = normalizeDetailUrl(link.url);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ label: labelForUrl(url, link.label), url });
  }
  return out;
}

function scoreApplyLink(link: DetailLink): number {
  const { url, label } = link;
  let score = 0;
  if (isPdfUrl(url)) score -= 100;
  if (APPLY_LABEL_RE.test(label)) score += 40;
  if (APPLY_PATH_RE.test(url)) score += 35;
  if (/official\s*website|visit\s+/i.test(label)) score += 12;
  if (/notification|pdf|download/i.test(label)) score -= 20;
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/$/, "") || "/";
    if (path !== "/") score += 8;
    if (/\.(gov|nic|ac|org|res)\.in$/i.test(parsed.hostname)) score += 4;
  } catch {
    /* ignore */
  }
  return score;
}

function pushLink(candidates: DetailLink[], url: unknown, label?: string) {
  const normalized = normalizeDetailUrl(url);
  if (!normalized) return;
  candidates.push({ label: labelForUrl(normalized, label), url: normalized });
}

/** Collect every usable outbound link on a job row (detail panel — import-trusted, not strict official filter). */
export function collectDetailLinksFromJob(job: Record<string, unknown> | null | undefined): DetailLink[] {
  if (!job) return [];
  const detail = (job.detail && typeof job.detail === "object" ? job.detail : {}) as Record<
    string,
    unknown
  >;
  const candidates: DetailLink[] = [];

  const sections = Array.isArray(detail.content_sections) ? detail.content_sections : [];

  for (const section of sections) {
    const s = section as {
      links?: Array<{ label?: string; url?: string }>;
      paragraphs?: unknown[];
      lists?: unknown[];
    };
    for (const link of s.links || []) {
      pushLink(candidates, link.url, link.label);
    }
    for (const paragraph of s.paragraphs || []) {
      for (const url of extractUrlsFromText(paragraph)) {
        pushLink(candidates, url, "Official Website");
      }
    }
    for (const list of s.lists || []) {
      if (!Array.isArray(list)) continue;
      for (const item of list) {
        for (const url of extractUrlsFromText(item)) {
          pushLink(candidates, url, "Official Website");
        }
      }
    }
  }

  for (const key of ["apply_links", "links"]) {
    const list = detail[key];
    if (Array.isArray(list)) {
      for (const item of list) {
        if (typeof item === "string") {
          pushLink(candidates, item, "Apply Online");
        } else if (item && typeof item === "object") {
          const row = item as { label?: string; url?: string; text?: string };
          pushLink(candidates, row.url, row.label || row.text || "Apply Online");
        }
      }
    }
  }

  pushLink(candidates, job.apply_url, "Apply Online");
  pushLink(candidates, job.applyUrl, "Apply Online");
  pushLink(candidates, job.officialUrl, "Official Website");
  pushLink(candidates, detail.notification_url, "Official Website");
  pushLink(candidates, job.pdf_url, "Download Notification PDF");
  pushLink(candidates, job.pdfUrl, "Download Notification PDF");
  pushLink(candidates, detail.pdf_url, "Download Notification PDF");
  pushLink(candidates, detail.pdfUrl, "Download Notification PDF");

  for (const key of ["pdf_urls", "pdfUrls"]) {
    const list = detail[key];
    if (Array.isArray(list)) {
      for (const item of list) pushLink(candidates, item, "Download Notification PDF");
    }
  }

  const pdfList = job.pdfUrls;
  if (Array.isArray(pdfList)) {
    for (const item of pdfList) pushLink(candidates, item, "Download Notification PDF");
  }

  for (const key of ["howApply", "documents_required"]) {
    const list = job[key] ?? detail[key];
    if (Array.isArray(list)) {
      for (const item of list) {
        for (const url of extractUrlsFromText(item)) {
          pushLink(candidates, url, "Official Website");
        }
      }
    }
  }

  return dedupeDetailLinks(candidates);
}

/** Primary outbound URL for cards — best portal/apply page, never a PDF when HTML exists. */
export function resolveTrustedApplyHref(job: Record<string, unknown> | null | undefined): string | null {
  const links = collectDetailLinksFromJob(job);
  const portals = links.filter((l) => !isPdfUrl(l.url));
  if (!portals.length) return null;
  const best = [...portals].sort((a, b) => scoreApplyLink(b) - scoreApplyLink(a))[0];
  return best?.url || null;
}

export function resolveTrustedPdfHref(job: Record<string, unknown> | null | undefined): string | null {
  const links = collectDetailLinksFromJob(job);
  return links.find((l) => isPdfUrl(l.url))?.url || null;
}

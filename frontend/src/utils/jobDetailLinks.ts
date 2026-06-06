import { isBlockedAggregatorHost, isPdfUrl } from "@/utils/officialDomains";
import type { DetailLink } from "@/utils/jobDetailStructured";

function cleanText(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
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

/** Collect every usable outbound link on a job row (detail panel — import-trusted, not strict official filter). */
export function collectDetailLinksFromJob(job: Record<string, unknown> | null | undefined): DetailLink[] {
  if (!job) return [];
  const detail = (job.detail && typeof job.detail === "object" ? job.detail : {}) as Record<
    string,
    unknown
  >;
  const candidates: DetailLink[] = [];

  const push = (url: unknown, label?: string) => {
    const normalized = normalizeDetailUrl(url);
    if (!normalized) return;
    candidates.push({ label: labelForUrl(normalized, label), url: normalized });
  };

  push(job.apply_url, "Apply Online");
  push(job.applyUrl, "Apply Online");
  push(job.pdf_url, "Download Notification PDF");
  push(job.pdfUrl, "Download Notification PDF");
  push(detail.pdf_url, "Download Notification PDF");
  push(detail.pdfUrl, "Download Notification PDF");
  push(detail.notification_url, "Official Notification");

  for (const key of ["pdf_urls", "pdfUrls"]) {
    const list = detail[key];
    if (Array.isArray(list)) {
      for (const item of list) push(item, "Download Notification PDF");
    }
  }

  const sections = Array.isArray(detail.content_sections) ? detail.content_sections : [];
  for (const section of sections) {
    const links = (section as { links?: Array<{ label?: string; url?: string }> }).links || [];
    for (const link of links) {
      push(link.url, link.label);
    }
  }

  return dedupeDetailLinks(candidates);
}

/** Primary outbound URL for cards — portal first, then PDF. Import-trusted (not strict .gov.in only). */
export function resolveTrustedApplyHref(job: Record<string, unknown> | null | undefined): string | null {
  const links = collectDetailLinksFromJob(job);
  const portal = links.find((l) => !isPdfUrl(l.url));
  if (portal) return portal.url;
  return links[0]?.url || null;
}

export function resolveTrustedPdfHref(job: Record<string, unknown> | null | undefined): string | null {
  const links = collectDetailLinksFromJob(job);
  return links.find((l) => isPdfUrl(l.url))?.url || null;
}

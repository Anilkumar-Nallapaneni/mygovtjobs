/**
 * Fetches allowed official RSS/Atom feeds, dedupes by link, extracts PDF URLs from HTML bodies.
 *
 * Usage: npm run fetch:official
 * Output: public/data/official-feed-items.json
 *
 * Extend scripts/official-sources.json with more feeds (state PSC / ministry RSS where published).
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Parser from "rss-parser";
import { DEFAULT_LOOKBACK_DAYS, filterByLookback, isWithinLookback, parseDaysArg } from "./lib/lookback.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CONFIG_PATH = join(__dirname, "official-sources.json");
const OUT_DIR = join(ROOT, "frontend", "public", "data");
const OUT_FILE = join(OUT_DIR, "official-feed-items.json");

function stableId(link) {
  return createHash("sha256").update(String(link || "").trim()).digest("hex").slice(0, 16);
}

function extractPdfUrls(html) {
  if (!html || typeof html !== "string") return [];
  const re = /https?:\/\/[^\s"'<>]+\.pdf/gi;
  const found = html.match(re) || [];
  return [...new Set(found.map((u) => u.replace(/&amp;/g, "&")))].slice(0, 8);
}

function parseDate(iso) {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

async function main() {
  const raw = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
  const lookbackDays = parseDaysArg(process.argv, Number(raw.lookbackDays) || DEFAULT_LOOKBACK_DAYS);
  const userAgent = raw.userAgent || "GovJobAlertFetcher/1.0";
  const feeds = Array.isArray(raw.feeds) ? raw.feeds : [];
  console.log(`Lookback window: ${lookbackDays} days`);

  const parser = new Parser({
    timeout: 25000,
    headers: {
      "User-Agent": userAgent,
      Accept: "application/rss+xml, application/xml, text/xml, */*",
      "Accept-Language": "en-IN,en;q=0.9",
    },
    maxRedirects: 5,
  });

  async function loadFeedXml(feedUrl) {
    const res = await fetch(feedUrl, {
      redirect: "follow",
      headers: {
        "User-Agent": userAgent,
        Accept: "application/rss+xml, application/xml, text/xml, */*",
        "Accept-Language": "en-IN,en;q=0.9",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  }

  const sourceReports = [];
  const byLink = new Map();

  for (const f of feeds) {
    const id = f.id || f.feedUrl;
    const report = { id, name: f.name || id, feedUrl: f.feedUrl, ok: false, error: null, itemCount: 0 };
    sourceReports.push(report);
    if (!f.feedUrl) {
      report.error = "missing feedUrl";
      continue;
    }
    const titleRe = f.titleMustMatch ? new RegExp(f.titleMustMatch, "i") : null;
    const maxItems = Math.min(300, Math.max(1, Number(f.maxItems) || 80));
    const scanLimit = Math.min(500, maxItems * 4);

    try {
      const xml = await loadFeedXml(f.feedUrl);
      const feed = await parser.parseString(xml);
      const items = feed.items || [];
      let taken = 0;
      for (const it of items.slice(0, scanLimit)) {
        if (taken >= maxItems) break;
        const title = (it.title || "").trim();
        const link = (it.link || it.guid || "").toString().trim();
        if (!title || !link) continue;
        if (titleRe && !titleRe.test(title)) continue;

        const html = [it.content, it["content:encoded"], it.contentSnippet, it.summary].filter(Boolean).join("\n");
        const pdfUrls = extractPdfUrls(html);
        const publishedAt = parseDate(it.pubDate || it.isoDate);
        if (!isWithinLookback(publishedAt, lookbackDays, { includeUnknown: true })) continue;

        const row = {
          id: stableId(link),
          title,
          link,
          publishedAt,
          summary: (it.contentSnippet || it.summary || "").toString().replace(/\s+/g, " ").trim().slice(0, 400) || null,
          pdfUrls,
          sourceId: id,
          sourceName: f.name || id,
          dept: f.dept || feed.title || id,
          state: f.state || "All India",
        };

        if (!byLink.has(link)) byLink.set(link, row);
        taken++;
      }
      report.ok = true;
      report.itemCount = taken;
    } catch (e) {
      report.error = e instanceof Error ? e.message : String(e);
    }
  }

  const items = filterByLookback([...byLink.values()], lookbackDays).sort((a, b) => {
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return tb - ta;
  });

  mkdirSync(OUT_DIR, { recursive: true });
  const payload = {
    generatedAt: new Date().toISOString(),
    sourceReports,
    items,
  };
  writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Wrote ${items.length} deduped items to ${OUT_FILE}`);
  for (const r of sourceReports) {
    console.log(`  [${r.ok ? "ok" : "fail"}] ${r.name}: ${r.itemCount} kept${r.error ? ` — ${r.error}` : ""}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Fetches RSS feeds + officialSites.js portals → official-feed-items.json + live-jobs.json
 *
 * Usage: npm run fetch:official [-- --limit=25]
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Parser from "rss-parser";
import { fetchOfficialSiteItems } from "./fetch-official-sites.mjs";
import {
  extractPdfUrls,
  FEED_FILE,
  LIVE_JOBS_FILE,
  mergeFeedItems,
  parseDate,
  stableId,
  writeOfficialPayload,
} from "./lib/official-feed-utils.mjs";
import { DEFAULT_LOOKBACK_DAYS, isWithinLookback, parseDaysArg } from "./lib/lookback.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RSS_CONFIG = join(__dirname, "official-sources.json");

export async function fetchRssItems(options = {}) {
  const raw = JSON.parse(readFileSync(RSS_CONFIG, "utf8"));
  const lookbackDays = options.lookbackDays ?? Number(raw.lookbackDays) ?? DEFAULT_LOOKBACK_DAYS;
  const userAgent = raw.userAgent || "GovJobAlertFetcher/1.0";
  const feeds = Array.isArray(raw.feeds) ? raw.feeds : [];
  const parser = new Parser({
    timeout: 25000,
    headers: { "User-Agent": userAgent },
    maxRedirects: 5,
  });

  const sourceReports = [];
  const items = [];

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
      const res = await fetch(f.feedUrl, {
        redirect: "follow",
        headers: {
          "User-Agent": userAgent,
          Accept: "application/rss+xml, application/xml, text/xml, */*",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const feed = await parser.parseString(await res.text());
      let taken = 0;
      for (const it of (feed.items || []).slice(0, scanLimit)) {
        if (taken >= maxItems) break;
        const title = (it.title || "").trim();
        const link = (it.link || it.guid || "").toString().trim();
        if (!title || !link) continue;
        if (titleRe && !titleRe.test(title)) continue;
        const publishedAt = parseDate(it.pubDate || it.isoDate);
        if (!isWithinLookback(publishedAt, lookbackDays, { includeUnknown: true })) continue;
        const html = [it.content, it["content:encoded"], it.summary].filter(Boolean).join("\n");
        items.push({
          id: stableId(link),
          title,
          link,
          publishedAt: parseDate(it.pubDate || it.isoDate),
          summary: (it.contentSnippet || it.summary || "").toString().replace(/\s+/g, " ").trim().slice(0, 400) || null,
          pdfUrls: extractPdfUrls(html),
          sourceId: id,
          sourceName: f.name || id,
          dept: f.dept || id,
          state: f.state || "All India",
          category: f.category || null,
          stateIds: f.stateIds || ["all"],
          fetchMethod: "rss-feed",
        });
        taken++;
      }
      report.ok = true;
      report.itemCount = taken;
    } catch (e) {
      report.error = e instanceof Error ? e.message : String(e);
    }
    console.log(`  [${report.ok ? "ok" : "fail"}] RSS ${report.name}: ${report.itemCount}${report.error ? ` — ${report.error}` : ""}`);
  }

  return { sourceReports, items };
}

async function main() {
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const cliLimit = limitArg ? Number(limitArg.split("=")[1]) : undefined;
  const lookbackDays = parseDaysArg(process.argv, DEFAULT_LOOKBACK_DAYS);

  console.log(`=== Notifications from last ${lookbackDays} days ===`);
  console.log("\n=== RSS feeds (official-sources.json) ===");
  const rss = await fetchRssItems({ lookbackDays });

  console.log("\n=== Official portals (officialSites.js) ===");
  const sites = await fetchOfficialSiteItems(
    cliLimit != null ? { maxSites: cliLimit, lookbackDays } : { lookbackDays }
  );

  const merged = mergeFeedItems(rss.items, sites.items);
  writeOfficialPayload({
    items: merged,
    sourceReports: rss.sourceReports,
    siteReports: sites.siteReports,
  });

  console.log(`\nWrote ${merged.length} items →`);
  console.log(`  ${FEED_FILE}`);
  console.log(`  ${LIVE_JOBS_FILE}`);
}

const isDirectRun = process.argv[1]?.includes("fetch-all-official.mjs");
if (isDirectRun) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

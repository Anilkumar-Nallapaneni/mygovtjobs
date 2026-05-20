/**
 * Quick HEAD/GET audit of officialSites.js URLs — writes scripts/data/site-audit.json
 * Usage: node scripts/audit-official-sites.mjs [--limit=20]
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { OFFICIAL_SITES } from "../frontend/src/data/officialSites.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "data", "site-audit.json");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

async function probe(url) {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(18000),
      headers: { "User-Agent": UA, Accept: "text/html,*/*" },
    });
    const text = await res.text();
    return {
      status: res.status,
      ok: res.ok,
      finalUrl: res.url,
      bytes: text.length,
      hasRss: /type=["']application\/rss\+xml/i.test(text) || /rel=["']alternate["'][^>]+rss/i.test(text),
    };
  } catch (e) {
    return { status: 0, ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function main() {
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : 0;
  let sites = [...OFFICIAL_SITES];
  if (limit > 0) sites = sites.slice(0, limit);

  const results = [];
  for (const s of sites) {
    const latest = await probe(s.latestUrl || s.url);
    const home = s.url !== s.latestUrl ? await probe(s.url) : null;
    results.push({
      id: s.id,
      name: s.name,
      latestUrl: s.latestUrl,
      latest,
      home,
    });
    const tag = latest.ok ? "ok" : "FAIL";
    console.log(`[${tag}] ${s.id} ${latest.status} ${latest.error || latest.finalUrl || s.latestUrl}`);
    await new Promise((r) => setTimeout(r, 300));
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
  const failed = results.filter((r) => !r.latest.ok);
  console.log(`\n${failed.length}/${results.length} latestUrl failures → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

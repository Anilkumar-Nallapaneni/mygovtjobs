/**
 * Fills scripts/trees/flats/{lang}.json from en.json via Google Translate.
 * Usage: node scripts/fill-locale-flats.mjs [te] [ta] ...
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { countFilled, toFlat } from "./i18n-en-flat.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const FLATS_DIR = path.join(__dirname, "trees/flats");
const en = JSON.parse(fs.readFileSync(path.join(root, "src/i18n/locales/en.json"), "utf8"));
const enFlat = toFlat(en);

const TARGETS = {
  bn: "bn",
  te: "te",
  ta: "ta",
  gu: "gu",
  kn: "kn",
  ml: "ml",
  pa: "pa",
  or: "or",
  ur: "ur",
  sat: "sat",
  mni: "mni",
  mr: "mr",
  as: "as",
};

const MIN_FILLED = 150;

function protectPlaceholders(text) {
  const slots = [];
  const safe = text.replace(/\{[a-zA-Z_][\w]*\}/g, (m) => {
    const token = `__PH_${slots.length}__`;
    slots.push([token, m]);
    return token;
  });
  return { safe, slots };
}

function restorePlaceholders(text, slots) {
  let out = text;
  for (const [token, original] of slots) {
    out = out.split(token).join(original);
  }
  return out;
}

async function translate(text, tl) {
  if (!text?.trim()) return text;
  const { safe, slots } = protectPlaceholders(text);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${tl}&dt=t&q=${encodeURIComponent(safe)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return restorePlaceholders(
    json[0].map((x) => x[0]).join(""),
    slots
  );
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const paths = Object.keys(enFlat);
const only = process.argv.slice(2);
const langs = only.length ? only.filter((c) => TARGETS[c]) : Object.keys(TARGETS);

fs.mkdirSync(FLATS_DIR, { recursive: true });

for (const lang of langs) {
  const tl = TARGETS[lang];
  const outPath = path.join(FLATS_DIR, `${lang}.json`);
  let existing = {};
  try {
    existing = JSON.parse(fs.readFileSync(outPath, "utf8"));
  } catch {
    /* new */
  }

  const missingCount = paths.filter((p) => !existing[p]?.trim()).length;
  if (missingCount === 0) {
    console.log(`[${lang}] skip — all ${paths.length} strings present`);
    continue;
  }

  console.log(`\n[${lang}] → ${tl} (${missingCount} new of ${paths.length} strings)`);
  for (let i = 0; i < paths.length; i++) {
    const p = paths[i];
    if (existing[p]?.trim()) continue;
    try {
      existing[p] = await translate(enFlat[p], tl);
    } catch (e) {
      console.warn(`  skip ${p}:`, e.message);
      existing[p] = enFlat[p];
    }
    if (i % 20 === 0) {
      fs.writeFileSync(outPath, JSON.stringify(existing));
      process.stdout.write(`  ${i}/${paths.length}\r`);
    }
    await sleep(85);
  }
  fs.writeFileSync(outPath, JSON.stringify(existing, null, 2));
  console.log(`  wrote ${outPath} (${countFilled(existing)} strings)`);
}

console.log("\nDone. Run: npm run i18n:generate");

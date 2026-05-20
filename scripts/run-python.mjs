#!/usr/bin/env node
/**
 * Run a script with backend/.venv Python (works on Windows + macOS/Linux).
 * Usage: node scripts/run-python.mjs scripts/run-ingest-direct.py --limit 20
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";
const py = join(root, "backend", ".venv", isWin ? "Scripts/python.exe" : "bin/python");

if (!existsSync(py)) {
  console.error(`Python venv not found:\n  ${py}`);
  console.error("\nSetup once:");
  console.error("  cd backend");
  console.error("  python -m venv .venv");
  console.error(isWin ? "  .venv\\Scripts\\activate" : "  source .venv/bin/activate");
  console.error("  pip install -r requirements.txt");
  process.exit(1);
}

const args = process.argv.slice(2);
if (!args.length) {
  console.error("Usage: node scripts/run-python.mjs <script.py> [args…]");
  process.exit(1);
}

const result = spawnSync(py, args, { stdio: "inherit", cwd: root, env: process.env });
process.exit(result.status ?? 1);

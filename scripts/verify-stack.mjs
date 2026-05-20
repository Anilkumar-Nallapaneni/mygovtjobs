#!/usr/bin/env node
/**
 * Quick stack verification — run from repo root: npm run verify
 */
import { existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const checks = []

function ok(name, pass, detail = '') {
  checks.push({ name, pass, detail })
  const icon = pass ? '✓' : '✗'
  console.log(`${icon} ${name}${detail ? ` — ${detail}` : ''}`)
}

async function fetchOk(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
    return res.ok
  } catch {
    return false
  }
}

ok('frontend/src/App.jsx', existsSync(join(root, 'frontend/src/App.jsx')))
ok('frontend/public/india.svg', existsSync(join(root, 'frontend/public/india.svg')))
ok('frontend/src/hooks/useLiveJobs.js', existsSync(join(root, 'frontend/src/hooks/useLiveJobs.js')))
ok('frontend/src/lib/supabase.ts', existsSync(join(root, 'frontend/src/lib/supabase.ts')))
ok('frontend/public/data/live-jobs.json', existsSync(join(root, 'frontend/public/data/live-jobs.json')))

const envLocal = join(root, 'frontend/.env.local')
if (existsSync(envLocal)) {
  const text = readFileSync(envLocal, 'utf8')
  ok('VITE_SUPABASE_URL set', /VITE_SUPABASE_URL=\s*https:\/\//.test(text))
} else {
  ok('frontend/.env.local (optional)', false, 'copy from frontend/.env.example for Supabase')
}

ok('frontend node_modules', existsSync(join(root, 'frontend/node_modules')))

const devPort = 2222
if (await fetchOk(`http://localhost:${devPort}/`)) {
  const svg = await fetchOk(`http://localhost:${devPort}/india.svg`)
  ok(`Frontend http://localhost:${devPort}`, true)
  ok(`India map SVG :${devPort}`, svg)
  ok(`Live jobs JSON :${devPort}`, await fetchOk(`http://localhost:${devPort}/data/live-jobs.json`))
} else {
  ok(`Frontend http://localhost:${devPort}`, false, 'start: npm run dev')
}

const failed = checks.filter((c) => !c.pass).length
console.log(`\n${checks.length - failed}/${checks.length} checks passed`)
process.exit(failed > 0 ? 1 : 0)

#!/usr/bin/env node
/**
 * Push frontend env from frontend/.env.local to Vercel (production + preview).
 * Prereq: vercel login && vercel link
 *
 *   npm run vercel:env:push
 */
import { readFileSync, existsSync } from 'fs'
import { spawnSync } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = join(root, 'frontend', '.env.local')

function loadEnv(path) {
  if (!existsSync(path)) return {}
  const out = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 1) continue
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim()
  }
  return out
}

const local = loadEnv(envPath)
const url = local.VITE_SUPABASE_URL
const anon = local.VITE_SUPABASE_ANON_KEY

if (!url || !anon || url.includes('your-project')) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in frontend/.env.local')
  process.exit(1)
}

const jobsSource = process.env.VERCEL_JOBS_SOURCE || 'supabase'
const apiUrl = process.env.VERCEL_API_URL ?? ''

const pairs = [
  ['VITE_SUPABASE_URL', url],
  ['VITE_SUPABASE_ANON_KEY', anon],
  ['VITE_JOBS_SOURCE', jobsSource],
  // Omit empty API URL — Vercel CLI rejects --value ""
  ...(apiUrl ? [['VITE_API_URL', apiUrl]] : []),
]

function addOne(key, value, target) {
  const vercel = process.platform === 'win32' ? 'vercel.cmd' : 'vercel'
  const args = ['env', 'add', key, target, '--value', value, '--yes', '--force', '--no-sensitive', '--non-interactive']
  const r = spawnSync(vercel, args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], shell: true })
  if (r.stdout) process.stdout.write(r.stdout)
  if (r.stderr) process.stderr.write(r.stderr)
  if (r.status !== 0) {
    console.error(`Failed: vercel env add ${key} ${target} (exit ${r.status})`)
    if (r.stderr) console.error(String(r.stderr))
    process.exit(r.status || 1)
  }
  console.log(`  ✓ ${key} (${target})`)
}

console.log('Pushing env to linked Vercel project (production)…')
console.log('  VITE_JOBS_SOURCE =', jobsSource)
// Preview requires a git-branch in newer Vercel CLI; production is enough for --prod deploys.
for (const target of ['production']) {
  for (const [key, value] of pairs) {
    addOne(key, value, target)
  }
}
console.log('Tip: add Preview env in Vercel Dashboard → Settings → Environment Variables if needed.')
console.log('Done. Redeploy: vercel --prod')

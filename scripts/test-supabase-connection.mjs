#!/usr/bin/env node
/**
 * Test Supabase REST + optional backend DB.
 * Run from repo root: node scripts/test-supabase-connection.mjs
 */
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

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

const fe = loadEnv(join(root, 'frontend/.env.local'))
const url = fe.VITE_SUPABASE_URL
const anon = fe.VITE_SUPABASE_ANON_KEY

if (!url || !anon || url.includes('your-project')) {
  console.error('✗ Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in frontend/.env.local')
  process.exit(1)
}

console.log('Project:', url)

const headers = {
  apikey: anon,
  Authorization: `Bearer ${anon}`,
}

async function rest(path) {
  const res = await fetch(`${url}/rest/v1/${path}`, { headers })
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = text.slice(0, 200)
  }
  return { ok: res.ok, status: res.status, body }
}

const health = await fetch(`${url}/rest/v1/`, { headers })
console.log(health.ok ? '✓ REST API reachable' : `✗ REST ${health.status}`)

const jobs = await rest('jobs?select=id,title,status&status=eq.live&limit=3')
if (jobs.status === 404 || (typeof jobs.body === 'object' && jobs.body?.code === 'PGRST205')) {
  console.log('✗ Table `jobs` not found — run database/supabase_setup.sql in SQL Editor')
} else if (jobs.status === 401 || jobs.status === 403) {
  console.log(`✗ jobs query ${jobs.status} — check RLS policies and anon grants`)
  console.log('  ', JSON.stringify(jobs.body))
} else if (jobs.ok) {
  const n = Array.isArray(jobs.body) ? jobs.body.length : 0
  console.log(`✓ jobs table OK (${n} sample row(s) returned)`)
  if (n > 0) console.log('  ', jobs.body.map((r) => r.title).join(' | '))
} else {
  console.log(`✗ jobs query ${jobs.status}:`, jobs.body)
}

process.exit(jobs.ok || jobs.status === 200 ? 0 : 1)

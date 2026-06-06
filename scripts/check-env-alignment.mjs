#!/usr/bin/env node
/**
 * Verify frontend and backend env files reference the same Supabase project.
 * Run: npm run env:check
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

function projectRef(url) {
  const m = String(url || '').match(/https:\/\/([^.]+)\.supabase\.co/)
  return m ? m[1] : null
}

function dbRef(databaseUrl) {
  const m = String(databaseUrl || '').match(/postgres(?:ql\+asyncpg)?:\/\/postgres\.([^:/]+)/)
  return m ? m[1] : null
}

const fe = loadEnv(join(root, 'frontend/.env.local'))
const be = loadEnv(join(root, 'backend/.env'))

const feRef = projectRef(fe.VITE_SUPABASE_URL)
const beUrlRef = projectRef(be.SUPABASE_URL)
const beDbRef = dbRef(be.DATABASE_URL)

let ok = true

function check(name, pass, detail = '') {
  const icon = pass ? '✓' : '✗'
  console.log(`${icon} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!pass) ok = false
}

check('frontend/.env.local exists', existsSync(join(root, 'frontend/.env.local')))
check('backend/.env exists', existsSync(join(root, 'backend/.env')))
check('VITE_SUPABASE_URL set', Boolean(feRef), feRef || 'copy frontend/.env.example')
check('SUPABASE_URL set', Boolean(beUrlRef), beUrlRef || 'copy backend/.env.example')
check('DATABASE_URL set', Boolean(beDbRef), beDbRef || 'set pooler URI in backend/.env')

if (feRef && beUrlRef) {
  check('Supabase project ref matches (URL)', feRef === beUrlRef, `${feRef} vs ${beUrlRef}`)
}
if (feRef && beDbRef) {
  check('Supabase project ref matches (DB)', feRef === beDbRef, `${feRef} vs ${beDbRef}`)
}

if (fe.VITE_SUPABASE_ANON_KEY?.includes('service_role')) {
  check('anon key is not service_role', false, 'use anon/public key in frontend only')
}

console.log(ok ? '\nEnv alignment OK' : '\nFix mismatched env files before ingest/deploy')
process.exit(ok ? 0 : 1)

import { useEffect, useMemo, useState } from 'react'
import { ALL_JOBS } from '@/data/jobs'
import { fetchJobsFromApi, fetchJobsFromJson } from '@/lib/jobsApi'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import { adaptLiveJob, mergeJobs } from '@/utils/liveJobAdapter'
import { filterActiveJobs } from '@/utils/jobFilters'

const RECRUIT_RE =
  /recruit|vacanc|notif|advert|exam|bharti|apply|post|constable|group[\s-]*[i1-4]|cgl|ntpc|psc|ssc|upsc|railway|bank|police|teacher|defence|apprentice|walk-?in|selection|appointment/i
/** Nav/menu links scraped from portals — not job listings. */
const NOISE_TITLE_RE =
  /^(careers?|tenders?|contact(\s+us)?|login|sign\s*up|privacy|sitemap|gallery|tourism|about\s+us|governing\s+board|policies|rules|guidelines|circulars\s+withdrawn|home|news\s*&\s*events)$/i
const MAX_LIVE_ROWS = 1500
const SUPABASE_PAGE = 500
/** Demo rows from database/supabase_setup.sql — hide when real ingest data is present. */
const DEMO_SLUG_PREFIX = /^demo-/

function isUsefulLiveRow(row, { strict = false } = {}) {
  const title = String(row?.title || '').trim()
  if (!title || title.length < 6) return false
  if (/^\{\{.*\}\}$/.test(title)) return false
  if (/translate\s*\}\}/i.test(title)) return false
  if (NOISE_TITLE_RE.test(title)) return false
  if (/reach out to|contact us|privacy policy|sitemap|login|gallery|tourism/i.test(title)) return false
  const status = String(row?.status || '').toLowerCase()
  if (status === 'expired' || status === 'draft') return false

  if (!strict) {
    if (row.apply_url) return true
    if (title.length >= 10 && !NOISE_TITLE_RE.test(title)) return true
  }
  return RECRUIT_RE.test(title) || RECRUIT_RE.test(String(row?.dept || ''))
}

function scoreLiveRow(row) {
  const title = String(row?.title || '')
  let score = 0
  if (RECRUIT_RE.test(title)) score += 3
  if (Number(row?.vacancies) > 0) score += 2
  if (row?.last_date) score += 1
  if (Array.isArray(row?.state_codes) && row.state_codes.length) score += 1
  return score
}

function dedupeLiveRows(rows, { strictFilter = false } = {}) {
  const seen = new Set()
  const out = []
  const sorted = [...rows].sort((a, b) => scoreLiveRow(b) - scoreLiveRow(a))
  for (const row of sorted) {
    if (!isUsefulLiveRow(row, { strict: strictFilter })) continue
    const slug = String(row?.slug || row?.id || '').trim()
    if (!slug) continue
    const key = slug.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(row)
    if (out.length >= MAX_LIVE_ROWS) break
  }
  return out
}

async function fetchJobsFromSupabase() {
  const supabase = getSupabase()
  if (!supabase) return []

  const select =
    'id,slug,title,dept,category,state_codes,vacancies,qualification,salary,age_limit,last_date,apply_url,status,published_at,detail'

  const today = new Date().toISOString().slice(0, 10)
  const all = []
  for (let offset = 0; offset < MAX_LIVE_ROWS; offset += SUPABASE_PAGE) {
    const { data, error } = await supabase
      .from('jobs')
      .select(select)
      .eq('status', 'live')
      .or(`last_date.is.null,last_date.gte.${today}`)
      .order('published_at', { ascending: false })
      .range(offset, offset + SUPABASE_PAGE - 1)

    if (error) {
      console.warn('[useLiveJobs] Supabase:', error.message)
      break
    }
    if (!data?.length) break
    all.push(...data)
    if (data.length < SUPABASE_PAGE) break
  }
  return all
}

/**
 * Live jobs from Supabase / API / JSON. Demo catalog used only when no live backend data.
 * Expired listings are never shown.
 */
export function useLiveJobs() {
  const [liveRows, setLiveRows] = useState([])
  const [sources, setSources] = useState(['static'])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [apiRows, jsonRows, supaRows] = await Promise.all([
          fetchJobsFromApi({ limit: 1000 }),
          fetchJobsFromJson(),
          isSupabaseConfigured() ? fetchJobsFromSupabase() : Promise.resolve([]),
        ])

        const active = []
        const liveRaw = []

        if (supaRows.length) {
          active.push('supabase')
          const real = supaRows.filter(
            (r) =>
              !DEMO_SLUG_PREFIX.test(String(r.slug || '')) &&
              (r.detail?.source || '') !== 'demo'
          )
          liveRaw.push(...(real.length ? real : supaRows))
        }
        if (apiRows.length) {
          active.push('api')
          liveRaw.push(...apiRows.filter((r) => r.status === 'live'))
        }
        if (jsonRows.length) {
          active.push('official-sites')
          liveRaw.push(...jsonRows.filter((r) => !r.status || r.status === 'live'))
        }
        if (!active.length) active.push('static')

        const fromBackend = active.includes('supabase') || active.includes('api')
        const rows = dedupeLiveRows(liveRaw, { strictFilter: !fromBackend }).map(adaptLiveJob)

        if (!cancelled) {
          setLiveRows(rows)
          setSources(active)
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load live jobs')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const hasBackend = sources.includes('api') || sources.includes('supabase')
  const displayJobs = useMemo(() => {
    const adapted = filterActiveJobs(liveRows)
    if (hasBackend && adapted.length > 0) return adapted
    if (adapted.length > 0) return filterActiveJobs(mergeJobs([], adapted))
    return filterActiveJobs(mergeJobs(ALL_JOBS, []))
  }, [liveRows, hasBackend])

  return {
    jobs: displayJobs,
    liveRows,
    source: sources.join('+'),
    sources,
    loading,
    error,
    staticCount: ALL_JOBS.length,
    liveCount: hasBackend ? displayJobs.length : liveRows.length,
    hasBackend,
  }
}

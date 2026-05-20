import { useEffect, useMemo, useState } from 'react'
import { ALL_JOBS } from '@/data/jobs'
import { fetchJobsFromApi, fetchJobsFromJson } from '@/lib/jobsApi'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import { adaptLiveJob, mergeJobs } from '@/utils/liveJobAdapter'
import { filterDisplayJobs } from '@/utils/jobFilters'
import { isPortalNoiseJob } from '@/utils/jobNoiseFilter'

const RECRUIT_RE =
  /recruit|vacanc|notif|advert|exam|bharti|apply|post|constable|group[\s-]*[i1-4]|cgl|ntpc|psc|ssc|upsc|railway|bank|police|teacher|defence|apprentice|walk-?in|selection|appointment/i
const NOISE_TITLE_RE =
  /^(careers?|tenders?|contact(\s+us)?|login|sign\s*up|privacy|sitemap|gallery|tourism|about\s+us|governing\s+board|policies|rules|guidelines|circulars\s+withdrawn|home|news\s*&\s*events)$/i

const MAX_LIVE_ROWS = 800
const SUPABASE_PAGE = 400
const JSON_CAP = 800
const DEMO_SLUG_PREFIX = /^demo-/

let CACHE = null
let INFLIGHT = null

function isUsefulLiveRow(row, { strict = false } = {}) {
  const title = String(row?.title || '').trim()
  if (!title || title.length < 6) return false
  if (isPortalNoiseJob(row)) return false
  if (/^\{\{.*\}\}$/.test(title)) return false
  if (/translate\s*\}\}/i.test(title)) return false
  if (NOISE_TITLE_RE.test(title)) return false
  if (/reach out to|contact us|privacy policy|sitemap|login|gallery|tourism/i.test(title)) return false
  if (String(row?.status || '').toLowerCase() === 'draft') return false

  if (!strict) {
    if (Number(row?.vacancies) > 0) return true
    if (row?.last_date) return true
    if (RECRUIT_RE.test(title) && title.length >= 18) return true
    if (title.length >= 28 && RECRUIT_RE.test(title)) return true
  }
  return RECRUIT_RE.test(title) || RECRUIT_RE.test(String(row?.dept || ''))
}

function scoreLiveRow(row) {
  const title = String(row?.title || '')
  let score = 0
  if (isPortalNoiseJob(row)) score -= 10
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
    if (!isUsefulLiveRow(row, { strictFilter })) continue
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

  const all = []
  for (let offset = 0; offset < MAX_LIVE_ROWS; offset += SUPABASE_PAGE) {
    const { data, error } = await supabase
      .from('jobs')
      .select(select)
      .in('status', ['live', 'expired'])
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

async function loadJobsPayload() {
  if (isSupabaseConfigured()) {
    const supaRows = await fetchJobsFromSupabase()
    const real = supaRows.filter(
      (r) =>
        !DEMO_SLUG_PREFIX.test(String(r.slug || '')) &&
        (r.detail?.source || '') !== 'demo'
    )
    if (real.length) {
      return {
        raw: real,
        sources: ['supabase'],
        hasBackend: true,
        error: null,
        strictFilter: true,
      }
    }
  }

  const apiResult = await fetchJobsFromApi({ limit: MAX_LIVE_ROWS })
  if (apiResult.items.length && !apiResult.degraded) {
    return {
      raw: apiResult.items.filter((r) => r.status !== 'draft'),
      sources: ['api'],
      hasBackend: true,
      error: null,
      strictFilter: true,
    }
  }

  const jsonRows = await fetchJobsFromJson()
  if (jsonRows.length) {
    return {
      raw: jsonRows.slice(0, JSON_CAP).filter((r) => !r.status || r.status !== 'draft'),
      sources: ['official-sites'],
      hasBackend: true,
      error: apiResult.degraded ? 'Job database temporarily unavailable' : null,
      strictFilter: false,
    }
  }

  if (apiResult.degraded) {
    return { raw: [], sources: ['static'], hasBackend: false, error: 'Job database temporarily unavailable', strictFilter: false }
  }

  return { raw: [], sources: ['static'], hasBackend: false, error: null, strictFilter: false }
}

export function useLiveJobs() {
  const [liveRows, setLiveRows] = useState(CACHE?.rows || [])
  const [sources, setSources] = useState(CACHE?.sources || ['static'])
  const [loading, setLoading] = useState(!CACHE)
  const [error, setError] = useState(CACHE?.error || null)
  const [hasBackend, setHasBackend] = useState(Boolean(CACHE?.hasBackend))

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      if (CACHE?.rows) {
        setLiveRows(CACHE.rows)
        setSources(CACHE.sources)
        setHasBackend(CACHE.hasBackend)
        setError(CACHE.error)
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      try {
        if (!INFLIGHT) {
          INFLIGHT = loadJobsPayload().finally(() => {
            INFLIGHT = null
          })
        }
        const payload = await INFLIGHT
        const rows = dedupeLiveRows(payload.raw, { strictFilter: payload.strictFilter }).map(adaptLiveJob)

        CACHE = {
          rows,
          sources: payload.sources,
          hasBackend: payload.hasBackend,
          error: payload.error,
        }

        if (!cancelled) {
          setLiveRows(rows)
          setSources(payload.sources)
          setHasBackend(payload.hasBackend)
          if (payload.error) setError(payload.error)
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

  const displayJobs = useMemo(() => {
    const adapted = filterDisplayJobs(liveRows)
    if (hasBackend && adapted.length > 0) return adapted
    if (adapted.length > 0) return filterDisplayJobs(mergeJobs([], adapted))
    return filterDisplayJobs(mergeJobs(ALL_JOBS, []))
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

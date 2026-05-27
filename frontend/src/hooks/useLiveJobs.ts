import { useCallback, useEffect, useMemo, useState } from 'react'
import { ALL_JOBS } from '@/data/jobs'
import {
  fetchJobsFromApi,
  fetchLiveJobsSnapshot,
  JOBS_FETCH_TIMEOUT_MS,
} from '@/lib/jobsApi'
import {
  dailySyncFromJsonPayload,
  fetchSyncStatus,
  type DailySyncMeta,
  type SyncStatusResponse,
} from '@/lib/dailySync'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import { adaptLiveJob, mergeJobs } from '@/utils/liveJobAdapter'
import { filterDisplayJobs } from '@/utils/jobFilters'
import { isPortalNoiseJob } from '@/utils/jobNoiseFilter'
import { isAllowedOfficialJob, rowHasBlockedHost } from '@/utils/officialDomains'

const RECRUIT_RE =
  /recruit|vacanc|notif|advert|exam|bharti|apply|post|constable|group[\s-]*[i1-4]|cgl|ntpc|psc|ssc|upsc|railway|bank|police|teacher|defence|apprentice|walk-?in|selection|appointment/i
const NOISE_TITLE_RE =
  /^(careers?|tenders?|contact(\s+us)?|login|sign\s*up|privacy|sitemap|gallery|tourism|about\s+us|governing\s+board|policies|rules|guidelines|circulars\s+withdrawn|home|news\s*&\s*events)$/i

const MAX_LIVE_ROWS = 8000
const SUPABASE_PAGE = 1000
const JSON_CAP = 8000
const DEMO_SLUG_PREFIX = /^demo-/
const API_PAGE = 1000

/** auto | static | api | supabase — auto uses the refreshed official snapshot first */
const JOBS_SOURCE = (import.meta.env.VITE_JOBS_SOURCE || 'auto').toLowerCase()
const IS_EXPLICIT_SOURCE = ['static', 'api', 'supabase'].includes(JOBS_SOURCE)

let CACHE = null
let INFLIGHT = null
/** Set when user hits Refresh — refetch without blanking the UI. */
let FORCE_RELOAD = false

export function invalidateJobsCache() {
  CACHE = null
  INFLIGHT = null
  FORCE_RELOAD = true
}

function isUsefulLiveRow(row, { strict = false } = {}) {
  const title = String(row?.title || '').trim()
  if (!title || title.length < 6) return false
  if (isPortalNoiseJob(row)) return false
  if (rowHasBlockedHost(row)) return false
  if (!isAllowedOfficialJob(row)) return false
  if (/^\{\{.*\}\}$/.test(title)) return false
  if (/translate\s*\}\}/i.test(title)) return false
  if (NOISE_TITLE_RE.test(title)) return false
  if (/reach out to|contact us|privacy policy|sitemap|login|gallery|tourism/i.test(title)) return false
  if (String(row?.status || '').toLowerCase() === 'draft') return false

  if (!strict) return true
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

function vacancyCount(row) {
  return Number(row?.rawVacancies ?? row?.vacancies) || 0
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

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms)
    promise.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      }
    )
  })
}

async function fetchSupabasePage(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  offset: number,
  rangeEnd: number
) {
  const select =
    'id,slug,title,dept,category,state_codes,vacancies,qualification,salary,age_limit,last_date,apply_url,status,published_at,detail'

  const query = supabase
    .from('jobs')
    .select(select)
    .in('status', ['live', 'expired'])
    .order('published_at', { ascending: false })
    .range(offset, rangeEnd)

  const { data, error } = await withTimeout(
    (async () => query)(),
    JOBS_FETCH_TIMEOUT_MS,
    'Supabase jobs'
  )

  if (error) {
    console.warn('[useLiveJobs] Supabase:', error.message)
    return []
  }
  return data || []
}

async function fetchJobsFromSupabase({
  startOffset = 0,
  maxRows = MAX_LIVE_ROWS,
}: {
  startOffset?: number
  maxRows?: number
} = {}) {
  const supabase = getSupabase()
  if (!supabase) return []

  const endOffset = Math.min(MAX_LIVE_ROWS, startOffset + maxRows)
  const pageStarts: number[] = []
  for (let offset = startOffset; offset < endOffset; offset += SUPABASE_PAGE) {
    pageStarts.push(offset)
  }

  const pages = await Promise.all(
    pageStarts.map((offset) => {
      const rangeEnd = Math.min(offset + SUPABASE_PAGE - 1, endOffset - 1)
      return fetchSupabasePage(supabase, offset, rangeEnd)
    })
  )

  const all: Array<Record<string, unknown>> = []
  for (const batch of pages) {
    if (!batch.length) break
    all.push(...batch)
    if (batch.length < SUPABASE_PAGE) break
  }
  return all
}

function rowSource(row: Record<string, unknown>) {
  const detail = row.detail
  return detail && typeof detail === 'object' ? (detail as Record<string, unknown>).source : ''
}

function supabasePayload(rows: Array<Record<string, unknown>>) {
  const real = rows.filter(
    (r) => !DEMO_SLUG_PREFIX.test(String(r?.slug || '')) && rowSource(r) !== 'demo'
  )
  if (!real.length) return null
  return { raw: real, sources: ['supabase'], hasBackend: true, error: null, strictFilter: false }
}

async function fetchAllFromApi() {
  const first = await fetchJobsFromApi({ limit: API_PAGE, offset: 0 })
  if (first.degraded || !first.items.length) return { items: [], degraded: first.degraded }
  let items = [...first.items]
  const total = Math.min(first.total || items.length, MAX_LIVE_ROWS)
  let offset = items.length
  while (items.length < total && offset < MAX_LIVE_ROWS) {
    const page = await fetchJobsFromApi({
      limit: Math.min(API_PAGE, total - items.length, MAX_LIVE_ROWS - items.length),
      offset,
    })
    if (page.degraded || !page.items.length) break
    items = items.concat(page.items)
    offset += page.items.length
    if (page.items.length < API_PAGE) break
  }
  return { items, degraded: false, total: first.total || items.length }
}

async function tryStatic() {
  const snap = await fetchLiveJobsSnapshot()
  if (!snap.items.length) return null
  return {
    raw: snap.items.slice(0, JSON_CAP).filter((r) => !r.status || r.status !== 'draft'),
    sources: ['official-sites'],
    hasBackend: true,
    error: null,
    strictFilter: false,
    dailySync: dailySyncFromJsonPayload({
      dailySync: snap.dailySync,
      generatedAt: snap.generatedAt,
    }),
    generatedAt: snap.generatedAt,
  }
}

async function trySupabase() {
  const supaRows = await fetchJobsFromSupabase()
  return supabasePayload(supaRows)
}

async function tryApi() {
  const apiResult = await fetchAllFromApi()
  if (!apiResult.items.length || apiResult.degraded) return null
  return {
    raw: apiResult.items.filter((r) => r.status !== 'draft'),
    sources: ['api'],
    hasBackend: true,
    error: null,
    strictFilter: false,
  }
}

function sourceOrder(): Array<'static' | 'supabase' | 'api'> {
  if (JOBS_SOURCE === 'static') return ['static']
  if (JOBS_SOURCE === 'api') return ['api', 'static']
  if (JOBS_SOURCE === 'supabase') return ['supabase', 'static']
  return ['static', 'supabase', 'api']
}

async function loadJobsPayload() {
  const order = sourceOrder()
  const primary = order[0]
  const fallbacks = order.slice(1)

  const runStep = async (step: 'static' | 'supabase' | 'api') => {
    if (step === 'static') return tryStatic()
    if (step === 'supabase' && isSupabaseConfigured()) return trySupabase()
    if (step === 'api') return tryApi()
    return null
  }

  let hit = await runStep(primary)

  if (!hit) {
    for (const step of fallbacks) {
      hit = await runStep(step)
      if (hit) break
    }
  }

  if (!IS_EXPLICIT_SOURCE) {
    const apiResult = await fetchJobsFromApi({ limit: API_PAGE })
    if (apiResult.degraded) {
      return { raw: [], sources: ['static'], hasBackend: false, error: 'Job database temporarily unavailable', strictFilter: false }
    }
  }

  return { raw: [], sources: ['static'], hasBackend: false, error: null, strictFilter: false }
}

function processPayload(payload: { raw: unknown[]; strictFilter: boolean }) {
  const rows = dedupeLiveRows(payload.raw, { strictFilter: payload.strictFilter }).map(adaptLiveJob)
  return { rows, stats: statsFromRows(rows) }
}

function statsFromRows(rows: Array<Record<string, unknown>>) {
  let vacancies = 0
  let noticesWithVacancies = 0
  let liveNotices = 0
  for (const row of rows) {
    const count = vacancyCount(row)
    if (count > 0) {
      vacancies += count
      noticesWithVacancies += 1
    }
    if (String(row.status || 'live').toLowerCase() !== 'expired') liveNotices += 1
  }
  return {
    totalNotices: rows.length,
    vacancies,
    noticesWithVacancies,
    liveNotices,
  }
}

export function useLiveJobs() {
  const [liveRows, setLiveRows] = useState(CACHE?.rows || [])
  const [sources, setSources] = useState(CACHE?.sources || ['static'])
  const [refreshing, setRefreshing] = useState(!CACHE)
  const [error, setError] = useState(CACHE?.error || null)
  const [hasBackend, setHasBackend] = useState(Boolean(CACHE?.hasBackend))
  const [catalogStats, setCatalogStats] = useState(CACHE?.catalogStats || null)
  const [dailySyncMeta, setDailySyncMeta] = useState<DailySyncMeta | null>(CACHE?.dailySync || null)
  const [syncStatus, setSyncStatus] = useState<SyncStatusResponse | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const dailySyncOnly = import.meta.env.VITE_DAILY_SYNC_ONLY === '1'

  const refresh = useCallback(() => {
    if (dailySyncOnly) return
    FORCE_RELOAD = true
    setRefreshKey((k) => k + 1)
  }, [dailySyncOnly])

  useEffect(() => {
    let cancelled = false
    fetchSyncStatus().then((st) => {
      if (!cancelled && st) setSyncStatus(st)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      const forced = FORCE_RELOAD
      FORCE_RELOAD = false

      if (CACHE?.rows && !forced) {
        setLiveRows(CACHE.rows)
        setSources(CACHE.sources)
        setHasBackend(CACHE.hasBackend)
        setError(CACHE.error)
        setCatalogStats(CACHE.catalogStats || null)
        setRefreshing(false)
        return
      }

      setRefreshing(true)
      if (!forced || !CACHE?.rows?.length) setError(null)

      // Fast bootstrap for explicit live modes: show the snapshot while live sources load.
      if (sourceOrder()[0] !== 'static' && !IS_EXPLICIT_SOURCE) {
        try {
          const bootstrap = await tryStatic()
          if (!cancelled && bootstrap) {
            const { rows: bootRows, stats: bootStats } = processPayload(bootstrap)
            if (bootRows.length) {
              setLiveRows(bootRows)
              setSources(bootstrap.sources)
              setHasBackend(bootstrap.hasBackend)
              setCatalogStats(bootStats)
            }
          }
        } catch {
          /* fall through to full load */
        }
      }

      if (JOBS_SOURCE === 'supabase' && isSupabaseConfigured()) {
        try {
          const firstRaw = await fetchJobsFromSupabase({ maxRows: SUPABASE_PAGE })
          const firstPayload = supabasePayload(firstRaw)
          const firstProcessed = firstPayload ? processPayload(firstPayload) : null
          if (firstProcessed?.rows.length) {
            CACHE = {
              rows: firstProcessed.rows,
              sources: firstPayload.sources,
              hasBackend: firstPayload.hasBackend,
              error: firstPayload.error,
              catalogStats: firstProcessed.stats,
            }

            if (!cancelled) {
              setLiveRows(firstProcessed.rows)
              setSources(firstPayload.sources)
              setHasBackend(firstPayload.hasBackend)
              setError(null)
              setCatalogStats(firstProcessed.stats)
              setRefreshing(false)
            }

            if (firstRaw.length < SUPABASE_PAGE) return

            ;(async () => {
              try {
                if (!cancelled) setRefreshing(true)
                const restRaw = await fetchJobsFromSupabase({ startOffset: SUPABASE_PAGE })
                const fullPayload = supabasePayload([...firstRaw, ...restRaw])
                if (!fullPayload) return
                const { rows: fullRows, stats: fullStats } = processPayload(fullPayload)
                CACHE = {
                  rows: fullRows,
                  sources: fullPayload.sources,
                  hasBackend: fullPayload.hasBackend,
                  error: fullPayload.error,
                  catalogStats: fullStats,
                }
                if (!cancelled) {
                  setLiveRows(fullRows)
                  setSources(fullPayload.sources)
                  setHasBackend(fullPayload.hasBackend)
                  setError(null)
                  setCatalogStats(fullStats)
                }
              } catch (e) {
                if (!cancelled) setError(e?.message || 'Failed to load all live jobs')
              } finally {
                if (!cancelled) setRefreshing(false)
              }
            })()
            return
          }
        } catch {
          /* fall through to static fallback */
        }
      }

      try {
        if (!INFLIGHT) {
          INFLIGHT = loadJobsPayload().finally(() => {
            INFLIGHT = null
          })
        }
        const payload = await INFLIGHT
        const { rows, stats } = processPayload(payload)

        const dailySync =
          (payload as { dailySync?: DailySyncMeta | null }).dailySync ?? dailySyncMeta

        CACHE = {
          rows,
          sources: payload.sources,
          hasBackend: payload.hasBackend,
          error: payload.error,
          catalogStats: stats,
          dailySync: dailySync || null,
        }

        if (!cancelled) {
          setLiveRows(rows)
          setSources(payload.sources)
          setHasBackend(payload.hasBackend)
          if (payload.error) setError(payload.error)
          setCatalogStats(stats)
          if (dailySync) setDailySyncMeta(dailySync)
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load live jobs')
      } finally {
        if (!cancelled) setRefreshing(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [refreshKey])

  const displayJobs = useMemo(() => {
    const adapted = filterDisplayJobs(liveRows)
    if (hasBackend && adapted.length > 0) return adapted
    if (adapted.length > 0) return filterDisplayJobs(mergeJobs([], adapted))
    return filterDisplayJobs(mergeJobs(ALL_JOBS, []))
  }, [liveRows, hasBackend])

  const hasCatalog = displayJobs.length > 0

  return {
    jobs: displayJobs,
    liveRows,
    source: sources.join('+'),
    sources,
    /** Only block empty views — curated/demo data can show while live source connects */
    loading: refreshing && !hasCatalog,
    refreshing,
    error,
    staticCount: ALL_JOBS.length,
    liveCount: hasBackend ? displayJobs.length : liveRows.length,
    catalogStats,
    hasBackend,
    refresh,
    dailySyncMeta,
    syncStatus,
    dailySyncOnly,
  }
}

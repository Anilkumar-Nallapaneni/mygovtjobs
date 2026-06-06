export type ApiJob = {
  id: string
  slug: string
  title: string
  dept?: string | null
  category?: string | null
  state_codes?: string[]
  vacancies?: number
  qualification?: string | null
  salary?: string | null
  age_limit?: string | null
  last_date?: string | null
  apply_url?: string | null
  pdf_url?: string | null
  status?: string
  detail?: Record<string, unknown>
}

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

/** Fail fast when backend/proxy is down — avoids multi-minute hangs on Windows */
export const JOBS_FETCH_TIMEOUT_MS = 12_000

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number }
): Promise<Response> {
  const timeoutMs = init?.timeoutMs ?? JOBS_FETCH_TIMEOUT_MS
  const { timeoutMs: _t, ...rest } = init ?? {}
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...rest, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

function apiUrl(path: string, params?: Record<string, string | number | undefined>) {
  const base = API_BASE || ''
  const qs = params
    ? '?' +
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : ''
  return `${base}${path}${qs}`
}

export type FetchJobsResult = {
  items: ApiJob[]
  total: number
  degraded: boolean
}

export async function fetchJobsFromApi(params?: {
  state?: string
  category?: string
  q?: string
  limit?: number
  offset?: number
}): Promise<FetchJobsResult> {
  try {
    const res = await fetchWithTimeout(
      apiUrl('/api/jobs', {
        state: params?.state,
        category: params?.category,
        q: params?.q,
        limit: params?.limit ?? 200,
        offset: params?.offset ?? 0,
      }),
      { cache: 'default' }
    )
    if (res.status === 503) return { items: [], total: 0, degraded: true }
    if (!res.ok) return { items: [], total: 0, degraded: false }
    const json = await res.json()
    return {
      items: Array.isArray(json.items) ? json.items : [],
      total: typeof json.total === 'number' ? json.total : json.items?.length ?? 0,
      degraded: Boolean(json.degraded),
    }
  } catch {
    return { items: [], total: 0, degraded: false }
  }
}

export type LiveJobsSnapshot = {
  items: ApiJob[]
  generatedAt?: string | null
  dailySync?: Record<string, unknown> | null
}

let snapshotPrefetch: Promise<LiveJobsSnapshot> | null = null

export function invalidateSnapshotPrefetch() {
  snapshotPrefetch = null
}

/** Start loading the static snapshot before React mounts (faster first paint). */
export function prefetchLiveJobsSnapshot() {
  if (!snapshotPrefetch) {
    snapshotPrefetch = fetchLiveJobsSnapshot()
  }
  return snapshotPrefetch
}

function parseLiveJobsSnapshot(json: unknown): LiveJobsSnapshot {
  const payload = json && typeof json === 'object' ? (json as Record<string, unknown>) : {}
  const items = Array.isArray(payload.items) ? payload.items : []
  return {
    items: items.slice(0, 8000),
    generatedAt: typeof payload.generatedAt === 'string' ? payload.generatedAt : null,
    dailySync:
      payload.dailySync && typeof payload.dailySync === 'object'
        ? (payload.dailySync as Record<string, unknown>)
        : null,
  }
}

/** Static snapshot written by daily IngestAgent sync (8 AM IST). */
export async function fetchLiveJobsSnapshot(options?: {
  bustCache?: boolean
}): Promise<LiveJobsSnapshot> {
  const dailyOnly = import.meta.env.VITE_DAILY_SYNC_ONLY === '1'
  const bustCache = Boolean(options?.bustCache)

  if (!bustCache && snapshotPrefetch) {
    return snapshotPrefetch
  }

  const run = async (): Promise<LiveJobsSnapshot> => {
    try {
      const url =
        dailyOnly || !bustCache
          ? '/data/live-jobs.json'
          : `/data/live-jobs.json?t=${Date.now()}`
      const res = await fetchWithTimeout(url, {
        cache: dailyOnly ? 'force-cache' : bustCache ? 'no-store' : 'default',
        timeoutMs: 8_000,
      })
      if (!res.ok) return { items: [] }
      const json = await res.json()
      return parseLiveJobsSnapshot(json)
    } catch {
      return { items: [] }
    }
  }

  if (bustCache) {
    snapshotPrefetch = run()
    return snapshotPrefetch
  }

  snapshotPrefetch = run()
  return snapshotPrefetch
}

export type AlertSubscribePayload = {
  channel: 'email' | 'whatsapp' | 'telegram' | 'push'
  channel_address: string
  state_codes?: string[]
  categories?: string[]
  qualification_tags?: string[]
}

export async function subscribeToAlerts(
  payload: AlertSubscribePayload
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(apiUrl('/api/alerts/subscribe'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: text || `HTTP ${res.status}` }
    }
    const json = await res.json()
    return { ok: true, id: String(json.id ?? 'subscribed') }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}

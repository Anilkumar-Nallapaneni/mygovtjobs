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
    const res = await fetch(
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

export async function fetchJobsFromJson(): Promise<ApiJob[]> {
  try {
    const res = await fetch('/data/live-jobs.json', { cache: 'default' })
    if (!res.ok) return []
    const json = await res.json()
    const items = Array.isArray(json.items) ? json.items : []
    return items.slice(0, 8000)
  } catch {
    return []
  }
}

export async function fetchJobBySlug(slug: string): Promise<ApiJob | null> {
  try {
    const res = await fetch(apiUrl(`/api/jobs/${encodeURIComponent(slug)}`), { cache: 'default' })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
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

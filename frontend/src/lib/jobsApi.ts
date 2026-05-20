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

export async function fetchJobsFromApi(params?: {
  state?: string
  category?: string
  q?: string
  limit?: number
}): Promise<ApiJob[]> {
  try {
    const res = await fetch(
      apiUrl('/api/jobs', {
        state: params?.state,
        category: params?.category,
        q: params?.q,
        limit: params?.limit ?? 1000,
      }),
      { cache: 'no-store' }
    )
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json.items) ? json.items : []
  } catch {
    return []
  }
}

export async function fetchJobsFromJson(): Promise<ApiJob[]> {
  try {
    const res = await fetch('/data/live-jobs.json', { cache: 'no-store' })
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json.items) ? json.items : []
  } catch {
    return []
  }
}

export async function fetchJobBySlug(slug: string): Promise<ApiJob | null> {
  try {
    const res = await fetch(apiUrl(`/api/jobs/${encodeURIComponent(slug)}`), { cache: 'no-store' })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

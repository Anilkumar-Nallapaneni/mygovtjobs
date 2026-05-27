/** Daily 8 AM IST sync metadata from API or live-jobs.json snapshot. */

export type DailySyncMeta = {
  completedAt?: string | null
  completedAtIst?: string | null
  dateIst?: string | null
  nextRunAtIst?: string | null
  jobCount?: number | null
  sourcesScraped?: number | null
  scheduledLabel?: string | null
}

export type SyncStatusResponse = {
  timezone?: string
  scheduledHourIst?: number
  scheduledMinuteIst?: number
  enforceOncePerDay?: boolean
  ranTodayIst?: boolean
  canRunNow?: boolean
  isRunning?: boolean
  status?: string
  lastCompletedAt?: string | null
  lastCompletedAtIst?: string | null
  lastCompletedDateIst?: string | null
  nextRunAtIst?: string | null
  jobCount?: number | null
  sourcesScraped?: number | null
  error?: string | null
}

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export function formatIstDisplay(iso: string | null | undefined, locale = 'en-IN'): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleString(locale, {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function dailySyncFromJsonPayload(json: Record<string, unknown> | null | undefined): DailySyncMeta | null {
  const block = json?.dailySync
  if (!block || typeof block !== 'object') return null
  return block as DailySyncMeta
}

export async function fetchSyncStatus(): Promise<SyncStatusResponse | null> {
  if (!API_BASE) return null
  try {
    const res = await fetch(`${API_BASE}/api/meta/sync-status`, { cache: 'default' })
    if (!res.ok) return null
    return (await res.json()) as SyncStatusResponse
  } catch {
    return null
  }
}

export function dailySyncLabel(
  meta: DailySyncMeta | null,
  api: SyncStatusResponse | null,
  t: (key: string, opts?: Record<string, unknown>) => string
): string {
  const completed = meta?.completedAtIst || api?.lastCompletedAtIst
  const next = meta?.nextRunAtIst || api?.nextRunAtIst
  if (completed) {
    return t('jobsStatus.dailyUpdated', {
      time: formatIstDisplay(completed),
      defaultValue: `Updated daily · last sync ${formatIstDisplay(completed)} IST`,
    })
  }
  if (next) {
    return t('jobsStatus.dailyNext', {
      time: formatIstDisplay(next),
      defaultValue: `Next update ${formatIstDisplay(next)} IST`,
    })
  }
  return t('jobsStatus.dailySchedule', {
    defaultValue: 'Official listings refresh daily at 8:00 AM IST',
  })
}

/** Job list filters — keep draft/noise out; expired listings stay visible for archive. */

import { isPortalNoiseJob } from '@/utils/jobNoiseFilter'
import { isAllowedOfficialJob } from '@/utils/officialDomains'

const DAY_MS = 86400000
const RECENT_PUBLISHED_DAYS = 4

export function parseLastDate(value) {
  if (!value || value === '—') return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function parsePublishedAt(value) {
  if (!value || value === '—') return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function isJobExpired(job) {
  const status = String(job?.status || '').toLowerCase()
  if (status === 'expired') return true

  const last = parseLastDate(job?.lastDate)
  if (last) {
    const daysLeft = Math.ceil((last.getTime() - Date.now()) / DAY_MS)
    if (daysLeft < 0) return true
  }
  return false
}

/** Hide draft/pending rows and portal noise; live + expired both shown. */
export function filterDisplayJobs(jobs) {
  if (!Array.isArray(jobs)) return []
  return jobs.filter((j) => {
    if (!j || isPortalNoiseJob(j)) return false
    if (!isAllowedOfficialJob(j)) return false
    const status = String(j?.status || '').toLowerCase()
    if (status === 'draft' || status === 'pending') return false

    // Only show jobs posted in the last 4 days.
    const publishedAt = parsePublishedAt(
      (j as any)?.published_at || (j as any)?.publishedAt || (j as any)?.detail?.published
    )
    if (!publishedAt) return false
    if (publishedAt.getTime() < Date.now() - RECENT_PUBLISHED_DAYS * DAY_MS) return false

    // Only show jobs that have a notification PDF.
    const hasPdf =
      Boolean((j as any)?.pdfUrl || (j as any)?.pdf_url) ||
      (Array.isArray((j as any)?.pdfUrls) && (j as any)?.pdfUrls.length > 0) ||
      (Array.isArray((j as any)?.pdf_urls) && (j as any)?.pdf_urls.length > 0)

    return hasPdf
  })
}

/** @deprecated Use filterDisplayJobs — kept for imports that meant “non-draft”. */
export function filterActiveJobs(jobs) {
  return filterDisplayJobs(jobs)
}

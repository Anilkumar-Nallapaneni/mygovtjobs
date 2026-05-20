/** Job list filters — keep draft/noise out; expired listings stay visible for archive. */

import { isPortalNoiseJob } from '@/utils/jobNoiseFilter'

const DAY_MS = 86400000

export function parseLastDate(value) {
  if (!value || value === '—') return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function isJobExpired(job) {
  const status = String(job?.status || '').toLowerCase()
  if (status === 'expired') return true

  const last = parseLastDate(job?.lastDate)
  if (last) {
    const daysLeft = Math.ceil((last - new Date()) / DAY_MS)
    if (daysLeft < 0) return true
  }
  return false
}

/** Hide draft rows and portal noise; live + expired both shown. */
export function filterDisplayJobs(jobs) {
  if (!Array.isArray(jobs)) return []
  return jobs.filter((j) => {
    if (!j || isPortalNoiseJob(j)) return false
    const status = String(j?.status || '').toLowerCase()
    return status !== 'draft'
  })
}

/** @deprecated Use filterDisplayJobs — kept for imports that meant “non-draft”. */
export function filterActiveJobs(jobs) {
  return filterDisplayJobs(jobs)
}

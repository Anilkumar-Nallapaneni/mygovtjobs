/** Keep only open listings — hide DB "expired" and past last-date jobs. */

const DAY_MS = 86400000

export function parseLastDate(value) {
  if (!value || value === '—') return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function isJobExpired(job) {
  const status = String(job?.status || '').toLowerCase()
  if (status === 'expired' || status === 'draft') return true

  const last = parseLastDate(job?.lastDate)
  if (last) {
    const daysLeft = Math.ceil((last - new Date()) / DAY_MS)
    if (daysLeft < 0) return true
  }
  return false
}

export function filterActiveJobs(jobs) {
  if (!Array.isArray(jobs)) return []
  return jobs.filter((j) => j && !isJobExpired(j))
}

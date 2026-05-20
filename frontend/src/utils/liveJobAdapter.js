import { STATES } from '@/data/states'
import { resolvePdfUrl } from '@/utils/resolvePdfUrl'
import { cleanJobTitle, cleanDept } from '@/utils/jobNoiseFilter'
import { enrichJobMetadata } from '@/utils/jobMetadataUtils'
import { isJobExpired } from '@/utils/jobFilters'

/** Map API / Supabase job row → shape used by JobCard / HomePage. */
export function adaptLiveJob(row, index = 0) {
  const stateCodes = (row.state_codes || []).map((c) => String(c).toLowerCase())
  const isNationwide = stateCodes.length === 0
  const stateIds = isNationwide ? ['all'] : stateCodes

  const stateName = isNationwide
    ? 'All India'
    : stateCodes.length === 1
      ? STATES.find((s) => s.id === stateCodes[0])?.n || stateCodes[0]
      : stateCodes.map((id) => STATES.find((s) => s.id === id)?.n || id).join(', ')

  const category = row.category && String(row.category).trim() ? String(row.category).trim() : 'state'
  const rawStatus = String(row.status || 'live').toLowerCase()
  const lastDate = row.last_date || '—'
  const displayStatus =
    rawStatus === 'expired' || isJobExpired({ status: rawStatus, lastDate })
      ? 'expired'
      : rawStatus === 'hot'
        ? 'hot'
        : 'new'

  return enrichJobMetadata({
    id: row.id || `live-${index}`,
    slug: row.slug || `live-job-${index}`,
    title: cleanJobTitle(row.title) || 'Government recruitment',
    dept: cleanDept(row.dept, row.detail?.source),
    state: stateName,
    stateIds,
    category,
    vacancies: Number(row.vacancies) || 0,
    qual: row.qualification || 'As per notification',
    lastDate,
    published_at: row.published_at || row.detail?.published || null,
    salary: row.salary || '—',
    age: row.age_limit || '—',
    type: 'Notification',
    status: displayStatus,
    officialUrl: row.detail?.notification_url || row.apply_url || row.detail?.link || '#',
    applyUrl: row.apply_url || row.detail?.notification_url || '#',
    pdfUrl: row.pdf_url || resolvePdfUrl(row),
    about: row.detail?.summary || row.title || '',
    dates: row.detail?.dates || {},
    fee: row.detail?.fee || {},
    posts: row.detail?.posts || [],
    selection: row.detail?.selection || [],
    howApply: row.detail?.howApply || [],
    isLive: true,
    _fromLive: true,
  })
}

/** Curated demo jobs + live rows (unique slug). */
export function mergeJobs(staticJobs, liveJobs) {
  const out = [...staticJobs]
  const usedSlugs = new Set(staticJobs.map((j) => j.slug))

  for (let i = 0; i < liveJobs.length; i++) {
    const job = { ...liveJobs[i] }
    let slug = job.slug || `live-${job.id || i}`
    if (usedSlugs.has(slug)) slug = `${slug}-${job.id || i}`
    usedSlugs.add(slug)
    out.push({ ...job, slug, id: job.id || slug })
  }

  return out
}

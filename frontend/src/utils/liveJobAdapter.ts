import { collectPdfUrls, resolvePdfUrl } from '@/utils/resolvePdfUrl'
import { cleanJobTitle, cleanDept } from '@/utils/jobNoiseFilter'
import { enrichJobMetadata } from '@/utils/jobMetadataUtils'
import { isJobExpired } from '@/utils/jobFilters'
import { resolveStateDisplay } from '@/utils/jobStateResolve'
import { resolveJobQualification } from '@/utils/jobQualification'
import { sanitizeOfficialUrls } from '@/utils/officialDomains'

function sanitizeDetailForUi(detail) {
  if (!detail || typeof detail !== 'object') return {}
  const out = { ...detail }
  delete out.discovery_ref
  delete out.discovered_via
  return out
}
import { sanitizeVacancyCount } from '@/utils/jobMetadataUtils'

/** Map API / Supabase job row → shape used by JobCard / HomePage. */
export function adaptLiveJob(row, index = 0) {
  const { stateIds, stateName } = resolveStateDisplay(row)
  const qualResolved = resolveJobQualification({
    qual: row.qualification,
    title: row.title,
    about: row.detail?.summary,
    dept: row.dept,
    detail: row.detail,
  })

  const category = row.category && String(row.category).trim() ? String(row.category).trim() : 'state'
  const rawStatus = String(row.status || 'live').toLowerCase()
  const lastDate = row.last_date || '—'
  const displayStatus =
    rawStatus === 'expired' || isJobExpired({ status: rawStatus, lastDate })
      ? 'expired'
      : rawStatus === 'hot'
        ? 'hot'
        : 'new'

  const urls = sanitizeOfficialUrls(row)
  const title = cleanJobTitle(row.title) || 'Government recruitment'
  const rawVacancies = Number(row.vacancies) || 0
  const vacancies = sanitizeVacancyCount(rawVacancies, title)

  return enrichJobMetadata({
    id: row.id || `live-${index}`,
    slug: row.slug || `live-job-${index}`,
    title,
    dept: cleanDept(row.dept, row.detail?.source),
    state: stateName,
    stateIds,
    category,
    vacancies,
    rawVacancies,
    qual: qualResolved.label || 'See notification',
    eduFilterKey: qualResolved.key,
    lastDate,
    published_at: row.published_at || row.detail?.published || null,
    salary: row.salary || '—',
    age: row.age_limit || '—',
    type: 'Notification',
    status: displayStatus,
    officialUrl: urls.officialUrl,
    applyUrl: urls.applyUrl,
    pdfUrl: urls.pdfUrl || resolvePdfUrl(row),
    pdfUrls: urls.pdfUrls?.length ? urls.pdfUrls : collectPdfUrls(row),
    about: row.detail?.summary || '',
    detail: sanitizeDetailForUi(row.detail || {}),
    qualification: row.qualification,
    age_limit: row.age_limit,
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

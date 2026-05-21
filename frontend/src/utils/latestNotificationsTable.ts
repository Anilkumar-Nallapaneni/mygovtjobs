import { CATS } from '@/data/categories'
import { STATES } from '@/data/states'
import { isPortalNoiseJob } from '@/utils/jobNoiseFilter'
import { isAllowedOfficialJob, pickOfficialDetailUrl } from '@/utils/officialDomains'

const CAT_BY_ID = Object.fromEntries(CATS.map((c) => [c.id, c]))

function categoryTabForJob(job) {
  const cat = String(job?.category || 'state').toLowerCase()
  if (CAT_BY_ID[cat]) return { id: cat, name: CAT_BY_ID[cat].name }
  const stateId = job?.stateIds?.[0]
  if (stateId && stateId !== 'all') {
    const st = STATES.find((s) => s.id === stateId)
    if (st) return { id: `state-${stateId}`, name: st.n }
  }
  const stateName = String(job?.state || '').trim()
  if (stateName && stateName !== 'All India') {
    const st = STATES.find((s) => s.n === stateName)
    if (st) return { id: `state-${st.id}`, name: st.n }
  }
  return { id: 'state', name: CAT_BY_ID.state?.name || 'State PSC' }
}

function formatPostName(job) {
  const title = String(job?.title || '').trim()
  const v = Number(job?.vacancies) || 0
  if (v > 0 && !/posts?\b/i.test(title)) return `${title} – ${v.toLocaleString('en-IN')} Posts`
  return title
}

function extractAdvtNo(job) {
  const fromDetail = job?.advtNo || job?.detail?.advt_no
  if (fromDetail) return String(fromDetail)
  const t = String(job?.title || '')
  const m = t.match(/advt\.?\s*no\.?\s*[:.]?\s*([A-Z0-9/.-]+)/i)
  return m ? m[1] : null
}

export function jobToNotificationRow(job) {
  const tab = categoryTabForJob(job)
  const detailUrl = pickOfficialDetailUrl(job)
  return {
    id: job.id || job.slug,
    category: tab.name,
    categoryId: tab.id,
    postDate: job.published_at || null,
    postDateIso: job.published_at || null,
    board: job.dept || 'Recruitment board',
    postName: formatPostName(job),
    qualification: job.qual && job.qual !== '—' ? job.qual : null,
    advtNo: extractAdvtNo(job),
    lastDate: job.lastDate && job.lastDate !== '—' ? job.lastDate : null,
    lastDateIso: job.lastDate && job.lastDate !== '—' ? job.lastDate : null,
    detailUrl,
    _job: job,
  }
}

export function buildLatestNotificationsData(jobs) {
  const items = []
  const byCategory = new Map()

  for (const job of jobs) {
    if (!job || isPortalNoiseJob(job)) continue
    if (!isAllowedOfficialJob(job)) continue

    const row = jobToNotificationRow(job)
    items.push(row)
    if (!byCategory.has(row.categoryId)) byCategory.set(row.categoryId, [])
    byCategory.get(row.categoryId).push(row)
  }

  const catOrder = [...CATS.map((c) => c.id), ...STATES.map((s) => `state-${s.id}`)]
  const categories = []
  const seen = new Set()

  for (const id of catOrder) {
    const rows = byCategory.get(id)
    if (rows?.length) {
      categories.push({ id, name: rows[0].category, count: rows.length })
      seen.add(id)
    }
  }
  for (const [id, rows] of byCategory) {
    if (!seen.has(id)) {
      categories.push({ id, name: rows[0]?.category || id, count: rows.length })
    }
  }

  return {
    items,
    categories,
    total: items.length,
  }
}

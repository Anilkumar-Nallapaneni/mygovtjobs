/**
 * Official recruitment URLs only — block third-party job-aggregator domains.
 */
import { collectPdfUrls } from '@/utils/resolvePdfUrl'

const BLOCKED_HOST_RE =
  /(?:^|\.)(?:freejobalert|sarkariresult|sarkarijob|sarkarinaukri|governmentjob|indgovtjobs|rojgarresult|jobriya|fresherslive|employmentnews|naukri|indeed|shine|timesjobs|foundit|monster)\./i

const BLOCKED_TEXT_RE =
  /freejobalert|sarkariresult|sarkarijob|indgovtjobs|rojgarresult|fresherslive/i

const OFFICIAL_HOST_RE = /\.(gov|nic|ac|org|res)\.in$/i

const PSU_PREFIX_RE =
  /^(www\.)?(upsc|ssc|rrb|ibps|isro|drdo|bel|coalindia|ntpc|nhai|esic|aiims|jipmer|nielit|npcil|pib)\./i

/** PSU / bank career portals (not always .gov.in). */
const OFFICIAL_STEMS = [
  'sbi.co.in',
  'sbi.bank.in',
  'bankofbaroda.in',
  'bankofbaroda.co.in',
  'ibps.in',
  'rbi.org.in',
  'centralbankofindia.co.in',
  'unionbankofindia.co.in',
  'pnbindia.in',
  'canarabank.com',
  'indianbank.in',
  'licindia.in',
  'nalcoindia.com',
  'ongcindia.com',
  'ntpc.co.in',
  'apprenticeshipindia.gov.in',
  'bfsissc.com',
]

export function hostnameOf(url) {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return ''
  }
}

export function containsBlockedBrandText(...parts) {
  const hay = parts.filter(Boolean).join(' ')
  return BLOCKED_TEXT_RE.test(hay)
}

export function isBlockedAggregatorHost(url) {
  const host = hostnameOf(url)
  if (!host) return false
  return BLOCKED_HOST_RE.test(host) || containsBlockedBrandText(host)
}

export function isOfficialRecruitmentUrl(url) {
  if (!url || url === '#') return false
  if (isBlockedAggregatorHost(url)) return false
  try {
    const host = new URL(url).hostname.toLowerCase()
    if (OFFICIAL_HOST_RE.test(host)) return true
    if (host.endsWith('.gov')) return true
    if (/\.gov\.[a-z]{2,}$/.test(host)) return true
    if (PSU_PREFIX_RE.test(host)) return true
    if (host === 'pib.gov.in' || host.endsWith('.pib.gov.in')) return true
    if (OFFICIAL_STEMS.some((stem) => host === stem || host.endsWith(`.${stem}`))) return true
    return false
  } catch {
    return false
  }
}

export function collectJobUrls(job) {
  return [
    job?.applyUrl,
    job?.officialUrl,
    job?.pdfUrl,
    job?.apply_url,
    job?.detail?.notification_url,
    job?.detail?.link,
    ...(Array.isArray(job?.detail?.pdf_urls) ? job.detail.pdf_urls : []),
  ].filter(Boolean)
}

export function rowHasBlockedHost(job) {
  return collectJobUrls(job).some((u) => isBlockedAggregatorHost(u))
}

/** Outbound links restricted to official domains. */
export function sanitizeOfficialUrls(job) {
  const applyUrl = pickOfficialDetailUrl(job)
  const pdfs = collectPdfUrls(job)
  let pdfUrl = pdfs[0] || job?.pdfUrl || job?.pdf_url || null
  if (pdfUrl && !isOfficialRecruitmentUrl(pdfUrl)) pdfUrl = pdfs[0] || null
  if (!pdfUrl && applyUrl && /\.pdf(\?|$)/i.test(applyUrl)) pdfUrl = applyUrl

  return {
    applyUrl: applyUrl || '#',
    officialUrl: applyUrl || '#',
    pdfUrl: pdfUrl || null,
    pdfUrls: pdfs,
  }
}

export function pickOfficialDetailUrl(job) {
  for (const u of collectJobUrls(job)) {
    if (isOfficialRecruitmentUrl(u)) return u
  }
  return null
}

/**
 * Show listing only when it points at an official portal and has no aggregator links.
 */
export function isAllowedOfficialJob(job) {
  if (!job) return false
  if (containsBlockedBrandText(job.title, job.dept, job.about)) return false
  if (rowHasBlockedHost(job)) return false
  return Boolean(pickOfficialDetailUrl(job))
}

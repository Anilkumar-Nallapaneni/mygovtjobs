/** Portal menu / section links — not individual job notifications. */
const PORTAL_NAV_TITLE_RE =
  /^(apply\s+online|notifications?|advertisements?|examination\s+syllabus|recruitment\s+calendar|results?|tenders?\s*(?:&|and)\s*quotations?|previous\s+question\s+papers?|important\s+orders?|download\s+admission\s+certificate|role\s+and\s+functions|vision\s*(?:&|and)\s*mission|compendium\s+of\s+rules|query\s+management|attestation|transparency|disclosure\s+under\s+rti|commission\s*(?:&|and)\s*incumbency|promotion\s*(?:&|and)\s*disciplinary|officers\s+in\b|rejection\s+notice|archive|view\s+archive|whats\s+new|recruitment\s+notices?|syllabus|calendar|forms?(?:\s+download)?|downloads?|faq|help|about\s+us|contact(?:\s+us)?|home|login|sign\s*up|sitemap|governing\s+board|policies|rules|guidelines|circulars\s+withdrawn|news\s*(?:&|and)\s*events|careers?|tenders?|gallery|tourism|old\s+questions|answer\s+key|personal\s+interview|valid\s*\/?\s*rejected\s+list|direct\s+syllabus|rules\s+and\s+regulations|history\s+of\b|composition\s+of\b|functions\s+of\b|submission\s+of\s+the\s+offline\s+application\s+form|direct\s+recruitment|schedule\s+of\s+examinations|departmental\s+notification|examination|question\s+departmental|lde\s+(results|schedule)|constitutional\s+provision|biodata\s+of|public\s+service\s+commission)$/i

const GENERIC_SECTION_URL_RE = /\/Pages\/View_(?:Content|Archive)\.aspx\?id=/i

const JOB_HINT_RE =
  /\d|post|vacanc|group|assistant|clerk|constable|engineer|teacher|officer|exam|bharti|recruit|notification\s+(?:no|for)|advt|direct\s+recruit|apprentice|resident|specialist|selection|engagement/i

const JUNK_TITLE_RE =
  /^application\s+form\b|^download\b|^click\s+here\b|^pdf\b|^notification$|^english\s*\(|^hindi\s*\(|pdf\s*size|old\s+questions|answer\s+key\s+\d{4}|chairman,?\s|submission\s+of\s+the\s+offline|^question\s+departmental|^schedule\s+of\s+examinations|^direct\s+recruitment$|^departmental\s+notification$|^examination$|^lde\s+results|^valid\s*\/?\s*rejected\s+lists|constitutional\s+provision|^biodata\s+of\b|public\s+service\s+commission$|^external\s+link\b/i

export function cleanJobTitle(title) {
  return String(title || '')
    .replace(/\s*Read\s+More\s*$/i, '')
    .replace(/[\s\-–—]*PDF\s*size:\s*\([^)]*\)\s*\.?\s*$/gi, '')
    .replace(/[\s\-–—]*PDF\s*size:\s*\(\)\s*\.?\s*$/gi, '')
    .replace(/[\s\-–—]*PDF\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[.\-–—\s]+|[.\-–—\s]+$/g, '')
}

export function isPortalNavTitle(title) {
  const t = cleanJobTitle(title)
  if (!t || t.length < 6) return true
  if (PORTAL_NAV_TITLE_RE.test(t)) return true
  if (JUNK_TITLE_RE.test(t)) return true
  if (/^[a-z]{1,3}\s/.test(t) && !/\d/.test(t)) return true
  if (/\s+g$/i.test(t) && t.length < 30) return true
  if (t.length < 24 && !JOB_HINT_RE.test(t)) return true
  return false
}

export function isPortalNoiseJob(row) {
  const title = cleanJobTitle(row?.title)
  if (/external\s+link\s+that\s+opens/i.test(title)) return true
  if (
    /freejobalert|sarkariresult|sarkarijob|sarkarinaukri|governmentjob|indgovtjobs|rojgarresult|jobriya|fresherslive/i.test(
      `${title} ${row?.dept || ''}`
    )
  ) {
    return true
  }
  const url =
    row?.apply_url ||
    row?.applyUrl ||
    row?.officialUrl ||
    row?.detail?.notification_url ||
    row?.detail?.link ||
    ''
  if (isPortalNavTitle(title)) return true
  if (url && GENERIC_SECTION_URL_RE.test(url) && title.length < 40 && !JOB_HINT_RE.test(title)) {
    return true
  }
  if (/\/recruitmentfile\/?$/i.test(url) && isPortalNavTitle(title)) return true
  try {
    const path = new URL(url, 'http://local').pathname.replace(/\/$/, '')
    if ((path === '' || path === '/') && isPortalNavTitle(title)) return true
  } catch {
    /* ignore bad URLs */
  }
  return false
}

/** Clean department display — hide raw hostnames when possible. */
export function cleanDept(dept, source) {
  const d = String(dept || '').trim()
  if (d && !d.startsWith('www.') && !/\.gov\.in$|\.nic\.in$/i.test(d)) return d
  const labels = {
    esic: "ESIC — Employees' State Insurance Corporation",
    isro: 'ISRO — Indian Space Research Organisation',
    'isro-rss': 'ISRO — Indian Space Research Organisation',
    upsc: 'Union Public Service Commission (UPSC)',
    ssc: 'Staff Selection Commission (SSC)',
    ibps: 'Institute of Banking Personnel Selection (IBPS)',
  }
  const key = String(source || '').replace(/-rss$/, '')
  if (labels[key]) return labels[key]
  let host = d.replace(/^www\./, '')
  host = host.replace(/\.(gov|nic|ac|org)\.in$/i, '')
  return host ? host.replace(/[-.]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Official notification'
}

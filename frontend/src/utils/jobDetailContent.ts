import { pickOfficialDetailUrl } from "@/utils/officialDomains";
import { collectPdfUrls } from "@/utils/resolvePdfUrl";
import { normalizeIsoDate, resolveVacancyCount } from "@/utils/jobMetadataUtils";

const MISSING_DETAIL = "See official notification";
const RAW_PDF_MARKERS = [
  /page\s+\d+\s+of\s+\d+/i,
  /government\s+of\s+india\s+ministry/i,
  /railway\s+recruitment\s+boards?/i,
  /\bsl\.?\s*no\.?\b/i,
  /\broll\s*no\.?\b/i,
  /\bcen\s+\d{2}\/\d{4}\b/i,
  /download(?:ing)?\s+of\s+e-?call\s+letter/i,
];

function trimSummary(text, max = 1200) {
  const s = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!s || s.length < 40) return "";
  if (/^Sl No\.\s*Roll No/i.test(s)) return "";
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function meaningfulValue(value) {
  const s = String(value || "").trim();
  if (!s || s === "—") return "";
  if (/^(?:see|as per)\s+(?:official\s+)?notification$/i.test(s)) return "";
  return s;
}

function looksLikeRawPdfDump(text) {
  const s = String(text || "");
  const markerCount = RAW_PDF_MARKERS.reduce((n, re) => n + (re.test(s) ? 1 : 0), 0);
  return markerCount >= 2 || (s.length > 550 && markerCount >= 1);
}

function firstUsefulSentence(text) {
  if (looksLikeRawPdfDump(text)) return "";
  const sentence = String(text || "")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .find((s) => s.length >= 60 && s.length <= 280 && !/^page\s+\d+/i.test(s));
  return sentence || "";
}

function extractSalary(text) {
  const s = String(text || "").replace(/\s+/g, " ");
  const rupee = s.match(/(?:pay\s+scale|salary|emoluments|remuneration)\s*[:-]?\s*((?:rs\.?|inr|₹)\s?[\d,]+(?:\s*(?:-|to|–)\s*(?:rs\.?|inr|₹)?\s?[\d,]+)?[^.;]{0,45})/i);
  if (rupee) return rupee[1].trim();
  const level = s.match(/\b(?:pay\s+level|level)\s*[-:]?\s*(\d{1,2}(?:\s*\([^)]*\))?)/i);
  return level ? `Pay Level ${level[1].trim()}` : "";
}

function extractAge(text) {
  const s = String(text || "").replace(/\s+/g, " ");
  const labelled = s.match(/(?:age\s+limit|upper\s+age|minimum\s+age|maximum\s+age)\s*[:-]?\s*([^.;]{0,90}?(?:years?|yrs?|age)[^.;]{0,30})/i);
  if (labelled) return labelled[1].trim();
  const range = s.match(/\b(\d{2}\s*(?:-|to|–)\s*\d{2}\s*(?:years?|yrs?))\b/i);
  return range ? range[1].trim() : "";
}

function buildAbout(job) {
  const rawSummary = trimSummary(job.about || job.detail?.summary, 900);
  const usefulSentence = firstUsefulSentence(rawSummary);

  const parts = [
    `${job.title} is an official recruitment notice${job.dept && job.dept !== job.title ? ` from ${job.dept}` : ""}.`,
    job.dept && job.dept !== job.title ? `Issued by ${job.dept}.` : "",
    meaningfulValue(job.qual) ? `Qualification: ${job.qual}.` : "",
    job.vacancies > 0 ? `Approximately ${job.vacancies.toLocaleString("en-IN")} posts mentioned in the listing.` : "",
    job.lastDate && job.lastDate !== "—" ? `Last date: ${job.lastDate}.` : "",
    usefulSentence,
    "Open the official notification PDF or portal link below for eligibility, fees, and how to apply.",
  ].filter(Boolean);

  return parts.join(" ");
}

function buildHighlights(job) {
  return [
    job.vacancies > 0 ? `${job.vacancies.toLocaleString("en-IN")} notified posts` : "",
    job.lastDate && job.lastDate !== "—" ? `Apply by ${job.lastDate}` : "",
    meaningfulValue(job.salary) ? `Salary: ${job.salary}` : "",
    meaningfulValue(job.age) ? `Age: ${job.age}` : "",
    meaningfulValue(job.qual) ? `Qualification: ${job.qual}` : "",
  ].filter(Boolean);
}

function buildDates(job) {
  const dates = { ...(job.dates || {}) };
  const last = job.lastDate && job.lastDate !== "—" ? job.lastDate : null;
  const published =
    normalizeIsoDate(job.publishedDate) ||
    normalizeIsoDate(job.published_at) ||
    normalizeIsoDate(job.detail?.published);

  if (last && !dates["Apply End"] && !dates["Last Date"]) {
    dates["Last Date"] = last;
  }
  if (published && !dates.Notification) {
    dates.Notification = published;
  }
  if (job.detail?.advt_no && !dates["Advertisement No."]) {
    dates["Advertisement No."] = job.detail.advt_no;
  }
  return dates;
}

function buildHowApply(job, applyHref) {
  if (Array.isArray(job.howApply) && job.howApply.length) return job.howApply;
  if (!applyHref) {
    return ["Open the official PDF notification using the link below and follow the instructions inside."];
  }
  const host = (() => {
    try {
      return new URL(applyHref).hostname.replace(/^www\./, "");
    } catch {
      return "the official portal";
    }
  })();
  return [
    `Visit the official site (${host}).`,
    "Read the full advertisement/notification carefully.",
    "Check eligibility, age limit, and required documents.",
    "Complete the online application before the last date (if applicable).",
    "Save your application confirmation / registration number.",
  ];
}

function buildSelection(job) {
  if (Array.isArray(job.selection) && job.selection.length) return job.selection;
  return [
    "Refer to the official notification for the exact selection stages (written exam, interview, skill test, etc.).",
  ];
}

/**
 * Normalize a JobCard/live row into a JobDetail-friendly shape with fallbacks.
 */
export function buildJobDetailView(job) {
  if (!job) return job;

  const title = job.title || "Government recruitment";
  const summary = job?.detail?.summary || job?.about || "";
  const vacancies = resolveVacancyCount(job.vacancies, title, summary, job?.about);
  const applyHref =
    pickOfficialDetailUrl(job) ||
    (job.applyUrl && job.applyUrl !== "#" ? job.applyUrl : null) ||
    (job.pdfUrl || null);

  const pdfUrls = Array.isArray(job.pdfUrls) && job.pdfUrls.length ? job.pdfUrls : collectPdfUrls(job);
  const pdfHref = pdfUrls[0] || job.pdfUrl || (applyHref && /\.pdf(\?|$)/i.test(applyHref) ? applyHref : null);
  const htmlApply =
    applyHref && applyHref !== pdfHref && !/\.pdf(\?|$)/i.test(applyHref) ? applyHref : null;

  const qual =
    job.qual && job.qual !== "—" && job.qual !== "See notification"
      ? job.qual
      : job.detail?.qualification || "See official notification";

  const salary = meaningfulValue(job.salary) || extractSalary(summary) || MISSING_DETAIL;
  const age = meaningfulValue(job.age) || meaningfulValue(job.age_limit) || extractAge(summary) || MISSING_DETAIL;

  const dates = buildDates({ ...job, vacancies, lastDate: job.lastDate });
  const about = buildAbout({ ...job, vacancies, salary, age });
  const highlights = buildHighlights({ ...job, vacancies, salary, age, qual });
  const howApply = buildHowApply(job, htmlApply || pdfHref);
  const selection = buildSelection(job);

  const fee = job.fee && Object.keys(job.fee).length ? job.fee : {};
  const posts = Array.isArray(job.posts) && job.posts.length ? job.posts : [];

  return {
    ...job,
    title,
    vacancies,
    qual,
    salary,
    age,
    about,
    highlights,
    dates,
    fee,
    posts,
    howApply,
    selection,
    applyUrl: htmlApply || applyHref || "#",
    pdfUrl: pdfHref,
    pdfUrls,
    officialUrl: htmlApply || job.officialUrl,
    nationality: job.nationality || "See official notification",
    ageRelax: job.ageRelax || "See official notification",
    attempts: job.attempts || "See official notification",
    helpdesk: job.helpdesk || "—",
    email: job.email || "—",
    syllabus: job.syllabus || "",
    _detailReady: true,
  };
}

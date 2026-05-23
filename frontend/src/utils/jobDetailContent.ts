import { pickOfficialDetailUrl } from "@/utils/officialDomains";
import { collectPdfUrls } from "@/utils/resolvePdfUrl";
import { normalizeIsoDate, resolveVacancyCount } from "@/utils/jobMetadataUtils";

function trimSummary(text, max = 1200) {
  const s = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!s || s.length < 40) return "";
  if (/^Sl No\.\s*Roll No/i.test(s)) return "";
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function buildAbout(job) {
  const summary = trimSummary(job.about || job.detail?.summary);
  if (summary) return summary;

  const parts = [
    job.title,
    job.dept && job.dept !== job.title ? `Issued by ${job.dept}.` : "",
    job.qual && job.qual !== "See notification" ? `Qualification: ${job.qual}.` : "",
    job.vacancies > 0 ? `Approximately ${job.vacancies.toLocaleString("en-IN")} posts mentioned in the listing.` : "",
    job.lastDate && job.lastDate !== "—" ? `Last date: ${job.lastDate}.` : "",
    "Open the official notification PDF or portal link below for eligibility, fees, and how to apply.",
  ].filter(Boolean);

  return parts.join(" ");
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

  const salary = job.salary && job.salary !== "—" ? job.salary : "See official notification";
  const age = job.age && job.age !== "—" ? job.age : job.age_limit || "See official notification";

  const dates = buildDates({ ...job, vacancies, lastDate: job.lastDate });
  const about = buildAbout({ ...job, vacancies });
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

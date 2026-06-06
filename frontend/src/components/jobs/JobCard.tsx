import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNow } from "@/hooks/useNow";
import { DS } from "@/theme/designSystem";
import { CATS } from "@/data/categories";
import type { JobRecord } from "@/types/job";
import { enrichJobMetadata } from "@/utils/jobMetadataUtils";
import { isPdfUrl, resolveOfficialApplyHref } from "@/utils/officialDomains";
import { resolveTrustedApplyHref, resolveTrustedPdfHref } from "@/utils/jobDetailLinks";
import { resolvePdfUrl } from "@/utils/resolvePdfUrl";

const DAY_MS = 1000 * 60 * 60 * 24;

function formatDate(value, locale) {
  if (!value || value === "—") return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(locale === "en" ? "en-IN" : locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function hasKnownDisplayValue(value) {
  const text = String(value ?? "").trim();
  return Boolean(text && !/^(?:-|—|tba|pending|null|undefined)$/i.test(text));
}

function JobCard({
  job,
  onClick,
  compact = false,
  onEducationClick,
  onStateClick,
}: {
  job: JobRecord
  onClick?: () => void
  compact?: boolean
  onEducationClick?: (key: string) => void
  onStateClick?: (stateId: string) => void
}) {
  const { t, i18n } = useTranslation();
  const now = useNow();
  const dateLocale = i18n.language === "en" ? "en-IN" : i18n.language;
  const enriched = useMemo(() => (job?._enriched ? job : enrichJobMetadata(job)), [job]);

  const title = String(enriched?.title || "").trim() || t("job.untitled", { defaultValue: "Government recruitment" });
  const dept = String(enriched?.dept || "").trim() || t("job.officialSource", { defaultValue: "Official notification" });
  const vacancies = Number(enriched?.vacancies) || 0;
  const lastDateRaw = enriched?.lastDate;
  const lastDate = formatDate(lastDateRaw, dateLocale);
  const publishedDate = formatDate(enriched?.publishedDate, dateLocale);
  const hasLastDate = hasKnownDisplayValue(lastDateRaw);
  const isExpired = job?.status === "expired";
  const lastMs = hasLastDate ? new Date(String(lastDateRaw)).getTime() : NaN;
  const daysLeft =
    hasLastDate && !isExpired && !Number.isNaN(lastMs)
      ? Math.ceil((lastMs - now) / DAY_MS)
      : null;
  const isUrgent = daysLeft != null && daysLeft >= 0 && daysLeft <= 7;

  const officialHref = resolveTrustedApplyHref(enriched) || resolveOfficialApplyHref(enriched);
  const pdfHref = useMemo(() => {
    const trusted = resolveTrustedPdfHref(enriched);
    if (trusted) return trusted;
    const official = resolvePdfUrl(enriched);
    if (official) return official;
    const stored = enriched?.pdfUrl || enriched?.pdf_url;
    if (stored) return stored;
    const apply = enriched?.applyUrl || enriched?.apply_url;
    if (apply && isPdfUrl(apply)) return apply;
    return null;
  }, [enriched]);
  const postsDisplay =
    vacancies > 0
      ? vacancies.toLocaleString(dateLocale)
      : officialHref
        ? t("job.postsCheckOfficial", { defaultValue: "See official" })
        : t("job.postsUnavailable", { defaultValue: "Not listed" });

  const dateLabel = hasLastDate
    ? lastDate
    : publishedDate !== "—"
      ? publishedDate
      : officialHref
        ? t("job.postsCheckOfficial", { defaultValue: "See official" })
        : t("job.postsUnavailable", { defaultValue: "Not listed" });
  const dateCaption = hasLastDate
    ? t("jobDetail.lastDate")
    : publishedDate !== "—"
      ? t("job.postedOn", { defaultValue: "Posted" })
      : t("jobDetail.lastDate");

  const catId = job?.category && CATS.some((c) => c.id === job.category) ? job.category : "state";
  const catColor = (CATS.find((c) => c.id === catId) || { color: DS.saffron }).color;
  const meta = [
    {
      icon: "📍",
      value: enriched?.state || "All India",
      kind: "state",
      stateId: enriched?.stateIds?.[0],
    },
    {
      icon: "🎓",
      value: enriched?.qual || t("job.qualSeeNotification", { defaultValue: "See notification" }),
      kind: "education",
      eduKey: enriched?.eduFilterKey,
    },
    { icon: "💰", value: enriched?.salary && enriched.salary !== "—" ? enriched.salary : null, kind: "salary" },
  ].filter((m) => m.value && (m.kind === "education" || (m.value !== "—" && m.value !== "See notification")));

  return (
    <article
      className={`job-card${compact ? " job-card--compact" : ""}${isExpired ? " job-card--expired" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <div className="job-card__accent" style={{ background: `linear-gradient(180deg, ${catColor}, color-mix(in srgb, ${catColor} 30%, transparent))` }} aria-hidden />

      <div className="job-card__inner">
      <div className="job-card__top">
        <div className="job-card__main">
          <div className="job-card__badges">
            <span
              className="job-card__badge"
              style={{
                background: `${catColor}18`,
                color: catColor,
                border: `1px solid ${catColor}35`,
              }}
            >
              {t(`category.${catId}`).toUpperCase()}
            </span>
            {job?.status === "new" && <span className="job-card__badge job-card__badge--new">{t("job.new")}</span>}
            {job?.status === "hot" && (
              <span className="job-card__badge job-card__badge--hot">
                🔥 {t("job.hot")}
              </span>
            )}
            {isExpired && (
              <span className="job-card__badge job-card__badge--expired">{t("job.expired")}</span>
            )}
            {job?._fromLive && (
              <span
                className="job-card__badge"
                style={{
                  background: "var(--ds-accentSoft)",
                  color: "var(--ds-saffron)",
                  border: "1px solid var(--ds-accentBorder)",
                }}
              >
                LIVE
              </span>
            )}
          </div>
          <h3 className="job-card__title">{title}</h3>
          <p className="job-card__dept">{dept}</p>
        </div>

        <div className="job-card__vacancy" title={vacancies > 0 ? undefined : t("job.postsTbaHint", { defaultValue: "See official notification for post count" })}>
          <div className={`job-card__vacancy-num${vacancies > 0 ? "" : " job-card__vacancy-num--muted"}`}>
            {postsDisplay}
          </div>
          <div className="job-card__vacancy-label">
            {vacancies > 0 ? t("job.posts") : t("job.notice", { defaultValue: "NOTICE" })}
          </div>
        </div>
      </div>

      <div className={`job-card__stats${vacancies > 0 ? " job-card__stats--vacancy-shown" : ""}`}>
        <div className="job-card__stat job-card__stat--highlight">
          <span className="job-card__stat-label">{dateCaption}</span>
          <span className="job-card__stat-value">{dateLabel}</span>
        </div>
      </div>

      <div className="job-card__meta">
        {meta.map(({ icon, value, kind, stateId, eduKey }) => {
          const canState = kind === "state" && stateId && stateId !== "all" && onStateClick;
          const canEdu = kind === "education" && eduKey && onEducationClick;
          const Tag = canState || canEdu ? "button" : "span";
          const handleChip = (e) => {
            if (!canState && !canEdu) return;
            e.stopPropagation();
            if (canState) onStateClick(stateId);
            else if (canEdu) onEducationClick(eduKey);
          };
          return (
            <Tag
              key={`${icon}-${value}`}
              type={Tag === "button" ? "button" : undefined}
              className={`job-card__chip${canState || canEdu ? " job-card__chip--link" : ""}`}
              title={value}
              onClick={handleChip}
            >
              {icon} {value}
            </Tag>
          );
        })}
      </div>

      <div className="job-card__footer">
        <div className={`job-card__deadline${isUrgent ? " job-card__deadline--urgent" : ""}`}>
          <span>
            📅 {dateCaption}: <strong>{dateLabel}</strong>
          </span>
          {daysLeft != null && daysLeft <= 30 && daysLeft >= 0 && (
            <span className={`job-card__days${isUrgent ? " job-card__days--urgent" : ""}`}>
              {t("job.daysLeft", { count: daysLeft })}
            </span>
          )}
          {isExpired && (
            <span className="job-card__days job-card__days--expired">{t("job.expired")}</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {pdfHref ? (
            <a
              href={pdfHref}
              target="_blank"
              rel="noopener noreferrer"
              className="job-card__pdf"
              onClick={(e) => e.stopPropagation()}
              title={t("jobDetail.downloadPdf")}
            >
              📄 {t("job.pdf", { defaultValue: "PDF" })}
            </a>
          ) : null}
          <span className="job-card__cta">{t("jobDetail.viewDetails")} →</span>
        </div>
      </div>
      </div>
    </article>
  );
}

export default memo(
  JobCard,
  (a, b) =>
    a.job?.id === b.job?.id &&
    a.compact === b.compact &&
    a.onClick === b.onClick
);

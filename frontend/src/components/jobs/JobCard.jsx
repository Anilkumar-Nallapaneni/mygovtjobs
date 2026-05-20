import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { DS } from "@/theme/designSystem";
import { CATS } from "@/data/categories";
import { enrichJobMetadata } from "@/utils/jobMetadataUtils";
import "./JobCard.css";

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

export default function JobCard({ job, onClick, compact = false }) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "en" ? "en-IN" : i18n.language;
  const enriched = useMemo(() => enrichJobMetadata(job), [job]);

  const title = String(enriched?.title || "").trim() || t("job.untitled", { defaultValue: "Government recruitment" });
  const dept = String(enriched?.dept || "").trim() || t("job.officialSource", { defaultValue: "Official notification" });
  const vacancies = Number(enriched?.vacancies) || 0;
  const lastDateRaw = enriched?.lastDate;
  const lastDate = formatDate(lastDateRaw, dateLocale);
  const publishedDate = formatDate(enriched?.publishedDate, dateLocale);
  const hasLastDate = lastDateRaw && lastDateRaw !== "—";
  const isExpired = job?.status === "expired";
  const daysLeft = hasLastDate && !isExpired ? Math.ceil((new Date(lastDateRaw) - new Date()) / DAY_MS) : null;
  const isUrgent = daysLeft != null && daysLeft >= 0 && daysLeft <= 7;

  const postsDisplay =
    vacancies > 0
      ? vacancies.toLocaleString(dateLocale)
      : t("job.postsTba", { defaultValue: "TBA" });

  const dateLabel = hasLastDate
    ? lastDate
    : publishedDate !== "—"
      ? publishedDate
      : "—";
  const dateCaption = hasLastDate
    ? t("jobDetail.lastDate")
    : publishedDate !== "—"
      ? t("job.postedOn", { defaultValue: "Posted" })
      : t("jobDetail.lastDate");

  const catId = job?.category && CATS.some((c) => c.id === job.category) ? job.category : "state";
  const catColor = (CATS.find((c) => c.id === catId) || { color: DS.saffron }).color;

  const meta = [
    { icon: "📍", value: enriched?.state || "All India" },
    { icon: "🎓", value: enriched?.qual || "As per notification" },
    { icon: "💰", value: enriched?.salary && enriched.salary !== "—" ? enriched.salary : null },
  ].filter((m) => m.value);

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
      <div className="job-card__accent" style={{ background: `linear-gradient(to bottom, ${catColor}, transparent)` }} aria-hidden />

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
          <div className="job-card__vacancy-label">{t("job.posts")}</div>
        </div>
      </div>

      <div className="job-card__stats">
        <div className={`job-card__stat${vacancies > 0 ? " job-card__stat--highlight" : ""}`}>
          <span className="job-card__stat-label">{t("job.posts")}</span>
          <span className="job-card__stat-value">{postsDisplay}</span>
        </div>
        <div className={`job-card__stat${hasLastDate ? " job-card__stat--highlight" : ""}`}>
          <span className="job-card__stat-label">{dateCaption}</span>
          <span className="job-card__stat-value">{dateLabel}</span>
        </div>
      </div>

      <div className="job-card__meta">
        {meta.map(({ icon, value }) => (
          <span key={`${icon}-${value}`} className="job-card__chip" title={value}>
            {icon} {value}
          </span>
        ))}
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
        <span className="job-card__cta">{t("jobDetail.viewDetails")} →</span>
      </div>
    </article>
  );
}

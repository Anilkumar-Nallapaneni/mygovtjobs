import { useTranslation } from "react-i18next";
import { DS } from "@/theme/designSystem";
import { CATS } from "@/data/categories";
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

  const title = String(job?.title || "").trim() || t("job.untitled", { defaultValue: "Government recruitment" });
  const dept = String(job?.dept || "").trim() || t("job.officialSource", { defaultValue: "Official notification" });
  const vacancies = Number(job?.vacancies) || 0;
  const lastDateRaw = job?.lastDate;
  const lastDate = formatDate(lastDateRaw, dateLocale);
  const daysLeft = lastDateRaw && lastDateRaw !== "—" ? Math.ceil((new Date(lastDateRaw) - new Date()) / DAY_MS) : null;
  const isUrgent = daysLeft != null && daysLeft >= 0 && daysLeft <= 7;

  const catId = job?.category && CATS.some((c) => c.id === job.category) ? job.category : "state";
  const catColor = (CATS.find((c) => c.id === catId) || { color: DS.saffron }).color;

  const meta = [
    { icon: "📍", value: job?.state || "All India" },
    { icon: "🎓", value: job?.qual || "As per notification" },
    { icon: "💰", value: job?.salary && job.salary !== "—" ? job.salary : null },
  ].filter((m) => m.value);

  return (
    <article
      className={`job-card${compact ? " job-card--compact" : ""}`}
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

        <div className="job-card__vacancy">
          <div className="job-card__vacancy-num">{vacancies > 0 ? vacancies.toLocaleString("en-IN") : "—"}</div>
          <div className="job-card__vacancy-label">{t("job.posts")}</div>
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
            📅 {t("jobDetail.lastDate")} {lastDate}
          </span>
          {daysLeft != null && daysLeft <= 30 && daysLeft >= 0 && (
            <span className={`job-card__days${isUrgent ? " job-card__days--urgent" : ""}`}>
              {t("job.daysLeft", { count: daysLeft })}
            </span>
          )}
        </div>
        <span className="job-card__cta">{t("jobDetail.viewDetails")} →</span>
      </div>
    </article>
  );
}

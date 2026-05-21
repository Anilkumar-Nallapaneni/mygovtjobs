import { useTranslation } from "react-i18next";
import JobCard from "@/components/jobs/JobCard";
import "./StateJobsPanel.css";

export default function StateJobsPanel({
  stateName,
  stateJobs,
  nationwideJobs,
  sort,
  onSortChange,
  onJobClick,
  onEducationClick,
  onStateClick,
}) {
  const { t } = useTranslation();
  const stateVac = stateJobs.reduce((s, j) => s + (Number(j.vacancies) || 0), 0);
  const nwVac = nationwideJobs.reduce((s, j) => s + (Number(j.vacancies) || 0), 0);

  return (
    <section className="state-jobs-panel" aria-label={t("home.jobsInState", { state: stateName })}>
      <header className="state-jobs-panel__header">
        <div>
          <h2 className="state-jobs-panel__title">{t("home.jobsInState", { state: stateName })}</h2>
          <p className="state-jobs-panel__meta">
            {stateJobs.length > 0
              ? t("home.stateJobsCount", {
                  count: stateJobs.length,
                  vacancies: stateVac.toLocaleString("en-IN"),
                  defaultValue: "{{count}} state listings · {{vacancies}} vacancies",
                })
              : t("home.noStateListingsShort", { defaultValue: "No state-specific listings yet" })}
            {nationwideJobs.length > 0 &&
              ` · ${t("home.nationwideCount", {
                count: nationwideJobs.length,
                defaultValue: "{{count}} all-India",
              })}`}
          </p>
        </div>
        <div className="state-jobs-panel__sort">
          <span>{t("home.sort")}</span>
          {["lastDate", "vacancies"].map((s) => (
            <button
              key={s}
              type="button"
              className={`state-jobs-panel__sort-btn${sort === s ? " is-active" : ""}`}
              onClick={() => onSortChange(s)}
            >
              {s === "lastDate" ? t("home.deadline") : t("home.vacancies")}
            </button>
          ))}
        </div>
      </header>

      <div className="state-jobs-panel__scroll">
        {stateJobs.length === 0 ? (
          <div className="state-jobs-panel__empty">
            <div className="state-jobs-panel__empty-icon">📋</div>
            <p>{t("home.noStateListings")}</p>
            {nationwideJobs.length > 0 && <p className="state-jobs-panel__empty-hint">{t("home.seeNationwideBelow")}</p>}
          </div>
        ) : (
          <div className="state-jobs-panel__list">
            {stateJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                compact
                onClick={() => onJobClick(job)}
                onEducationClick={onEducationClick}
                onStateClick={onStateClick}
              />
            ))}
          </div>
        )}

        {nationwideJobs.length > 0 && (
          <>
            <h3 className="state-jobs-panel__section-label">{t("home.nationwideSection")}</h3>
            <p className="state-jobs-panel__section-meta">
              {t("home.nationwideMeta", {
                count: nationwideJobs.length,
                vacancies: nwVac.toLocaleString("en-IN"),
                defaultValue: "{{count}} central notifications · {{vacancies}} vacancies",
              })}
            </p>
            <div className="state-jobs-panel__list">
              {nationwideJobs.map((job) => (
                <JobCard
                  key={`nw-${job.id}`}
                  job={job}
                  compact
                  onClick={() => onJobClick(job)}
                  onEducationClick={onEducationClick}
                  onStateClick={onStateClick}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

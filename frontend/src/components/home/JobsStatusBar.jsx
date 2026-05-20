import { useTranslation } from "react-i18next";
import "./JobsStatusBar.css";

export default function JobsStatusBar({ loading, staticCount, liveCount, sources: _sources, hasBackend, error }) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="jobs-status jobs-status--loading" role="status">
        {t("jobsStatus.loading", { defaultValue: "Loading job listings…" })}
      </div>
    );
  }

  const mode = hasBackend
    ? t("jobsStatus.liveMode", { defaultValue: "Live database connected" })
    : t("jobsStatus.demoMode", {
        defaultValue: "Demo catalog — connect Supabase + backend for real-time jobs",
      });

  return (
    <div className={`jobs-status${hasBackend ? " jobs-status--live" : ""}`} role="status">
      <span className="jobs-status__dot" aria-hidden />
      <span>
        <strong>{hasBackend ? liveCount : staticCount + liveCount}</strong>{" "}
        {t("jobsStatus.listings", { defaultValue: "listings" })}
        {!hasBackend && (
          <>
            {" · "}
            <strong>{staticCount}</strong> {t("jobsStatus.curated", { defaultValue: "curated" })}
          </>
        )}
        {liveCount > 0 && (
          <>
            {" · "}
            <strong>{liveCount}</strong>{" "}
            {hasBackend
              ? t("jobsStatus.liveFromDb", { defaultValue: "live from official sources" })
              : t("jobsStatus.live", { defaultValue: "live" })}
          </>
        )}
        {" · "}
        <span className="jobs-status__mode">{mode}</span>
      </span>
      {error && (
        <span className="jobs-status__err">
          {/unavailable/i.test(error) ? t("jobsStatus.degraded") : error}
        </span>
      )}
      {!hasBackend && import.meta.env.DEV && (
        <span className="jobs-status__hint">
          {t("jobsStatus.setupHint", {
            defaultValue: "Next: set up Supabase → run backend ingest → add VITE_SUPABASE_URL",
          })}
        </span>
      )}
    </div>
  );
}

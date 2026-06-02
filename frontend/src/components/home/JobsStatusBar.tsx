import { useTranslation } from "react-i18next";

export default function JobsStatusBar({
  loading,
  refreshing = false,
  liveCount,
  hasBackend,
  error,
}) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="jobs-status jobs-status--loading" role="status">
        {t("jobsStatus.loading", { defaultValue: "Loading job listings…" })}
      </div>
    );
  }

  if (refreshing) {
    return (
      <div className="jobs-status jobs-status--loading" role="status">
        <span className="jobs-status__dot" aria-hidden />
        {t("jobsStatus.refreshing", { defaultValue: "Updating live listings…" })}
        {liveCount > 0 && (
          <>
            {" · "}
            <strong>{liveCount}</strong> {t("jobsStatus.listings", { defaultValue: "listings" })}
          </>
        )}
      </div>
    );
  }

  const mode = hasBackend
    ? t("jobsStatus.liveMode", { defaultValue: "Official recruitment notices" })
    : t("jobsStatus.offlineMode", { defaultValue: "Could not load live listings" });

  return (
    <div className={`jobs-status${hasBackend ? " jobs-status--live" : ""}`} role="status">
      <span className="jobs-status__dot" aria-hidden />
      <span>
        <strong>{liveCount}</strong> {t("jobsStatus.listings", { defaultValue: "recruitment listings" })}
        {" · "}
        <span className="jobs-status__mode">{mode}</span>
      </span>
      {error && (
        <span className="jobs-status__err">
          {/unavailable/i.test(error) ? t("jobsStatus.degraded") : error}
        </span>
      )}
    </div>
  );
}

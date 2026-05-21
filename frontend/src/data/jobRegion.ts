import { STATES } from "./states";

/** Central / nationwide listings — shown under All India, not in a single state's list. */
export function isNationwideAllStatesJob(job) {
  const ids = job?.stateIds;
  return (
    job?.state === "All India" ||
    (Array.isArray(ids) && (ids.includes("all") || ids.length >= STATES.length))
  );
}

/** State-specific jobs only (excludes central all-India listings). */
export function jobMatchesStateFilter(job, stateId) {
  if (!stateId) return true;
  if (isNationwideAllStatesJob(job)) return false;
  const sn = STATES.find((s) => s.id === stateId)?.n || "";
  if (job.state === sn) return true;
  const ids = job.stateIds;
  return Boolean(Array.isArray(ids) && ids.includes(stateId));
}

/** Central recruitments open in every state — shown as a secondary section. */
export function jobMatchesNationwideFilter(job) {
  return isNationwideAllStatesJob(job);
}

/** Vacancies attributed to `stateId` for map / strip (matches state-filtered lists when no extra filters). */
export function vacanciesForStateId(job, stateId) {
  return jobMatchesStateFilter(job, stateId) ? Number(job.vacancies) || 0 : 0;
}

import { STATES } from '@/data/states'
import { CATS } from '@/data/categories'
import { jobMatchesStateFilter } from '@/data/jobRegion'

/** Single pass — state listing counts + category listing counts. */
export function computeJobAggregates(jobs) {
  const stateCounts = Object.fromEntries(STATES.map((s) => [s.id, 0]))
  const categoryCounts = Object.fromEntries(CATS.map((c) => [c.id, 0]))

  for (const job of jobs) {
    let cat = job?.category as string | undefined
    if (!cat && Array.isArray(job?.state_codes) && job.state_codes.length > 0) {
      cat = 'state'
    }
    if (cat && categoryCounts[cat] !== undefined) categoryCounts[cat] += 1

    for (const s of STATES) {
      if (jobMatchesStateFilter(job, s.id)) stateCounts[s.id] += 1
    }
  }

  return { stateCounts, categoryCounts }
}

import { STATES } from '@/data/states'
import { CATS } from '@/data/categories'
import { jobMatchesStateFilter } from '@/data/jobRegion'

/** Single pass — state listing counts + category listing counts. */
export function computeJobAggregates(jobs) {
  const stateCounts = Object.fromEntries(STATES.map((s) => [s.id, 0]))
  const categoryCounts = Object.fromEntries(CATS.map((c) => [c.id, 0]))

  for (const job of jobs) {
    const cat = job?.category
    if (cat && categoryCounts[cat] !== undefined) categoryCounts[cat] += 1

    for (const s of STATES) {
      if (jobMatchesStateFilter(job, s.id)) stateCounts[s.id] += 1
    }
  }

  return { stateCounts, categoryCounts }
}

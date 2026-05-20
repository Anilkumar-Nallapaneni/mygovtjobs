/**
 * Builds a reservation-style breakdown that sums exactly to `total`.
 * Used when a post has no `categoryVacancies` from the official PDF yet.
 * Replace per-post `categoryVacancies` in `jobs.js` with annexure figures when available.
 */
export function categoryVacanciesFor(total) {
  const t = Math.max(0, Math.round(Number(total) || 0));
  const labels = ["General (UR)", "OBC", "SC", "ST", "EWS"];
  const weights = [0.4, 0.27, 0.16, 0.1, 0.07];
  if (t === 0) {
    return Object.fromEntries(labels.map((l) => [l, 0]));
  }
  const exact = weights.map((w) => t * w);
  const floors = exact.map((x) => Math.floor(x));
  let rem = t - floors.reduce((a, b) => a + b, 0);
  const order = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < rem; k++) {
    floors[order[k].i]++;
  }
  return Object.fromEntries(labels.map((l, i) => [l, floors[i]]));
}

export function enrichJobPosts(posts) {
  if (!posts?.length) return posts;
  return posts.map((p) => ({
    ...p,
    categoryVacancies: p.categoryVacancies ?? categoryVacanciesFor(p.vacancies),
  }));
}

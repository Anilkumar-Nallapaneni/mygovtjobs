/** Scroll to a section after React state updates have painted. Falls back if target is hidden. */
export function scrollToSection(sectionId, { behavior = "smooth" } = {}) {
  requestAnimationFrame(() => {
    setTimeout(() => {
      const fallbacks = ["state-jobs-panel", "main-jobs", "dream-job-heading", "official-headlines", "alert-section"];
      const candidates = sectionId ? [sectionId, ...fallbacks.filter((id) => id !== sectionId)] : fallbacks;

      for (const id of candidates) {
        const el = document.getElementById(id);
        if (!el) continue;
        const style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") continue;
        el.scrollIntoView({ behavior, block: "start" });
        return;
      }
    }, 80);
  });
}

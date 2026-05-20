import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { applyColorMode } from "@/theme/designSystem";
import { STATES, toSvgStateId } from "@/data/states";
import { vacanciesForStateId } from "@/data/jobRegion";
import { useLiveJobs } from "@/hooks/useLiveJobs";
import { FEED_POOL } from "@/data/feed";
import Ticker from "@/components/layout/Ticker";
import Navbar from "@/components/layout/Navbar";
import HomePage from "@/components/home/HomePage";
import JobsStatusBar from "@/components/home/JobsStatusBar";
import JobDetail from "@/components/jobs/JobDetail";
import { scrollToSection } from "@/utils/scrollToSection";

const FEED_TICK_MS = 18_000;
const INITIAL_FEED_SIZE = 6;
const FEED_MAX = 30;

const COLOR_MODE_KEY = "bharatnaukri-color-mode";

export default function App() {
  const { i18n } = useTranslation();
  const { jobs, loading: jobsLoading, staticCount, liveCount, sources, hasBackend, error: jobsError } = useLiveJobs();
  const [view, setView] = useState("home");
  const [selectedState, setSelectedState] = useState(null);
  const [activeCat, setActiveCat] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [search, setSearch] = useState("");
  const [headlinesTopicKey, setHeadlinesTopicKey] = useState(null);
  const [colorMode, setColorMode] = useState(() => {
    try {
      const v = localStorage.getItem(COLOR_MODE_KEY);
      if (v === "night") {
        localStorage.setItem(COLOR_MODE_KEY, "dark");
        return "dark";
      }
      if (v === "bw") return "bw";
      if (v === "dark") return "dark";
      return "bw";
    } catch {
      return "bw";
    }
  });

  const onColorModeChange = useCallback((next) => {
    try {
      localStorage.setItem(COLOR_MODE_KEY, next);
    } catch {
      /* ignore */
    }
    // Apply before setState so the next paint uses updated `DS` (effects run after paint).
    applyColorMode(next);
    setColorMode(next);
  }, []);

  useLayoutEffect(() => {
    applyColorMode(colorMode);
    document.documentElement.dataset.colorMode = colorMode;
  }, [colorMode]);

  const [feedItems, setFeedItems] = useState(() =>
    FEED_POOL.slice(0, INITIAL_FEED_SIZE).map((f, i) => ({ ...f, time: Date.now() - i * 120_000 }))
  );

  /** Prepend latest official RSS snapshot (from `npm run fetch:official`) into the ticker when present. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/data/official-feed-items.json", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const json = await res.json();
        const rows = Array.isArray(json.items) ? json.items : [];
        if (!rows.length || cancelled) return;
        const extra = rows.slice(0, 12).map((it, i) => ({
          title: it.title,
          dept: it.sourceName || it.dept || "Official",
          type: "new",
          state: it.state || "All India",
          time: Date.now() - (i + 1) * 90_000,
        }));
        setFeedItems((prev) => [...extra, ...prev].slice(0, FEED_MAX));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto job feed - rotates through FEED_POOL every FEED_TICK_MS.
  useEffect(() => {
    let idx = INITIAL_FEED_SIZE;
    const t = setInterval(() => {
      const item = { ...FEED_POOL[idx % FEED_POOL.length], time: Date.now() };
      setFeedItems((prev) => [item, ...prev].slice(0, FEED_MAX));
      idx++;
    }, FEED_TICK_MS);
    return () => clearInterval(t);
  }, []);

  /** Per-state vacancy totals — same attribution as the state-filtered job list (nationwide-all-states jobs excluded). */
  const stateCounts = useMemo(() => {
    const c = {};
    STATES.forEach((s) => {
      c[s.id] = jobs.reduce((sum, j) => sum + vacanciesForStateId(j, s.id), 0);
    });
    return c;
  }, [jobs]);

  const mapStateData = useMemo(
    () =>
      STATES.map((state) => ({
        id: toSvgStateId(state.id),
        name: state.n,
        fill: "#ffffff",
        customData: {
          name: state.n,
          jobs: (stateCounts[state.id] || 0).toLocaleString(),
        },
      })),
    [stateCounts]
  );

  const handleJobClick = (job) => {
    setSelectedJob(job);
    window.scrollTo(0, 0);
  };
  const handleSearch = useCallback(() => {
    setView("jobs");
    setSelectedJob(null);
    setSelectedState(null);
    setActiveCat(null);
    setHeadlinesTopicKey(null);
    scrollToSection("main-jobs");
  }, []);

  const handleNavigate = useCallback(
    (nextView) => {
      setView(nextView);
      setSelectedJob(null);

      if (nextView === "admit-card") {
        setHeadlinesTopicKey("admit-card");
      } else if (nextView === "results") {
        setHeadlinesTopicKey(null);
      } else if (nextView !== "alert") {
        setHeadlinesTopicKey(null);
      }

      if (nextView === "jobs") {
        setSelectedState(null);
        setActiveCat(null);
      }

      const sectionByView = {
        home: null,
        jobs: "main-jobs",
        results: "official-headlines",
        "admit-card": "official-headlines",
        alert: "alert-section",
      };

      const sectionId = sectionByView[nextView];
      if (sectionId) {
        scrollToSection(sectionId);
      } else if (nextView === "home") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    []
  );

  const handleFooterLink = useCallback((target) => {
    setSelectedJob(null);
    if (target.view) setView(target.view);
    else if (target.section === "main-jobs" || target.section === "state-jobs-panel") setView("jobs");
    else if (target.section === "official-headlines") setView("results");
    else if (target.section === "alert-section") setView("alert");

    if (target.topicKey !== undefined) setHeadlinesTopicKey(target.topicKey);
    if (target.view === "admit-card") setHeadlinesTopicKey("admit-card");

    if (target.section === "main-jobs") {
      setSelectedState(null);
      setActiveCat(null);
      scrollToSection("main-jobs");
      return;
    }

    if (target.state) {
      setSelectedState(target.state);
      if (target.category) setActiveCat(target.category);
      else setActiveCat(null);
      scrollToSection("state-jobs-panel");
      return;
    }

    if (target.category) {
      setSelectedState(null);
      setActiveCat(target.category);
      scrollToSection("main-jobs");
      return;
    }

    if (target.section) scrollToSection(target.section);
  }, []);

  return (
    <>
      <div className="app-shell">
        <Ticker feedItems={feedItems} />
        <Navbar
          view={view}
          onNavigate={handleNavigate}
          search={search}
          setSearch={setSearch}
          onSearch={handleSearch}
          colorMode={colorMode}
          onColorModeChange={onColorModeChange}
        />
        <div style={{ flex: 1 }}>
          {!selectedJob && (
            <div style={{ padding: "10px 20px 0", maxWidth: 1240, margin: "0 auto" }}>
              <JobsStatusBar
                loading={jobsLoading}
                staticCount={staticCount}
                liveCount={liveCount}
                sources={sources}
                hasBackend={hasBackend}
                error={jobsError}
              />
            </div>
          )}
          {selectedJob ? (
            <JobDetail key={`${selectedJob.id}-${i18n.language}`} job={selectedJob} onClose={() => setSelectedJob(null)} />
          ) : (
            <HomePage
              jobs={jobs}
              jobsLoading={jobsLoading}
              staticCount={staticCount}
              liveCount={liveCount}
              selectedState={selectedState}
              setSelectedState={setSelectedState}
              activeCat={activeCat}
              setActiveCat={setActiveCat}
              stateCounts={stateCounts}
              onJobClick={handleJobClick}
              search={search}
              setSearch={setSearch}
              mapStateData={mapStateData}
              onFooterLink={handleFooterLink}
              headlinesTopicKey={headlinesTopicKey}
              setHeadlinesTopicKey={setHeadlinesTopicKey}
            />
          )}
        </div>
      </div>
    </>
  );
}

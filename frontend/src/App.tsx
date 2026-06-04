import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { applyColorMode } from "@/theme/designSystem";
import { STATES, toSvgStateId } from "@/data/states";
import { computeJobAggregates } from "@/utils/jobAggregates";
import { useStateLabel } from "@/utils/stateLabels";
import { useLiveJobs } from "@/hooks/useLiveJobs";
import { dailySyncLabel } from "@/lib/dailySync";
import { FEED_POOL } from "@/data/feed";
import { loadOfficialFeed, feedItemsForTicker } from "@/lib/officialFeed";
import Ticker from "@/components/layout/Ticker";
import Navbar from "@/components/layout/Navbar";
import CategoryGrid from "@/components/jobs/CategoryGrid";
import { scrollToSection } from "@/utils/scrollToSection";

const HomePage = lazy(() => import("@/components/home/HomePage"));
const JobDetail = lazy(() => import("@/components/jobs/JobDetail"));

const FEED_TICK_MS = 18_000;
const INITIAL_FEED_SIZE = 6;
const FEED_MAX = 30;

const COLOR_MODE_KEY = "mygovtjobs-color-mode";

function PageFallback() {
  return <div className="page-fallback">Loading…</div>;
}

export default function App() {
  const { i18n, t } = useTranslation();
  const stateLabel = useStateLabel();
  const {
    jobs,
    loading: jobsLoading,
    liveCount,
    catalogStats,
    refresh: refreshJobs,
    dailySyncMeta,
    syncStatus,
  } = useLiveJobs();

  const dailySyncLine = useMemo(
    () => dailySyncLabel(dailySyncMeta, syncStatus, t),
    [dailySyncMeta, syncStatus, t]
  );
  const [view, setView] = useState("home");
  const [homeResetKey, setHomeResetKey] = useState(0);
  const [selectedState, setSelectedState] = useState(null);
  const [activeCat, setActiveCat] = useState(null);
  const [quickFilter, setQuickFilter] = useState(null);
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
    applyColorMode(next as "dark" | "bw");
    setColorMode(next);
  }, []);

  useLayoutEffect(() => {
    applyColorMode(colorMode as "dark" | "bw");
    document.documentElement.dataset.colorMode = colorMode;
  }, [colorMode]);

  const [feedItems, setFeedItems] = useState(() =>
    FEED_POOL.slice(0, INITIAL_FEED_SIZE).map((f, i) => ({ ...f, time: Date.now() - i * 120_000 }))
  );

  useEffect(() => {
    let cancelled = false;
    loadOfficialFeed().then((json) => {
      if (cancelled || !json) return;
      const extra = feedItemsForTicker(json, 12);
      if (!extra.length) return;
      setFeedItems((prev) => [...extra, ...prev].slice(0, FEED_MAX));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let idx = INITIAL_FEED_SIZE;
    const t = setInterval(() => {
      const item = { ...FEED_POOL[idx % FEED_POOL.length], time: Date.now() };
      setFeedItems((prev) => [item, ...prev].slice(0, FEED_MAX));
      idx++;
    }, FEED_TICK_MS);
    return () => clearInterval(t);
  }, []);

  const { stateCounts, categoryCounts } = useMemo(() => computeJobAggregates(jobs), [jobs]);

  const mapStateData = useMemo(
    () =>
      STATES.map((state) => {
        const label = stateLabel(state.id);
        return {
          id: toSvgStateId(state.id),
          name: label,
          fill: "#ffffff",
          customData: {
            name: label,
            listings: (stateCounts[state.id] || 0).toLocaleString(),
          },
        };
      }),
    [stateCounts, stateLabel]
  );

  const handleJobClick = useCallback((job) => {
    setSelectedJob(job);
    window.scrollTo(0, 0);
  }, []);

  const handleSearch = useCallback(() => {
    setView("jobs");
    setSelectedJob(null);
    setSelectedState(null);
    setActiveCat(null);
    setQuickFilter(null);
    setHeadlinesTopicKey(null);
    scrollToSection("main-jobs");
  }, []);

  const handleBrowseJobs = useCallback(() => {
    setView("jobs");
    setSelectedJob(null);
  }, []);

  const handleCategorySelect = useCallback(
    (catId) => {
      const next = activeCat === catId ? null : catId;
      setView("jobs");
      setSelectedJob(null);
      setSelectedState(null);
      setActiveCat(next);
      setQuickFilter(null);
      setSearch("");
      setHeadlinesTopicKey(null);
      setHomeResetKey((k) => k + 1);
      scrollToSection("main-jobs");
    },
    [activeCat]
  );

  const resetToHome = useCallback(() => {
    setView("home");
    setSelectedJob(null);
    setSelectedState(null);
    setActiveCat(null);
    setQuickFilter(null);
    setSearch("");
    setHeadlinesTopicKey(null);
    setHomeResetKey((k) => k + 1);
    refreshJobs();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [refreshJobs]);

  const handleNavigate = useCallback(
    (nextView) => {
      if (nextView === "home") {
        resetToHome();
        return;
      }

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
        setQuickFilter(null);
      }

      const sectionByView = {
        home: null,
        jobs: "main-jobs",
        results: "official-headlines",
        "admit-card": "official-headlines",
        alert: "alert-section",
      };

      const sectionId = sectionByView[nextView];
      if (sectionId) scrollToSection(sectionId);
    },
    [resetToHome]
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
      setQuickFilter(null);
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

  const handleCloseJob = useCallback(() => setSelectedJob(null), []);

  return (
    <>
      <div className="app-shell" key={i18n.resolvedLanguage || i18n.language}>
        <Ticker feedItems={feedItems} jobItems={jobs} />
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
            <div className="app-sector-browser">
              <CategoryGrid activeCat={activeCat} onSelectCategory={handleCategorySelect} counts={categoryCounts} />
            </div>
          )}
          <Suspense fallback={<PageFallback />}>
            {selectedJob ? (
              <JobDetail key={`${selectedJob.id}-${i18n.language}`} job={selectedJob} onClose={handleCloseJob} />
            ) : (
              <HomePage
                key={`home-${homeResetKey}-${i18n.resolvedLanguage || i18n.language}`}
                jobs={jobs}
                jobsLoading={jobsLoading}
                liveCount={liveCount}
                catalogStats={catalogStats}
                selectedState={selectedState}
                setSelectedState={setSelectedState}
                activeCat={activeCat}
                setActiveCat={setActiveCat}
                quickFilter={quickFilter}
                setQuickFilter={setQuickFilter}
                onBrowseJobs={handleBrowseJobs}
                stateCounts={stateCounts}
                onJobClick={handleJobClick}
                search={search}
                setSearch={setSearch}
                mapStateData={mapStateData}
                onFooterLink={handleFooterLink}
                headlinesTopicKey={headlinesTopicKey}
                setHeadlinesTopicKey={setHeadlinesTopicKey}
                dailySyncLine={dailySyncLine}
              />
            )}
          </Suspense>
        </div>
      </div>
      <SpeedInsights />
    </>
  );
}

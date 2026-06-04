import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { STATES, toSvgStateId } from "@/data/states";
import { isNationwideAllStatesJob, jobMatchesNationwideFilter, jobMatchesStateFilter } from "@/data/jobRegion";
import { jobMatchesSearch } from "@/utils/jobSearch";
import { scrollToSection } from "@/utils/scrollToSection";
import { useStateLabel } from "@/utils/stateLabels";
import { resolveJobQualification } from "@/utils/jobQualification";
import {
  QUICK_FILTER_KEYS,
  aggregateCountsByQuickFilter,
  computeEducationVacancySummary,
  jobMatchesEducationFilterKey,
} from "@/utils/educationVacancySummary";
import StateStrip from "@/components/jobs/StateStrip";
import JobCard from "@/components/jobs/JobCard";
import JobCardGrid from "@/components/jobs/JobCardGrid";
import AlertSection from "@/components/home/AlertSection";
import StateJobsPanel from "@/components/home/StateJobsPanel";
import NotificationsSidebar from "@/components/home/NotificationsSidebar";
import LatestNotificationsTable from "@/components/home/LatestNotificationsTable";
import Footer from "@/components/layout/Footer";

const IndiaSvgMap = lazy(() =>
  import("@/components/Maps/IndiaMap/IndiaMap").then((m) => ({ default: m.IndiaMap }))
);
const OfficialHeadlinesSection = lazy(() => import("@/components/home/OfficialHeadlinesSection"));

/** Default: show full filtered list (virtualized when large). Set false + limit for low-end devices. */
const INITIAL_JOB_LIMIT = 5000;
const VIRTUAL_GRID_MIN = 49;
/** Hero summary cards → job list filter (null = show all on home). */
const HERO_STAT_FILTERS = [
  { key: "vacancies", labelKey: "home.heroStatJobsVacancies" },
  { key: "hotNew", labelKey: "home.heroStatJobsHotNew" },
  { key: "states", labelKey: "home.heroStatJobsStates" },
  { key: "live", labelKey: "home.heroStatJobsLive" },
];

function jobMatchesHeroStatFilter(job, statKey) {
  switch (statKey) {
    case "vacancies":
      return vacancyCountForStats(job) > 0;
    case "hotNew":
      return job?.status === "hot" || job?.status === "new";
    case "states":
      if (isNationwideAllStatesJob(job)) return false;
      return STATES.some((s) => jobMatchesStateFilter(job, s.id));
    case "live":
      return String(job?.status || "live").toLowerCase() !== "expired";
    default:
      return true;
  }
}

function vacancyCountForStats(job) {
  return Number(job?.rawVacancies ?? job?.vacancies) || 0;
}

function EducationFilterPill({
  filterKey,
  active,
  counts,
  locale,
  onClick,
  t,
  compact = false,
}: {
  filterKey: string;
  active: boolean;
  counts: { listings: number; vacancies: number };
  locale: string;
  onClick: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
  compact?: boolean;
}) {
  const meta =
    counts.vacancies > 0
      ? t("home.browseEducationPillMeta", {
          count: counts.listings.toLocaleString(locale),
          vacancies: counts.vacancies.toLocaleString(locale),
          defaultValue: "{{count}} jobs · {{vacancies}} posts",
        })
      : t("home.browseEducationPillMetaJobs", {
          count: counts.listings.toLocaleString(locale),
          defaultValue: "{{count}} jobs",
        });

  return (
    <button
      type="button"
      onClick={onClick}
      title={meta}
      className={`home-edu-pill${active ? " home-edu-pill--active" : ""}${compact ? " home-edu-pill--compact" : ""}`}
    >
      <span className="home-edu-pill__title">{t(`quickFilter.${filterKey}`)}</span>
      <span className="home-edu-pill__meta">{meta}</span>
    </button>
  );
}

export default function HomePage({
  jobs = [],
  jobsLoading = false,
  liveCount = 0,
  catalogStats = null,
  selectedState,
  setSelectedState,
  activeCat,
  setActiveCat,
  quickFilter,
  setQuickFilter,
  onBrowseJobs,
  stateCounts,
  onJobClick,
  search,
  setSearch,
  mapStateData,
  onFooterLink,
  headlinesTopicKey = null,
  setHeadlinesTopicKey,
  dailySyncLine = "",
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en-IN" : i18n.language;
  const eduYear = new Date().getFullYear();
  const stateLabel = useStateLabel();
  const [sort, setSort] = useState("lastDate");
  /** Home default: show full job list (not collapsed behind “load more”). */
  const [showAll, setShowAll] = useState(true);
  /** Selected item in the left notifications sidebar (purely visual for now). */
  const [sidebarKey, setSidebarKey] = useState(null);
  /** Hero stat card filter: vacancies | hotNew | states | live | null = all jobs */
  const [heroStatFilter, setHeroStatFilter] = useState(null);
  const mapPanelRef = useRef<HTMLDivElement | null>(null);
  const [statePanelHeight, setStatePanelHeight] = useState<number | null>(null);

  const browseToJobs = useCallback(() => {
    setShowAll(true);
    onBrowseJobs?.();
    const target = selectedState && !search.trim() ? "state-jobs-panel" : "main-jobs";
    scrollToSection(target);
  }, [onBrowseJobs, selectedState, search, setShowAll]);

  const handleQuickFilterClick = useCallback(
    (key) => {
      const next = quickFilter === key ? null : key;
      setHeroStatFilter(null);
      setQuickFilter(next);
      if (next) browseToJobs();
    },
    [quickFilter, setQuickFilter, browseToJobs]
  );

  const handleStateSelect = useCallback(
    (stateId) => {
      setHeroStatFilter(null);
      setSelectedState(stateId);
      if (stateId) {
        setShowAll(true);
        onBrowseJobs?.();
        scrollToSection("state-jobs-panel");
      }
    },
    [setSelectedState, onBrowseJobs, setShowAll]
  );

  const handleHeroStatClick = useCallback(
    (statKey) => {
      const next = heroStatFilter === statKey ? null : statKey;
      setHeroStatFilter(next);
      if (!next) return;
      setSelectedState(null);
      setActiveCat(null);
      setQuickFilter(null);
      if (typeof setSearch === "function") setSearch("");
      setSidebarKey(null);
      if (typeof setHeadlinesTopicKey === "function") setHeadlinesTopicKey(null);
      setShowAll(true);
      onBrowseJobs?.();
      if (statKey === "states") {
        scrollToSection("india-map-panel");
      } else {
        scrollToSection("main-jobs");
      }
    },
    [heroStatFilter, setSelectedState, setActiveCat, setQuickFilter, setSearch, setHeadlinesTopicKey, onBrowseJobs]
  );

  const clearListFilters = useCallback(() => {
    setHeroStatFilter(null);
    setSelectedState(null);
    setActiveCat(null);
    setQuickFilter(null);
    if (typeof setSearch === "function") setSearch("");
    setSidebarKey(null);
    if (typeof setHeadlinesTopicKey === "function") setHeadlinesTopicKey(null);
  }, [setSelectedState, setActiveCat, setQuickFilter, setSearch, setHeadlinesTopicKey, setSidebarKey]);

  const handleEducationFromCard = useCallback(
    (eduKey) => {
      setQuickFilter(eduKey);
      setShowAll(true);
      onBrowseJobs?.();
      scrollToSection(selectedState && !search.trim() ? "state-jobs-panel" : "main-jobs");
    },
    [setQuickFilter, onBrowseJobs, selectedState, search, setShowAll]
  );

  const jobCardFilterProps = {
    onEducationClick: handleEducationFromCard,
    onStateClick: handleStateSelect,
  };

  const handleSidebarSelect = (key) => {
    const next = sidebarKey === key ? null : key;
    setSidebarKey(next);
    if (key !== "latest" && typeof setHeadlinesTopicKey === "function") {
      setHeadlinesTopicKey((prev) => (prev === key ? null : key));
    } else if (key === "latest" && typeof setHeadlinesTopicKey === "function") {
      setHeadlinesTopicKey(null);
    }
    if (key === "latest") {
      setSelectedState(null);
      setActiveCat(null);
      setHeroStatFilter(null);
      setQuickFilter(null);
      if (typeof setSearch === "function") setSearch("");
      setShowAll(true);
      onBrowseJobs?.();
      scrollToSection("main-jobs");
    }
  };

  const effectiveTopicKey =
    headlinesTopicKey === "latest" || sidebarKey === "latest"
      ? null
      : headlinesTopicKey ?? sidebarKey;
  const showLatestTable =
    (sidebarKey === "latest" || headlinesTopicKey === "latest") &&
    !selectedState &&
    !activeCat &&
    !search.trim() &&
    !quickFilter &&
    !heroStatFilter;
  const sidebarActiveKey = sidebarKey || (headlinesTopicKey === "latest" ? "latest" : null);

  useEffect(() => {
    if (search.trim() || activeCat || quickFilter || heroStatFilter || selectedState) {
      setShowAll(true);
    }
  }, [selectedState, activeCat, search, quickFilter, heroStatFilter]);

  useEffect(() => {
    setQuickFilter(null);
  }, [selectedState, setQuickFilter]);

  useEffect(() => {
    if (!selectedState) {
      setStatePanelHeight(null);
      return;
    }

    const node = mapPanelRef.current;
    if (!node) return;

    let frame = 0;
    const updateHeight = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = Math.ceil(node.getBoundingClientRect().height);
        setStatePanelHeight((current) => (Math.abs((current ?? 0) - next) > 1 ? next : current));
      });
    };

    updateHeight();

    const Observer = window.ResizeObserver;
    const observer = Observer ? new Observer(updateHeight) : null;
    observer?.observe(node);
    window.addEventListener("resize", updateHeight);

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", updateHeight);
    };
  }, [selectedState]);

  const filtered = useMemo(() => {
    let j = [...jobs];

    if (selectedState && !search.trim()) {
      j = j.filter((x) => jobMatchesStateFilter(x, selectedState));
    }

    if (search.trim()) {
      j = j.filter((x) => jobMatchesSearch(x, search));
    }

    if (activeCat) j = j.filter((x) => x.category === activeCat);

    if (quickFilter) {
      j = j.filter((x) => {
        if ((x as { eduFilterKey?: string }).eduFilterKey === quickFilter) return true;
        const q = resolveJobQualification(x);
        if (q.key === quickFilter) return true;
        return jobMatchesEducationFilterKey(x, quickFilter);
      });
    }

    if (heroStatFilter) {
      j = j.filter((x) => jobMatchesHeroStatFilter(x, heroStatFilter));
    }

    if (sort === "vacancies") j.sort((a, b) => b.vacancies - a.vacancies);
    else if (sort === "lastDate") {
      j.sort((a, b) => {
        const aExpired = a.status === "expired" ? 1 : 0;
        const bExpired = b.status === "expired" ? 1 : 0;
        if (aExpired !== bExpired) return aExpired - bExpired;
        return new Date(String(a.lastDate)).getTime() - new Date(String(b.lastDate)).getTime();
      });
    }

    return j;
  }, [jobs, selectedState, activeCat, sort, search, quickFilter, heroStatFilter]);

  /** Plain official wire list — hidden on default home; jobs live in the panel below */
  const showOfficialHeadlines = Boolean(effectiveTopicKey);
  const showJobCardGrid = !showLatestTable && filtered.length > 0;

  const nationwideForState = useMemo(() => {
    if (!selectedState || search.trim() || activeCat || quickFilter) return [];
    let j = jobs.filter((x) => jobMatchesNationwideFilter(x));
    if (sort === "vacancies") j.sort((a, b) => b.vacancies - a.vacancies);
    else if (sort === "lastDate") {
      j.sort((a, b) => {
        const aExpired = a.status === "expired" ? 1 : 0;
        const bExpired = b.status === "expired" ? 1 : 0;
        if (aExpired !== bExpired) return aExpired - bExpired;
        return new Date(String(a.lastDate)).getTime() - new Date(String(b.lastDate)).getTime();
      });
    }
    return j.slice(0, 16);
  }, [jobs, selectedState, sort, search, activeCat, quickFilter]);

  const displayed = showAll ? filtered : filtered.slice(0, INITIAL_JOB_LIMIT);
  const totalListings = jobs.length;
  const quickFilterCounts = useMemo(() => {
    const summary = computeEducationVacancySummary(jobs);
    return aggregateCountsByQuickFilter(summary);
  }, [jobs]);
  const heroStats = useMemo(() => {
    let posts = 0;
    let withPostCount = 0;
    let hotNew = 0;
    let stateListings = 0;
    const statesWithListings = new Set();
    let live = 0;
    for (const job of jobs) {
      const vacancies = vacancyCountForStats(job);
      if (vacancies > 0) withPostCount += 1;
      if (vacancies > 0) posts += vacancies;
      if (job?.status === "hot" || job?.status === "new") hotNew += 1;
      const matchedStates = STATES.filter((s) => jobMatchesStateFilter(job, s.id));
      if (matchedStates.length) {
        stateListings += 1;
        matchedStates.forEach((s) => statesWithListings.add(s.id));
      }
      if (jobMatchesHeroStatFilter(job, "live")) live += 1;
    }
    const catalogVacancies = Number(catalogStats?.vacancies) || 0;
    const catalogNoticesWithVacancies = Number(catalogStats?.noticesWithVacancies) || 0;
    const catalogTotalNotices = Number(catalogStats?.totalNotices) || 0;
    const catalogLiveNotices = Number(catalogStats?.liveNotices) || 0;

    return {
      posts: catalogVacancies || posts,
      withPostCount: catalogNoticesWithVacancies || withPostCount,
      hotNew,
      states: statesWithListings.size,
      stateListings,
      live: catalogLiveNotices || catalogTotalNotices || live,
    };
  }, [jobs, catalogStats]);
  const stateName = selectedState ? stateLabel(selectedState) : "";
  const stateFilteredVac = selectedState ? filtered.reduce((s, j) => s + vacancyCountForStats(j), 0) : 0;
  const stateFilteredCount = selectedState ? filtered.length : 0;

  return (
    <div>
      {/* Row 1 — state strip only (under navbar) */}
      <div className="home-subheader">
        <div className="home-subheader__inner">
          <StateStrip variant="subheader" selected={selectedState} onSelect={handleStateSelect} stateCounts={stateCounts} />
        </div>
      </div>

      {/* Row 2 — tagline (hidden while a state is selected — “jobs scroll” mode) */}
      <section className="home-page-main">
        {!selectedState && (
          <div className="home-hero-tagline">
            <div className="home-hero-tagline__rule" aria-hidden />
            <span className="home-hero-tagline__text">{t("home.tagline")}</span>
          </div>
        )}

        {selectedState && (
          <div className="home-state-filters">
            <div className="home-state-filters__label">{t("home.filterListings")}</div>
            <div className="home-state-filters__pills">
              {QUICK_FILTER_KEYS.map((f) => (
                <EducationFilterPill
                  key={f}
                  filterKey={f}
                  active={quickFilter === f}
                  counts={quickFilterCounts[f] ?? { listings: 0, vacancies: 0 }}
                  locale={locale}
                  onClick={() => handleQuickFilterClick(f)}
                  t={t}
                  compact
                />
              ))}
            </div>
          </div>
        )}

        <div className={`home-hero-grid${selectedState ? " home-hero-grid--state" : ""}`}>
          {/* Left – Notifications sidebar (hidden in state drill-down for space) */}
          {!selectedState && <NotificationsSidebar activeKey={sidebarActiveKey} onSelect={handleSidebarSelect} />}

          {/* Middle – Map */}
          <div id="india-map-panel" ref={mapPanelRef}>
            <div className="home-map-block">
              <div className="home-map-block__head">
                <div className="home-map-block__title-row">
                  <span className="home-map-block__dot" aria-hidden />
                  <span className="home-map-block__title">
                    {stateName ? t("home.jobMap", { state: stateName }) : t("home.allIndiaJobMap")}
                  </span>
                </div>
                {selectedState && (
                  <button
                    type="button"
                    className="home-map-block__clear"
                    onClick={() => {
                      setHeroStatFilter(null);
                      setSelectedState(null);
                    }}
                  >
                    {t("home.clear")}
                  </button>
                )}
              </div>

              {selectedState && (
                <div className="home-map-block__banner">
                  <div>
                    <div className="home-map-block__banner-label">📍 {stateName}</div>
                    <div className="home-map-block__banner-region">
                      {t("home.region")} {STATES.find((s) => s.id === selectedState)?.reg}
                    </div>
                  </div>
                  <div className="home-map-block__banner-stat">
                    <div className="home-map-block__banner-num">{stateFilteredVac.toLocaleString("en-IN")}</div>
                    <div className="home-map-block__banner-meta">{t("home.vacanciesFiltered")}</div>
                    <div className="home-map-block__banner-sub">{t("home.listing", { count: stateFilteredCount })}</div>
                  </div>
                </div>
              )}

              <div className="home-map-shell">
                <Suspense fallback={<div className="home-map-shell-fallback">Loading map…</div>}>
                  <IndiaSvgMap
                    stateData={mapStateData}
                    selectionSyncKey={selectedState ?? ""}
                    onStateClick={(svgId) => {
                      const matched = STATES.find((state) => toSvgStateId(state.id) === svgId);
                      handleStateSelect(matched ? matched.id : null);
                    }}
                  />
                </Suspense>
              </div>
            </div>
          </div>

          {/* Right — marketing hero OR state job panel */}
          <div
            id="state-jobs-panel"
            className={selectedState ? "home-state-jobs-panel" : undefined}
            style={selectedState && statePanelHeight ? { height: statePanelHeight } : undefined}
          >
            {!selectedState ? (
              <>
                <header className="home-dream-job">
                  <h1 id="dream-job-heading" className="home-dream-job__title">
                    {t("home.dreamJobPrefix")}{" "}
                    <span className="home-dream-job__highlight">{t("home.dreamJobHighlight")}</span>
                  </h1>
                  <p className="home-dream-job__desc">
                    {t("home.heroDescFast", {
                      listings: totalListings,
                      defaultValue:
                        "Real-time government job alerts from UPSC, SSC, Railways, Banking, Police & more. Browse {{listings}} live recruitment notices from official sources.",
                    })}
                  </p>
                  <div className="home-first-visit">
                    <strong>{t("home.firstVisitTitle", { defaultValue: "New here?" })}</strong>
                    <span>
                      {t("home.firstVisitText", {
                        defaultValue:
                          "Start with the map, sector cards, or education filters. Every listing links back to an official notification.",
                      })}
                    </span>
                  </div>
                </header>

                <div style={{ marginBottom: 20 }}>
                  <div className="home-hero-stats">
                    {[
                      {
                        key: "vacancies",
                        v: heroStats.posts.toLocaleString("en-IN"),
                        l: t("home.totalNotifiedPosts", { count: heroStats.withPostCount }),
                        i: "📋",
                      },
                      { key: "hotNew", v: heroStats.hotNew.toLocaleString("en-IN"), l: t("home.hotNewTags"), i: "🔥" },
                      {
                        key: "states",
                        v: heroStats.states.toLocaleString("en-IN"),
                        l: t("home.statesMap", { count: heroStats.stateListings }),
                        i: "🗺️",
                      },
                      { key: "live", v: heroStats.live.toLocaleString("en-IN"), l: t("home.liveListings"), i: "📰" },
                    ].map(({ key, v, l, i }) => {
                      const on = heroStatFilter === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          className={`home-hero-stat${on ? " home-hero-stat--active" : ""}`}
                          aria-pressed={on}
                          onClick={() => handleHeroStatClick(key)}
                          title={on ? t("home.clearFilter") : l}
                        >
                          <div className="home-hero-stat__icon">{i}</div>
                          <div className="home-hero-stat__value">{v}</div>
                          <div className="home-hero-stat__label">{l}</div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="home-edu-panel">
                    <div className="home-edu-panel__head">
                      <h2 className="home-edu-panel__title">
                        {t("home.browseEducationYear", {
                          year: eduYear,
                          defaultValue: "Browse by Education · {{year}}",
                        })}
                      </h2>
                      {quickFilter && (
                        <button type="button" className="home-edu-panel__clear" onClick={() => setQuickFilter(null)}>
                          {t("home.clearFilter")}
                        </button>
                      )}
                    </div>
                    <div className="home-edu-panel__pills">
                      {QUICK_FILTER_KEYS.map((f) => (
                        <EducationFilterPill
                          key={f}
                          filterKey={f}
                          active={quickFilter === f}
                          counts={quickFilterCounts[f] ?? { listings: 0, vacancies: 0 }}
                          locale={locale}
                          onClick={() => handleQuickFilterClick(f)}
                          t={t}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <StateJobsPanel
                stateName={stateName}
                stateJobs={filtered}
                nationwideJobs={nationwideForState}
                sort={sort}
                onSortChange={setSort}
                onJobClick={onJobClick}
                {...jobCardFilterProps}
              />
            )}
          </div>
        </div>
      </section>

      {showOfficialHeadlines && (
        <Suspense fallback={null}>
          <OfficialHeadlinesSection
            stateId={selectedState}
            categoryId={activeCat}
            topicKey={effectiveTopicKey}
            search={search}
            onClearTopic={() => {
              setSidebarKey(null);
              if (typeof setHeadlinesTopicKey === "function") setHeadlinesTopicKey(null);
            }}
          />
        </Suspense>
      )}

      <section
        id="main-jobs"
        className={`home-jobs-section${selectedState && !search.trim() ? " home-jobs-section--hidden" : ""}`}
      >
          <div className="home-jobs-section__header">
            <div>
              <h2 className="home-jobs-section__title">
                {showLatestTable
                  ? t("sidebar.latest")
                  : selectedState
                    ? t("home.jobsInState", { state: stateName })
                    : activeCat
                      ? t("home.categoryJobs", { category: t(`category.${activeCat}`) })
                      : search
                        ? t("home.searchResults")
                        : heroStatFilter
                          ? t(HERO_STAT_FILTERS.find((h) => h.key === heroStatFilter)?.labelKey ?? "home.latestJobs")
                          : t("home.latestJobs")}
              </h2>
              <p className="home-jobs-section__meta">
                {showLatestTable
                  ? t("latestNotif.subtitle", {
                      defaultValue: "Post Date · Board · Post · Qualification · Advt No · Last Date",
                    })
                  : t("home.jobsMetaFast", {
                      count: filtered.length,
                      defaultValue: "{{count}} listings available",
                    })}
                {!showLatestTable && jobsLoading
                  ? ` · ${t("ticker.live")}…`
                  : !showLatestTable && liveCount > 0
                    ? ` · ${t("home.liveCount", { count: liveCount, defaultValue: "{{count}} official notices" })}`
                    : ""}
                {!showLatestTable && quickFilter ? ` · ${t(`quickFilter.${quickFilter}`)}` : ""}
                {!showLatestTable && heroStatFilter
                  ? ` · ${t(HERO_STAT_FILTERS.find((h) => h.key === heroStatFilter)?.labelKey ?? "")}`
                  : ""}
              </p>
              {!showLatestTable && dailySyncLine ? (
                <p className="home-jobs-section__sync">{dailySyncLine}</p>
              ) : null}
              {!showLatestTable && !selectedState && !activeCat && !search.trim() && !quickFilter && !heroStatFilter ? (
                <p className="home-jobs-section__hint">{t("home.showEverything")}</p>
              ) : null}
            </div>
            <div className="home-jobs-section__toolbar">
              {showLatestTable && (sidebarKey || headlinesTopicKey === "latest") && (
                <button
                  type="button"
                  onClick={() => {
                    setSidebarKey(null);
                    if (typeof setHeadlinesTopicKey === "function") setHeadlinesTopicKey(null);
                  }}
                  className="home-jobs-section__filter-btn"
                >
                  {t("home.clearAllFilters")}
                </button>
              )}
              {!showLatestTable && (selectedState || activeCat || search.trim() || quickFilter || heroStatFilter) && (
                <button type="button" onClick={clearListFilters} className="home-jobs-section__filter-btn">
                  {t("home.clearAllFilters")}
                </button>
              )}
              {!showLatestTable && (
                <>
              <span className="home-jobs-section__sort-label">{t("home.sort")}</span>
              {["lastDate", "vacancies"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSort(s)}
                  className={`home-jobs-section__sort-btn${sort === s ? " home-jobs-section__sort-btn--active" : ""}`}
                >
                  {s === "lastDate" ? t("home.deadline") : t("home.vacancies")}
                </button>
              ))}
                </>
              )}
            </div>
          </div>

          {showLatestTable ? (
            <LatestNotificationsTable jobs={jobs} loading={jobsLoading} onJobClick={onJobClick} />
          ) : filtered.length === 0 ? (
            <div className="home-jobs-empty">
              <div className="home-jobs-empty__icon">📭</div>
              <div className="home-jobs-empty__title">{t("home.noJobs")}</div>
              <div className="home-jobs-empty__hint">{t("home.noJobsHint")}</div>
            </div>
          ) : (
            <div className="home-jobs-section__panel" aria-label={t("home.latestJobs")}>
              {showJobCardGrid && displayed.length >= VIRTUAL_GRID_MIN ? (
                <JobCardGrid jobs={displayed} onJobClick={onJobClick} jobCardFilterProps={jobCardFilterProps} />
              ) : (
                <div className="home-jobs-grid home-jobs-grid--scroll">
                  {displayed.map((job) => (
                    <JobCard key={job.id} job={job} onClick={() => onJobClick(job)} {...jobCardFilterProps} />
                  ))}
                </div>
              )}
              {!showAll && filtered.length > INITIAL_JOB_LIMIT && (
                <div className="home-jobs-section__load-more">
                  <button
                    type="button"
                    onClick={() => setShowAll(true)}
                    className="home-jobs-section__load-more-btn"
                  >
                    {t("home.loadMore", { count: filtered.length - INITIAL_JOB_LIMIT })}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

      <AlertSection />
      <Footer onFooterLink={onFooterLink} />
    </div>
  );
}

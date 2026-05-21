import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DS } from "@/theme/designSystem";
import { STATES, toSvgStateId } from "@/data/states";
import { CATS } from "@/data/categories";
import { ALL_JOBS } from "@/data/jobs";
import { jobMatchesNationwideFilter, jobMatchesStateFilter } from "@/data/jobRegion";
import { jobMatchesSearch } from "@/utils/jobSearch";
import { scrollToSection } from "@/utils/scrollToSection";
import { useStateLabel } from "@/utils/stateLabels";
import { resolveJobQualification } from "@/utils/jobQualification";
import StateStrip from "@/components/jobs/StateStrip";
import CategoryGrid from "@/components/jobs/CategoryGrid";
import JobCard from "@/components/jobs/JobCard";
import JobCardGrid from "@/components/jobs/JobCardGrid";
import AlertSection from "@/components/home/AlertSection";
import StateJobsPanel from "@/components/home/StateJobsPanel";
import NotificationsSidebar from "@/components/home/NotificationsSidebar";
import LatestNotificationsTable from "@/components/home/LatestNotificationsTable";
import Footer from "@/components/layout/Footer";
import "./HomePage.css";

const IndiaSvgMap = lazy(() => import("@/components/Maps").then((m) => ({ default: m.IndiaMap })));
const OfficialHeadlinesSection = lazy(() => import("@/components/home/OfficialHeadlinesSection"));

/** Default: show full filtered list (virtualized when large). Set false + limit for low-end devices. */
const INITIAL_JOB_LIMIT = 5000;
const VIRTUAL_GRID_MIN = 49;
const QUICK_FILTER_KEYS = ["tenth", "twelfth", "graduate", "engineering", "defence", "banking", "police"];

/** Narrow state-mode job list by the quick pill (qualification / sector). */
const jobMatchesQuickFilter = (job, filterKey) => {
  const q = `${job.qual || ""} ${job.title || ""} ${job.dept || ""}`.toLowerCase();
  const cat = job.category;
  switch (filterKey) {
    case "tenth":
      return /\b10th\b|10\s*th|class\s*10|matric/i.test(q);
    case "twelfth":
      return /12th|10\s*\+\s*2|intermediate|10\+2|hsc\b/i.test(q);
    case "graduate":
      return /graduate|grad\.|b\.a|b\.sc|b\.com|b\.ed|degree|pg|post\s*grad|master/i.test(q);
    case "engineering":
      return /engineer|b\.tech|b\.e\.|m\.tech|gate|diploma\s*\(eng|ece|cse|mechanical|civil/i.test(q);
    case "defence":
      return cat === "defence";
    case "banking":
      return cat === "banking";
    case "police":
      return cat === "police";
    default:
      return true;
  }
};

export default function HomePage({
  jobs = ALL_JOBS,
  jobsLoading = false,
  staticCount = 0,
  liveCount = 0,
  selectedState,
  setSelectedState,
  activeCat,
  setActiveCat,
  quickFilter,
  setQuickFilter,
  onBrowseJobs,
  stateCounts,
  categoryCounts,
  onJobClick,
  search,
  setSearch,
  mapStateData,
  onFooterLink,
  headlinesTopicKey = null,
  setHeadlinesTopicKey,
}) {
  const { t } = useTranslation();
  const stateLabel = useStateLabel();
  const [sort, setSort] = useState("lastDate");
  const [showAll, setShowAll] = useState(true);
  /** Selected item in the left notifications sidebar (purely visual for now). */
  const [sidebarKey, setSidebarKey] = useState(null);

  const browseToJobs = useCallback(() => {
    setShowAll(true);
    onBrowseJobs?.();
    const target = selectedState && !search.trim() ? "state-jobs-panel" : "main-jobs";
    scrollToSection(target);
  }, [onBrowseJobs, selectedState, search]);

  const handleQuickFilterClick = useCallback(
    (key) => {
      const next = quickFilter === key ? null : key;
      setQuickFilter(next);
      if (next) browseToJobs();
    },
    [quickFilter, setQuickFilter, browseToJobs]
  );

  const handleCategorySelect = useCallback(
    (catId) => {
      const next = activeCat === catId ? null : catId;
      setActiveCat(next);
      if (next) browseToJobs();
    },
    [activeCat, setActiveCat, browseToJobs]
  );

  const handleStateSelect = useCallback(
    (stateId) => {
      setSelectedState(stateId);
      if (stateId) {
        setShowAll(true);
        onBrowseJobs?.();
        scrollToSection("state-jobs-panel");
      }
    },
    [setSelectedState, onBrowseJobs]
  );

  const handleEducationFromCard = useCallback(
    (eduKey) => {
      setQuickFilter(eduKey);
      setShowAll(true);
      onBrowseJobs?.();
      scrollToSection(selectedState && !search.trim() ? "state-jobs-panel" : "main-jobs");
    },
    [setQuickFilter, onBrowseJobs, selectedState, search]
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
    !quickFilter;
  const sidebarActiveKey = sidebarKey || (headlinesTopicKey === "latest" ? "latest" : null);

  useEffect(() => {
    if (search.trim() || activeCat || quickFilter) {
      setShowAll(true);
    } else {
      setShowAll(false);
    }
  }, [selectedState, activeCat, search, quickFilter]);

  useEffect(() => {
    setQuickFilter(null);
  }, [selectedState, setQuickFilter]);

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
        return jobMatchesQuickFilter(x, quickFilter);
      });
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
  }, [jobs, selectedState, activeCat, sort, search, quickFilter]);

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
  const totalVac = jobs.reduce((s, j) => s + j.vacancies, 0);
  const totalListings = jobs.length;
  const hotNewCount = jobs.filter((j) => j.status === "hot" || j.status === "new").length;
  const stateName = selectedState ? stateLabel(selectedState) : "";
  const stateFilteredVac = selectedState ? filtered.reduce((s, j) => s + j.vacancies, 0) : 0;
  const stateFilteredCount = selectedState ? filtered.length : 0;

  const categoryCountsResolved = categoryCounts ?? Object.fromEntries(CATS.map((c) => [c.id, 0]));

  return (
    <div>
      {/* Row 1 — state strip only (under navbar) */}
      <div
        className="home-subheader"
        style={{
          borderBottom: `1px solid ${DS.border}`,
          background: DS.sheetBg,
          backdropFilter: "blur(10px)",
        }}
      >
        <div
          className="home-subheader__inner"
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            padding: "10px 20px",
            width: "100%",
            minWidth: 0,
            overflowX: "auto",
          }}
        >
          <StateStrip variant="subheader" selected={selectedState} onSelect={handleStateSelect} stateCounts={stateCounts} />
        </div>
      </div>

      {/* Row 2 — tagline (hidden while a state is selected — “jobs scroll” mode) */}
      <section style={{ padding: "0 20px 28px", maxWidth: 1240, margin: "0 auto" }}>
        {!selectedState && (
          <div
            className="home-hero-tagline"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "8px 0 14px",
              marginBottom: 16,
              width: "100%",
            }}
          >
            <div style={{ height: 2, width: 28, background: DS.gradientRule, flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: DS.saffron, letterSpacing: 3, fontFamily: "monospace" }}>
              {t("home.tagline")}
            </span>
          </div>
        )}

        {selectedState && (
          <div
            style={{
              marginBottom: 20,
              paddingBottom: 16,
              borderBottom: `1px solid ${DS.border}`,
              width: "100%",
            }}
          >
            <div style={{ fontSize: 10.5, fontWeight: 700, color: DS.muted, letterSpacing: 1, fontFamily: "'Outfit',sans-serif", marginBottom: 10 }}>
              {t("home.filterListings")}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {QUICK_FILTER_KEYS.map((f) => {
                const on = quickFilter === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => handleQuickFilterClick(f)}
                    style={{
                      background: on ? DS.accentSoft : DS.bg2,
                      border: `1px solid ${on ? DS.accentBorderHi : DS.border}`,
                      borderRadius: 20,
                      padding: "5px 13px",
                      fontSize: 11.5,
                      color: on ? DS.saffron : DS.muted,
                      fontWeight: on ? 700 : 400,
                      cursor: "pointer",
                      fontFamily: "'Outfit',sans-serif",
                      transition: "all 0.12s",
                    }}
                  >
                    {t(`quickFilter.${f}`)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div
          className={`home-hero-grid${selectedState ? " home-hero-grid--state" : ""}`}
          style={{
            display: "grid",
            gridTemplateColumns: selectedState ? "minmax(260px, 1fr) minmax(340px, 1.15fr)" : "220px minmax(0, 1fr) minmax(0, 1fr)",
            gap: 24,
            alignItems: selectedState ? "stretch" : "start",
          }}
        >
          {/* Left – Notifications sidebar (hidden in state drill-down for space) */}
          {!selectedState && <NotificationsSidebar activeKey={sidebarActiveKey} onSelect={handleSidebarSelect} />}

          {/* Middle – Map */}
          <div style={{ width: "100%", maxWidth: "100%", margin: "0 auto" }}>
            <div style={{ width: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: DS.saffron, boxShadow: `0 0 8px ${DS.saffron}` }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: DS.white, fontFamily: "'Outfit',sans-serif" }}>
                    {stateName ? t("home.jobMap", { state: stateName }) : t("home.allIndiaJobMap")}
                  </span>
                </div>
                {selectedState && (
                  <button
                    type="button"
                    onClick={() => setSelectedState(null)}
                    style={{ background: "transparent", border: `1px solid ${DS.border}`, borderRadius: 7, padding: "3px 10px", fontSize: 11, color: DS.muted, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}
                  >
                    {t("home.clear")}
                  </button>
                )}
              </div>

              {selectedState && (
                <div style={{ background: DS.panelWarm, border: `1px solid ${DS.accentBorder}`, borderRadius: 12, padding: "10px 14px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 12, color: DS.saffron, fontWeight: 600, marginBottom: 2 }}>📍 {stateName}</div>
                    <div style={{ fontSize: 10.5, color: DS.muted }}>{t("home.region")} {STATES.find((s) => s.id === selectedState)?.reg}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: DS.saffron, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>
                      {stateFilteredVac.toLocaleString("en-IN")}
                    </div>
                    <div style={{ fontSize: 9.5, color: DS.muted }}>{t("home.vacanciesFiltered")}</div>
                    <div style={{ fontSize: 9, color: DS.muted, marginTop: 2 }}>{t("home.listing", { count: stateFilteredCount })}</div>
                  </div>
                </div>
              )}

              <div style={{ background: DS.bg1, border: `1px solid ${DS.border}`, borderRadius: 14, padding: 10, overflow: "visible" }}>
                <Suspense fallback={<div style={{ minHeight: 280, color: DS.muted, fontSize: 12 }}>Loading map…</div>}>
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
          <div id="state-jobs-panel" className={selectedState ? "home-state-jobs-panel" : undefined} style={selectedState ? { minWidth: 0, scrollMarginTop: 80 } : undefined}>
            {!selectedState ? (
              <>
                <header style={{ marginBottom: 16, width: "100%" }}>
                  <h1
                    id="dream-job-heading"
                    style={{
                      fontSize: "clamp(24px, 3.4vw, 34px)",
                      fontWeight: 900,
                      color: DS.white,
                      fontFamily: "'Sora',sans-serif",
                      lineHeight: 1.12,
                      marginBottom: 10,
                      letterSpacing: 0.3,
                    }}
                  >
                    {t("home.dreamJobPrefix")} <span style={{ color: DS.saffron }}>{t("home.dreamJobHighlight")}</span>
                  </h1>
                  <p
                    style={{
                      fontSize: 14,
                      color: DS.mutedHi,
                      lineHeight: 1.65,
                      maxWidth: "none",
                      fontFamily: "'Outfit',sans-serif",
                      margin: 0,
                    }}
                  >
                    {t("home.heroDesc", { vacancies: totalVac.toLocaleString("en-IN"), listings: totalListings })}
                  </p>
                </header>

                <div style={{ marginBottom: 20 }}>
                  <div className="home-hero-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 10 }}>
                    {[
                      { v: totalVac.toLocaleString("en-IN"), l: t("home.activeVacancies"), i: "📋" },
                      { v: hotNewCount.toLocaleString("en-IN"), l: t("home.hotNewTags"), i: "🔥" },
                      { v: STATES.length.toLocaleString("en-IN"), l: t("home.statesMap"), i: "🗺️" },
                      { v: totalListings.toLocaleString("en-IN"), l: t("home.liveListings"), i: "📰" },
                    ].map(({ v, l, i }) => (
                      <div key={l} style={{ background: DS.bg1, border: `1px solid ${DS.border}`, borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
                        <div style={{ fontSize: 16, marginBottom: 4 }}>{i}</div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: DS.saffron, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>{v}</div>
                        <div style={{ fontSize: 9.5, color: DS.muted, marginTop: 4, fontFamily: "'Outfit',sans-serif" }}>{l}</div>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      background: DS.bg1,
                      border: `1px solid ${DS.border}`,
                      borderRadius: 12,
                      padding: "12px 14px 14px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 12 }}>
                      <h2 style={{ fontSize: 13, fontWeight: 800, color: DS.white, fontFamily: "'Sora',sans-serif", margin: 0, letterSpacing: 0.2 }}>{t("home.browseEducation")}</h2>
                      {quickFilter && (
                        <button
                          type="button"
                          onClick={() => setQuickFilter(null)}
                          style={{
                            background: "transparent",
                            border: `1px solid ${DS.borderHi}`,
                            borderRadius: 8,
                            padding: "4px 10px",
                            fontSize: 10.5,
                            color: DS.mutedHi,
                            cursor: "pointer",
                            fontFamily: "'Outfit',sans-serif",
                            flexShrink: 0,
                          }}
                        >
                          {t("home.clearFilter")}
                        </button>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      {QUICK_FILTER_KEYS.map((f) => {
                        const on = quickFilter === f;
                        return (
                          <button
                            key={f}
                            type="button"
                            onClick={() => handleQuickFilterClick(f)}
                            style={{
                              background: on ? DS.accentSoft : DS.bg2,
                              border: `1px solid ${on ? DS.accentBorderHi : DS.border}`,
                              borderRadius: 20,
                              padding: "6px 14px",
                              fontSize: 11.5,
                              color: on ? DS.saffron : DS.mutedHi,
                              fontWeight: on ? 700 : 500,
                              cursor: "pointer",
                              fontFamily: "'Outfit',sans-serif",
                              transition: "background 0.12s, border-color 0.12s, color 0.12s",
                            }}
                          >
                            {t(`quickFilter.${f}`)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <CategoryGrid activeCat={activeCat} onSelectCategory={handleCategorySelect} counts={categoryCountsResolved} />
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

      <section
        id="main-jobs"
        style={{
          padding: "12px 20px 40px",
          maxWidth: 1240,
          margin: "0 auto",
          display: selectedState && !search.trim() ? "none" : "block",
          scrollMarginTop: 80,
        }}
      >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: DS.white, fontFamily: "'Sora',sans-serif", margin: "0 0 3px" }}>
                {showLatestTable
                  ? t("sidebar.latest")
                  : selectedState
                    ? t("home.jobsInState", { state: stateName })
                    : activeCat
                      ? t("home.categoryJobs", { category: t(`category.${activeCat}`) })
                      : search
                        ? t("home.searchResults")
                        : t("home.latestJobs")}
              </h2>
              <p style={{ fontSize: 12, color: DS.muted, fontFamily: "'Outfit',sans-serif", margin: 0 }}>
                {showLatestTable
                  ? t("latestNotif.subtitle", {
                      defaultValue: "Post Date · Board · Post · Qualification · Advt No · Last Date",
                    })
                  : t("home.jobsMeta", {
                      count: filtered.length,
                      vacancies: filtered.reduce((s, j) => s + j.vacancies, 0).toLocaleString("en-IN"),
                    })}
                {!showLatestTable && jobsLoading
                  ? ` · ${t("ticker.live")}…`
                  : !showLatestTable && liveCount > 0
                    ? ` · ${t("home.catalogMix", { demo: staticCount, live: liveCount })}`
                    : ""}
                {!showLatestTable && quickFilter ? ` · ${t(`quickFilter.${quickFilter}`)}` : ""}
              </p>
              {!showLatestTable && !selectedState && !activeCat && !search.trim() && !quickFilter ? (
                <p style={{ fontSize: 11, color: DS.muted, fontFamily: "'Outfit',sans-serif", margin: "6px 0 0" }}>
                  {t("home.showEverything")}
                </p>
              ) : null}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {showLatestTable && (sidebarKey || headlinesTopicKey === "latest") && (
                <button
                  type="button"
                  onClick={() => {
                    setSidebarKey(null);
                    if (typeof setHeadlinesTopicKey === "function") setHeadlinesTopicKey(null);
                  }}
                  style={{
                    background: DS.accentSoft,
                    border: `1px solid ${DS.accentBorder}`,
                    borderRadius: 8,
                    padding: "5px 12px",
                    fontSize: 11.5,
                    color: DS.saffron,
                    cursor: "pointer",
                    fontFamily: "'Outfit',sans-serif",
                    fontWeight: 600,
                  }}
                >
                  {t("home.clearAllFilters")}
                </button>
              )}
              {!showLatestTable && (selectedState || activeCat || search.trim() || quickFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedState(null);
                    setActiveCat(null);
                    setQuickFilter(null);
                    if (typeof setSearch === "function") setSearch("");
                  }}
                  style={{
                    background: DS.accentSoft,
                    border: `1px solid ${DS.accentBorder}`,
                    borderRadius: 8,
                    padding: "5px 12px",
                    fontSize: 11.5,
                    color: DS.saffron,
                    cursor: "pointer",
                    fontFamily: "'Outfit',sans-serif",
                    fontWeight: 600,
                  }}
                >
                  {t("home.clearAllFilters")}
                </button>
              )}
              {!showLatestTable && (
                <>
              <span style={{ fontSize: 11.5, color: DS.muted, fontFamily: "'Outfit',sans-serif" }}>{t("home.sort")}</span>
              {["lastDate", "vacancies"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSort(s)}
                  style={{
                    background: sort === s ? DS.accentSoft : "transparent",
                    border: `1px solid ${sort === s ? DS.accentBorder : DS.border}`,
                    borderRadius: 8,
                    padding: "5px 12px",
                    fontSize: 11.5,
                    color: sort === s ? DS.saffron : DS.muted,
                    cursor: "pointer",
                    fontFamily: "'Outfit',sans-serif",
                  }}
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
            <div style={{ textAlign: "center", padding: "60px 0", color: DS.muted, fontFamily: "'Outfit',sans-serif" }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6, color: DS.mutedHi }}>{t("home.noJobs")}</div>
              <div style={{ fontSize: 13 }}>{t("home.noJobsHint")}</div>
            </div>
          ) : (
            <>
              {displayed.length >= VIRTUAL_GRID_MIN ? (
                <JobCardGrid jobs={displayed} onJobClick={onJobClick} jobCardFilterProps={jobCardFilterProps} />
              ) : (
                <div className="home-jobs-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {displayed.map((job) => (
                    <JobCard key={job.id} job={job} onClick={() => onJobClick(job)} {...jobCardFilterProps} />
                  ))}
                </div>
              )}
              {!showAll && filtered.length > INITIAL_JOB_LIMIT && (
                <div style={{ textAlign: "center", marginTop: 20 }}>
                  <button
                    type="button"
                    onClick={() => setShowAll(true)}
                    style={{ background: DS.bg1, border: `1px solid ${DS.accentBorder}`, borderRadius: 12, padding: "12px 32px", fontSize: 13, fontWeight: 600, color: DS.saffron, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}
                  >
                    {t("home.loadMore", { count: filtered.length - INITIAL_JOB_LIMIT })}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

      <AlertSection />
      <Footer onFooterLink={onFooterLink} />
    </div>
  );
}

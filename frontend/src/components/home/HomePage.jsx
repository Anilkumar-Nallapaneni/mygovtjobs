import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DS } from "@/theme/designSystem";
import { STATES, toSvgStateId } from "@/data/states";
import { CATS } from "@/data/categories";
import { ALL_JOBS } from "@/data/jobs";
import { jobMatchesNationwideFilter, jobMatchesStateFilter } from "@/data/jobRegion";
import { jobMatchesSearch } from "@/utils/jobSearch";
import { IndiaMap as IndiaSvgMap } from "@/components/Maps";
import StateStrip from "@/components/jobs/StateStrip";
import CategoryGrid from "@/components/jobs/CategoryGrid";
import JobCard from "@/components/jobs/JobCard";
import AlertSection from "@/components/home/AlertSection";
import OfficialHeadlinesSection from "@/components/home/OfficialHeadlinesSection";
import StateJobsPanel from "@/components/home/StateJobsPanel";
import NotificationsSidebar from "@/components/home/NotificationsSidebar";
import Footer from "@/components/layout/Footer";
import "./HomePage.css";

const INITIAL_JOB_LIMIT = 48;
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
  stateCounts,
  onJobClick,
  search,
  setSearch,
  mapStateData,
}) {
  const { t } = useTranslation();
  const [sort, setSort] = useState("lastDate");
  const [showAll, setShowAll] = useState(true);
  /** Quick qualification / sector pills — filter job list (All India or state). */
  const [quickFilter, setQuickFilter] = useState(null);
  /** Selected item in the left notifications sidebar (purely visual for now). */
  const [sidebarKey, setSidebarKey] = useState(null);

  const handleSidebarSelect = (key) => {
    setSidebarKey((prev) => (prev === key ? null : key));
  };

  useEffect(() => {
    if (search.trim()) {
      setShowAll(true);
    } else {
      setShowAll(false);
    }
  }, [selectedState, activeCat, search, quickFilter]);

  useEffect(() => {
    setQuickFilter(null);
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
      j = j.filter((x) => jobMatchesQuickFilter(x, quickFilter));
    }

    if (sort === "vacancies") j.sort((a, b) => b.vacancies - a.vacancies);
    else if (sort === "lastDate") j.sort((a, b) => new Date(a.lastDate) - new Date(b.lastDate));

    return j;
  }, [jobs, selectedState, activeCat, sort, search, quickFilter]);

  const nationwideForState = useMemo(() => {
    if (!selectedState || search.trim() || activeCat || quickFilter) return [];
    let j = jobs.filter((x) => jobMatchesNationwideFilter(x));
    if (sort === "vacancies") j.sort((a, b) => b.vacancies - a.vacancies);
    else if (sort === "lastDate") j.sort((a, b) => new Date(a.lastDate) - new Date(b.lastDate));
    return j.slice(0, 16);
  }, [jobs, selectedState, sort, search, activeCat, quickFilter]);

  const displayed = showAll ? filtered : filtered.slice(0, INITIAL_JOB_LIMIT);
  const totalVac = jobs.reduce((s, j) => s + j.vacancies, 0);
  const totalListings = jobs.length;
  const hotNewCount = jobs.filter((j) => j.status === "hot" || j.status === "new").length;
  const stateName = selectedState ? STATES.find((s) => s.id === selectedState)?.n : "";
  const stateFilteredVac = selectedState ? filtered.reduce((s, j) => s + j.vacancies, 0) : 0;

  const categoryCounts = useMemo(
    () => Object.fromEntries(CATS.map((c) => [c.id, jobs.filter((j) => j.category === c.id).reduce((s, j) => s + j.vacancies, 0)])),
    [jobs]
  );

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
          <StateStrip variant="subheader" selected={selectedState} onSelect={setSelectedState} stateCounts={stateCounts} />
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
                    onClick={() => setQuickFilter((prev) => (prev === f ? null : f))}
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
          {!selectedState && <NotificationsSidebar activeKey={sidebarKey} onSelect={handleSidebarSelect} />}

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
                    <div style={{ fontSize: 9, color: DS.muted, marginTop: 2 }}>{t("home.listing", { count: filtered.length })}</div>
                  </div>
                </div>
              )}

              <div style={{ background: DS.bg1, border: `1px solid ${DS.border}`, borderRadius: 14, padding: 10, overflow: "visible" }}>
                <IndiaSvgMap
                  stateData={mapStateData}
                  selectionSyncKey={selectedState ?? ""}
                  onStateClick={(svgId) => {
                    const matched = STATES.find((state) => toSvgStateId(state.id) === svgId);
                    setSelectedState(matched ? matched.id : null);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Right — marketing hero OR state job panel */}
          <div className={selectedState ? "home-state-jobs-panel" : undefined} style={selectedState ? { minWidth: 0 } : undefined}>
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
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 10 }}>
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
                            onClick={() => setQuickFilter((prev) => (prev === f ? null : f))}
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
                    <CategoryGrid activeCat={activeCat} setActiveCat={setActiveCat} counts={categoryCounts} />
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
              />
            )}
          </div>
        </div>
      </section>

      <OfficialHeadlinesSection
        stateId={selectedState}
        categoryId={activeCat}
        topicKey={sidebarKey}
        search={search}
        onClearTopic={() => setSidebarKey(null)}
      />

      <section
        id="main-jobs"
        style={{
          padding: "12px 20px 40px",
          maxWidth: 1240,
          margin: "0 auto",
          display: selectedState && !search.trim() ? "none" : "block",
        }}
      >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: DS.white, fontFamily: "'Sora',sans-serif", margin: "0 0 3px" }}>
                {selectedState
                  ? t("home.jobsInState", { state: stateName })
                  : activeCat
                    ? t("home.categoryJobs", { category: t(`category.${activeCat}`) })
                    : search
                      ? t("home.searchResults")
                      : t("home.latestJobs")}
              </h2>
              <p style={{ fontSize: 12, color: DS.muted, fontFamily: "'Outfit',sans-serif", margin: 0 }}>
                {t("home.jobsMeta", {
                  count: filtered.length,
                  vacancies: filtered.reduce((s, j) => s + j.vacancies, 0).toLocaleString("en-IN"),
                })}
                {jobsLoading
                  ? ` · ${t("ticker.live")}…`
                  : liveCount > 0
                    ? ` · ${t("home.catalogMix", { demo: staticCount, live: liveCount })}`
                    : ""}
                {quickFilter ? ` · ${t(`quickFilter.${quickFilter}`)}` : ""}
              </p>
              {!selectedState && !activeCat && !search.trim() && !quickFilter ? (
                <p style={{ fontSize: 11, color: DS.muted, fontFamily: "'Outfit',sans-serif", margin: "6px 0 0" }}>
                  {t("home.showEverything")}
                </p>
              ) : null}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {(selectedState || activeCat || search.trim() || quickFilter) && (
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
            </div>
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: DS.muted, fontFamily: "'Outfit',sans-serif" }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6, color: DS.mutedHi }}>{t("home.noJobs")}</div>
              <div style={{ fontSize: 13 }}>{t("home.noJobsHint")}</div>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {displayed.map((job) => (
                  <JobCard key={job.id} job={job} onClick={() => onJobClick(job)} />
                ))}
              </div>
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
      <Footer />
    </div>
  );
}

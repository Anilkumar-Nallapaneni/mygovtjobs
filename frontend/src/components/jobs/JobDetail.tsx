import { Fragment, useEffect, useMemo, useRef } from "react";

import { useTranslation } from "react-i18next";

import { DS } from "@/theme/designSystem";

import { CATS } from "@/data/categories";

import { translateDateKey, translateFeeKey } from "@/utils/jobDetailLabels";

import { resolveOfficialApplyHref } from "@/utils/officialDomains";

import { buildJobDetailView } from "@/utils/jobDetailContent";



const DAY_MS = 1000 * 60 * 60 * 24;



function sumCategoryVacancies(categoryVacancies) {

  if (!categoryVacancies || typeof categoryVacancies !== "object") return 0;

  return Object.values(categoryVacancies).reduce((a: number, n) => a + (Number(n) || 0), 0);

}



function Section({ title, children }) {

  return (

    <div style={{ background: DS.bg1, border: `1px solid ${DS.border}`, borderRadius: 14, padding: "16px 18px", marginBottom: 12 }}>

      <h3 style={{ fontSize: 11, fontWeight: 700, color: DS.saffron, letterSpacing: 1.5, marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${DS.border}`, fontFamily: "'Outfit',sans-serif", textTransform: "uppercase", margin: "0 0 12px" }}>

        {title}

      </h3>

      {children}

    </div>

  );

}



function displayValue(v, fallback) {

  const s = String(v ?? "").trim();

  if (!s || /^(?:-|—|tba|pending|null|undefined)$/i.test(s)) return fallback;

  return s;

}

function isUsefulDisplayValue(v) {

  const s = String(v ?? "").trim();

  if (!s || /^(?:-|—|tba|pending|null|undefined)$/i.test(s)) return false;

  return !/^(?:see|as per)\s+(?:official\s+)?notification$/i.test(s);

}



export default function JobDetail({ job, onClose }) {

  const { t, i18n } = useTranslation();

  const panelRef = useRef(null);

  const view = useMemo(() => buildJobDetailView(job), [job]);

  const catColor = (CATS.find((c) => c.id === view.category) || { color: DS.saffron }).color;

  const lastDateMs = view.lastDate ? new Date(view.lastDate).getTime() : NaN;

  const nowMs = new Date().getTime();

  const daysLeft = Number.isFinite(lastDateMs) ? Math.ceil((lastDateMs - nowMs) / DAY_MS) : null;

  const isUrgent = daysLeft != null && daysLeft >= 0 && daysLeft <= 7;

  const postsVacSum = (view.posts || []).reduce((s, p) => s + (Number(p.vacancies) || 0), 0);

  const postsSumMismatch = view.posts?.length > 0 && postsVacSum !== (Number(view.vacancies) || 0);

  const dateLocale = i18n.language === "en" ? "en-IN" : i18n.language;



  const primaryOfficialHref = resolveOfficialApplyHref(view);
  const pdfHref = view.pdfUrl || (Array.isArray(view.pdfUrls) ? view.pdfUrls[0] : null);



  const missingDetailLabel = primaryOfficialHref
    ? t("job.postsCheckOfficial", { defaultValue: "See official" })
    : t("job.postsUnavailable", { defaultValue: "Not listed" });

  const postsLabel =

    view.vacancies > 0

      ? view.vacancies.toLocaleString(dateLocale)

      : missingDetailLabel;

  const statCards = [

    { l: t("jobDetail.totalPosts"), v: postsLabel, i: "📋" },

    { l: t("jobDetail.lastDateLabel"), v: displayValue(view.lastDate, missingDetailLabel), i: "📅" },

    ...(isUsefulDisplayValue(view.salary) ? [{ l: t("jobDetail.salary"), v: view.salary, i: "💰" }] : []),

    ...(isUsefulDisplayValue(view.age) ? [{ l: t("jobDetail.ageLimit"), v: view.age, i: "👤" }] : []),

  ];



  const dateEntries = Object.entries(view.dates || {}).filter(([, v]) => v && String(v).trim());

  const feeEntries = Object.entries(view.fee || {}).filter(([, v]) => v && String(v).trim());

  const eligibilityRows = [
    { label: t("jobDetail.qualification"), value: view.qual },
    { label: t("jobDetail.nationality"), value: view.nationality },
    { label: t("jobDetail.ageRelaxation"), value: view.ageRelax },
    { label: t("jobDetail.attempts"), value: view.attempts },
  ].filter(({ value }) => isUsefulDisplayValue(value));
  const extraDetails = Array.isArray(view.extraDetails)
    ? view.extraDetails.filter((row) => row?.label && isUsefulDisplayValue(row?.value))
    : [];

  const hasLinks = Boolean(primaryOfficialHref);
  const mockTestHref = `https://www.google.com/search?q=${encodeURIComponent(`${view.title} mock test`)}`;
  const linkBtnBase = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 12,
    minHeight: 46,
    padding: "11px 20px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    textDecoration: "none",
    fontFamily: "'Outfit',sans-serif",
    flex: "1 1 0",
    minWidth: 0,
  } as const;



  useEffect(() => {

    const onKey = (e) => {

      if (e.key === "Escape") onClose();

    };

    const prevOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    document.addEventListener("keydown", onKey);

    panelRef.current?.focus();

    return () => {

      document.removeEventListener("keydown", onKey);

      document.body.style.overflow = prevOverflow;

    };

  }, [onClose]);



  return (

    <div

      className="job-detail-overlay"

      style={{ background: DS.overlayScrim }}

      role="dialog"

      aria-modal="true"

      aria-label={view.title}

      onClick={(e) => {

        if (e.target === e.currentTarget) onClose();

      }}

    >

      <div ref={panelRef} className="job-detail-panel" tabIndex={-1}>

        <button

          type="button"

          onClick={onClose}

          style={{ background: DS.bg2, border: `1px solid ${DS.borderHi}`, borderRadius: 10, padding: "8px 16px", fontSize: 12, color: DS.mutedHi, cursor: "pointer", marginBottom: 14, fontFamily: "'Outfit',sans-serif", display: "flex", alignItems: "center", gap: 6 }}

        >

          {t("jobDetail.back")}

        </button>



        <div style={{ background: DS.bg1, border: `1px solid ${DS.border}`, borderRadius: 18, padding: "22px 24px", marginBottom: 12 }}>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>

            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: `${catColor}18`, color: catColor, border: `1px solid ${catColor}40` }}>

              {t(`category.${view.category}`).toUpperCase()}

            </span>

            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: DS.bg3, color: DS.mutedHi, border: `1px solid ${DS.borderHi}` }}>{view.type}</span>

            {view.status === "hot" && (

              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: DS.redSoftBg, color: DS.red, border: `1px solid ${DS.redSoftBorder}` }}>

                🔥 {t("job.hot")}

              </span>

            )}

            {isUrgent && (

              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: DS.redSoftBg, color: DS.red, border: `1px solid ${DS.redSoftBorder}` }}>

                ⚠️ {t("jobDetail.closingIn", { count: daysLeft })}

              </span>

            )}

          </div>

          <h1 style={{ fontSize: 21, fontWeight: 900, color: DS.white, fontFamily: "'Sora',sans-serif", lineHeight: 1.25, marginBottom: 6 }}>{view.title}</h1>

          <p style={{ fontSize: 13, color: DS.muted, fontFamily: "'Outfit',sans-serif", marginBottom: 16 }}>{view.dept}</p>



          <div className="job-detail-stats">

            {statCards.map(({ l, v, i }) => (

              <div key={l} style={{ background: DS.bg3, border: `1px solid ${DS.borderHi}`, borderRadius: 12, padding: "12px", textAlign: "center" }}>

                <div style={{ fontSize: 18, marginBottom: 5 }}>{i}</div>

                <div style={{ fontSize: 12, fontWeight: 800, color: DS.saffron, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.2 }}>{v}</div>

                <div style={{ fontSize: 9.5, color: DS.muted, marginTop: 4, fontFamily: "'Outfit',sans-serif" }}>{l}</div>

              </div>

            ))}

          </div>



        </div>



        {view.about ? (

          <Section title={t("jobDetail.aboutRecruitment")}>

            {view.highlights?.length > 0 ? (
              <div className="job-detail-highlights">
                {view.highlights.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            ) : null}

            <p style={{ fontSize: 13, color: DS.mutedHi, lineHeight: 1.7, margin: 0, fontFamily: "'Outfit',sans-serif" }}>{view.about}</p>

          </Section>

        ) : null}



        {dateEntries.length > 0 ? (

          <Section title={t("jobDetail.importantDates")}>

            <div className="job-detail-dates">

              {dateEntries.map(([k, v]) => (

                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${DS.border}` }}>

                  <span style={{ fontSize: 12, color: DS.muted, fontFamily: "'Outfit',sans-serif" }}>{translateDateKey(t, k)}</span>

                  <span style={{ fontSize: 12, fontWeight: 700, color: DS.white, fontFamily: "'JetBrains Mono',monospace" }}>{String(v)}</span>

                </div>

              ))}

            </div>

          </Section>

        ) : null}



        {view.posts?.length > 0 && (

          <Section title={t("jobDetail.postWiseVacancy")}>

            {postsSumMismatch && (

              <p style={{ fontSize: 11, color: DS.red, margin: "0 0 10px", fontFamily: "'Outfit',sans-serif", lineHeight: 1.5, background: DS.redSoftBg, border: `1px solid ${DS.redSoftBorder}`, borderRadius: 8, padding: "8px 10px" }}>

                {t("jobDetail.postsMismatch", { sum: postsVacSum.toLocaleString(dateLocale), total: (Number(view.vacancies) || 0).toLocaleString(dateLocale) })}

              </p>

            )}

            <p style={{ fontSize: 11, color: DS.muted, margin: "0 0 12px", fontFamily: "'Outfit',sans-serif", lineHeight: 1.5 }}>{t("jobDetail.postWiseHint")}</p>

            <div style={{ overflowX: "auto" }}>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>

                <thead>

                  <tr style={{ borderBottom: `1px solid ${DS.border}` }}>

                    <th style={{ textAlign: "left", padding: "6px 8px", color: DS.muted, fontFamily: "'Outfit',sans-serif", fontWeight: 600 }}>{t("jobDetail.postName")}</th>

                    <th style={{ textAlign: "right", padding: "6px 8px", color: DS.muted, fontFamily: "'Outfit',sans-serif", fontWeight: 600 }}>{t("home.vacancies")}</th>

                    <th style={{ textAlign: "right", padding: "6px 8px", color: DS.muted, fontFamily: "'Outfit',sans-serif", fontWeight: 600 }}>{t("jobDetail.payLevel")}</th>

                  </tr>

                </thead>

                <tbody>

                  {view.posts.map((p, i) => {

                    const cat = p.categoryVacancies;

                    const catSum = sumCategoryVacancies(cat);

                    const showCat = cat && typeof cat === "object" && Object.keys(cat).length > 0;

                    return (

                      <Fragment key={`post-${p.post || i}`}>

                        <tr style={{ borderBottom: showCat ? "none" : `1px solid ${DS.tableRowBorder}` }}>

                          <td style={{ padding: "9px 8px", color: DS.mutedHi, fontFamily: "'Outfit',sans-serif", verticalAlign: "top" }}>{p.post}</td>

                          <td style={{ padding: "9px 8px", textAlign: "right", color: DS.saffron, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, verticalAlign: "top" }}>{(p.vacancies || 0).toLocaleString(dateLocale)}</td>

                          <td style={{ padding: "9px 8px", textAlign: "right", color: DS.muted, fontSize: 11, verticalAlign: "top" }}>{p.pay}</td>

                        </tr>

                        {showCat && (

                          <tr style={{ borderBottom: `1px solid ${DS.tableRowBorder}` }}>

                            <td colSpan={3} style={{ padding: "0 8px 12px 16px", background: DS.bg0 }}>

                              <div style={{ fontSize: 10, fontWeight: 700, color: DS.saffron, letterSpacing: 0.8, marginBottom: 8, fontFamily: "'Outfit',sans-serif", textTransform: "uppercase" }}>{t("jobDetail.categoryWiseVacancy")}</div>

                              <table style={{ width: "100%", maxWidth: 420, borderCollapse: "collapse", fontSize: 11 }}>

                                <thead>

                                  <tr>

                                    <th style={{ textAlign: "left", padding: "5px 8px", color: DS.muted, fontWeight: 600, borderBottom: `1px solid ${DS.border}`, fontFamily: "'Outfit',sans-serif" }}>{t("jobDetail.categoryCol")}</th>

                                    <th style={{ textAlign: "right", padding: "5px 8px", color: DS.muted, fontWeight: 600, borderBottom: `1px solid ${DS.border}`, fontFamily: "'Outfit',sans-serif" }}>{t("job.posts")}</th>

                                  </tr>

                                </thead>

                                <tbody>

                                  {Object.entries(cat).map(([label, n]) => (

                                    <tr key={label}>

                                      <td style={{ padding: "6px 8px", color: DS.mutedHi, fontFamily: "'Outfit',sans-serif", borderBottom: `1px solid ${DS.tableRowBorder}` }}>{label}</td>

                                      <td style={{ padding: "6px 8px", textAlign: "right", color: DS.white, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, borderBottom: `1px solid ${DS.tableRowBorder}` }}>{Number(n).toLocaleString(dateLocale)}</td>

                                    </tr>

                                  ))}

                                  <tr>

                                    <td style={{ padding: "7px 8px", color: DS.muted, fontFamily: "'Outfit',sans-serif", fontWeight: 600 }}>{t("jobDetail.categoryTotal")}</td>

                                    <td style={{ padding: "7px 8px", textAlign: "right", color: DS.saffron, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>{Number(catSum).toLocaleString(dateLocale)}</td>

                                  </tr>

                                </tbody>

                              </table>

                            </td>

                          </tr>

                        )}

                      </Fragment>

                    );

                  })}

                </tbody>

              </table>

            </div>

          </Section>
        )}



        {view.selection?.length > 0 ? (

          <Section title={t("jobDetail.selectionProcess")}>

            <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>

              {view.selection.map((step, i) => (

                <li key={i} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>

                  <span style={{ width: 24, height: 24, borderRadius: "50%", background: `${DS.saffron}18`, border: `1px solid ${DS.saffron}40`, color: DS.saffron, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>

                  <span style={{ color: DS.mutedHi, fontFamily: "'Outfit',sans-serif" }}>{step}</span>

                </li>

              ))}

            </ol>

          </Section>

        ) : null}



        {view.howApply?.length > 0 ? (

          <Section title={t("jobDetail.howToApply")}>

            <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>

              {view.howApply.map((step, i) => (

                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13 }}>

                  <span style={{ color: DS.saffron, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, flexShrink: 0, marginTop: 1 }}>0{i + 1}</span>

                  <span style={{ color: DS.mutedHi, fontFamily: "'Outfit',sans-serif", lineHeight: 1.5 }}>{step}</span>

                </li>

              ))}

            </ol>

          </Section>

        ) : null}



        {(feeEntries.length > 0 || eligibilityRows.length > 0 || view.syllabus) && (

          <div
            className="job-detail-fee-grid"
            style={feeEntries.length > 0 ? undefined : { gridTemplateColumns: "1fr" }}
          >

            {feeEntries.length > 0 ? (

              <Section title={t("jobDetail.applicationFee")}>

                {feeEntries.map(([k, v]) => (

                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${DS.border}` }}>

                    <span style={{ fontSize: 12, color: DS.muted, fontFamily: "'Outfit',sans-serif" }}>{translateFeeKey(t, k)}</span>

                    <span style={{ fontSize: 12, fontWeight: 600, color: DS.white, fontFamily: "'Outfit',sans-serif" }}>{String(v)}</span>

                  </div>

                ))}

              </Section>

            ) : null}

            <Section title={t("jobDetail.eligibilityDetails")}>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

                {eligibilityRows.map(({ label, value }) => (
                  <div key={label} style={{ fontSize: 12, fontFamily: "'Outfit',sans-serif" }}>
                    <span style={{ color: DS.muted }}>{label} </span>
                    <span style={{ color: DS.mutedHi }}>{value}</span>
                  </div>
                ))}

                {view.syllabus ? (

                  <div style={{ fontSize: 12, fontFamily: "'Outfit',sans-serif" }}>

                    <span style={{ color: DS.muted }}>{t("jobDetail.syllabus")} </span>

                    <span style={{ color: DS.mutedHi }}>{view.syllabus}</span>

                  </div>

                ) : null}

              </div>

            </Section>

          </div>

        )}



        <Section title={t("jobDetail.officialLinks", { defaultValue: "Official Links" })}>
          {hasLinks ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {primaryOfficialHref && (
                <a href={primaryOfficialHref} target="_blank" rel="noopener noreferrer" style={{ ...linkBtnBase, background: DS.gradientBrand, border: "none", color: DS.inkOnBrand }}>
                  🌐 {t("jobDetail.applyOfficial")}
                </a>
              )}
              {pdfHref && pdfHref !== primaryOfficialHref && (
                <a href={pdfHref} target="_blank" rel="noopener noreferrer" style={{ ...linkBtnBase, background: DS.bg3, border: `1px solid ${DS.borderHi}`, color: DS.white }}>
                  📄 {t("jobDetail.downloadPdf")}
                </a>
              )}

              <a href={mockTestHref} target="_blank" rel="noopener noreferrer" style={{ ...linkBtnBase, background: DS.bg3, border: `1px solid ${DS.borderHi}`, color: DS.white }}>
                📝 {t("sidebar.mockTest", { defaultValue: "Mock Test" })}
              </a>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <a href={mockTestHref} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", width: "fit-content", alignItems: "center", gap: 7, background: DS.bg3, border: `1px solid ${DS.borderHi}`, borderRadius: 12, padding: "11px 20px", fontSize: 13, fontWeight: 600, color: DS.white, cursor: "pointer", textDecoration: "none", fontFamily: "'Outfit',sans-serif" }}>
                📝 {t("sidebar.mockTest", { defaultValue: "Mock Test" })}
              </a>
              <p style={{ marginTop: 2, fontSize: 12, color: DS.muted, fontFamily: "'Outfit',sans-serif", lineHeight: 1.5 }}>
                {t("jobDetail.noOfficialLink", {
                  defaultValue: "No verified official link was saved for this listing. Try searching the department name on a .gov.in portal.",
                })}
              </p>
            </div>
          )}
        </Section>

        {extraDetails.length > 0 ? (
          <Section title={t("jobDetail.additionalInfo", { defaultValue: "Additional Details" })}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              {extraDetails.map((row) => (
                <div key={row.label} style={{ background: DS.bg3, border: `1px solid ${DS.borderHi}`, borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, color: DS.muted, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 4, fontFamily: "'Outfit',sans-serif" }}>
                    {row.label}
                  </div>
                  <div style={{ fontSize: 12, color: DS.mutedHi, lineHeight: 1.55, fontFamily: "'Outfit',sans-serif" }}>{row.value}</div>
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        <div style={{ marginTop: 14, padding: "12px 16px", background: DS.bg3, border: `1px solid ${DS.borderHi}`, borderRadius: 10, fontSize: 11.5, color: DS.muted, lineHeight: 1.6, fontFamily: "'Outfit',sans-serif" }}>

          ⚠️ {t("jobDetail.disclaimer")}

        </div>

      </div>

    </div>

  );

}



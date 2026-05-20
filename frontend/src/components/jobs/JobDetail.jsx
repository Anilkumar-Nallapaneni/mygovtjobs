import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { DS } from "@/theme/designSystem";
import { CATS } from "@/data/categories";
import { translateDateKey, translateFeeKey } from "@/utils/jobDetailLabels";

const DAY_MS = 1000 * 60 * 60 * 24;

function sumCategoryVacancies(categoryVacancies) {
  if (!categoryVacancies || typeof categoryVacancies !== "object") return 0;
  return Object.values(categoryVacancies).reduce((a, n) => a + (Number(n) || 0), 0);
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

export default function JobDetail({ job, onClose }) {
  const { t, i18n } = useTranslation();
  const catColor = (CATS.find((c) => c.id === job.category) || { color: DS.saffron }).color;
  const daysLeft = Math.ceil((new Date(job.lastDate) - new Date()) / DAY_MS);
  const isUrgent = daysLeft >= 0 && daysLeft <= 7;
  const postsVacSum = (job.posts || []).reduce((s, p) => s + (Number(p.vacancies) || 0), 0);
  const postsSumMismatch = job.posts?.length > 0 && postsVacSum !== (Number(job.vacancies) || 0);
  const dateLocale = i18n.language === "en" ? "en-IN" : i18n.language;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: DS.overlayScrim, zIndex: 500, overflow: "auto", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={{ maxWidth: 780, margin: "30px auto", padding: "0 16px 40px" }}>
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
              {t(`category.${job.category}`).toUpperCase()}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: DS.bg3, color: DS.mutedHi, border: `1px solid ${DS.borderHi}` }}>{job.type}</span>
            {job.status === "hot" && (
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
          <h1 style={{ fontSize: 21, fontWeight: 900, color: DS.white, fontFamily: "'Sora',sans-serif", lineHeight: 1.25, marginBottom: 6 }}>{job.title}</h1>
          <p style={{ fontSize: 13, color: DS.muted, fontFamily: "'Outfit',sans-serif", marginBottom: 16 }}>{job.dept}</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 18 }}>
            {[
              { l: t("jobDetail.totalPosts"), v: job.vacancies.toLocaleString(dateLocale), i: "📋" },
              { l: t("jobDetail.lastDateLabel"), v: job.lastDate, i: "📅" },
              { l: t("jobDetail.salary"), v: job.salary, i: "💰" },
              { l: t("jobDetail.ageLimit"), v: job.age, i: "👤" },
            ].map(({ l, v, i }) => (
              <div key={l} style={{ background: DS.bg3, border: `1px solid ${DS.borderHi}`, borderRadius: 12, padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: 18, marginBottom: 5 }}>{i}</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: DS.saffron, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.2 }}>{v}</div>
                <div style={{ fontSize: 9.5, color: DS.muted, marginTop: 4, fontFamily: "'Outfit',sans-serif" }}>{l}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <a href={job.applyUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 7, background: DS.gradientBrand, border: "none", borderRadius: 12, padding: "11px 22px", fontSize: 13, fontWeight: 700, color: DS.inkOnBrand, cursor: "pointer", textDecoration: "none", fontFamily: "'Outfit',sans-serif" }}>
              🌐 {t("jobDetail.applyOfficial")}
            </a>
            {job.pdfUrl && (
              <a href={job.pdfUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 7, background: DS.bg3, border: `1px solid ${DS.borderHi}`, borderRadius: 12, padding: "11px 20px", fontSize: 13, fontWeight: 600, color: DS.white, cursor: "pointer", textDecoration: "none", fontFamily: "'Outfit',sans-serif" }}>
                📄 {t("jobDetail.downloadPdf")}
              </a>
            )}
            <a href={job.officialUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: DS.muted, padding: "11px 14px", borderRadius: 12, border: `1px solid ${DS.border}`, textDecoration: "none", fontFamily: "'Outfit',sans-serif" }}>
              🔗 {t("jobDetail.officialWebsite")}
            </a>
          </div>
        </div>

        <Section title={t("jobDetail.aboutRecruitment")}>
          <p style={{ fontSize: 13, color: DS.mutedHi, lineHeight: 1.7, margin: 0, fontFamily: "'Outfit',sans-serif" }}>{job.about}</p>
        </Section>

        <Section title={t("jobDetail.importantDates")}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
            {Object.entries(job.dates || {}).map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${DS.border}` }}>
                <span style={{ fontSize: 12, color: DS.muted, fontFamily: "'Outfit',sans-serif" }}>{translateDateKey(t, k)}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: DS.white, fontFamily: "'JetBrains Mono',monospace" }}>{v}</span>
              </div>
            ))}
          </div>
        </Section>

        {job.posts?.length > 0 && (
          <Section title={t("jobDetail.postWiseVacancy")}>
            {postsSumMismatch && (
              <p style={{ fontSize: 11, color: DS.red, margin: "0 0 10px", fontFamily: "'Outfit',sans-serif", lineHeight: 1.5, background: DS.redSoftBg, border: `1px solid ${DS.redSoftBorder}`, borderRadius: 8, padding: "8px 10px" }}>
                {t("jobDetail.postsMismatch", { sum: postsVacSum.toLocaleString(dateLocale), total: (Number(job.vacancies) || 0).toLocaleString(dateLocale) })}
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
                  {job.posts.map((p, i) => {
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
                                    <td style={{ padding: "7px 8px", textAlign: "right", color: DS.saffron, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>{catSum.toLocaleString(dateLocale)}</td>
                                  </tr>
                                </tbody>
                              </table>
                              {catSum !== (p.vacancies || 0) && (
                                <div style={{ fontSize: 10, color: DS.muted, marginTop: 6, fontFamily: "'Outfit',sans-serif" }}>
                                  {t("jobDetail.categoryNote", { catSum: catSum.toLocaleString(dateLocale), postTotal: (p.vacancies || 0).toLocaleString(dateLocale) })}
                                </div>
                              )}
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

        <Section title={t("jobDetail.selectionProcess")}>
          <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {(job.selection || []).map((step, i) => (
              <li key={i} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: `${DS.saffron}18`, border: `1px solid ${DS.saffron}40`, color: DS.saffron, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                <span style={{ color: DS.mutedHi, fontFamily: "'Outfit',sans-serif" }}>{step}</span>
              </li>
            ))}
          </ol>
        </Section>

        <Section title={t("jobDetail.howToApply")}>
          <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {(job.howApply || []).map((step, i) => (
              <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13 }}>
                <span style={{ color: DS.saffron, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, flexShrink: 0, marginTop: 1 }}>0{i + 1}</span>
                <span style={{ color: DS.mutedHi, fontFamily: "'Outfit',sans-serif", lineHeight: 1.5 }}>{step}</span>
              </li>
            ))}
          </ol>
        </Section>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Section title={t("jobDetail.applicationFee")}>
            {Object.entries(job.fee || {}).map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${DS.border}` }}>
                <span style={{ fontSize: 12, color: DS.muted, fontFamily: "'Outfit',sans-serif" }}>{translateFeeKey(t, k)}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: DS.white, fontFamily: "'Outfit',sans-serif" }}>{v}</span>
              </div>
            ))}
          </Section>
          <Section title={t("jobDetail.eligibilityDetails")}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 12, fontFamily: "'Outfit',sans-serif" }}>
                <span style={{ color: DS.muted }}>{t("jobDetail.qualification")} </span>
                <span style={{ color: DS.mutedHi }}>{job.qual}</span>
              </div>
              <div style={{ fontSize: 12, fontFamily: "'Outfit',sans-serif" }}>
                <span style={{ color: DS.muted }}>{t("jobDetail.nationality")} </span>
                <span style={{ color: DS.mutedHi }}>{job.nationality}</span>
              </div>
              <div style={{ fontSize: 12, fontFamily: "'Outfit',sans-serif" }}>
                <span style={{ color: DS.muted }}>{t("jobDetail.ageRelaxation")} </span>
                <span style={{ color: DS.mutedHi }}>{job.ageRelax}</span>
              </div>
              <div style={{ fontSize: 12, fontFamily: "'Outfit',sans-serif" }}>
                <span style={{ color: DS.muted }}>{t("jobDetail.attempts")} </span>
                <span style={{ color: DS.mutedHi }}>{job.attempts}</span>
              </div>
              {job.syllabus && (
                <div style={{ fontSize: 12, fontFamily: "'Outfit',sans-serif" }}>
                  <span style={{ color: DS.muted }}>{t("jobDetail.syllabus")} </span>
                  <span style={{ color: DS.mutedHi }}>{job.syllabus}</span>
                </div>
              )}
            </div>
          </Section>
        </div>

        <div style={{ background: `${DS.saffron}08`, border: `1px solid ${DS.saffron}25`, borderRadius: 12, padding: "14px 18px", display: "flex", gap: 20, flexWrap: "wrap" }}>
          <div>
            <span style={{ fontSize: 11, color: DS.muted }}>📞 {t("jobDetail.helpdesk")} </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: DS.white, fontFamily: "monospace" }}>{job.helpdesk}</span>
          </div>
          <div>
            <span style={{ fontSize: 11, color: DS.muted }}>📧 {t("jobDetail.email")} </span>
            <a href={`mailto:${job.email}`} style={{ fontSize: 12, fontWeight: 600, color: DS.saffron, fontFamily: "monospace", textDecoration: "none" }}>
              {job.email}
            </a>
          </div>
        </div>

        <div style={{ marginTop: 14, padding: "12px 16px", background: DS.bg3, border: `1px solid ${DS.borderHi}`, borderRadius: 10, fontSize: 11.5, color: DS.muted, lineHeight: 1.6, fontFamily: "'Outfit',sans-serif" }}>
          ⚠️ {t("jobDetail.disclaimer")}
        </div>
      </div>
    </div>
  );
}

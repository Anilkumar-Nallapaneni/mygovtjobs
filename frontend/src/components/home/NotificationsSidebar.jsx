import { useTranslation } from "react-i18next";
import { DS } from "@/theme/designSystem";

const SECTIONS = [
  {
    id: "notifications",
    titleKey: "sidebar.notifications",
    items: [
      { key: "latest", labelKey: "sidebar.latest", highlight: true },
      { key: "employment-news", labelKey: "sidebar.employmentNews" },
      { key: "search-jobs", labelKey: "sidebar.searchJobs" },
      { key: "sarkari-job", labelKey: "sidebar.sarkariJob" },
      { key: "sarkari-naukri", labelKey: "sidebar.sarkariNaukri" },
      { key: "anganwadi", labelKey: "sidebar.anganwadi" },
      { key: "forest", labelKey: "sidebar.forest" },
      { key: "education", labelKey: "sidebar.education" },
      { key: "mock-test", labelKey: "sidebar.mockTest" },
    ],
  },
  {
    id: "announcements",
    titleKey: "sidebar.announcements",
    items: [
      { key: "sarkari-result", labelKey: "sidebar.sarkariResult" },
      { key: "admit-card", labelKey: "sidebar.admitCard" },
      { key: "exam-results", labelKey: "sidebar.examResults" },
      { key: "answer-key", labelKey: "sidebar.answerKey" },
      { key: "cutoff", labelKey: "sidebar.cutoff" },
      { key: "written-marks", labelKey: "sidebar.writtenMarks" },
      { key: "interview", labelKey: "sidebar.interview" },
      { key: "last-date", labelKey: "sidebar.lastDate" },
    ],
  },
  {
    id: "others",
    titleKey: "sidebar.others",
    items: [
      { key: "eligibility", labelKey: "sidebar.eligibility" },
      { key: "syllabus", labelKey: "sidebar.syllabus" },
      { key: "exam-pattern", labelKey: "sidebar.examPattern" },
      { key: "selection", labelKey: "sidebar.selection" },
      { key: "previous-papers", labelKey: "sidebar.previousPapers" },
      { key: "games", labelKey: "sidebar.games" },
      { key: "image-resizer", labelKey: "sidebar.imageResizer" },
      { key: "pdf-to-word", labelKey: "sidebar.pdfToWord" },
      { key: "image-to-pdf", labelKey: "sidebar.imageToPdf" },
      { key: "word-to-pdf", labelKey: "sidebar.wordToPdf" },
      { key: "ai-interview", labelKey: "sidebar.aiInterview" },
    ],
  },
];

export default function NotificationsSidebar({ activeKey = null, onSelect }) {
  const { t } = useTranslation();

  const handleClick = (item) => {
    if (typeof onSelect === "function") onSelect(item.key, item);
  };

  return (
    <aside
      className="home-notifications-sidebar"
      aria-label={t("sidebar.aria")}
      style={{
        background: DS.bg1,
        border: `1px solid ${DS.border}`,
        borderRadius: 14,
        overflow: "hidden",
        fontFamily: "'Outfit',sans-serif",
        alignSelf: "start",
        position: "sticky",
        top: 96,
        maxHeight: "calc(100vh - 120px)",
        overflowY: "auto",
      }}
    >
      {SECTIONS.map((section, idx) => (
        <section key={section.id} style={{ borderTop: idx === 0 ? "none" : `1px solid ${DS.border}` }}>
          <header
            style={{
              background: DS.gradientBrand,
              color: DS.inkOnBrand,
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 0.3,
              fontFamily: "'Sora',sans-serif",
            }}
          >
            {t(section.titleKey)}
          </header>

          <ul style={{ listStyle: "none", padding: "6px 4px 8px", margin: 0 }}>
            {section.items.map((item) => {
              const isActive = activeKey === item.key;
              const baseColor = item.highlight ? DS.saffron : DS.mutedHi;
              return (
                <li key={item.key} style={{ margin: 0 }}>
                  <button
                    type="button"
                    onClick={() => handleClick(item)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      textAlign: "left",
                      background: isActive ? DS.accentSoft : "transparent",
                      border: "none",
                      borderRadius: 8,
                      padding: "6px 10px",
                      fontSize: 12.5,
                      lineHeight: 1.35,
                      color: isActive ? DS.saffron : baseColor,
                      fontWeight: item.highlight || isActive ? 700 : 500,
                      cursor: "pointer",
                      fontFamily: "'Outfit',sans-serif",
                      transition: "background 0.12s, color 0.12s",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: DS.saffron,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t(item.labelKey)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </aside>
  );
}

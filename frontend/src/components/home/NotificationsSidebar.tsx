import { useTranslation } from "react-i18next";

const SECTIONS = [
  {
    id: "notifications",
    titleKey: "sidebar.notifications",
    items: [
      { key: "latest", labelKey: "sidebar.latest" },
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
    ],
  },
];

export default function NotificationsSidebar({ activeKey = null, onSelect }) {
  const { t } = useTranslation();

  const handleClick = (item) => {
    if (typeof onSelect === "function") onSelect(item.key, item);
  };

  return (
    <aside className="home-notifications-sidebar" aria-label={t("sidebar.aria")}>
      {SECTIONS.map((section) => (
        <section key={section.id} className="notifications-sidebar__section">
          <header className="notifications-sidebar__header">{t(section.titleKey)}</header>
          <ul className="notifications-sidebar__list">
            {section.items.map((item) => {
              const isActive = activeKey === item.key;
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    aria-current={isActive ? "true" : undefined}
                    className={`notifications-sidebar__item-btn${isActive ? " notifications-sidebar__item-btn--active" : ""}`}
                    onClick={() => handleClick(item)}
                  >
                    <span className="notifications-sidebar__dot" aria-hidden />
                    <span className="notifications-sidebar__label">{t(item.labelKey)}</span>
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

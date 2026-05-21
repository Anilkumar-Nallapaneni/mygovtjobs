import { useTranslation } from "react-i18next";
import { DS } from "@/theme/designSystem";
import BrandLogo from "@/components/layout/BrandLogo";
import "./Footer.css";

const FOOTER_LINK_KEYS = {
  quickLinks: ["latestJobs", "results", "admitCards", "syllabus", "examCalendar", "answerKeys"],
  categories: ["upsc", "ssc", "railways", "banking", "defence", "police", "teaching"],
  topStates: ["up", "bihar", "rajasthan", "maharashtra", "mp", "jharkhand"],
  company: ["about", "advertise", "privacy", "terms", "contact", "disclaimerLink"],
};

const TOP_STATE_LABELS = {
  up: "Uttar Pradesh",
  bihar: "Bihar",
  rajasthan: "Rajasthan",
  maharashtra: "Maharashtra",
  mp: "Madhya Pradesh",
  jharkhand: "Jharkhand",
};

/** Map footer link keys to in-page section anchors or nav views. */
const FOOTER_LINK_TARGETS = {
  latestJobs: { section: "main-jobs", topicKey: "latest" },
  results: { section: "official-headlines" },
  admitCards: { section: "official-headlines", view: "admit-card", topicKey: "admit-card" },
  syllabus: { section: "official-headlines", topicKey: "syllabus" },
  examCalendar: { section: "main-jobs" },
  answerKeys: { section: "official-headlines", topicKey: "answer-key" },
  upsc: { section: "main-jobs", category: "upsc" },
  ssc: { section: "main-jobs", category: "ssc" },
  railways: { section: "main-jobs", category: "railways" },
  banking: { section: "main-jobs", category: "banking" },
  defence: { section: "main-jobs", category: "defence" },
  police: { section: "main-jobs", category: "police" },
  teaching: { section: "main-jobs", category: "teaching" },
  up: { section: "state-jobs-panel", state: "up" },
  bihar: { section: "state-jobs-panel", state: "bihar" },
  rajasthan: { section: "state-jobs-panel", state: "rajasthan" },
  maharashtra: { section: "state-jobs-panel", state: "maharashtra" },
  mp: { section: "state-jobs-panel", state: "mp" },
  jharkhand: { section: "state-jobs-panel", state: "jharkhand" },
  about: { section: "footer-about" },
  advertise: { section: "alert-section" },
  privacy: { section: "footer-disclaimer" },
  terms: { section: "footer-disclaimer" },
  contact: { section: "alert-section" },
  disclaimerLink: { section: "footer-disclaimer" },
};

const SOCIAL = ["Telegram", "YouTube", "X", "Instagram"];

export default function Footer({ onFooterLink }) {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  const columns = [
    { heading: t("footer.quickLinks"), keys: FOOTER_LINK_KEYS.quickLinks, ns: "footer" },
    { heading: t("footer.categories"), keys: FOOTER_LINK_KEYS.categories, ns: "category" },
    { heading: t("footer.topStates"), keys: FOOTER_LINK_KEYS.topStates, ns: "state" },
    { heading: t("footer.company"), keys: FOOTER_LINK_KEYS.company, ns: "footer" },
  ];

  const handleLink = (key) => {
    const target = FOOTER_LINK_TARGETS[key] || { section: "main-jobs" };
    if (typeof onFooterLink === "function") {
      onFooterLink(target);
    } else {
      document.getElementById(target.section)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__grid">
          <div id="footer-about">
            <div className="footer__brand-row">
              <BrandLogo size={34} className="brand-logo--footer footer__logo" />
              <div>
                <div className="footer__brand-name">
                  {t("brand.primary")}
                  <span style={{ color: DS.saffron }}>{t("brand.accent")}</span>
                </div>
                <div className="footer__brand-tagline">{t("brand.tagline")}</div>
              </div>
            </div>
            <p className="footer__blurb">{t("footer.blurb")}</p>
            <div id="footer-disclaimer" className="footer__disclaimer">⚠️ {t("footer.disclaimer")}</div>
          </div>
          {columns.map(({ heading, keys, ns }) => (
            <div key={heading}>
              <h4 className="footer__col-heading">{heading}</h4>
              <ul className="footer__links">
                {keys.map((key) => (
                  <li key={key}>
                    <button type="button" className="footer__link" onClick={() => handleLink(key)}>
                      {ns === "state" ? TOP_STATE_LABELS[key] : t(`${ns}.${key}`)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="footer__bottom">
          <span className="footer__copyright">{t("footer.copyright", { year })}</span>
          <div className="footer__social">
            {SOCIAL.map((s) => (
              <span key={s} className="footer__link" style={{ cursor: "default", opacity: 0.7 }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

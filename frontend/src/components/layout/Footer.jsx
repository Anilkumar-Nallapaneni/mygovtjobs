import { useTranslation } from "react-i18next";
import { DS } from "@/theme/designSystem";

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

const SOCIAL = ["Telegram", "YouTube", "X", "Instagram"];

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  const columns = [
    { heading: t("footer.quickLinks"), keys: FOOTER_LINK_KEYS.quickLinks, ns: "footer" },
    { heading: t("footer.categories"), keys: FOOTER_LINK_KEYS.categories, ns: "category" },
    { heading: t("footer.topStates"), keys: FOOTER_LINK_KEYS.topStates, ns: "state" },
    { heading: t("footer.company"), keys: FOOTER_LINK_KEYS.company, ns: "footer" },
  ];

  return (
    <footer style={{ background: DS.bg0, borderTop: `1px solid ${DS.border}`, padding: "36px 20px 18px" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 28, marginBottom: 28 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 34, height: 34, background: DS.gradientBrand, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>🇮🇳</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 900, color: DS.white, letterSpacing: 1.5, lineHeight: 1, fontFamily: "'Sora',sans-serif" }}>
                  {t("brand.primary")}
                  <span style={{ color: DS.saffron }}>{t("brand.accent")}</span>
                </div>
                <div style={{ fontSize: 8, color: DS.muted, letterSpacing: 2, fontFamily: "monospace" }}>{t("brand.tagline")}</div>
              </div>
            </div>
            <p style={{ fontSize: 12.5, color: DS.muted, fontFamily: "'Outfit',sans-serif", lineHeight: 1.7, marginBottom: 12 }}>{t("footer.blurb")}</p>
            <div style={{ fontSize: 11, color: DS.mutedHi, fontFamily: "'Outfit',sans-serif", background: DS.bg2, border: `1px solid ${DS.border}`, borderRadius: 8, padding: "10px 12px", lineHeight: 1.6 }}>
              ⚠️ {t("footer.disclaimer")}
            </div>
          </div>
          {columns.map(({ heading, keys, ns }) => (
            <div key={heading}>
              <h4 style={{ fontSize: 11, fontWeight: 700, color: DS.white, letterSpacing: 1.5, marginBottom: 12, fontFamily: "'Outfit',sans-serif", textTransform: "uppercase" }}>{heading}</h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 7 }}>
                {keys.map((key) => (
                  <li key={key}>
                    <a
                      href="#"
                      style={{ fontSize: 12.5, color: DS.muted, fontFamily: "'Outfit',sans-serif", textDecoration: "none", transition: "color 0.12s" }}
                      onMouseEnter={(e) => (e.target.style.color = DS.saffron)}
                      onMouseLeave={(e) => (e.target.style.color = DS.muted)}
                    >
                      {ns === "state" ? TOP_STATE_LABELS[key] : t(`${ns}.${key}`)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ borderTop: `1px solid ${DS.border}`, paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontSize: 11.5, color: DS.muted, fontFamily: "'Outfit',sans-serif" }}>{t("footer.copyright", { year })}</span>
          <div style={{ display: "flex", gap: 14 }}>
            {SOCIAL.map((s) => (
              <a
                key={s}
                href="#"
                style={{ fontSize: 11.5, color: DS.muted, fontFamily: "'Outfit',sans-serif", textDecoration: "none", transition: "color 0.12s" }}
                onMouseEnter={(e) => (e.target.style.color = DS.saffron)}
                onMouseLeave={(e) => (e.target.style.color = DS.muted)}
              >
                {s}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

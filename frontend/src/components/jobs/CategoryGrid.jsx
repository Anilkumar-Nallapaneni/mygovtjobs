import { useTranslation } from "react-i18next";
import { DS } from "@/theme/designSystem";
import { CATS } from "@/data/categories";

export default function CategoryGrid({ activeCat, setActiveCat, counts }) {
  const { t } = useTranslation();

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h2 style={{ fontSize: 13, fontWeight: 800, color: DS.white, fontFamily: "'Sora',sans-serif", margin: 0, letterSpacing: 0.2 }}>{t("categoryGrid.title")}</h2>
        {activeCat && (
          <button
            type="button"
            onClick={() => setActiveCat(null)}
            style={{ background: "transparent", border: `1px solid ${DS.borderHi}`, borderRadius: 8, padding: "4px 12px", fontSize: 11, color: DS.mutedHi, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}
          >
            {t("categoryGrid.clearFilter")}
          </button>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
        {CATS.map((c) => {
          const active = activeCat === c.id;
          const cnt = counts[c.id] || parseInt(c.total.replace(",", ""), 10) || 0;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCat(active ? null : c.id)}
              style={{
                background: active ? `${c.color}18` : DS.bg1,
                border: `1px solid ${active ? c.color + "50" : DS.border}`,
                borderRadius: 12,
                padding: "13px 10px",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s",
              }}
            >
              <div style={{ fontSize: 18, marginBottom: 6 }}>{c.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: active ? c.color : DS.white, fontFamily: "'Outfit',sans-serif", marginBottom: 3 }}>{t(`category.${c.id}`)}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: c.color, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>{cnt.toLocaleString()}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

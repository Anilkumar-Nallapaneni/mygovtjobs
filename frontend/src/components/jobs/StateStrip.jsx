import { useTranslation } from "react-i18next";
import { DS } from "@/theme/designSystem";
import { STATES } from "@/data/states";

const TOP_STATE_COUNT = 16;

/**
 * @param {"full" | "embedded" | "subheader"} variant
 * - full: standalone bar (default), with background + bottom border
 * - embedded: under map title, tight padding
 * - subheader: chips only row, right-aligned in a flex bar (use with hideLabel)
 */
export default function StateStrip({ selected, onSelect, stateCounts, variant = "full", hideLabel }) {
  const { t } = useTranslation();
  const sorted = [...STATES]
    .sort((a, b) => (stateCounts[b.id] || 0) - (stateCounts[a.id] || 0))
    .slice(0, TOP_STATE_COUNT);

  const showLabel = hideLabel ? false : variant !== "subheader";

  const wrapStyle =
    variant === "subheader"
      ? {
          padding: 0,
          margin: 0,
          border: "none",
          background: "transparent",
          overflowX: "auto",
          minWidth: 0,
          width: "100%",
        }
      : variant === "embedded"
        ? {
            padding: "10px 0 12px",
            marginBottom: 8,
            borderBottom: `1px solid ${DS.border}`,
            background: "transparent",
            overflowX: "auto",
          }
        : {
            padding: "12px 20px",
            borderBottom: `1px solid ${DS.border}`,
            background: DS.bg0,
            overflowX: "auto",
          };

  const rowStyle = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: "max-content",
    ...(variant === "subheader" ? { justifyContent: "flex-start" } : {}),
  };

  return (
    <div style={wrapStyle}>
      <div className="state-strip-row" style={rowStyle}>
        {showLabel && (
          <span
            style={{
              fontSize: 10.5,
              color: DS.muted,
              fontWeight: 700,
              letterSpacing: 1,
              fontFamily: "'Outfit',sans-serif",
              flexShrink: 0,
            }}
          >
            {t("stateStrip.topStates")}
          </span>
        )}
        <button
          onClick={() => onSelect(null)}
          style={{
            background: !selected ? DS.accentSoft : "transparent",
            border: `1px solid ${!selected ? DS.accentBorderHi : DS.border}`,
            borderRadius: 20,
            padding: "4px 14px",
            fontSize: 11.5,
            fontWeight: !selected ? 700 : 400,
            color: !selected ? DS.saffron : DS.mutedHi,
            cursor: "pointer",
            flexShrink: 0,
            fontFamily: "'Outfit',sans-serif",
            transition: "all 0.12s",
          }}
        >
          🇮🇳 {t("stateStrip.allIndia")}
        </button>
        {sorted.map((s) => {
          const active = selected === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(active ? null : s.id)}
              style={{
                background: active ? DS.accentSoft : "transparent",
                border: `1px solid ${active ? DS.accentBorderHi : DS.border}`,
                borderRadius: 20,
                padding: "4px 12px",
                fontSize: 11.5,
                fontWeight: active ? 700 : 400,
                color: active ? DS.saffron : DS.mutedHi,
                cursor: "pointer",
                flexShrink: 0,
                fontFamily: "'Outfit',sans-serif",
                whiteSpace: "nowrap",
                transition: "all 0.12s",
              }}
            >
              {s.ab}{" "}
              <span
                style={{
                  fontFamily: "'JetBrains Mono',monospace",
                  color: active ? DS.gold : DS.muted,
                  fontSize: 9.5,
                }}
              >
                {(stateCounts[s.id] || 0).toLocaleString("en-IN")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

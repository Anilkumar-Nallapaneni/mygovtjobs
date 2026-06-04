import { useTranslation } from "react-i18next";
import { STATES } from "@/data/states";
import { useStateLabel } from "@/utils/stateLabels";

/**
 * @param {"full" | "embedded" | "subheader"} variant
 */
export default function StateStrip({
  selected,
  onSelect,
  stateCounts,
  variant = "full",
  hideLabel = false,
}: {
  selected: string | null
  onSelect: (id: string | null) => void
  stateCounts?: Record<string, number>
  variant?: "full" | "embedded" | "subheader"
  hideLabel?: boolean
}) {
  const { t } = useTranslation();
  const stateLabel = useStateLabel();
  const isSubheader = variant === "subheader";
  const sorted = [...STATES]
    .filter((state) => (stateCounts?.[state.id] || 0) > 0 || selected === state.id)
    .sort((a, b) => (stateCounts?.[b.id] || 0) - (stateCounts?.[a.id] || 0));

  const showLabel = !hideLabel;
  const stripClass = [
    "state-strip",
    isSubheader ? "state-strip--subheader" : variant === "embedded" ? "state-strip--embedded" : "state-strip--full",
  ].join(" ");

  return (
    <div className={stripClass}>
      <div className="state-strip-row">
        {showLabel && (
          <span className="state-strip-label">
            {isSubheader ? t("stateStrip.browse", { defaultValue: "Browse by state" }) : t("stateStrip.topStates")}
          </span>
        )}
        <button
          type="button"
          className={`state-strip-chip state-strip-chip--all${!selected ? " state-strip-chip--active" : ""}`}
          onClick={() => onSelect(null)}
        >
          🇮🇳 {t("stateStrip.allIndia")}
        </button>
        {sorted.map((s) => {
          const active = selected === s.id;
          return (
            <button
              key={s.id}
              type="button"
              className={`state-strip-chip${active ? " state-strip-chip--active" : ""}`}
              title={stateLabel(s.id)}
              aria-label={stateLabel(s.id)}
              onClick={() => onSelect(active ? null : s.id)}
            >
              {s.ab}{" "}
              <span className="state-strip-chip__count">
                {(stateCounts?.[s.id] || 0).toLocaleString("en-IN")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

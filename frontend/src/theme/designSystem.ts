/* Centralized design tokens — dark and black & white (light monochrome; app default is light). */

const DARK = {
  bg0: "#03060D",
  bg1: "#080D1A",
  bg2: "#0C1220",
  bg3: "#101828",
  border: "#131D2E",
  borderHi: "#1E2D42",
  saffron: "#FF6B00",
  saffronHi: "#FF8C35",
  gold: "#FFAA00",
  white: "#EDF2FF",
  muted: "#3D5068",
  mutedHi: "#6B829A",
  green: "#22C55E",
  red: "#EF4444",
  blue: "#38BDF8",
  /* Semantic UI (no hardcoded orange in components) */
  accentSoft: "rgba(255,107,0,0.12)",
  accentSoftMid: "rgba(255,107,0,0.1)",
  accentBorder: "rgba(255,107,0,0.35)",
  accentBorderHi: "rgba(255,107,0,0.45)",
  accentBorderLo: "rgba(255,107,0,0.25)",
  accentBorderNav: "rgba(255,107,0,0.3)",
  accentGlow: "rgba(255,107,0,0.07)",
  gradientBrand: "linear-gradient(135deg,#FF6B00,#FFAA00)",
  gradientRule: "linear-gradient(to right,#FF6B00,#FFAA00)",
  inkOnBrand: "#060A00",
  panelWarm: "linear-gradient(135deg,#1A0E00,#0A1228)",
  sheetBg: "rgba(3,6,13,0.98)",
  navScrim: "rgba(3,6,13,0.97)",
  jobCardHoverBg: "#0E1828",
  alertPanelBg: "linear-gradient(135deg,#0C1828,#1A0E00)",
  switchKnobShadow: "0 0 8px rgba(255,107,0,0.35)",
  accentChipActiveBg: "rgba(255,107,0,0.15)",
  accentChipActiveBorder: "rgba(255,107,0,0.5)",
  textBody: "#EDF2FF",
  textMuted: "#6B829A",
  textSubtle: "#6B829A",
  overlayScrim: "rgba(0,0,0,0.88)",
  shadowCardHover: "0 10px 30px rgba(0,0,0,0.5)",
  greenSoftBg: "rgba(34,197,94,0.12)",
  greenSoftBorder: "rgba(34,197,94,0.3)",
  redSoftBg: "rgba(239,68,68,0.12)",
  redSoftBorder: "rgba(239,68,68,0.3)",
  tableRowBorder: "rgba(19,29,46,0.6)",
};

/** Light monochrome — neutral grays, no orange (shown as “Light” in the UI). */
const BW = {
  bg0: "#E8E9ED",
  bg1: "#FFFFFF",
  bg2: "#F3F4F7",
  bg3: "#E2E3E9",
  border: "#B8BAC4",
  borderHi: "#9FA2AE",
  saffron: "#1C1C22",
  saffronHi: "#2E2E36",
  gold: "#45454E",
  white: "#0E0E12",
  muted: "#5E6068",
  mutedHi: "#3A3C44",
  green: "#15803D",
  red: "#B91C1C",
  blue: "#1D4ED8",
  accentSoft: "rgba(20,22,30,0.07)",
  accentSoftMid: "rgba(20,22,30,0.09)",
  accentBorder: "rgba(20,22,30,0.2)",
  accentBorderHi: "rgba(20,22,30,0.32)",
  accentBorderLo: "rgba(20,22,30,0.14)",
  accentBorderNav: "rgba(20,22,30,0.22)",
  accentGlow: "rgba(20,22,30,0.05)",
  gradientBrand: "linear-gradient(135deg,#2C2C34,#5C5C68)",
  gradientRule: "linear-gradient(to right,#24242A,#6A6A76)",
  inkOnBrand: "#F6F6F8",
  panelWarm: "linear-gradient(135deg,#FBFBFC,#EEEEF2)",
  sheetBg: "rgba(255,255,255,0.94)",
  navScrim: "rgba(255,255,255,0.94)",
  jobCardHoverBg: "#F0F1F5",
  alertPanelBg: "linear-gradient(135deg,#F6F6F8,#EBECF0)",
  switchKnobShadow: "0 1px 3px rgba(0,0,0,0.2)",
  accentChipActiveBg: "rgba(20,22,30,0.1)",
  accentChipActiveBorder: "rgba(20,22,30,0.38)",
  textBody: "#111827",
  textMuted: "#4B5563",
  textSubtle: "#374151",
  overlayScrim: "rgba(12,12,16,0.78)",
  shadowCardHover: "0 12px 28px rgba(0,0,0,0.12)",
  greenSoftBg: "rgba(21,128,61,0.12)",
  greenSoftBorder: "rgba(21,128,61,0.35)",
  redSoftBg: "rgba(185,28,28,0.12)",
  redSoftBorder: "rgba(185,28,28,0.35)",
  tableRowBorder: "rgba(184,186,196,0.65)",
};

/** Push current palette to `html` as `--ds-*` for CSS (see `src/styles/variables.css`). */
export function syncDesignTokensToDom() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const key of Object.keys(active)) {
    const val = active[key];
    if (val != null) root.style.setProperty(`--ds-${key}`, String(val));
  }
  root.style.setProperty("--ds-text-body", active.textBody || active.white);
  root.style.setProperty("--ds-text-muted", active.textMuted || active.muted);
  root.style.setProperty("--ds-text-subtle", active.textSubtle || active.mutedHi);
}

/**
 * @param {"dark" | "bw"} mode — `bw` is the light theme (stored key unchanged for compatibility).
 */
export function applyColorMode(mode: "dark" | "bw") {
  active = mode === "bw" ? { ...BW } : { ...DARK };
  syncDesignTokensToDom();
}

export type DesignTokens = typeof DARK;

let active: DesignTokens = { ...DARK };

export const DS = new Proxy({} as DesignTokens, {
  get(_, prop: keyof DesignTokens) {
    return active[prop];
  },
});

if (typeof document !== "undefined") {
  syncDesignTokensToDom();
}

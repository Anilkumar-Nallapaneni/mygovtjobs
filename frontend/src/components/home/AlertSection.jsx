import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DS } from "@/theme/designSystem";
import { subscribeToAlerts } from "@/lib/jobsApi";

const CHANNEL_KEYS = ["email", "whatsapp", "telegram", "push"];

const PLACEHOLDER_KEYS = {
  email: "alert.placeholder",
  whatsapp: "alert.placeholderWhatsApp",
  telegram: "alert.placeholderTelegram",
  push: "alert.placeholderPush",
};

export default function AlertSection() {
  const { t } = useTranslation();
  const [address, setAddress] = useState("");
  const [sub, setSub] = useState(false);
  const [channel, setChannel] = useState("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validateAddress = () => {
    const v = address.trim();
    if (!v) return false;
    if (channel === "email") return v.includes("@");
    if (channel === "whatsapp") return /^\+?[\d\s-]{10,}$/.test(v);
    return v.length >= 3;
  };

  const handleSubscribe = async () => {
    if (!validateAddress()) {
      setError(t("alert.invalidAddress"));
      return;
    }
    setError("");
    setLoading(true);
    const result = await subscribeToAlerts({
      channel,
      channel_address: address.trim(),
    });
    setLoading(false);
    if (result.ok) {
      setSub(true);
    } else {
      setError(
        result.error.includes("fetch") || result.error.includes("Network")
          ? t("alert.offlineError")
          : t("alert.error")
      );
    }
  };

  return (
    <div id="alert-section" style={{ padding: "40px 20px", background: DS.bg0, borderTop: `1px solid ${DS.border}`, scrollMarginTop: 80 }}>
      <div
        style={{
          maxWidth: 800,
          margin: "0 auto",
          background: DS.alertPanelBg,
          border: `1px solid ${DS.accentBorderLo}`,
          borderRadius: 22,
          padding: "42px 24px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse at 50% 0%,${DS.accentGlow},transparent 60%)`,
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: DS.white, fontFamily: "var(--font-display)", marginBottom: 8, letterSpacing: 0.5 }}>
            {t("alert.title")}
          </h2>
          <p style={{ fontSize: 13.5, color: DS.mutedHi, marginBottom: 26, lineHeight: 1.6, maxWidth: 440, margin: "0 auto 24px", fontFamily: "var(--font-sans)" }}>
            {t("alert.desc")}
          </p>

          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 18, flexWrap: "wrap" }} role="radiogroup" aria-label={t("alert.title")}>
            {CHANNEL_KEYS.map((key) => {
              const active = channel === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    setChannel(key);
                    setError("");
                  }}
                  style={{
                    background: active ? DS.accentChipActiveBg : DS.bg1,
                    border: `1px solid ${active ? DS.accentChipActiveBorder : DS.border}`,
                    borderRadius: 10,
                    padding: "7px 16px",
                    fontSize: 12.5,
                    fontWeight: active ? 700 : 500,
                    color: active ? DS.saffron : DS.muted,
                    cursor: "pointer",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {t(`alert.${key}`)}
                </button>
              );
            })}
          </div>

          {sub ? (
            <p style={{ color: DS.green, fontSize: 14, fontFamily: "var(--font-sans)", padding: "14px 0" }}>
              ✅ {t("alert.success", { channel: t(`alert.${channel}`) })}
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubscribe();
              }}
            >
              <div style={{ display: "flex", gap: 10, maxWidth: 460, margin: "0 auto", flexWrap: "wrap", justifyContent: "center" }}>
                <input
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setError("");
                  }}
                  placeholder={t(PLACEHOLDER_KEYS[channel] || "alert.placeholder")}
                  aria-label={t(PLACEHOLDER_KEYS[channel] || "alert.placeholder")}
                  style={{
                    flex: "1 1 200px",
                    background: DS.bg2,
                    border: `1px solid ${DS.borderHi}`,
                    borderRadius: 12,
                    padding: "12px 16px",
                    fontSize: 13,
                    color: DS.white,
                    outline: "none",
                    fontFamily: "var(--font-sans)",
                  }}
                />
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    background: DS.gradientBrand,
                    border: "none",
                    borderRadius: 12,
                    padding: "12px 22px",
                    fontSize: 13,
                    fontWeight: 700,
                    color: DS.inkOnBrand,
                    cursor: loading ? "wait" : "pointer",
                    flexShrink: 0,
                    fontFamily: "var(--font-sans)",
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? t("alert.subscribing") : t("alert.subscribe")}
                </button>
              </div>
              {error && (
                <p style={{ color: DS.red, fontSize: 12, marginTop: 10, fontFamily: "var(--font-sans)" }}>
                  {error}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

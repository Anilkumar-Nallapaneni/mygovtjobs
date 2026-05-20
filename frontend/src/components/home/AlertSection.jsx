import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DS } from "@/theme/designSystem";

const CHANNEL_KEYS = ["email", "whatsapp", "telegram", "push"];

export default function AlertSection() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [sub, setSub] = useState(false);
  const [channel, setChannel] = useState("email");

  return (
    <div style={{ padding: "40px 20px", background: DS.bg0, borderTop: `1px solid ${DS.border}` }}>
      <div
        style={{
          maxWidth: 800,
          margin: "0 auto",
          background: DS.alertPanelBg,
          border: `1px solid ${DS.accentBorderLo}`,
          borderRadius: 22,
          padding: "42px",
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
          <h2 style={{ fontSize: 26, fontWeight: 900, color: DS.white, fontFamily: "'Sora',sans-serif", marginBottom: 8, letterSpacing: 0.5 }}>
            {t("alert.title")}
          </h2>
          <p style={{ fontSize: 13.5, color: DS.mutedHi, marginBottom: 26, lineHeight: 1.6, maxWidth: 440, margin: "0 auto 24px" }}>{t("alert.desc")}</p>

          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 18, flexWrap: "wrap" }} role="radiogroup" aria-label={t("alert.title")}>
            {CHANNEL_KEYS.map((key) => {
              const active = channel === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setChannel(key)}
                  style={{
                    background: active ? DS.accentChipActiveBg : DS.bg1,
                    border: `1px solid ${active ? DS.accentChipActiveBorder : DS.border}`,
                    borderRadius: 10,
                    padding: "7px 16px",
                    fontSize: 12.5,
                    fontWeight: active ? 700 : 500,
                    color: active ? DS.saffron : DS.muted,
                    cursor: "pointer",
                    fontFamily: "'Outfit',sans-serif",
                  }}
                >
                  {t(`alert.${key}`)}
                </button>
              );
            })}
          </div>

          {sub ? (
            <p style={{ color: DS.green, fontSize: 14, fontFamily: "'Outfit',sans-serif", padding: "14px 0" }}>
              ✅ {t("alert.success", { channel: t(`alert.${channel}`) })}
            </p>
          ) : (
            <div style={{ display: "flex", gap: 10, maxWidth: 460, margin: "0 auto" }}>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("alert.placeholder")}
                style={{
                  flex: 1,
                  background: DS.bg2,
                  border: `1px solid ${DS.borderHi}`,
                  borderRadius: 12,
                  padding: "12px 16px",
                  fontSize: 13,
                  color: DS.white,
                  outline: "none",
                  fontFamily: "'Outfit',sans-serif",
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (email.includes("@")) setSub(true);
                }}
                style={{
                  background: DS.gradientBrand,
                  border: "none",
                  borderRadius: 12,
                  padding: "12px 22px",
                  fontSize: 13,
                  fontWeight: 700,
                  color: DS.inkOnBrand,
                  cursor: "pointer",
                  flexShrink: 0,
                  fontFamily: "'Outfit',sans-serif",
                }}
              >
                {t("alert.subscribe")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

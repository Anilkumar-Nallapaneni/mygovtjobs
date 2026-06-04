import { useState } from "react";
import { useTranslation } from "react-i18next";
import { subscribeToAlerts } from "@/lib/jobsApi";

const CHANNEL_KEYS = ["email", "whatsapp", "telegram", "push"] as const;
type AlertChannel = (typeof CHANNEL_KEYS)[number];

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
  const [channel, setChannel] = useState<AlertChannel>("email");
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
    } else if ("error" in result) {
      const errMsg = result.error;
      setError(
        errMsg.includes("fetch") || errMsg.includes("Network")
          ? t("alert.offlineError")
          : t("alert.error")
      );
    }
  };

  return (
    <div id="alert-section" className="alert-section">
      <div className="alert-section__card">
        <div className="alert-section__glow" aria-hidden />
        <div className="alert-section__body">
          <div className="alert-section__icon">🔔</div>
          <h2 className="alert-section__title">{t("alert.title")}</h2>
          <p className="alert-section__desc">{t("alert.desc")}</p>

          <div className="alert-section__channels" role="radiogroup" aria-label={t("alert.title")}>
            {CHANNEL_KEYS.map((key) => {
              const active = channel === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`alert-section__channel${active ? " alert-section__channel--active" : ""}`}
                  onClick={() => {
                    setChannel(key as AlertChannel);
                    setError("");
                  }}
                >
                  {t(`alert.${key}`)}
                </button>
              );
            })}
          </div>

          {sub ? (
            <p className="alert-section__success">
              ✅ {t("alert.success", { channel: t(`alert.${channel}`) })}
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubscribe();
              }}
            >
              <div className="alert-section__form-row">
                <input
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setError("");
                  }}
                  placeholder={t(PLACEHOLDER_KEYS[channel] || "alert.placeholder")}
                  aria-label={t(PLACEHOLDER_KEYS[channel] || "alert.placeholder")}
                  className="alert-section__input"
                />
                <button type="submit" disabled={loading} className="alert-section__submit">
                  {loading ? t("alert.subscribing") : t("alert.subscribe")}
                </button>
              </div>
              {error && <p className="alert-section__error">{error}</p>}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

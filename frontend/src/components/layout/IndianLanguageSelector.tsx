import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { DS } from "@/theme/designSystem";
import { ensureLocale } from "@/i18n/ensureLocale";
import { INDIAN_LANGUAGES, LANGUAGE_COUNT, languageMeta } from "@/i18n/languages";

/** Only language switcher on the site — lists all 23 Indian languages. */
export default function IndianLanguageSelector() {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const activeLang = i18n.resolvedLanguage || i18n.language;
  const current = languageMeta(activeLang);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const pickLanguage = async (code: string) => {
    if (code === activeLang) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    setError(null);
    try {
      await ensureLocale(code);
      await i18n.changeLanguage(code);
      setOpen(false);
    } catch (e) {
      console.error("[IndianLanguageSelector]", e);
      setError(t("lang.error"));
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div ref={rootRef} className="indian-language-selector" style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        title={t("lang.choose")}
        disabled={switching}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: DS.bg2,
          border: `1px solid ${error ? "#c44" : DS.borderHi}`,
          borderRadius: 10,
          padding: "6px 10px",
          fontSize: 12,
          color: DS.white,
          cursor: switching ? "wait" : "pointer",
          fontFamily: "'Outfit',sans-serif",
          maxWidth: 160,
        }}
      >
        <span style={{ fontSize: 14 }} aria-hidden>
          🌐
        </span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {switching ? "…" : current.native}
        </span>
        <span style={{ color: DS.muted, fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </button>

      {error && (
        <div
          style={{ position: "absolute", top: "100%", right: 0, fontSize: 10, color: "#f88", marginTop: 4 }}
          role="alert"
        >
          {error}
        </div>
      )}

      {open && (
        <ul
          role="listbox"
          aria-label={t("lang.label")}
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            margin: 0,
            padding: 6,
            listStyle: "none",
            background: DS.bg1,
            border: `1px solid ${DS.borderHi}`,
            borderRadius: 12,
            boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
            maxHeight: "min(70vh, 420px)",
            overflowY: "auto",
            zIndex: 500,
            minWidth: 240,
          }}
        >
          <li
            aria-hidden
            style={{
              padding: "6px 10px 4px",
              fontSize: 10,
              color: DS.muted,
              fontFamily: "'Outfit',sans-serif",
              borderBottom: `1px solid ${DS.border}`,
              marginBottom: 4,
              position: "sticky",
              top: 0,
              background: DS.bg1,
            }}
          >
            {t("lang.count", {
              count: LANGUAGE_COUNT,
              defaultValue: `${LANGUAGE_COUNT} languages`,
            })}
          </li>
          {INDIAN_LANGUAGES.map((lang) => {
            const active = activeLang === lang.code;
            return (
              <li key={lang.code} role="option" aria-selected={active}>
                <button
                  type="button"
                  disabled={switching}
                  onClick={() => pickLanguage(lang.code)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: active ? DS.accentSoft : "transparent",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 10px",
                    cursor: switching ? "wait" : "pointer",
                    fontFamily: "'Outfit',sans-serif",
                    fontSize: 12.5,
                    color: active ? DS.saffron : DS.mutedHi,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    direction: lang.dir,
                  }}
                >
                  <span>{lang.native}</span>
                  <span style={{ fontSize: 10, color: DS.muted }}>{lang.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

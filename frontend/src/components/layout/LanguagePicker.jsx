import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { DS } from "@/theme/designSystem";
import { INDIAN_LANGUAGES } from "@/i18n/languages";

export default function LanguagePicker() {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const current = INDIAN_LANGUAGES.find((l) => l.code === i18n.language) ?? INDIAN_LANGUAGES[0];

  return (
    <div ref={rootRef} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        title={t("lang.choose")}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: DS.bg2,
          border: `1px solid ${DS.borderHi}`,
          borderRadius: 10,
          padding: "6px 10px",
          fontSize: 12,
          color: DS.white,
          cursor: "pointer",
          fontFamily: "'Outfit',sans-serif",
          maxWidth: 140,
        }}
      >
        <span style={{ fontSize: 14 }} aria-hidden>
          🌐
        </span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{current.native}</span>
        <span style={{ color: DS.muted, fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </button>

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
            maxHeight: 320,
            overflowY: "auto",
            zIndex: 500,
            minWidth: 200,
          }}
        >
          {INDIAN_LANGUAGES.map((lang) => {
            const active = i18n.language === lang.code;
            return (
              <li key={lang.code} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    i18n.changeLanguage(lang.code);
                    setOpen(false);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: active ? DS.accentSoft : "transparent",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 10px",
                    cursor: "pointer",
                    fontFamily: "'Outfit',sans-serif",
                    fontSize: 12.5,
                    color: active ? DS.saffron : DS.mutedHi,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
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


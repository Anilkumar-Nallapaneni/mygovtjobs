import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import IndianLanguageSelector from "@/components/layout/IndianLanguageSelector";
import BrandLogo from "@/components/layout/BrandLogo";
const NAV_KEYS = ["home", "jobs", "results", "admitCard", "alert"];

function formatNavDate(d, locale) {
  return d.toLocaleDateString(locale === "en" ? "en-IN" : locale, { day: "numeric", month: "short", year: "numeric" }).replace(/,/g, "").trim();
}

function formatNavTime(d, locale) {
  return d
    .toLocaleTimeString(locale === "en" ? "en-IN" : locale, { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true })
    .replace(/\s*a\.?m\.?/i, " am")
    .replace(/\s*p\.?m\.?/i, " pm")
    .toLowerCase();
}

const toViewId = (key) => (key === "admitCard" ? "admit-card" : key);

function NavButtons({ view, onNavigate, className = "" }) {
  const { t } = useTranslation();
  return (
    <div className={className}>
      {NAV_KEYS.map((key) => {
        const id = toViewId(key);
        const active = view === id;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onNavigate(id)}
            className={`navbar__nav-btn${active ? " navbar__nav-btn--active" : ""}`}
          >
            {t(`nav.${key}`)}
          </button>
        );
      })}
    </div>
  );
}

function SearchForm({ search, setSearch, onSearch, className = "" }) {
  const { t } = useTranslation();
  return (
    <form
      role="search"
      className={`navbar__search ${className}`.trim()}
      onSubmit={(e) => {
        e.preventDefault();
        onSearch?.();
      }}
    >
      <div className="navbar__search-box">
        <span className="navbar__menu-icon" aria-hidden>
          🔍
        </span>
        <input
          type="search"
          name="q"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("nav.searchPlaceholder")}
          aria-label={t("nav.searchPlaceholder")}
          className="navbar__search-input"
        />
      </div>
      <button type="submit" className="navbar__search-submit">
        {t("nav.search", { defaultValue: "Search" })}
      </button>
    </form>
  );
}

export default function Navbar({ view, onNavigate, search, setSearch, onSearch, colorMode = "bw", onColorModeChange }) {
  const { t, i18n } = useTranslation();
  const isLight = colorMode === "bw";
  const [now, setNow] = useState(() => new Date());
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const handleNavigate = (id) => {
    onNavigate?.(id);
    setMenuOpen(false);
  };

  const handleSearch = () => {
    onSearch?.();
    setMenuOpen(false);
  };

  return (
    <nav className={`navbar${menuOpen ? " navbar--open" : ""}`}>
      <div className="navbar__inner">
        <button type="button" className="navbar__brand" onClick={() => handleNavigate("home")}>
          <BrandLogo size={36} className="navbar__logo" />
          <div>
            <div className="navbar__brand-name">
              {t("brand.primary")}
              <span className="navbar__brand-accent">{t("brand.accent")}</span>
            </div>
            <div className="navbar__brand-tagline">{t("brand.tagline")}</div>
          </div>
        </button>

        <NavButtons view={view} onNavigate={handleNavigate} className="navbar__nav" />

        <SearchForm search={search} setSearch={setSearch} onSearch={handleSearch} />

        <div className="navbar__clock" aria-live="polite" aria-atomic="true">
          <span className="navbar__clock-date">{formatNavDate(now, i18n.language)}</span>
          <span className="navbar__clock-time">{formatNavTime(now, i18n.language)}</span>
        </div>

        <IndianLanguageSelector />

        {typeof onColorModeChange === "function" && (
          <div className="navbar__theme" title="Theme">
            <span className="navbar__theme-label">{t("nav.light")}</span>
            <button
              type="button"
              role="switch"
              aria-checked={!isLight}
              aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
              onClick={() => onColorModeChange(isLight ? "dark" : "bw")}
              className="navbar__theme-switch"
            >
              <span className={`navbar__theme-knob${isLight ? "" : " navbar__theme-knob--dark"}`} />
            </button>
            <span className="navbar__theme-label">{t("nav.dark")}</span>
          </div>
        )}

        <button
          type="button"
          className="navbar__menu-btn"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      <div className="navbar__drawer-backdrop" onClick={() => setMenuOpen(false)} aria-hidden={!menuOpen} />
      <div className="navbar__drawer" aria-hidden={!menuOpen}>
        <div className="navbar__drawer-close">
          <button type="button" className="navbar__menu-btn" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
            ✕
          </button>
        </div>
        <NavButtons view={view} onNavigate={handleNavigate} className="navbar__drawer-nav" />
        <SearchForm search={search} setSearch={setSearch} onSearch={handleSearch} className="navbar__drawer-search" />
      </div>
    </nav>
  );
}

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { DS } from "@/theme/designSystem";
import { useOfficialFeed } from "@/hooks/useOfficialFeed";
import {
  filterOfficialItems,
  describeActiveFilters,
} from "@/utils/officialFilters";
import { sitesForStateAndCategory } from "@/data/officialSites";

/**
 * Shows items from `public/data/official-feed-items.json` produced by
 * `npm run fetch:official`, filtered by state / category / sidebar topic.
 *
 * When the live feed has no matches for the active filters, falls back to a
 * curated list of OFFICIAL portal deep-links so the user is never stuck.
 */
export default function OfficialHeadlinesSection({
  stateId = null,
  categoryId = null,
  topicKey = null,
  search = "",
  onClearTopic,
}) {
  const { t, i18n } = useTranslation();
  const { items, generatedAt, error } = useOfficialFeed();

  const filtered = useMemo(
    () => filterOfficialItems(items, { stateId, categoryId, topicKey, search }),
    [items, stateId, categoryId, topicKey, search]
  );

  const fallbackSites = useMemo(
    () => sitesForStateAndCategory(stateId, categoryId),
    [stateId, categoryId]
  );

  const activeLabel = describeActiveFilters({ stateId, categoryId, topicKey, search });

  if (error && items.length === 0) {
    return (
      <section id="official-headlines" style={{ padding: "0 20px 28px", maxWidth: 1240, margin: "0 auto", scrollMarginTop: 80 }} aria-label="Official headlines">
        <div style={{ fontSize: 12, color: DS.muted, fontFamily: "var(--font-sans)" }}>
          {t("headlines.feedError", { error })}
        </div>
        <OfficialPortalGrid sites={fallbackSites} t={t} />
      </section>
    );
  }

  if (items.length === 0 && !generatedAt && !error) {
    return (
      <section id="official-headlines" style={{ padding: "0 20px 28px", maxWidth: 1240, margin: "0 auto", scrollMarginTop: 80 }} aria-label="Official headlines">
        <div style={{ fontSize: 12, color: DS.muted, fontFamily: "'Outfit',sans-serif" }}>
          {t("headlines.loading")}
        </div>
      </section>
    );
  }

  const showFallback = filtered.length === 0;

  return (
    <section id="official-headlines" style={{ padding: "0 20px 32px", maxWidth: 1240, margin: "0 auto", scrollMarginTop: 80 }} aria-label="Official headlines">
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: DS.white, fontFamily: "'Sora',sans-serif", margin: "0 0 4px" }}>
            {t("headlines.wireTitle")}
          </h2>
          <p style={{ fontSize: 12, color: DS.muted, fontFamily: "'Outfit',sans-serif", margin: 0, maxWidth: 720, lineHeight: 1.5 }}>
            {t("headlines.wireDesc")}
            {activeLabel ? (
              <>
                {" "}
                {t("headlines.filteredBy")} <strong style={{ color: DS.saffron }}>{activeLabel}</strong>.
              </>
            ) : null}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {topicKey && typeof onClearTopic === "function" && (
            <button
              type="button"
              onClick={onClearTopic}
              style={{
                background: "transparent",
                border: `1px solid ${DS.accentBorder}`,
                borderRadius: 8,
                padding: "4px 10px",
                fontSize: 11,
                color: DS.saffron,
                cursor: "pointer",
                fontFamily: "'Outfit',sans-serif",
              }}
            >
              {t("headlines.clearTopic")}
            </button>
          )}
          {generatedAt && (
            <span style={{ fontSize: 10.5, color: DS.muted, fontFamily: "'JetBrains Mono',monospace" }}>
              {t("headlines.snapshot")}{" "}
              {new Date(generatedAt).toLocaleString(i18n.language === "en" ? "en-IN" : i18n.language, { dateStyle: "medium", timeStyle: "short" })}
            </span>
          )}
        </div>
      </div>

      {showFallback ? (
        <>
          <div
            style={{
              background: DS.bg1,
              border: `1px solid ${DS.border}`,
              borderRadius: 12,
              padding: "10px 14px",
              fontSize: 12,
              color: DS.mutedHi,
              fontFamily: "'Outfit',sans-serif",
              marginBottom: 12,
              lineHeight: 1.55,
            }}
          >
            {t("headlines.noSnapshot", { label: activeLabel ? ` (${activeLabel})` : "" })}
          </div>
          <OfficialPortalGrid sites={fallbackSites} t={t} />
        </>
      ) : (
        <FeedList items={filtered} t={t} />
      )}
    </section>
  );
}

function FeedList({ items, t }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxHeight: 520,
        overflowY: "auto",
        paddingRight: 4,
        WebkitOverflowScrolling: "touch",
      }}
    >
      {items.map((it) => (
        <article
          key={it.id}
          style={{
            background: DS.bg1,
            border: `1px solid ${DS.border}`,
            borderRadius: 12,
            padding: "10px 12px",
            fontFamily: "'Outfit',sans-serif",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: DS.saffron,
              letterSpacing: 0.6,
              marginBottom: 4,
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span>{it.sourceName || it.sourceId}</span>
            {it.state && it.state !== "All India" && (
              <span style={{ color: DS.mutedHi, fontWeight: 600 }}>· {it.state}</span>
            )}
          </div>
          <a
            href={it.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 13.5,
              fontWeight: 600,
              color: DS.white,
              textDecoration: "none",
              lineHeight: 1.45,
            }}
          >
            {it.title}
            <span style={{ color: DS.muted, fontWeight: 400 }}> ↗</span>
          </a>
          {it.pdfUrls?.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {it.pdfUrls.map((pdf, pi) => {
                let label = t("headlines.pdf");
                try {
                  const seg = decodeURIComponent(pdf.split("/").pop() || "");
                  if (seg && seg.length < 42) label = seg;
                } catch {
                  /* ignore */
                }
                return (
                  <a
                    key={pdf}
                    href={pdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={pdf}
                    style={{
                      fontSize: 11,
                      color: DS.saffron,
                      textDecoration: "none",
                      border: `1px solid ${DS.accentBorder}`,
                      borderRadius: 8,
                      padding: "3px 8px",
                      maxWidth: 200,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {it.pdfUrls.length > 1 ? `${label} (${pi + 1})` : `${label}`} ↗
                  </a>
                );
              })}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

function OfficialPortalGrid({ sites, t }) {
  if (!sites.length) {
    return (
      <div
        style={{
          background: DS.bg1,
          border: `1px solid ${DS.border}`,
          borderRadius: 12,
          padding: "14px 16px",
          fontSize: 12.5,
          color: DS.mutedHi,
          fontFamily: "'Outfit',sans-serif",
        }}
      >
        {t("headlines.noPortals")}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 10,
      }}
    >
      {sites.map((s) => (
        <a
          key={s.id}
          href={s.latestUrl || s.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: DS.bg1,
            border: `1px solid ${DS.border}`,
            borderRadius: 12,
            padding: "10px 12px",
            textDecoration: "none",
            fontFamily: "'Outfit',sans-serif",
            color: DS.white,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            transition: "border-color 0.15s, background 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = DS.accentBorderHi;
            e.currentTarget.style.background = DS.bg2;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = DS.border;
            e.currentTarget.style.background = DS.bg1;
          }}
        >
          <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, color: DS.saffron, textTransform: "uppercase" }}>
            {s.scope}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35 }}>
            {s.name} <span style={{ color: DS.muted, fontWeight: 400 }}>↗</span>
          </span>
          <span style={{ fontSize: 10.5, color: DS.mutedHi, wordBreak: "break-all" }}>
            {hostFromUrl(s.latestUrl || s.url)}
          </span>
        </a>
      ))}
    </div>
  );
}

function hostFromUrl(u) {
  try {
    return new URL(u).host;
  } catch {
    return u;
  }
}

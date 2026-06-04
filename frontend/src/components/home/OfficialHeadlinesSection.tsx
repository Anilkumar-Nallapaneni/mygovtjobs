import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useOfficialFeed } from "@/hooks/useOfficialFeed";
import {
  filterOfficialItems,
  describeActiveFilters,
} from "@/utils/officialFilters";
import { sitesForStateAndCategory } from "@/data/officialSites";

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
      <section id="official-headlines" className="official-headlines official-headlines--compact" aria-label="Official headlines">
        <div className="official-headlines__muted">{t("headlines.feedError", { error })}</div>
        <OfficialPortalGrid sites={fallbackSites} t={t} />
      </section>
    );
  }

  if (items.length === 0 && !generatedAt && !error) {
    return (
      <section id="official-headlines" className="official-headlines official-headlines--compact" aria-label="Official headlines">
        <div className="official-headlines__muted">{t("headlines.loading")}</div>
      </section>
    );
  }

  const showFallback = filtered.length === 0;

  return (
    <section id="official-headlines" className="official-headlines" aria-label="Official headlines">
      <div className="official-headlines__head">
        <div>
          <h2 className="official-headlines__title">{t("headlines.wireTitle")}</h2>
          <p className="official-headlines__desc">
            {t("headlines.wireDesc")}
            {activeLabel ? (
              <>
                {" "}
                {t("headlines.filteredBy")}{" "}
                <strong className="official-headlines__filter-strong">{activeLabel}</strong>.
              </>
            ) : null}
          </p>
        </div>
        <div className="official-headlines__actions">
          {topicKey && typeof onClearTopic === "function" && (
            <button type="button" onClick={onClearTopic} className="official-headlines__clear-btn">
              {t("headlines.clearTopic")}
            </button>
          )}
          {generatedAt && (
            <span className="official-headlines__snapshot">
              {t("headlines.snapshot")}{" "}
              {new Date(generatedAt).toLocaleString(i18n.language === "en" ? "en-IN" : i18n.language, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          )}
        </div>
      </div>

      {showFallback ? (
        <>
          <div className="official-headlines__notice">
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
    <div className="official-headlines__feed">
      {items.map((it) => (
        <article key={it.id} className="official-headlines__article">
          <div className="official-headlines__source">
            <span>{it.sourceName || it.sourceId}</span>
            {it.state && it.state !== "All India" && (
              <span className="official-headlines__state">· {it.state}</span>
            )}
          </div>
          <a href={it.link} target="_blank" rel="noopener noreferrer" className="official-headlines__link">
            {it.title}
            <span className="official-headlines__link-arrow"> ↗</span>
          </a>
          {it.pdfUrls?.length > 0 && (
            <div className="official-headlines__pdfs">
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
                    className="official-headlines__pdf"
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
    return <div className="official-headlines__notice">{t("headlines.noPortals")}</div>;
  }

  return (
    <div className="official-headlines__portal-grid">
      {sites.map((s) => (
        <a
          key={s.id}
          href={s.latestUrl || s.url}
          target="_blank"
          rel="noopener noreferrer"
          className="official-headlines__portal-card"
        >
          <span className="official-headlines__portal-scope">{s.scope}</span>
          <span className="official-headlines__portal-name">
            {s.name} <span className="official-headlines__link-arrow">↗</span>
          </span>
          <span className="official-headlines__portal-host">{hostFromUrl(s.latestUrl || s.url)}</span>
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

import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

import { useNow } from "@/hooks/useNow";
import { DS } from "@/theme/designSystem";
import { CATS } from "@/data/categories";
import { translateDateKey, translateFeeKey } from "@/utils/jobDetailLabels";
import { isPdfUrl } from "@/utils/officialDomains";
import { buildJobDetailView } from "@/utils/jobDetailContent";
import { collectDetailLinksFromJob } from "@/utils/jobDetailLinks";

const DAY_MS = 1000 * 60 * 60 * 24;

function Section({ title, children }) {
  return (
    <div className="job-detail-section">
      {title ? <h3 className="job-detail-section-title">{title}</h3> : null}
      {children}
    </div>
  );
}

function displayValue(v, fallback = "—") {
  const s = String(v ?? "").trim();
  if (!s || /^(?:-|—|tba|pending|null|undefined)$/i.test(s)) return fallback;
  return s;
}

function renderDynamicTable(rows: Record<string, string>[]) {
  if (!rows?.length) return null;
  const keys = Object.keys(rows[0] || {});
  if (!keys.length) return null;

  return (
    <div className="job-detail-table-wrap">
      <table className="job-detail-table">
        <thead>
          <tr>
            {keys.map((key) => (
              <th key={key}>{key}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {keys.map((key) => (
                <td key={key}>{row[key] ?? ""}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ApplyLinks({ links }) {
  if (!links?.length) return null;

  return (
    <div className="job-detail-apply-links">
      <div className="job-detail-apply-links-row">
        {links.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="job-detail-apply-btn"
            onClick={(e) => e.stopPropagation()}
          >
            {isPdfUrl(link.url) ? "📄 " : "🔗 "}
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}

function MetaRow({ items }) {
  return (
    <div className="job-detail-meta-row">
      {items.map(({ label, value }) => (
        <span key={label}>
          <strong>{label}:</strong> {value}
        </span>
      ))}
    </div>
  );
}

function ContentSections({ sections }) {
  if (!sections?.length) return null;

  return sections.map((section, idx) => (
    <Section key={`${section.heading}-${idx}`} title={section.heading || ""}>
      {section.paragraphs?.map((paragraph, pIdx) => (
        <p key={pIdx} className="job-detail-summary">
          {paragraph}
        </p>
      ))}
      {section.tables?.map((table, tIdx) => (
        <div key={tIdx}>{renderDynamicTable(table)}</div>
      ))}
      {section.lists?.map((list, lIdx) => (
        <ul key={lIdx} className="job-detail-bullets">
          {list.map((item, iIdx) => (
            <li key={iIdx}>{item}</li>
          ))}
        </ul>
      ))}
    </Section>
  ));
}

export default function JobDetail({ job, onClose }) {
  const { t, i18n } = useTranslation();
  const panelRef = useRef(null);
  const view = useMemo(() => buildJobDetailView(job), [job]);
  const structured = view.structured;
  const useStructured = structured?.isStructured;

  const now = useNow();
  const catColor = (CATS.find((c) => c.id === view.category) || { color: DS.saffron }).color;
  const lastDateMs = view.lastDate ? new Date(view.lastDate).getTime() : NaN;
  const daysLeft = Number.isFinite(lastDateMs)
    ? Math.ceil((lastDateMs - now) / DAY_MS)
    : null;
  const isUrgent = daysLeft != null && daysLeft >= 0 && daysLeft <= 7;
  const dateLocale = i18n.language === "en" ? "en-IN" : i18n.language;

  const bottomLinks = useMemo(() => collectDetailLinksFromJob(job), [job]);

  const postName =
    structured?.overviewFacts.find((f) => /post name/i.test(f.label))?.value ||
    (view.vacancies > 0 ? `${view.vacancies.toLocaleString(dateLocale)} posts` : "—");

  const metaItems = [
    { label: t("jobDetail.board", { defaultValue: "Board" }), value: displayValue(view.dept) },
    { label: t("jobDetail.postName"), value: displayValue(postName) },
    { label: t("jobDetail.lastDateLabel"), value: displayValue(view.lastDate) },
  ].filter((item) => item.value !== "—");

  const dateEntries = useStructured
    ? structured.importantDates.map((d) => [d.event, d.date])
    : Object.entries(view.dates || {}).filter(([, v]) => v && String(v).trim());

  const feeEntries = Object.entries(view.fee || {}).filter(([, v]) => v && String(v).trim());
  const summaryText = useStructured ? structured.summary || view.about : view.about;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="job-detail-overlay"
      style={{ background: DS.overlayScrim }}
      role="dialog"
      aria-modal="true"
      aria-label={view.title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="job-detail-panel"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={onClose} className="job-detail-back-btn">
          {t("jobDetail.back")}
        </button>

        <div className="job-detail-hero">
          <div className="job-detail-badges">
            <span
              className="job-detail-badge"
              style={{ color: catColor, borderColor: `${catColor}40`, background: `${catColor}18` }}
            >
              {t(`category.${view.category}`).toUpperCase()}
            </span>
            {view.state ? (
              <span className="job-detail-badge job-detail-badge-muted">{view.state}</span>
            ) : null}
            {isUrgent ? (
              <span className="job-detail-badge job-detail-badge-urgent">
                ⚠️ {t("jobDetail.closingIn", { count: daysLeft })}
              </span>
            ) : null}
          </div>

          <h1 className="job-detail-title">{view.title}</h1>
          <MetaRow items={metaItems} />
        </div>

        {summaryText ? <p className="job-detail-lead">{summaryText}</p> : null}

        {dateEntries.length > 0 ? (
          <Section title={t("jobDetail.importantDates")}>
            <div className="job-detail-table-wrap">
              <table className="job-detail-table">
                <thead>
                  <tr>
                    <th>{t("jobDetail.dateEvent", { defaultValue: "Event" })}</th>
                    <th>{t("jobDetail.dateValue", { defaultValue: "Date" })}</th>
                  </tr>
                </thead>
                <tbody>
                  {dateEntries.map(([event, dateVal]) => (
                    <tr key={`${event}-${dateVal}`}>
                      <td>{translateDateKey(t, event)}</td>
                      <td>{String(dateVal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        ) : null}

        {useStructured ? (
          <ContentSections sections={structured.displaySections} />
        ) : (
          <>
            {view.selection?.length > 0 ? (
              <Section title={t("jobDetail.selectionProcess")}>
                <ol className="job-detail-steps">
                  {view.selection.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </Section>
            ) : null}

            {view.howApply?.length > 0 ? (
              <Section title={t("jobDetail.howToApply")}>
                <ol className="job-detail-steps">
                  {view.howApply.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </Section>
            ) : null}
          </>
        )}

        {feeEntries.length > 0 ? (
          <Section title={t("jobDetail.applicationFee")}>
            {feeEntries.map(([k, v]) => (
              <div key={k} className="job-detail-fee-row">
                <span>{translateFeeKey(t, k)}</span>
                <span>{String(v)}</span>
              </div>
            ))}
          </Section>
        ) : null}

        <Section title={t("jobDetail.officialLinks", { defaultValue: "Official Links" })}>
          <ApplyLinks links={bottomLinks} />
          {!bottomLinks.length ? (
            <p className="job-detail-summary">
              {t("jobDetail.noOfficialLink", {
                defaultValue:
                  "No verified official link was saved for this listing. Try searching the department name on a .gov.in portal.",
              })}
            </p>
          ) : null}
        </Section>

        <div className="job-detail-disclaimer">⚠️ {t("jobDetail.disclaimer")}</div>
      </div>
    </div>
  );
}

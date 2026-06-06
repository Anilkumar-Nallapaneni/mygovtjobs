import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

import { useNow } from "@/hooks/useNow";
import { DS } from "@/theme/designSystem";
import { CATS } from "@/data/categories";
import { translateDateKey, translateFeeKey } from "@/utils/jobDetailLabels";
import { isPdfUrl } from "@/utils/officialDomains";
import { buildJobDetailView } from "@/utils/jobDetailContent";
import { collectDetailLinksFromJob, resolveTrustedApplyHref, resolveTrustedPdfHref } from "@/utils/jobDetailLinks";
import { resolvePdfUrl } from "@/utils/resolvePdfUrl";

const DAY_MS = 1000 * 60 * 60 * 24;

function Section({ title, children, className = "" }) {
  return (
    <section className={`job-detail-section ${className}`.trim()}>
      {title ? <h3 className="job-detail-section-title">{title}</h3> : null}
      {children}
    </section>
  );
}

function displayValue(v, fallback = "") {
  const s = String(v ?? "").trim();
  if (!s || /^(?:-|—|tba|pending|null|undefined)$/i.test(s)) return fallback;
  return s;
}

function isKvRow(row: Record<string, string>) {
  const label = row.label || row.Label;
  const value = row.value || row.Value;
  return Boolean(label && value);
}

function isKvTable(rows: Record<string, string>[]) {
  return rows?.length > 0 && rows.every(isKvRow);
}

function isDateTable(rows: Record<string, string>[]) {
  return (
    rows?.length > 0 &&
    rows.every((row) => {
      const event = row.event || row.Event;
      const date = row.date || row.Date;
      return Boolean(event && date);
    })
  );
}

function FactsGrid({ items }: { items: Array<{ label: string; value: string }> }) {
  if (!items.length) return null;
  return (
    <div className="job-detail-facts-grid">
      {items.map((item) => (
        <div key={`${item.label}-${item.value}`} className="job-detail-fact-card">
          <div className="job-detail-fact-label">{item.label}</div>
          <div className="job-detail-fact-value">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function renderDataTable(rows: Record<string, string>[]) {
  if (!rows?.length) return null;

  if (isKvTable(rows)) {
    return (
      <FactsGrid
        items={rows.map((row) => ({
          label: row.label || row.Label || "",
          value: row.value || row.Value || "",
        }))}
      />
    );
  }

  const keys = Object.keys(rows[0] || {});
  if (!keys.length) return null;

  return (
    <div className="job-detail-table-wrap">
      <table className="job-detail-table job-detail-table--data">
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

function ContentSections({ sections, skipDateTables = false }) {
  if (!sections?.length) return null;

  return sections.map((section, idx) => {
    const tables = (section.tables || []).filter((table) => {
      if (!skipDateTables || !isDateTable(table)) return true;
      return !/important\s*dates/i.test(section.heading || "");
    });

    const links = section.links || [];
    const hasContent =
      section.paragraphs?.length || tables.length || section.lists?.length || links.length;
    if (!hasContent && !section.heading) return null;

    return (
      <Section key={`${section.heading}-${idx}`} title={section.heading || ""}>
        {section.paragraphs?.map((paragraph, pIdx) => (
          <p key={pIdx} className="job-detail-summary">
            {paragraph}
          </p>
        ))}
        {tables.map((table, tIdx) => (
          <div key={tIdx}>{renderDataTable(table)}</div>
        ))}
        {section.lists?.map((list, lIdx) => (
          <ul key={lIdx} className="job-detail-bullets">
            {list.map((item, iIdx) => (
              <li key={iIdx}>{item}</li>
            ))}
          </ul>
        ))}
        {links.length > 0 ? (
          <div className="job-detail-link-bar">
            {links.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`job-detail-link-btn${isPdfUrl(link.url) ? "" : " job-detail-link-btn-primary"}`}
                onClick={(e) => e.stopPropagation()}
              >
                {isPdfUrl(link.url) ? "📄" : "🔗"} {link.label}
              </a>
            ))}
          </div>
        ) : null}
      </Section>
    );
  });
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

  const applyHref = useMemo(() => {
    const portal = resolveTrustedApplyHref(job);
    if (portal) return portal;
    const raw = job?.applyUrl || job?.apply_url;
    if (raw && raw !== "#" && !isPdfUrl(raw)) return raw;
    return null;
  }, [job]);
  const pdfHref = useMemo(() => {
    const trusted = resolveTrustedPdfHref(job);
    if (trusted) return trusted;
    const official = resolvePdfUrl(job);
    if (official) return official;
    const stored = job?.pdfUrl || job?.pdf_url;
    if (stored) return stored;
    const apply = job?.applyUrl || job?.apply_url;
    if (apply && isPdfUrl(apply)) return apply;
    return null;
  }, [job]);
  const extraPdfLinks = useMemo(() => {
    const seen = new Set<string>();
    if (applyHref) seen.add(applyHref);
    if (pdfHref) seen.add(pdfHref);
    return collectDetailLinksFromJob(job).filter((l) => isPdfUrl(l.url) && !seen.has(l.url));
  }, [job, applyHref, pdfHref]);

  const postName =
    structured?.overviewFacts.find((f) => /post name/i.test(f.label))?.value || "";
  const applyMode = structured?.applyMode || structured?.overviewFacts.find((f) => /apply mode/i.test(f.label))?.value || "";
  const feeEntries = Object.entries(view.fee || {}).filter(([, v]) => v && String(v).trim());

  const overviewFacts = (structured?.overviewFacts || []).filter(
    (f) =>
      f.label &&
      f.value &&
      !/^post name$/i.test(f.label) &&
      !/^(company name|organization name)$/i.test(f.label) &&
      !(feeEntries.length > 0 && /\bfee\b/i.test(f.label))
  );

  const dateEntries = useStructured
    ? structured.importantDates.map((d) => [d.event, d.date])
    : Object.entries(view.dates || {}).filter(([, v]) => v && String(v).trim());

  const summaryText = useStructured ? structured.summary || view.about : view.about;
  const bodySections = useStructured ? structured.articleSections : [];

  const statItems = [
    {
      icon: "📋",
      label: t("jobDetail.postName"),
      value: postName || (view.vacancies > 0 ? `${view.vacancies.toLocaleString(dateLocale)} ${t("job.posts")}` : "—"),
    },
    {
      icon: "📅",
      label: t("jobDetail.lastDateLabel"),
      value: displayValue(view.lastDate, "—"),
    },
    {
      icon: "🎓",
      label: t("jobDetail.qualification", { defaultValue: "Qualification" }),
      value: displayValue(view.qual, "—"),
    },
    {
      icon: "💰",
      label: t("jobDetail.salary", { defaultValue: "Salary" }),
      value: displayValue(view.salary, "—"),
    },
  ].filter((item) => item.value && item.value !== "—");

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
      <div className="job-detail-shell" onClick={(e) => e.stopPropagation()}>
        <div ref={panelRef} className="job-detail-scroll" tabIndex={-1}>
        <div className="job-detail-toolbar">
          <button type="button" onClick={onClose} className="job-detail-back-btn">
            {t("jobDetail.back")}
          </button>
          {applyMode ? <span className="job-detail-toolbar-chip">{applyMode}</span> : null}
        </div>

        <header className="job-detail-hero job-detail-hero--sheet">
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
          {view.dept ? <p className="job-detail-dept">{view.dept}</p> : null}

          {statItems.length > 0 ? (
            <div className="job-detail-stats job-detail-stats--sheet">
              {statItems.map((item) => (
                <div key={item.label} className="job-detail-stat-card">
                  <div className="job-detail-stat-icon">{item.icon}</div>
                  <div className="job-detail-stat-value">{item.value}</div>
                  <div className="job-detail-stat-label">{item.label}</div>
                </div>
              ))}
            </div>
          ) : null}
        </header>

        {summaryText ? (
          <div className="job-detail-lead job-detail-lead--sheet">
            <p>{summaryText}</p>
          </div>
        ) : null}

        {overviewFacts.length > 0 ? (
          <Section title={t("jobDetail.overview", { defaultValue: "Overview" })}>
            <FactsGrid items={overviewFacts} />
          </Section>
        ) : null}

        {dateEntries.length > 0 ? (
          <Section title={t("jobDetail.importantDates")}>
            <div className="job-detail-table-wrap">
              <table className="job-detail-table job-detail-table--data">
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
          <ContentSections sections={bodySections} skipDateTables />
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

        <div className="job-detail-disclaimer">⚠️ {t("jobDetail.disclaimer")}</div>

        {(applyHref || pdfHref || extraPdfLinks.length > 0) ? (
          <div className="job-detail-cta">
            {applyHref ? (
              <a
                href={applyHref}
                target="_blank"
                rel="noopener noreferrer"
                className="job-detail-cta-primary"
                onClick={(e) => e.stopPropagation()}
              >
                🔗 {t("jobDetail.applyOfficial")}
              </a>
            ) : null}
            {pdfHref ? (
              <a
                href={pdfHref}
                target="_blank"
                rel="noopener noreferrer"
                className="job-detail-cta-secondary"
                onClick={(e) => e.stopPropagation()}
              >
                📄 {t("jobDetail.downloadPdf")}
              </a>
            ) : null}
            {extraPdfLinks.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="job-detail-cta-secondary"
                onClick={(e) => e.stopPropagation()}
              >
                📄 {link.label || t("jobDetail.downloadPdf")}
              </a>
            ))}
          </div>
        ) : (
          <div className="job-detail-cta job-detail-cta--empty">
            <p>{t("jobDetail.noOfficialLink", { defaultValue: "No official link available for this listing." })}</p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

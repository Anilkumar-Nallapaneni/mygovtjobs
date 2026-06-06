import { describe, expect, it } from "vitest";

import {
  collectDetailLinksFromJob,
  dedupeDetailLinks,
  normalizeDetailUrl,
  resolveTrustedApplyHref,
} from "@/utils/jobDetailLinks";

describe("jobDetailLinks", () => {
  it("keeps government CDN PDFs and blocks aggregator hosts", () => {
    const url =
      "https://cdn.s3waas.gov.in/s328dd2c7955ce926456240b2ff0100bde/uploads/2026/03/17740041096394.pdf";
    expect(normalizeDetailUrl(url)).toBe(url);
    expect(normalizeDetailUrl("https://www.freejobalert.com/foo")).toBeNull();
  });

  it("collects apply_url, pdf_urls, and section links", () => {
    const job = {
      apply_url: "https://facapp.iitm.ac.in/apply",
      detail: {
        pdf_urls: ["https://facapp.iitm.ac.in/img/Advertisement_RA-2026.pdf"],
        content_sections: [
          {
            heading: "Important Links",
            links: [{ label: "Apply Online", url: "https://facapp.iitm.ac.in/apply" }],
          },
        ],
      },
    };

    const links = collectDetailLinksFromJob(job);
    expect(links.some((l) => l.url.includes("facapp.iitm.ac.in/apply"))).toBe(true);
    expect(links.some((l) => l.url.endsWith(".pdf"))).toBe(true);
    expect(links.length).toBe(2);
  });

  it("prefers portal over PDF for trusted apply href", () => {
    const job = {
      apply_url: "https://cdn.s3waas.gov.in/notice.pdf",
      detail: {
        content_sections: [
          {
            links: [{ url: "https://www.kawardha.gov.in/recruit", label: "Official Website" }],
          },
        ],
      },
    };
    expect(resolveTrustedApplyHref(job)).toBe("https://www.kawardha.gov.in/recruit");
  });

  it("prefers official website from how-to-apply text over notification PDF", () => {
    const job = {
      apply_url: "https://cdnbbsr.s3waas.gov.in/s3ec03f7cfdde9db36af8e0d9a6d123d5c/uploads/2026/05/2026052118.pdf",
      detail: {
        content_sections: [
          {
            heading: "How to Apply",
            links: [],
            lists: [
              [
                "Download the application form from the official website: https://jagatsinghpur.dcourts.gov.in.",
              ],
            ],
            paragraphs: [],
            tables: [],
          },
          {
            heading: "Important Links",
            links: [
              { url: "https://cdnbbsr.s3waas.gov.in/s3ec03f7cfdde9db36af8e0d9a6d123d5c/uploads/2026/05/2026052118.pdf", label: "Click here" },
              { url: "https://jagatsinghpur.dcourts.gov.in/", label: "Click here" },
            ],
            lists: [],
            paragraphs: [],
            tables: [],
          },
        ],
      },
    };
    expect(resolveTrustedApplyHref(job)).toBe("https://jagatsinghpur.dcourts.gov.in/");
  });

  it("labels ViewPdf.aspx links as notification PDFs", () => {
    const job = {
      apply_url: "https://upsssc.gov.in/ViewPdf.aspx?abc123",
      detail: {
        content_sections: [
          {
            heading: "Important Links",
            links: [{ label: "Click here", url: "https://upsssc.gov.in/ViewPdf.aspx?abc123" }],
          },
        ],
      },
    };
    const links = collectDetailLinksFromJob(job);
    expect(links.every((l) => l.label === "Download Notification PDF")).toBe(true);
  });

  it("dedupes links by normalized URL", () => {
    const out = dedupeDetailLinks([
      { label: "A", url: "https://ssc.nic.in/apply" },
      { label: "B", url: "https://ssc.nic.in/apply" },
    ]);
    expect(out).toHaveLength(1);
  });
});

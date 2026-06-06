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

  it("dedupes links by normalized URL", () => {
    const out = dedupeDetailLinks([
      { label: "A", url: "https://ssc.nic.in/apply" },
      { label: "B", url: "https://ssc.nic.in/apply" },
    ]);
    expect(out).toHaveLength(1);
  });
});

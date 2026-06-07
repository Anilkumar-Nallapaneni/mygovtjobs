import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { fetchJobBySlug } from "@/lib/jobsApi";
import { adaptLiveJob } from "@/utils/liveJobAdapter";
import { applyJobSeo } from "@/utils/jobSeo";
import type { JobRecord } from "@/types/job";

const JobDetail = lazy(() => import("@/components/jobs/JobDetail"));

function PageFallback() {
  return <div className="page-fallback">Loading…</div>;
}

function hasFullDetail(job: JobRecord | null): boolean {
  const detail = job?.detail;
  if (!detail || typeof detail !== "object") return false;
  const sections = (detail as Record<string, unknown>).content_sections;
  return Array.isArray(sections) && sections.length > 0;
}

type JobDetailPageProps = {
  jobs: JobRecord[];
  loading: boolean;
};

export default function JobDetailPage({ jobs, loading }: JobDetailPageProps) {
  const { slug: slugParam } = useParams();
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  const [resolvedJob, setResolvedJob] = useState<JobRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const slug = slugParam ? decodeURIComponent(slugParam) : "";

  const listJob = useMemo(() => {
    if (!slug) return null;
    return jobs.find((row) => row.slug === slug || row.id === slug) || null;
  }, [jobs, slug]);

  const job = resolvedJob || listJob;

  useEffect(() => {
    setResolvedJob(null);
  }, [slug]);

  useEffect(() => {
    if (!slug || !listJob || hasFullDetail(listJob)) {
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    fetchJobBySlug(slug)
      .then((row) => {
        if (cancelled || !row) return;
        setResolvedJob(adaptLiveJob(row, 0));
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, listJob]);

  useEffect(() => {
    if (!job?.title) return;
    return applyJobSeo(job);
  }, [job]);

  if ((loading || detailLoading) && !job) {
    return <PageFallback />;
  }

  if (!job) {
    return (
      <div className="page-fallback">
        <p>{t("jobDetail.notFound", { defaultValue: "Job not found or no longer listed." })}</p>
        <button type="button" className="job-detail-back-btn" onClick={() => navigate("/")}>
          {t("jobDetail.back")}
        </button>
      </div>
    );
  }

  return (
    <Suspense fallback={<PageFallback />}>
      <JobDetail
        key={`${job.id}-${i18n.language}`}
        job={job}
        onClose={() => {
          if (window.history.length > 1) navigate(-1);
          else navigate("/");
        }}
      />
    </Suspense>
  );
}

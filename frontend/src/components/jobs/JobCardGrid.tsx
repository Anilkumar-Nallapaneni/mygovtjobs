import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import JobCard from "@/components/jobs/JobCard";

const ROW_HEIGHT = 168;
const GAP = 12;

/**
 * Two-column virtualized grid for large job lists.
 */
export default function JobCardGrid({ jobs, onJobClick, jobCardFilterProps = {} }) {
  const parentRef = useRef(null);
  const rowCount = Math.ceil(jobs.length / 2) || 0;

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT + GAP,
    overscan: 4,
  });

  return (
    <div
      ref={parentRef}
      className="home-jobs-grid-virtual"
      style={{ maxHeight: "min(72vh, 920px)", overflow: "auto", contain: "strict" }}
    >
      <div style={{ height: virtualizer.getTotalSize(), width: "100%", position: "relative" }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const i0 = virtualRow.index * 2;
          const pair = [jobs[i0], jobs[i0 + 1]].filter(Boolean);
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: GAP,
                paddingBottom: GAP,
              }}
            >
              {pair.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onClick={() => onJobClick(job)}
                  {...jobCardFilterProps}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

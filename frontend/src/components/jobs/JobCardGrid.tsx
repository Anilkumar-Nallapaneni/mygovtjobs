import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import JobCard from "@/components/jobs/JobCard";

/** Card height + row gap — must match styles/app.css virtual grid */
const CARD_HEIGHT = 252;
const ROW_GAP = 16;

/**
 * Two-column virtualized grid inside `.home-jobs-section__panel` only.
 */
export default function JobCardGrid({ jobs, onJobClick, jobCardFilterProps = {} }) {
  const parentRef = useRef(null);
  const rowCount = Math.ceil(jobs.length / 2) || 0;
  const rowSize = CARD_HEIGHT + ROW_GAP;

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowSize,
    overscan: 4,
  });

  const totalHeight = Math.max(virtualizer.getTotalSize(), rowCount * rowSize);

  return (
    <div ref={parentRef} className="home-jobs-grid-virtual" role="list">
      <div className="home-jobs-grid-virtual__track" style={{ height: totalHeight }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const i0 = virtualRow.index * 2;
          const pair = [jobs[i0], jobs[i0 + 1]].filter(Boolean);
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              className="home-jobs-grid-virtual__row"
              role="listitem"
              style={{
                height: rowSize,
                transform: `translateY(${virtualRow.start}px)`,
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

import { useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";

export default function Ticker({ feedItems = [], jobItems = [] }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);

  const jobLines = useMemo(() => {
    return jobItems.slice(0, 10).map((j) => {
      const tag = j.status === "hot" ? "🔥" : j.status === "new" ? "🆕" : "📋";
      const vac =
        j.vacancies != null && Number(j.vacancies) > 0
          ? ` — ${Number(j.vacancies).toLocaleString("en-IN")} ${t("ticker.posts")}`
          : "";
      const last = j.lastDate ? ` | ${t("ticker.last")} ${j.lastDate}` : "";
      return `${tag} ${j.title}${vac}${last}`;
    });
  }, [jobItems, t]);

  useEffect(() => {
    let x = 0;
    let raf: number;
    const run = () => {
      if (document.visibilityState === "hidden") {
        raf = requestAnimationFrame(run);
        return;
      }
      x -= 0.55;
      if (ref.current) {
        const hw = ref.current.scrollWidth / 2;
        if (Math.abs(x) >= hw) x = 0;
        ref.current.style.transform = `translateX(${x}px)`;
      }
      raf = requestAnimationFrame(run);
    };
    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, [feedItems, jobLines]);

  const liveFeeds = feedItems.slice(0, 5).map((f) => {
    const vac =
      f.vacancies != null && f.vacancies > 0
        ? ` — ${Number(f.vacancies).toLocaleString("en-IN")} ${t("ticker.posts")}`
        : "";
    return `🔴 ${t("ticker.liveLine", { title: `${f.title}${vac}` })}`;
  });

  const base = jobLines.length ? jobLines : liveFeeds;
  const all = base.length ? [...liveFeeds, ...base, ...liveFeeds, ...base] : liveFeeds;

  if (!all.length) return null;

  return (
    <div className="ticker">
      <div className="ticker__badge">
        <span className="ticker__dot" />
        <span className="ticker__label">{t("ticker.live")}</span>
      </div>
      <div className="ticker__viewport">
        <div ref={ref} className="ticker__track">
          {all.map((line, i) => (
            <span key={i} className="ticker__item">
              {line}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

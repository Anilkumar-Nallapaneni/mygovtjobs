import { useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { DS } from "@/theme/designSystem";

export default function Ticker({ feedItems = [], jobItems = [] }) {
  const { t } = useTranslation();
  const ref = useRef(null);

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
    let raf;
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
    <div style={{ height: 32, background: DS.bg0, borderBottom: `1px solid ${DS.border}`, display: "flex", alignItems: "center", overflow: "hidden", flexShrink: 0 }}>
      <div style={{ background: DS.saffron, padding: "0 14px", height: "100%", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: DS.inkOnBrand, animation: "pulse 1s infinite" }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: DS.inkOnBrand, fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1 }}>{t("ticker.live")}</span>
      </div>
      <div style={{ overflow: "hidden", flex: 1 }}>
        <div ref={ref} style={{ display: "flex", whiteSpace: "nowrap", willChange: "transform" }}>
          {all.map((line, i) => (
            <span key={i} style={{ fontSize: 11.5, color: DS.mutedHi, padding: "0 24px", borderRight: `1px solid ${DS.border}`, flexShrink: 0, fontFamily: "'Outfit',sans-serif" }}>
              {line}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

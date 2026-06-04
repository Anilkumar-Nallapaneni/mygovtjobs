import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { CATS, type CategoryId } from "@/data/categories";

type CategoryGridProps = {
  activeCat: CategoryId | null
  onSelectCategory: (categoryId: CategoryId | null) => void
  counts?: Partial<Record<CategoryId, number>>
}

export default function CategoryGrid({ activeCat, onSelectCategory, counts }: CategoryGridProps) {
  const { t } = useTranslation();

  return (
    <div className="category-grid">
      <div className="category-grid__header">
        <div>
          <h2 className="category-grid__title">{t("categoryGrid.title")}</h2>
          <p className="category-grid__subtitle">
            {t("categoryGrid.subtitle", { defaultValue: "Pick a sector to narrow the live listings." })}
          </p>
        </div>
        {activeCat && (
          <button
            type="button"
            onClick={() => onSelectCategory(activeCat)}
            className="category-grid__clear"
          >
            {t("categoryGrid.clearFilter")}
          </button>
        )}
      </div>
      <div className="category-grid__cards" aria-label={t("categoryGrid.title")}>
        {CATS.map((c) => {
          const active = activeCat === c.id;
          const cnt = Number(counts?.[c.id]) || 0;
          return (
            <button
              key={c.id}
              type="button"
              className={`category-grid-card${active ? " category-grid-card--active" : ""}`}
              onClick={() => onSelectCategory(c.id)}
              style={{ "--cat-color": c.color } as CSSProperties}
            >
              <span className="category-grid-card__icon">{c.icon}</span>
              <span className="category-grid-card__body">
                <span className="category-grid-card__name">{t(`category.${c.id}`)}</span>
                <span className="category-grid-card__meta">{t("categoryGrid.liveCount", { count: cnt, defaultValue: "{{count}} live" })}</span>
              </span>
              <span className="category-grid-card__count">
                {cnt.toLocaleString()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

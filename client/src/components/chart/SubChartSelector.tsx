import { useState } from "react";
import { INDICATOR_REGISTRY } from "../../indicators";
import type { IndicatorConfig } from "../../types";
import "./SubChartSelector.css";

interface SubChartSelectorProps {
  activeIndicators: IndicatorConfig[];
  onAdd: (indicator: IndicatorConfig) => void;
  onRemove: (index: number) => void;
  onClose: () => void;
}

export default function SubChartSelector({
  activeIndicators,
  onAdd,
  onRemove,
  onClose,
}: SubChartSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<"all" | "overlay" | "subchart">(
    "all",
  );

  const overlayIndicators = Object.entries(INDICATOR_REGISTRY).filter(
    ([, v]) => v.config.type === "overlay",
  );
  const subchartIndicators = Object.entries(INDICATOR_REGISTRY).filter(
    ([, v]) => v.config.type === "subchart",
  );

  const allEntries = Object.entries(INDICATOR_REGISTRY);

  const entries =
    selectedCategory === "overlay"
      ? overlayIndicators
      : selectedCategory === "subchart"
        ? subchartIndicators
        : allEntries;

  function isActive(name: string): boolean {
    return activeIndicators.some((ind) => ind.name === name);
  }

  function getActiveIndex(name: string): number {
    return activeIndicators.findIndex((ind) => ind.name === name);
  }

  return (
    <div className="subchart-selector__overlay" onClick={onClose}>
      <div
        className="subchart-selector__panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="subchart-selector__header">
          <h3 className="subchart-selector__title">指標選擇</h3>
          <button className="subchart-selector__close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="subchart-selector__tabs">
          <button
            className={`subchart-selector__tab${selectedCategory === "all" ? " subchart-selector__tab--active" : ""}`}
            onClick={() => setSelectedCategory("all")}
          >
            全部
          </button>
          <button
            className={`subchart-selector__tab${selectedCategory === "overlay" ? " subchart-selector__tab--active" : ""}`}
            onClick={() => setSelectedCategory("overlay")}
          >
            主圖疊加
          </button>
          <button
            className={`subchart-selector__tab${selectedCategory === "subchart" ? " subchart-selector__tab--active" : ""}`}
            onClick={() => setSelectedCategory("subchart")}
          >
            副圖指標
          </button>
        </div>

        <div className="subchart-selector__list">
          {entries.map(([name, { config }]) => {
            const active = isActive(name);
            return (
              <div key={name} className="subchart-selector__item">
                <label className="subchart-selector__item-label">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => {
                      if (active) {
                        onRemove(getActiveIndex(name));
                      } else {
                        onAdd({ ...config });
                      }
                    }}
                  />
                  <span className="subchart-selector__item-name">{name}</span>
                  <span className="subchart-selector__item-type">
                    {config.type === "overlay" ? "主圖" : "副圖"}
                  </span>
                </label>
                <span className="subchart-selector__item-params">
                  {Object.entries(config.params)
                    .map(([k, v]) => `${k}=${v}`)
                    .join(", ")}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

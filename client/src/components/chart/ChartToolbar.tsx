import { useState, useRef, useEffect } from "react";
import { INDICATOR_REGISTRY } from "../../indicators";
import MAConfig from "./MAConfig";
import type { Period, IndicatorConfig } from "../../types";
import "./ChartToolbar.css";

interface ChartToolbarProps {
  period: Period;
  onPeriodChange: (period: Period) => void;
  indicators: IndicatorConfig[];
  onAddIndicator: (indicator: IndicatorConfig) => void;
  onRemoveIndicator: (index: number) => void;
  onUpdateIndicator: (index: number, indicator: IndicatorConfig) => void;
  onToggleDrawing: () => void;
  activeDrawingTool: string | null;
}

const PERIODS: Period[] = ["1m", "5m", "15m", "30m", "60m", "1d", "1w", "1M"];
const ALL_INDICATORS = Object.entries(INDICATOR_REGISTRY);

export default function ChartToolbar({
  period,
  onPeriodChange,
  indicators,
  onAddIndicator,
  onRemoveIndicator,
  onUpdateIndicator,
  onToggleDrawing,
  activeDrawingTool,
}: ChartToolbarProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [editingMAIndex, setEditingMAIndex] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showDropdown]);

  const activeNames = new Set(indicators.map((ind) => ind.name));

  const editingMA = editingMAIndex !== null ? indicators[editingMAIndex] : null;

  return (
    <div className="chart-toolbar">
      {/* Period selector */}
      <div className="chart-toolbar__group">
        {PERIODS.map((p) => (
          <button
            key={p}
            className={`chart-toolbar__btn${period === p ? " chart-toolbar__btn--active" : ""}`}
            onClick={() => onPeriodChange(p)}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="chart-toolbar__divider" />

      {/* Active indicator tags */}
      <div className="chart-toolbar__group">
        {indicators.map((ind, i) => (
          <button
            key={`${ind.name}-${i}`}
            className="chart-toolbar__tag"
            onClick={() => {
              if (ind.name === "MA") {
                setEditingMAIndex(i);
              } else {
                onRemoveIndicator(i);
              }
            }}
            title={ind.name === "MA"
              ? "點擊設置 MA 參數"
              : `${ind.name}(${Object.values(ind.params).join(",")}) — 點擊移除`}
          >
            {ind.name === "MA"
              ? `MA(${Object.values(ind.params).filter(v => v > 0).join(",")})`
              : ind.name}
            <span className="chart-toolbar__tag-x">×</span>
          </button>
        ))}
      </div>

      {/* Add indicator button + dropdown */}
      <div className="chart-toolbar__group chart-toolbar__add-wrap" ref={dropdownRef}>
        <button
          className="chart-toolbar__btn chart-toolbar__btn--add"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          +指標
        </button>

        {showDropdown && (
          <div className="chart-toolbar__dropdown">
            {ALL_INDICATORS.map(([name, { config }]) => {
              const active = activeNames.has(name);
              return (
                <button
                  key={name}
                  className={`chart-toolbar__dropdown-item${active ? " chart-toolbar__dropdown-item--active" : ""}`}
                  onClick={() => {
                    if (name === "MA") {
                      // MA can have multiple instances with different params
                      onAddIndicator({ ...config });
                    } else if (!active) {
                      onAddIndicator({ ...config });
                    }
                    setShowDropdown(false);
                  }}
                  disabled={active && name !== "MA"}
                >
                  <span className="chart-toolbar__dropdown-name">{name}</span>
                  <span className="chart-toolbar__dropdown-type">
                    {config.type === "overlay" ? "疊加" : "副圖"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="chart-toolbar__divider" />

      {/* Drawing toggle */}
      <div className="chart-toolbar__group">
        <button
          className={`chart-toolbar__btn${activeDrawingTool ? " chart-toolbar__btn--active" : ""}`}
          onClick={onToggleDrawing}
        >
          ✏️ 繪圖
        </button>
      </div>

      {/* MA Config popup */}
      {editingMA && editingMAIndex !== null && (
        <MAConfig
          indicator={editingMA}
          index={editingMAIndex}
          onUpdate={onUpdateIndicator}
          onClose={() => setEditingMAIndex(null)}
        />
      )}
    </div>
  );
}

import type { Period, IndicatorConfig } from "../../types";
import "./ChartToolbar.css";

interface ChartToolbarProps {
  period: Period;
  onPeriodChange: (period: Period) => void;
  indicators: IndicatorConfig[];
  onToggleIndicator: (indicator: IndicatorConfig) => void;
  onOpenSubChart: () => void;
  onOpenDrawing: () => void;
  activeDrawingTool: string | null;
}

const PERIODS: Period[] = ["1m", "5m", "15m", "30m", "60m", "1d", "1w", "1M"];

export default function ChartToolbar({
  period,
  onPeriodChange,
  indicators,
  onToggleIndicator,
  onOpenSubChart,
  onOpenDrawing,
  activeDrawingTool,
}: ChartToolbarProps) {
  return (
    <div className="chart-toolbar">
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

      <div className="chart-toolbar__group">
        {indicators.slice(0, 4).map((ind, i) => (
          <button
            key={`${ind.name}-${i}`}
            className="chart-toolbar__btn chart-toolbar__btn--indicator"
            onClick={() => onToggleIndicator(ind)}
            title={`${ind.name}(${Object.values(ind.params).join(",")})`}
          >
            {ind.name}
          </button>
        ))}
        <button
          className="chart-toolbar__btn chart-toolbar__btn--more"
          onClick={onOpenSubChart}
        >
          +指標
        </button>
      </div>

      <div className="chart-toolbar__divider" />

      <div className="chart-toolbar__group">
        <button
          className={`chart-toolbar__btn${activeDrawingTool ? " chart-toolbar__btn--active" : ""}`}
          onClick={onOpenDrawing}
        >
          ✏️ 繪圖
        </button>
      </div>
    </div>
  );
}

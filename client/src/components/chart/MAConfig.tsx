import { useState, useRef, useEffect } from "react";
import type { IndicatorConfig } from "../../types";
import "./MAConfig.css";

interface MAConfigProps {
  indicator: IndicatorConfig;
  index: number;
  onUpdate: (index: number, config: IndicatorConfig) => void;
  onClose: () => void;
}

const MAX_MA = 10;

/** Parse p1-p10 params into a number array */
function toArray(params: Record<string, number>): (number | null)[] {
  const arr: (number | null)[] = [];
  for (let i = 1; i <= MAX_MA; i++) {
    const v = params[`p${i}`];
    arr.push(v != null && v > 0 ? v : null);
  }
  // If no p1-p10 exist, try period1/2/3 or single period
  if (arr.every((v) => v === null)) {
    for (let i = 1; i <= 3; i++) {
      const v = params[`period${i}`];
      if (v != null && v > 0) arr[i - 1] = v;
    }
    if (arr.every((v) => v === null) && params.period != null) {
      arr[0] = params.period;
    }
  }
  return arr;
}

function toParams(arr: (number | null)[]): Record<string, number> {
  const params: Record<string, number> = {};
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] != null && arr[i] > 0) {
      params[`p${i + 1}`] = arr[i];
    }
  }
  return params;
}

export default function MAConfig({ indicator, index, onUpdate, onClose }: MAConfigProps) {
  const [periods, setPeriods] = useState<(number | null)[]>(() => toArray(indicator.params));
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const activeCount = periods.filter((v) => v !== null).length;

  function setPeriod(i: number, value: string) {
    const v = parseInt(value, 10);
    const next = [...periods];
    if (value === "" || isNaN(v) || v <= 0) {
      next[i] = null;
    } else {
      next[i] = Math.min(999, Math.max(1, v));
    }
    setPeriods(next);
  }

  function apply() {
    onUpdate(index, {
      ...indicator,
      params: toParams(periods),
    });
    onClose();
  }

  return (
    <div className="ma-config__overlay" onClick={onClose}>
      <div className="ma-config__panel" ref={panelRef} onClick={(e) => e.stopPropagation()}>
        <div className="ma-config__header">
          <span>MA 參數設置（最多{MAX_MA}條）</span>
          <button className="ma-config__close" onClick={onClose}>×</button>
        </div>
        <div className="ma-config__grid">
          {periods.map((v, i) => (
            <div key={i} className="ma-config__field">
              <span className="ma-config__label">MA{i + 1}</span>
              <input
                className="ma-config__input"
                type="number"
                min={1}
                max={999}
                value={v ?? ""}
                onChange={(e) => setPeriod(i, e.target.value)}
                placeholder="--"
              />
            </div>
          ))}
        </div>
        <div className="ma-config__footer">
          <span className="ma-config__hint">{activeCount} 條均線</span>
          <button className="ma-config__apply" onClick={apply}>確定</button>
        </div>
      </div>
    </div>
  );
}

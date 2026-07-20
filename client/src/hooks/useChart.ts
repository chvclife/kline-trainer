import { useEffect, useRef, useCallback } from "react";
import { init, dispose } from "klinecharts";
import type { Chart, KLineData } from "klinecharts";
import { useTrainingStore } from "../store/trainingStore";
import { useChartStore } from "../store/chartStore";
import type { KlineBar, IndicatorConfig } from "../types";

const chartStyles = {
  candle: {
    type: "candle_solid" as const,
    bar: {
      upColor: "#ef5350",
      downColor: "#26a69a",
      upBorderColor: "#ef5350",
      downBorderColor: "#26a69a",
      upWickColor: "#ef5350",
      downWickColor: "#26a69a",
    },
  },
  grid: { show: true },
};

function convertToKlineData(bar: KlineBar): KLineData | null {
  const timestamp = new Date(bar.time).getTime();
  if (isNaN(timestamp)) return null;
  return {
    timestamp,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume,
  };
}

function toCalcParams(name: string, params: Record<string, number>): number[] {
  switch (name) {
    case "MA": {
      const result: number[] = [];
      for (let i = 1; i <= 10; i++) {
        const v = params[`p${i}`];
        if (v != null && v > 0) result.push(v);
      }
      return result.length > 0 ? result : [5, 10, 20, 60];
    }
    case "EMA":
      return params.period != null ? [params.period] : [5, 20];
    case "BOLL": return [params.period ?? 20, params.multiplier ?? 2];
    case "MACD": return [params.fast ?? 12, params.slow ?? 26, params.signal ?? 9];
    case "RSI": return [params.period ?? 14];
    case "KDJ": return [params.n ?? 9, params.m1 ?? 3, params.m2 ?? 3];
    default: return Object.values(params);
  }
}

function syncIndicators(chart: Chart, indicators: IndicatorConfig[]) {
  // Get all existing indicators and remove them
  const existing = chart.getIndicators();
  for (const ind of existing) {
    chart.removeIndicator({ id: ind.id });
  }

  for (const ind of indicators) {
    const isOverlay = ind.type === "overlay";
    if (isOverlay) {
      // Overlay indicators (MA, EMA, BOLL) go on the main candle pane
      // isStack=true so multiple overlays can coexist
      chart.createIndicator(
        { name: ind.name, calcParams: toCalcParams(ind.name, ind.params), paneId: "candle_pane" },
        true,
      );
    } else {
      // Sub-chart indicators (MACD, RSI, KDJ) go in their own pane
      chart.createIndicator(
        { name: ind.name, calcParams: toCalcParams(ind.name, ind.params) },
        true,
      );
    }
  }
}

interface UseChartOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  chartId: string;
}

export function useChart({ containerRef, chartId }: UseChartOptions) {
  const chartRef = useRef<Chart | null>(null);
  // Full dataset (all bars), never changes after initial load
  const fullDataRef = useRef<KLineData[]>([]);
  // How many bars are currently visible (revealed)
  const visibleCountRef = useRef(0);
  // The subscribeBar callback provided by klinecharts — call this to append a bar
  const appendBarRef = useRef<((bar: KLineData) => void) | null>(null);
  // Whether initial data has been loaded
  const initializedRef = useRef(false);

  // --- Chart init / dispose ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = init(container, { styles: chartStyles });
    if (!chart) {
      console.error(`[useChart] Failed to init chart "${chartId}"`);
      return;
    }
    chartRef.current = chart;

    // klinecharts v10 requires setSymbol + setPeriod before DataLoader will work.
    // _processDataLoad checks isValid(_symbol) && isValid(_period) — both must be non-null.
    chart.setSymbol({ ticker: "training", pricePrecision: 4, volumePrecision: 0 });
    chart.setPeriod({ type: "day", span: 1 });

    chart.setDataLoader({
      getBars: (params) => {
        if (params.type === "init") {
          // Return all currently visible bars
          const visible = fullDataRef.current.slice(0, visibleCountRef.current);
          params.callback(visible, { backward: false, forward: false });
        } else {
          // No lazy loading — all data is already in memory
          params.callback([], { backward: false, forward: false });
        }
      },
      subscribeBar: ({ callback }) => {
        // Save the callback — we call this to incrementally append bars
        appendBarRef.current = callback;
      },
      unsubscribeBar: () => {
        appendBarRef.current = null;
      },
    });

    return () => {
      dispose(chart);
      chartRef.current = null;
      appendBarRef.current = null;
      initializedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Sync kline data ---
  const allKlineData = useTrainingStore((s) => s.allKlineData);
  const currentIndex = useTrainingStore((s) => s.currentIndex);
  const dataLength = useTrainingStore((s) => s.dataLength);

  // Generate a data identity key to detect dataset changes
  const dataKey = dataLength > 0 && allKlineData.length > 0
    ? `${allKlineData[0]?.time}-${allKlineData[allKlineData.length - 1]?.time}-${dataLength}`
    : "";
  const prevDataKeyRef = useRef("");
  const prevVisibleRef = useRef(0);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    if (allKlineData.length === 0) return;

    const newVisibleCount = currentIndex + 1;
    const dataChanged = dataKey !== prevDataKeyRef.current;

    if (dataChanged) {
      // Full dataset changed — reload everything
      prevDataKeyRef.current = dataKey;
      const converted = allKlineData.map(convertToKlineData).filter((d): d is KLineData => d !== null);
      fullDataRef.current = converted;
      visibleCountRef.current = newVisibleCount;
      prevVisibleRef.current = newVisibleCount;
      initializedRef.current = true;
      chart.resetData();
    } else if (initializedRef.current && newVisibleCount > prevVisibleRef.current) {
      // Incremental update — append new bars one by one
      const barsToAdd = newVisibleCount - prevVisibleRef.current;
      for (let i = 0; i < barsToAdd; i++) {
        const barIndex = prevVisibleRef.current + i;
        if (barIndex < fullDataRef.current.length && appendBarRef.current) {
          appendBarRef.current(fullDataRef.current[barIndex]);
        }
      }
      visibleCountRef.current = newVisibleCount;
      prevVisibleRef.current = newVisibleCount;
    }
    // If newVisibleCount < prevVisibleRef, it means we went backwards
    // (e.g., reset to a new training). This is handled by dataChanged above.
  }, [allKlineData, currentIndex, dataKey]);

  // --- Sync indicators ---
  const indicators = useChartStore((s) => s.indicators);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    syncIndicators(chart, indicators);
  }, [indicators]);

  // --- Resize handling ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => chartRef.current?.resize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef]);

  return chartRef;
}

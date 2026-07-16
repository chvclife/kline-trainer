import { useEffect, useRef } from "react";
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

function convertToKlineData(bar: KlineBar): KLineData {
  return {
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume,
    timestamp: new Date(bar.time).getTime(),
  };
}

const OVERLAY_INDICATORS = new Set(["MA", "EMA", "BOLL"]);
const SUBCHART_INDICATORS = new Set(["MACD", "RSI", "KDJ"]);

function isOverlayIndicator(name: string): boolean {
  if (OVERLAY_INDICATORS.has(name)) return true;
  if (SUBCHART_INDICATORS.has(name)) return false;
  // Default: treat unknown as subchart
  return false;
}

function syncIndicators(chart: Chart, indicators: IndicatorConfig[]) {
  // Remove all existing indicators
  const existing = chart.getIndicators();
  for (const ind of existing) {
    chart.removeIndicator({ id: ind.id });
  }

  // Create overlay indicators first (on main pane, isStack=false)
  for (const ind of indicators) {
    if (isOverlayIndicator(ind.name)) {
      chart.createIndicator(ind.name, false);
    }
  }

  // Create subchart indicators (on sub panes, isStack=true)
  for (const ind of indicators) {
    if (!isOverlayIndicator(ind.name)) {
      chart.createIndicator(ind.name, true);
    }
  }
}

interface UseChartOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  chartId: string;
}

export function useChart({ containerRef, chartId }: UseChartOptions) {
  const chartRef = useRef<Chart | null>(null);

  // Keep a ref to hold the latest data for the DataLoader callback
  const dataRef = useRef<KLineData[]>([]);

  // --- Chart init / dispose on mount ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = init(container, {
      styles: chartStyles,
    });

    if (!chart) {
      console.error(`[useChart] Failed to init chart "${chartId}"`);
      return;
    }

    chartRef.current = chart;

    // Set static DataLoader: all data is provided upfront
    chart.setDataLoader({
      getBars: (params) => {
        const data = dataRef.current;
        params.callback(data, { backward: false, forward: false });
      },
    });

    // Force initial data load
    chart.resetData();

    return () => {
      dispose(chart);
      chartRef.current = null;
    };
    // Only run on mount/unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Sync kline data ---
  const visibleData = useTrainingStore(
    (s) => s.allKlineData.slice(0, s.currentIndex + 1)
  );

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const klineData = visibleData.map(convertToKlineData);
    dataRef.current = klineData;

    // Trigger data reload through the DataLoader
    chart.resetData();
  }, [visibleData]);

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

    const observer = new ResizeObserver(() => {
      chartRef.current?.resize();
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef]);

  return chartRef;
}

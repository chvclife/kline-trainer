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
  return false;
}

function syncIndicators(chart: Chart, indicators: IndicatorConfig[]) {
  const existing = chart.getIndicators();
  for (const ind of existing) {
    chart.removeIndicator({ id: ind.id });
  }

  for (const ind of indicators) {
    if (isOverlayIndicator(ind.name)) {
      chart.createIndicator(ind.name, false);
    }
  }

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
  const dataRef = useRef<KLineData[]>([]);
  const prevDataLenRef = useRef(0);

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

    chart.setDataLoader({
      getBars: (params) => {
        const data = dataRef.current;
        params.callback(data, { backward: false, forward: false });
      },
    });

    chart.resetData();

    return () => {
      dispose(chart);
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Sync kline data ---
  // Use individual selectors to avoid creating new array on every render
  const allKlineData = useTrainingStore((s) => s.allKlineData);
  const currentIndex = useTrainingStore((s) => s.currentIndex);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const visibleSlice = allKlineData.slice(0, currentIndex + 1);
    const klineData = visibleSlice.map(convertToKlineData);
    dataRef.current = klineData;

    // Only update if data length actually changed to avoid unnecessary redraws
    if (klineData.length !== prevDataLenRef.current || klineData.length <= 1) {
      prevDataLenRef.current = klineData.length;
      chart.resetData();
    } else {
      // For incremental updates (stepping forward), just update the last bar
      // and add new data point
      chart.resetData();
    }
  }, [allKlineData, currentIndex]);

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

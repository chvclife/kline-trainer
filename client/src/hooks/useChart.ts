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
  const existing = chart.getIndicators();
  for (const ind of existing) {
    chart.removeIndicator({ id: ind.id });
  }

  for (const ind of indicators) {
    const isOverlay = ind.type === "overlay";
    chart.createIndicator(
      { name: ind.name, calcParams: toCalcParams(ind.name, ind.params) },
      isOverlay ? false : true,
    );
  }
}

interface UseChartOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  chartId: string;
}

export function useChart({ containerRef, chartId }: UseChartOptions) {
  const chartRef = useRef<Chart | null>(null);
  const dataRef = useRef<KLineData[]>([]);
  const prevLenRef = useRef(0);
  const loaderFnRef = useRef<((params: any) => void) | null>(null);

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

    // IMPORTANT: klinecharts v10 requires setSymbol + setPeriod before DataLoader will work.
    // _processDataLoad checks isValid(_symbol) && isValid(_period) — both must be non-null.
    // setSymbol/setPeriod each call resetData() internally, which triggers getBars.
    // We use a mutable loader function so the DataLoader always reads current data.
    chart.setSymbol({ ticker: "training", pricePrecision: 4, volumePrecision: 0 });
    chart.setPeriod({ type: "day", span: 1 });

    // Set up DataLoader with a mutable loader function
    chart.setDataLoader({
      getBars: (params) => {
        if (loaderFnRef.current) {
          loaderFnRef.current(params);
        } else {
          params.callback([], { backward: false, forward: false });
        }
      },
    });

    return () => {
      dispose(chart);
      chartRef.current = null;
      loaderFnRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Sync kline data ---
  const allKlineData = useTrainingStore((s) => s.allKlineData);
  const currentIndex = useTrainingStore((s) => s.currentIndex);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    if (allKlineData.length === 0) return;

    const visibleSlice = allKlineData.slice(0, currentIndex + 1);
    const klineData = visibleSlice.map(convertToKlineData).filter((d): d is KLineData => d !== null);

    if (klineData.length === 0) return;

    // Only update if data length actually changed
    if (klineData.length !== prevLenRef.current || prevLenRef.current === 0) {
      prevLenRef.current = klineData.length;
      dataRef.current = klineData;

      // Update the loader function to return current data
      loaderFnRef.current = (params: any) => {
        if (params.type === "init") {
          params.callback(dataRef.current, { backward: false, forward: false });
        } else {
          // No more data on scroll forward/backward
          params.callback([], { backward: false, forward: false });
        }
      };

      // Trigger data reload via resetData
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
    const observer = new ResizeObserver(() => chartRef.current?.resize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef]);

  return chartRef;
}

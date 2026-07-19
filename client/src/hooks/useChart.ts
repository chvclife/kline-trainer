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
  if (isNaN(timestamp)) {
    console.warn(`[useChart] Invalid timestamp for bar:`, bar.time);
    return null;
  }
  return { open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: bar.volume, timestamp };
}

function syncIndicators(chart: Chart, indicators: IndicatorConfig[]) {
  // MA is drawn via canvas overlay on main chart (同花顺 style), skip it here
  const subOnly = indicators.filter((ind) => ind.name !== "MA");
  const managedNames = new Set(subOnly.map((ind) => ind.name));
  const existing = chart.getIndicators();
  for (const ind of existing) {
    if (managedNames.has(ind.name)) chart.removeIndicator({ id: ind.id });
  }

  function toCalcParams(name: string, params: Record<string, number>): number[] {
    switch (name) {
      case "MA": {
        const periods: number[] = [];
        for (let i = 1; i <= 10; i++) {
          const v = params[`p${i}`];
          if (v != null && v > 0) periods.push(v);
        }
        if (periods.length === 0) return params.period != null ? [params.period] : [5, 10, 20];
        return periods;
      }
      case "EMA":
        return params.period != null ? [params.period] : [params.period1 ?? 5, params.period2 ?? 20];
      case "BOLL": return [params.period ?? 20, params.multiplier ?? 2];
      case "MACD": return [params.fast ?? 12, params.slow ?? 26, params.signal ?? 9];
      case "RSI": return [params.period ?? 14];
      case "KDJ": return [params.n ?? 9, params.m1 ?? 3, params.m2 ?? 3];
      default: return Object.values(params);
    }
  }

  const ordered = [...subOnly].reverse();
  for (let i = 0; i < ordered.length; i++) {
    const ind = ordered[i];
    chart.createIndicator({ name: ind.name, id: `${ind.name}_${i}`, calcParams: toCalcParams(ind.name, ind.params) });
  }
}

interface UseChartOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  chartId: string;
}

export function useChart({ containerRef, chartId }: UseChartOptions) {
  const chartRef = useRef<Chart | null>(null);
  const dataRef = useRef<KLineData[]>([]);

  // --- Chart init / dispose ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const chart = init(container, { styles: chartStyles });
    if (!chart) { console.error(`[useChart] Failed to init chart "${chartId}"`); return; }
    chartRef.current = chart;
    chart.setSymbol({ ticker: 'DEFAULT', pricePrecision: 2, volumePrecision: 0 });
    chart.setPeriod({ multiplier: 1, span: 'day', text: '1d' });

    // Lazy-load: track whether more historical data may exist
    let hasMoreBackward = true;
    // Store the original data start date so we can extend backward
    let dataStartDate = '';

    chart.setDataLoader({
      getBars: (params) => {
        const data = dataRef.current;
        if (params.type === 'backward' && hasMoreBackward && data.length > 0) {
          // User scrolled left past first loaded bar — fetch earlier data
          const store = useTrainingStore.getState();
          const training = store.currentTraining;
          if (training) {
            // Calculate start date for earlier data fetch
            const firstBar = store.allKlineData[0];
            const firstDate = firstBar?.time?.slice(0, 10); // YYYY-MM-DD
            if (firstDate && firstDate !== dataStartDate) {
              dataStartDate = firstDate;
              // Fetch 200 more days before this date
              const endDate = new Date(firstDate);
              const startDate = new Date(endDate);
              startDate.setDate(startDate.getDate() - 200);
              const fmt = (d: Date) => d.toISOString().slice(0, 10);

              // Dynamic import stockApi to avoid circular deps
              import('../services/api').then(({ stockApi }) => {
                stockApi.getKline(training.stock_code, training.period, fmt(startDate), fmt(endDate))
                  .then((resp) => {
                    if (resp.data && resp.data.length > 0) {
                      store.prependKlineData(resp.data);
                      // Update dataRef and tell chart to reload
                      const newData = useTrainingStore.getState().allKlineData
                        .slice(0, useTrainingStore.getState().currentIndex + 1)
                        .map(convertToKlineData)
                        .filter((d): d is KLineData => d !== null);
                      dataRef.current = newData;
                      chart.resetData();
                    } else {
                      hasMoreBackward = false;
                    }
                  })
                  .catch(() => { hasMoreBackward = false; });
              });
            }
          }
        }
        params.callback(data, { backward: hasMoreBackward, forward: false });
      },
    });

    chart.resetData();
    return () => { dispose(chart); chartRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Sync kline data ---
  const allKlineData = useTrainingStore((s) => s.allKlineData);
  const currentIndex = useTrainingStore((s) => s.currentIndex);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const visibleSlice = allKlineData.slice(0, currentIndex + 1);
    const klineData = visibleSlice.map(convertToKlineData).filter((d): d is KLineData => d !== null);
    if (klineData.length === 0) return;
    dataRef.current = klineData;
    chart.resetData();
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

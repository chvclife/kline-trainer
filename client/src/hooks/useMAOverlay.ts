import { useEffect, useRef } from "react";
import type { Chart } from "klinecharts";
import { useTrainingStore } from "../store/trainingStore";

const MA_COLORS = [
  "#FFFFFF", "#FFD700", "#FF69B4", "#00FF00", "#00BFFF",
  "#FF8C00", "#FF1493", "#7FFF00", "#00CED1", "#FF4500",
];

function calcMA(closes: number[], period: number): (number | null)[] {
  const r: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { r.push(null); continue; }
    let s = 0;
    for (let j = i - period + 1; j <= i; j++) s += closes[j];
    r.push(s / period);
  }
  return r;
}

function drawLines(
  chart: Chart,
  canvas: HTMLCanvasElement,
  allKlineData: { time: string; close: number }[],
  currentIndex: number,
  maParams: number[],
) {
  const parent = canvas.parentElement;
  if (!parent) return;
  const cssW = parent.clientWidth;
  const cssH = parent.clientHeight;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  // Derive price→y mapping from convertFromPixel (convertToPixel doesn't return y in v10)
  const refTop = chart.convertFromPixel([{ x: cssW / 2, y: 0 }], { paneId: "candle_pane" });
  const refBot = chart.convertFromPixel([{ x: cssW / 2, y: cssH }], { paneId: "candle_pane" });
  const priceTop = (refTop as any)[0]?.value ?? 0;
  const priceBot = (refBot as any)[0]?.value ?? 0;
  const priceRange = priceTop - priceBot;
  if (priceRange === 0) return;

  const closes = allKlineData.map((b) => b.close);
  const vc = Math.min(currentIndex + 1, allKlineData.length);

  for (let m = 0; m < maParams.length; m++) {
    const period = maParams[m];
    const values = calcMA(closes, period);

    ctx.strokeStyle = MA_COLORS[m % MA_COLORS.length];
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.beginPath();

    let started = false;
    for (let i = 0; i < vc; i++) {
      const v = values[i];
      if (v == null) continue;
      const ts = new Date(allKlineData[i].time).getTime();
      if (isNaN(ts)) continue;
      // convertToPixel for x, compute y from price
      const pt = chart.convertToPixel({ timestamp: ts, price: v }, { paneId: "candle_pane" });
      if (!pt || pt.x == null) continue;
      const y = ((priceTop - v) / priceRange) * cssH;
      if (!started) { ctx.moveTo(pt.x, y); started = true; }
      else ctx.lineTo(pt.x, y);
    }
    ctx.stroke();
  }
}

interface UseMAOverlayOptions {
  chartRef: React.RefObject<Chart | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  maParams: number[];
}

export function useMAOverlay({ chartRef, containerRef, maParams }: UseMAOverlayOptions) {
  const overlayRef = useRef<HTMLCanvasElement | null>(null);

  // Subscribe to store for reactive updates
  const allKlineData = useTrainingStore((s) => s.allKlineData);
  const currentIndex = useTrainingStore((s) => s.currentIndex);

  // Main draw effect — creates canvas lazily, redraws on data change
  useEffect(() => {
    const chart = chartRef.current;
    const container = containerRef.current;
    if (!chart || !container || allKlineData.length === 0 || maParams.length === 0) return;

    // Lazy-create overlay canvas on first draw
    if (!overlayRef.current) {
      const canvas = document.createElement("canvas");
      canvas.style.cssText =
        "position:absolute;top:0;left:0;pointer-events:none;z-index:10;";
      container.style.position = "relative";
      container.appendChild(canvas);
      overlayRef.current = canvas;
    }

    drawLines(chart, overlayRef.current, allKlineData, currentIndex, maParams);
  }, [chartRef, containerRef, allKlineData, currentIndex, maParams]);

  // Subscribe to chart scroll/zoom with throttle to prevent flicker
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    let rafId = 0;
    const onAction = () => {
      if (rafId) return; // throttle: only one pending redraw
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        const ch = chartRef.current;
        const cv = overlayRef.current;
        if (!ch || !cv || maParams.length === 0) return;
        const s = useTrainingStore.getState();
        if (s.allKlineData.length === 0) return;
        drawLines(ch, cv, s.allKlineData, s.currentIndex, maParams);
      });
    };

    chart.subscribeAction("scroll", onAction);
    chart.subscribeAction("zoom", onAction);
    return () => {
      chart.unsubscribeAction("scroll", onAction);
      chart.unsubscribeAction("zoom", onAction);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [chartRef, maParams]);

  return overlayRef;
}

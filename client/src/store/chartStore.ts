import { create } from "zustand";
import type { IndicatorConfig, Drawing } from "../types";

const DEFAULT_INDICATORS: IndicatorConfig[] = [
  { name: "MA", type: "overlay", params: { period: 5 } },
  { name: "MA", type: "overlay", params: { period: 10 } },
  { name: "MA", type: "overlay", params: { period: 20 } },
];

interface ChartState {
  indicators: IndicatorConfig[];
  subChartCount: number;
  activeDrawingTool: string | null;
  drawings: Drawing[];

  addIndicator: (indicator: IndicatorConfig) => void;
  removeIndicator: (index: number) => void;
  setSubChartCount: (count: number) => void;
  setActiveDrawingTool: (tool: string | null) => void;
  addDrawing: (drawing: Drawing) => void;
  removeDrawing: (id: string) => void;
  clearDrawings: () => void;
}

export const useChartStore = create<ChartState>((set) => ({
  indicators: DEFAULT_INDICATORS,
  subChartCount: 1,
  activeDrawingTool: null,
  drawings: [],

  addIndicator: (indicator: IndicatorConfig) =>
    set((state) => ({ indicators: [...state.indicators, indicator] })),

  removeIndicator: (index: number) =>
    set((state) => ({
      indicators: state.indicators.filter((_, i) => i !== index),
    })),

  setSubChartCount: (count: number) => set({ subChartCount: count }),

  setActiveDrawingTool: (tool: string | null) =>
    set({ activeDrawingTool: tool }),

  addDrawing: (drawing: Drawing) =>
    set((state) => ({ drawings: [...state.drawings, drawing] })),

  removeDrawing: (id: string) =>
    set((state) => ({
      drawings: state.drawings.filter((d) => d.id !== id),
    })),

  clearDrawings: () => set({ drawings: [] }),
}));
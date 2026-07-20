import { create } from "zustand";
import type { IndicatorConfig, Drawing } from "../types";

const DEFAULT_INDICATORS: IndicatorConfig[] = [
  { name: "MA", type: "overlay", params: { p1: 5, p2: 10, p3: 20, p4: 60 } },
];

interface ChartState {
  indicators: IndicatorConfig[];
  activeDrawingTool: string | null;
  drawings: Drawing[];

  addIndicator: (indicator: IndicatorConfig) => void;
  removeIndicator: (index: number) => void;
  updateIndicator: (index: number, indicator: IndicatorConfig) => void;
  setActiveDrawingTool: (tool: string | null) => void;
  addDrawing: (drawing: Drawing) => void;
  removeDrawing: (id: string) => void;
  clearDrawings: () => void;
}

export const useChartStore = create<ChartState>((set) => ({
  indicators: DEFAULT_INDICATORS,
  activeDrawingTool: null,
  drawings: [],

  addIndicator: (indicator: IndicatorConfig) =>
    set((state) => ({ indicators: [...state.indicators, indicator] })),

  removeIndicator: (index: number) =>
    set((state) => ({
      indicators: state.indicators.filter((_, i) => i !== index),
    })),

  updateIndicator: (index: number, indicator: IndicatorConfig) =>
    set((state) => ({
      indicators: state.indicators.map((ind, i) => (i === index ? indicator : ind)),
    })),

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
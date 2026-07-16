import { create } from "zustand";
import type { KlineBar, TradeRecord, TrainingRecord } from "../types";

interface TrainingState {
  allKlineData: KlineBar[];
  currentIndex: number;
  position: number;
  costPrice: number;
  trades: TradeRecord[];
  currentTraining: TrainingRecord | null;
  playMode: "manual" | "replay";
  playSpeed: number;
  dataLength: number;
  isTraining: boolean;
  buyPercentage: number;
  sellPercentage: number;

  visibleData: () => KlineBar[];
  setKlineData: (data: KlineBar[]) => void;
  stepForward: () => void;
  buy: (percentage: number) => void;
  sell: (percentage: number) => void;
  setPlayMode: (mode: "manual" | "replay") => void;
  setPlaySpeed: (speed: number) => void;
  setCurrentTraining: (training: TrainingRecord) => void;
  setBuyPercentage: (p: number) => void;
  setSellPercentage: (p: number) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  allKlineData: [] as KlineBar[],
  currentIndex: 0,
  position: 0,
  costPrice: 0,
  trades: [] as TradeRecord[],
  currentTraining: null as TrainingRecord | null,
  playMode: "manual" as const,
  playSpeed: 1,
  dataLength: 0,
  isTraining: false,
  buyPercentage: 50,
  sellPercentage: 30,
};

export const useTrainingStore = create<TrainingState>((set, get) => ({
  ...INITIAL_STATE,

  visibleData: () => {
    const { allKlineData, currentIndex } = get();
    return allKlineData.slice(0, currentIndex + 1);
  },

  setKlineData: (data: KlineBar[]) => {
    set({
      allKlineData: data,
      dataLength: data.length,
      currentIndex: 0,
      position: 0,
      costPrice: 0,
      trades: [],
      isTraining: true,
    });
  },

  stepForward: () => {
    const { currentIndex, dataLength } = get();
    if (currentIndex < dataLength - 1) {
      set({ currentIndex: currentIndex + 1 });
    }
  },

  buy: (percentage: number) => {
    const { position, allKlineData, currentIndex, costPrice } = get();
    if (position >= 1) return; // already full position

    const pct = percentage / 100;
    const newPosition = position + (1 - position) * pct;
    const currentPrice = allKlineData[currentIndex]?.close ?? 0;

    // Weighted average cost price
    const newCostPrice =
      position === 0
        ? currentPrice
        : (costPrice * position + currentPrice * (newPosition - position)) /
          newPosition;

    set({
      position: Math.min(newPosition, 1),
      costPrice: newCostPrice,
    });
  },

  sell: (percentage: number) => {
    const { position } = get();
    if (position <= 0) return;

    const pct = percentage / 100;
    const newPosition = position * (1 - pct);

    set({
      position: Math.max(newPosition, 0),
      costPrice: newPosition === 0 ? 0 : get().costPrice,
    });
  },

  setPlayMode: (mode: "manual" | "replay") => set({ playMode: mode }),
  setPlaySpeed: (speed: number) => set({ playSpeed: speed }),

  setCurrentTraining: (training: TrainingRecord) => {
    set({ currentTraining: training });
  },

  setBuyPercentage: (p: number) => set({ buyPercentage: p }),
  setSellPercentage: (p: number) => set({ sellPercentage: p }),

  reset: () => set({ ...INITIAL_STATE }),
}));
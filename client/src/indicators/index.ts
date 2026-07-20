import type { IndicatorConfig } from "../types";
import { calculateMA } from "./ma";
import { calculateEMA } from "./ema";
import { calculateBOLL } from "./boll";
import { calculateMACD } from "./macd";
import { calculateRSI } from "./rsi";
import { calculateKDJ } from "./kdj";

export const INDICATOR_REGISTRY: Record<
  string,
  {
    config: IndicatorConfig;
    calculate: (data: any[], params: Record<string, number>) => any;
  }
> = {
  MA: {
    config: {
      name: "MA",
      type: "overlay",
      params: { p1: 5, p2: 10, p3: 20, p4: 60 },
    },
    calculate: (data, params) => {
      const periods: number[] = [];
      for (let i = 1; i <= 10; i++) {
        const v = params[`p${i}`];
        if (v != null && v > 0) periods.push(v);
      }
      const result: Record<string, number[]> = {};
      periods.forEach((p, i) => { result[`ma${i + 1}`] = calculateMA(data, p); });
      return result;
    },
  },
  EMA: {
    config: {
      name: "EMA",
      type: "overlay",
      params: { period: 5 },
    },
    calculate: (data, params) => ({
      ema1: calculateEMA(data, params.period),
    }),
  },
  BOLL: {
    config: {
      name: "BOLL",
      type: "overlay",
      params: { period: 20, multiplier: 2 },
    },
    calculate: (data, params) =>
      calculateBOLL(data, params.period, params.multiplier),
  },
  MACD: {
    config: {
      name: "MACD",
      type: "subchart",
      params: { fast: 12, slow: 26, signal: 9 },
    },
    calculate: (data, params) =>
      calculateMACD(data, params.fast, params.slow, params.signal),
  },
  RSI: {
    config: { name: "RSI", type: "subchart", params: { period: 14 } },
    calculate: (data, params) => ({ rsi: calculateRSI(data, params.period) }),
  },
  KDJ: {
    config: {
      name: "KDJ",
      type: "subchart",
      params: { n: 9, m1: 3, m2: 3 },
    },
    calculate: (data, params) =>
      calculateKDJ(data, params.n, params.m1, params.m2),
  },
};

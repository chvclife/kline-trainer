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
      params: { period1: 5, period2: 10, period3: 20 },
    },
    calculate: (data, params) => ({
      ma1: calculateMA(data, params.period1),
      ma2: calculateMA(data, params.period2),
      ma3: calculateMA(data, params.period3),
    }),
  },
  EMA: {
    config: {
      name: "EMA",
      type: "overlay",
      params: { period1: 5, period2: 20 },
    },
    calculate: (data, params) => ({
      ema1: calculateEMA(data, params.period1),
      ema2: calculateEMA(data, params.period2),
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

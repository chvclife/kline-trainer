import type { KlineBar } from "../types";

export function calculateBOLL(data: KlineBar[], period: number, multiplier: number) {
  const middle: (number | null)[] = [];
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      middle.push(null);
      upper.push(null);
      lower.push(null);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      const avg = slice.reduce((s, bar) => s + bar.close, 0) / period;
      const std = Math.sqrt(
        slice.reduce((s, bar) => s + (bar.close - avg) ** 2, 0) / period
      );
      middle.push(avg);
      upper.push(avg + multiplier * std);
      lower.push(avg - multiplier * std);
    }
  }
  return { middle, upper, lower };
}

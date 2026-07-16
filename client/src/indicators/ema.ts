import type { KlineBar } from "../types";

export function calculateEMA(data: KlineBar[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const k = 2 / (period + 1);
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      const sum = data.slice(0, period).reduce((s, bar) => s + bar.close, 0);
      result.push(sum / period);
    } else {
      const prev = result[i - 1]!;
      result.push(data[i].close * k + prev * (1 - k));
    }
  }
  return result;
}

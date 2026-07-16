import type { KlineBar } from "../types";

export function calculateMA(data: KlineBar[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((s, bar) => s + bar.close, 0);
      result.push(sum / period);
    }
  }
  return result;
}

import type { KlineBar } from "../types";

export function calculateKDJ(data: KlineBar[], n = 9, m1 = 3, m2 = 3) {
  const kValues: (number | null)[] = [];
  const dValues: (number | null)[] = [];
  const jValues: (number | null)[] = [];
  let prevK = 50;
  let prevD = 50;

  for (let i = 0; i < data.length; i++) {
    if (i < n - 1) {
      kValues.push(null);
      dValues.push(null);
      jValues.push(null);
    } else {
      const slice = data.slice(i - n + 1, i + 1);
      const highN = Math.max(...slice.map((b) => b.high));
      const lowN = Math.min(...slice.map((b) => b.low));
      const rsv =
        highN === lowN ? 50 : ((data[i].close - lowN) / (highN - lowN)) * 100;
      const k = (2 / m1) * prevK + (1 / m1) * rsv;
      const d = (2 / m2) * prevD + (1 / m2) * k;
      const j = 3 * k - 2 * d;
      kValues.push(k);
      dValues.push(d);
      jValues.push(j);
      prevK = k;
      prevD = d;
    }
  }
  return { k: kValues, d: dValues, j: jValues };
}

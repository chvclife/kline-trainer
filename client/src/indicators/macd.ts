import type { KlineBar } from "../types";
import { calculateEMA } from "./ema";

export function calculateMACD(
  data: KlineBar[],
  fast = 12,
  slow = 26,
  signal = 9
) {
  const emaFast = calculateEMA(data, fast);
  const emaSlow = calculateEMA(data, slow);

  const dif: (number | null)[] = emaFast.map((f, i) =>
    f !== null && emaSlow[i] !== null ? f - emaSlow[i]! : null
  );

  const dea: (number | null)[] = [];
  const k = 2 / (signal + 1);
  for (let i = 0; i < data.length; i++) {
    if (dif[i] === null) {
      dea.push(null);
      continue;
    }
    const prevDea = i > 0 && dea[i - 1] !== null ? dea[i - 1]! : 0;
    if (dea.filter((v) => v !== null).length === 0) {
      dea.push(dif[i]);
    } else {
      dea.push(dif[i]! * k + prevDea * (1 - k));
    }
  }

  const macd: (number | null)[] = dif.map((d, i) =>
    d !== null && dea[i] !== null ? 2 * (d - dea[i]!) : null
  );

  return { dif, dea, macd };
}

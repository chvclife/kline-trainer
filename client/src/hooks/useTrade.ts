import { useCallback } from "react";
import { useTrainingStore } from "../store/trainingStore";
import { trainingApi } from "../services/api";

export function useTrade() {
  const buy = useTrainingStore((s) => s.buy);
  const sell = useTrainingStore((s) => s.sell);
  const allKlineData = useTrainingStore((s) => s.allKlineData);
  const currentIndex = useTrainingStore((s) => s.currentIndex);
  const position = useTrainingStore((s) => s.position);
  const currentTraining = useTrainingStore((s) => s.currentTraining);

  const doBuy = useCallback(
    async (percentage?: number) => {
      const store = useTrainingStore.getState();
      const pct = percentage ?? store.buyPercentage;

      const prevPosition = store.position;
      buy(pct);

      const newPosition = useTrainingStore.getState().position;
      const price = allKlineData[currentIndex]?.close ?? 0;
      const time = allKlineData[currentIndex]?.time ?? "";

      if (currentTraining && newPosition > prevPosition) {
        try {
          await trainingApi.addTrade(currentTraining.id, {
            action: "buy",
            price,
            percentage: pct,
            position_after: newPosition,
            kline_time: time,
            kline_index: currentIndex,
          });
        } catch {
          // Silent fail - trade still exists in local state
        }
      }
    },
    [buy, allKlineData, currentIndex, currentTraining],
  );

  const doSell = useCallback(
    async (percentage?: number) => {
      const store = useTrainingStore.getState();
      const pct = percentage ?? store.sellPercentage;

      const prevPosition = store.position;
      sell(pct);

      const newPosition = useTrainingStore.getState().position;
      const price = allKlineData[currentIndex]?.close ?? 0;
      const time = allKlineData[currentIndex]?.time ?? "";

      if (currentTraining && newPosition < prevPosition) {
        try {
          await trainingApi.addTrade(currentTraining.id, {
            action: "sell",
            price,
            percentage: pct,
            position_after: newPosition,
            kline_time: time,
            kline_index: currentIndex,
          });
        } catch {
          // Silent fail
        }
      }
    },
    [sell, allKlineData, currentIndex, currentTraining],
  );

  return { doBuy, doSell, position };
}
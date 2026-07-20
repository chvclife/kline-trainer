import { useCallback, useEffect, useRef } from "react";
import { useTrainingStore } from "../store/trainingStore";
import { stockApi, trainingApi } from "../services/api";

export function useTraining() {
  const setKlineData = useTrainingStore((s) => s.setKlineData);
  const stepForward = useTrainingStore((s) => s.stepForward);
  const setCurrentTraining = useTrainingStore((s) => s.setCurrentTraining);
  const setPlayMode = useTrainingStore((s) => s.setPlayMode);
  const setPlaySpeed = useTrainingStore((s) => s.setPlaySpeed);
  const reset = useTrainingStore((s) => s.reset);
  const currentTraining = useTrainingStore((s) => s.currentTraining);
  const currentIndex = useTrainingStore((s) => s.currentIndex);
  const position = useTrainingStore((s) => s.position);
  const costPrice = useTrainingStore((s) => s.costPrice);
  const allKlineData = useTrainingStore((s) => s.allKlineData);
  const playMode = useTrainingStore((s) => s.playMode);
  const playSpeed = useTrainingStore((s) => s.playSpeed);
  const dataLength = useTrainingStore((s) => s.dataLength);
  const isTraining = useTrainingStore((s) => s.isTraining);

  const replayTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveCounter = useRef(0);

  /** Save current_index to backend (fire-and-forget) */
  const persistIndex = useCallback((trainingId: string, index: number) => {
    trainingApi.update(trainingId, { current_index: index }).catch(() => {});
  }, []);

  /** Save snapshot to backend (fire-and-forget) */
  const persistSnapshot = useCallback((trainingId: string) => {
    const state = useTrainingStore.getState();
    const close = state.allKlineData[state.currentIndex]?.close ?? 0;
    const marketValue = state.position * close;
    const unrealizedPnl = state.position > 0
      ? marketValue - state.costPrice * state.position
      : 0;
    trainingApi.addSnapshot(trainingId, {
      kline_index: state.currentIndex,
      position: state.position,
      cost_price: state.costPrice,
      market_value: marketValue,
      unrealized_pnl: unrealizedPnl,
      realized_pnl: 0,
    }).catch(() => {});
  }, []);

  const startTraining = useCallback(
    async (
      code: string,
      period: string,
      start: string,
      end: string,
      trainBars: number,
    ) => {
      // Fetch stock name from search or random
      let name = code;
      try {
        const results = await stockApi.search(code);
        const match = results.find((s) => s.code === code);
        if (match) name = match.name;
      } catch {
        // Use code as name fallback
      }

      // Fetch K-line data
      const klineResp = await stockApi.getKline(code, period, start, end);

      if (!klineResp.data || klineResp.data.length === 0) {
        throw new Error(`無法獲取 ${code} 的K線數據，請換一隻股票或調整日期範圍`);
      }

      // Calculate the initial reveal index (same logic as trainingStore.setKlineData)
      const tail = trainBars ?? Math.min(50, Math.floor(klineResp.data.length * 0.15));
      const initialIndex = Math.max(0, klineResp.data.length - 1 - tail);

      // Create training record with the correct initial index
      const training = await trainingApi.create({
        stock_code: code,
        stock_name: name,
        period,
        start_date: start,
        end_date: end,
        current_index: initialIndex,
      });

      // Use the trainBars parameter for initial reveal index
      setKlineData(klineResp.data, trainBars);
      setCurrentTraining(training);
    },
    [setKlineData, setCurrentTraining],
  );

  const resumeTraining = useCallback(
    async (id: string) => {
      // Fetch training record
      const training = await trainingApi.get(id);
      if (!training) throw new Error("Training record not found");

      // If already completed, throw so the page can redirect to review
      if (training.status === "completed") {
        throw new Error("completed");
      }

      // Normalize dates to YYYY-MM-DD (backend returns ISO datetime)
      const startDate = training.start_date?.slice(0, 10);
      const endDate = training.end_date?.slice(0, 10);

      // Fetch K-line data using the stored parameters
      const klineResp = await stockApi.getKline(
        training.stock_code,
        training.period,
        startDate,
        endDate,
      );

      if (!klineResp.data || klineResp.data.length === 0) {
        throw new Error("無法獲取K線數據");
      }

      // Restore position/costPrice from the last snapshot
      let restoredPosition = 0;
      let restoredCostPrice = 0;
      let restoredTrades: import("../types").TradeRecord[] = [];

      if (training.snapshots && training.snapshots.length > 0) {
        const lastSnapshot = training.snapshots[training.snapshots.length - 1];
        restoredPosition = lastSnapshot.position;
        restoredCostPrice = lastSnapshot.cost_price;
      }

      if (training.trades && training.trades.length > 0) {
        restoredTrades = training.trades;
      }

      // Clamp current_index to valid range
      const clampedIndex = Math.min(training.current_index, klineResp.data.length - 1);

      useTrainingStore.setState({
        allKlineData: klineResp.data,
        dataLength: klineResp.data.length,
        currentIndex: Math.max(0, clampedIndex),
        position: restoredPosition,
        costPrice: restoredCostPrice,
        trades: restoredTrades,
        isTraining: true,
        currentTraining: training,
      });

      // Reset save counter so auto-save continues from here
      saveCounter.current = 0;
    },
    [],
  );

  const doStepForward = useCallback(async () => {
    const store = useTrainingStore.getState();
    if (store.currentIndex >= store.dataLength - 1) return;

    stepForward();
    saveCounter.current += 1;

    const training = useTrainingStore.getState().currentTraining;
    if (!training) return;

    const newIndex = useTrainingStore.getState().currentIndex;

    // Persist current_index on every step
    persistIndex(training.id, newIndex);

    // Save snapshot every 5 steps
    if (saveCounter.current % 5 === 0) {
      persistSnapshot(training.id);
    }
  }, [stepForward, persistIndex, persistSnapshot]);

  const startReplay = useCallback(() => {
    // Clear any existing timer first
    if (replayTimer.current) {
      clearInterval(replayTimer.current);
      replayTimer.current = null;
    }
    setPlayMode("replay");

    const interval = 1000 / useTrainingStore.getState().playSpeed;
    replayTimer.current = setInterval(() => {
      const store = useTrainingStore.getState();
      if (store.currentIndex < store.dataLength - 1) {
        stepForward();

        // Persist index and snapshot during replay too
        const training = store.currentTraining;
        if (training) {
          const newIndex = useTrainingStore.getState().currentIndex;
          persistIndex(training.id, newIndex);
          saveCounter.current += 1;
          if (saveCounter.current % 5 === 0) {
            persistSnapshot(training.id);
          }
        }
      } else {
        if (replayTimer.current) {
          clearInterval(replayTimer.current);
          replayTimer.current = null;
        }
        setPlayMode("manual");
      }
    }, interval);
  }, [setPlayMode, stepForward, persistIndex, persistSnapshot]);

  const stopReplay = useCallback(() => {
    if (replayTimer.current) {
      clearInterval(replayTimer.current);
      replayTimer.current = null;
    }
    setPlayMode("manual");
  }, [setPlayMode]);

  // Cleanup replay timer on unmount
  useEffect(() => {
    return () => {
      if (replayTimer.current) {
        clearInterval(replayTimer.current);
        replayTimer.current = null;
      }
    };
  }, []);

  // Restart replay interval when speed changes during active replay
  useEffect(() => {
    if (playMode === "replay" && replayTimer.current) {
      clearInterval(replayTimer.current);
      replayTimer.current = setInterval(() => {
        const store = useTrainingStore.getState();
        if (store.currentIndex < store.dataLength - 1) {
          stepForward();

          const training = store.currentTraining;
          if (training) {
            const newIndex = useTrainingStore.getState().currentIndex;
            persistIndex(training.id, newIndex);
            saveCounter.current += 1;
            if (saveCounter.current % 5 === 0) {
              persistSnapshot(training.id);
            }
          }
        } else {
          if (replayTimer.current) {
            clearInterval(replayTimer.current);
            replayTimer.current = null;
          }
          setPlayMode("manual");
        }
      }, 1000 / playSpeed);
    }
  }, [playSpeed, playMode, stepForward, setPlayMode, persistIndex, persistSnapshot]);

  const completeTraining = useCallback(async () => {
    if (currentTraining) {
      stopReplay();

      // Save final snapshot before completing
      persistSnapshot(currentTraining.id);
      persistIndex(currentTraining.id, useTrainingStore.getState().currentIndex);

      const metrics = await trainingApi.complete(currentTraining.id);
      // Update the store with the completed training data
      useTrainingStore.setState({
        currentTraining: {
          ...currentTraining,
          status: "completed",
          total_return: metrics.total_return ?? null,
          win_rate: metrics.win_rate ?? null,
          max_drawdown: metrics.max_drawdown ?? null,
          sharpe_ratio: metrics.sharpe_ratio ?? null,
          profit_loss_ratio: metrics.profit_loss_ratio ?? null,
        },
      });
    }
  }, [currentTraining, stopReplay, persistSnapshot, persistIndex]);

  return {
    startTraining,
    resumeTraining,
    stepForward: doStepForward,
    startReplay,
    stopReplay,
    completeTraining,
    setPlaySpeed,
    reset,
    // State
    currentIndex,
    position,
    costPrice,
    allKlineData,
    playMode,
    playSpeed,
    dataLength,
    isTraining,
    currentTraining,
  };
}

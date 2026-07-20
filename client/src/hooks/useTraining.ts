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

      // Create training record
      const training = await trainingApi.create({
        stock_code: code,
        stock_name: name,
        period,
        start_date: start,
        end_date: end,
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

      // Fetch K-line data using the stored parameters
      const klineResp = await stockApi.getKline(
        training.stock_code,
        training.period,
        training.start_date,
        training.end_date,
      );

      // Set the data directly in the store with restored state
      const store = useTrainingStore.getState();

      // Find last snapshot to restore position/costPrice
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

      useTrainingStore.setState({
        allKlineData: klineResp.data,
        dataLength: klineResp.data.length,
        currentIndex: training.current_index,
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

    // Auto-save snapshot every 5 K-lines
    if (saveCounter.current % 5 === 0 && currentTraining) {
      const state = useTrainingStore.getState();
      try {
        const marketValue = state.position * (allKlineData[state.currentIndex]?.close ?? 0);
        const unrealizedPnl = state.position > 0
          ? marketValue - state.costPrice * state.position
          : 0;
        await trainingApi.addSnapshot(currentTraining.id, {
          kline_index: state.currentIndex,
          position: state.position,
          cost_price: state.costPrice,
          market_value: marketValue,
          unrealized_pnl: unrealizedPnl,
          realized_pnl: 0,
        });
      } catch {
        // Silent fail
      }

      // Save current_index
      try {
        await trainingApi.update(currentTraining.id, {
          current_index: state.currentIndex,
        });
      } catch {
        // Silent fail
      }
    }
  }, [stepForward, currentTraining, allKlineData]);

  const startReplay = useCallback(() => {
    // Clear any existing timer first
    if (replayTimer.current) {
      clearInterval(replayTimer.current);
      replayTimer.current = null;
    }
    setPlayMode("replay");
    // Read playSpeed fresh from store each tick to support speed changes mid-replay
    replayTimer.current = setInterval(() => {
      const store = useTrainingStore.getState();
      if (store.currentIndex < store.dataLength - 1) {
        stepForward();
      } else {
        if (replayTimer.current) {
          clearInterval(replayTimer.current);
          replayTimer.current = null;
        }
        setPlayMode("manual");
      }
    }, 1000 / useTrainingStore.getState().playSpeed);
  }, [setPlayMode, stepForward]);

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
      // Recreate interval with new speed
      clearInterval(replayTimer.current);
      replayTimer.current = setInterval(() => {
        const store = useTrainingStore.getState();
        if (store.currentIndex < store.dataLength - 1) {
          stepForward();
        } else {
          if (replayTimer.current) {
            clearInterval(replayTimer.current);
            replayTimer.current = null;
          }
          setPlayMode("manual");
        }
      }, 1000 / playSpeed);
    }
  }, [playSpeed, playMode, stepForward, setPlayMode]);

  const completeTraining = useCallback(async () => {
    if (currentTraining) {
      stopReplay();
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
  }, [currentTraining, stopReplay]);

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
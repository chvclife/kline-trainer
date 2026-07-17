import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import KlineChart from "../components/chart/KlineChart";
import Button from "../components/common/Button";
import Slider from "../components/common/Slider";
import "./TrainingPage.css";
import ChartToolbar from "../components/chart/ChartToolbar";
import SubChartSelector from "../components/chart/SubChartSelector";
import DrawingTool from "../components/chart/DrawingTool";
import TradePanel from "../components/training/TradePanel";
import TrainingPanel from "../components/training/TrainingPanel";
import TrainingResult from "../components/training/TrainingResult";
import PositionBar from "../components/training/PositionBar";
import StockSelector from "../components/stock/StockSelector";
import RandomStock from "../components/stock/RandomStock";
import { useTraining } from "../hooks/useTraining";
import { useTrade } from "../hooks/useTrade";
import { useChart } from "../hooks/useChart";
import { useTrainingStore } from "../store/trainingStore";
import { useChartStore } from "../store/chartStore";
import type { Period, StockItem } from "../types";

type Phase = "setup" | "training" | "complete";

const DEFAULT_PERIOD: Period = "1d";
const DEFAULT_DATA_DAYS = 200;

export default function TrainingPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [phase, setPhase] = useState<Phase>("setup");

  // Setup state
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);
  const [period, setPeriodState] = useState<Period>(DEFAULT_PERIOD);
  const [dataDays, setDataDays] = useState(DEFAULT_DATA_DAYS);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSubChart, setShowSubChart] = useState(false);
  const [showDrawing, setShowDrawing] = useState(false);

  const currentIndex = useTrainingStore((s) => s.currentIndex);
  const dataLength = useTrainingStore((s) => s.dataLength);

  // Training hooks
  const {
    startTraining,
    resumeTraining,
    completeTraining,
    reset,
    isTraining,
    currentTraining,
    position,
    costPrice,
    period: currentPeriod,
  } = useTraining();

  const {
    indicators,
    activeDrawingTool,
    addIndicator,
    removeIndicator,
    setActiveDrawingTool,
    clearDrawings,
  } = useChart();

  // Resume training when route has an id param
  useEffect(() => {
    if (id) {
      resumeTraining(id)
        .then(() => setPhase("training"))
        .catch(() => navigate("/dashboard"));
    }
    // Only run on mount or id change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const [startError, setStartError] = useState<string | null>(null);

  async function handleStart() {
    if (!selectedStock) return;

    // Calculate date range
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - dataDays);

    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    setStartError(null);
    try {
      await startTraining(
        selectedStock.code,
        period,
        fmt(start),
        fmt(end),
      );
      setPhase("training");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "啟動訓練失敗，請稍後再試";
      setStartError(msg);
      console.error("[TrainingPage] startTraining failed:", err);
    }
  }

  async function handleComplete() {
    await completeTraining();
    // Refetch the updated training record
    const updated = useTrainingStore.getState().currentTraining;
    if (updated) {
      setPhase("complete");
    }
  }

  function handleTryAgain() {
    reset();
    setPhase("setup");
    setSelectedStock(null);
  }

  function handleReview() {
    if (currentTraining) {
      navigate(`/review/${currentTraining.id}`);
    }
  }

  function handleBackToDashboard() {
    reset();
    navigate("/dashboard");
  }

  // ---- Setup Phase ----
  if (phase === "setup") {
    return (
      <div className="setup-layout">
        <div className="setup-card">
          <h1 className="setup-card__title">K線訓練</h1>
          <p className="setup-card__subtitle">選擇股票，開始訓練你的交易技巧</p>

          <div className="setup-card__section">
            <label className="setup-card__label">股票選擇</label>
            <StockSelector
              onSelect={setSelectedStock}
              placeholder="搜尋股票代碼或名稱..."
            />
            <div className="setup-card__random">
              <RandomStock onSelect={setSelectedStock} />
            </div>
            {selectedStock && (
              <div className="setup-card__selected">
                已選擇：{selectedStock.code} {selectedStock.name}
              </div>
            )}
          </div>

          <div className="setup-card__section">
            <label className="setup-card__label">K線週期</label>
            <div className="setup-card__periods">
              {(["1m", "5m", "15m", "30m", "60m", "1d", "1w", "1M"] as Period[]).map((p) => (
                <button
                  key={p}
                  className={`setup-card__period-btn${period === p ? " setup-card__period-btn--active" : ""}`}
                  onClick={() => setPeriodState(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="setup-card__section">
            <label className="setup-card__label">數據長度（天）</label>
            <Slider
              value={dataDays}
              min={30}
              max={1000}
              step={10}
              onChange={setDataDays}
            />
          </div>

          {startError && (
            <div style={{
              background: "oklch(0.62 0.22 25 / 0.15)",
              color: "var(--error)",
              padding: "8px 16px",
              borderRadius: "4px",
              fontSize: "var(--font-body)",
              textAlign: "center",
            }}>
              {startError}
            </div>
          )}

          <Button
            variant="accent"
            size="lg"
            disabled={!selectedStock}
            onClick={handleStart}
          >
            開始訓練
          </Button>
        </div>
      </div>
    );
  }

  // ---- Training Phase ----
  const sidebarContent = showDrawing ? (
    <DrawingTool
      activeTool={activeDrawingTool}
      onSelectTool={setActiveDrawingTool}
      onClearAll={clearDrawings}
    />
  ) : (
    <div className="sidebar-placeholder">
      <p className="sidebar-placeholder__text">側邊欄</p>
      <p className="sidebar-placeholder__hint">選擇繪圖工具或指標</p>
    </div>
  );

  return (
    <div className="training-layout">
      {/* Top Bar */}
      <div className="top-bar">
        <button
          className="top-bar__toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? "◀" : "▶"}
        </button>
        <span className="top-bar__stock">
          {currentTraining?.stock_name ?? "--"} ({currentTraining?.stock_code ?? "--"})
        </span>
        <span className="top-bar__period">{currentPeriod ?? period}</span>
        <div className="top-bar__spacer" />
        <span className="top-bar__index">
          {currentIndex + 1} / {dataLength}
        </span>
        <PositionBar position={position} costPrice={costPrice} />
        <Button variant="default" size="sm" onClick={handleComplete}>
          結束訓練
        </Button>
      </div>

      {/* Main Area */}
      <div className="main-area">
        {sidebarOpen && <div className="sidebar">{sidebarContent}</div>}

        <div className="chart-area">
          <ChartToolbar
            period={currentPeriod as Period ?? period}
            onPeriodChange={() => {}}
            indicators={indicators}
            onToggleIndicator={() => {}}
            onOpenSubChart={() => setShowSubChart(true)}
            onOpenDrawing={() => setShowDrawing(!showDrawing)}
            activeDrawingTool={activeDrawingTool}
          />
          <div className="chart-area__canvas">
            <KlineChart />
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bottom-bar">
        <TradePanel />
        <div className="bottom-bar__divider" />
        <TrainingPanel />
      </div>

      {/* SubChart Selector Modal */}
      {showSubChart && (
        <SubChartSelector
          activeIndicators={indicators}
          onAdd={addIndicator}
          onRemove={removeIndicator}
          onClose={() => setShowSubChart(false)}
        />
      )}

      {/* Complete Modal - shown when training completes and phase changes to complete */}
      {phase === "complete" && currentTraining && (
        <TrainingResult
          isOpen={true}
          training={currentTraining}
          onReview={handleReview}
          onTryAgain={handleTryAgain}
          onBackToDashboard={handleBackToDashboard}
        />
      )}
    </div>
  );
}

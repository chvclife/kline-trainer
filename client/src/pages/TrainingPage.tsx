import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import KlineChart from "../components/chart/KlineChart";
import Button from "../components/common/Button";
import Slider from "../components/common/Slider";
import "./TrainingPage.css";
import ChartToolbar from "../components/chart/ChartToolbar";
import DrawingTool from "../components/chart/DrawingTool";
import TradePanel from "../components/training/TradePanel";
import TrainingPanel from "../components/training/TrainingPanel";
import TrainingResult from "../components/training/TrainingResult";
import PositionBar from "../components/training/PositionBar";
import { useTraining } from "../hooks/useTraining";

import { useTrainingStore } from "../store/trainingStore";
import { useChartStore } from "../store/chartStore";
import { stockApi } from "../services/api";
import type { Period, StockItem } from "../types";

type Phase = "setup" | "training" | "complete";

const DEFAULT_PERIOD: Period = "1d";
const FETCH_DATA_DAYS = 500;   // Always load ~2 years of data, independent of training length
const DEFAULT_TRAIN_BARS = 50; // Default: trade through the last 50 bars

export default function TrainingPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [phase, setPhase] = useState<Phase>("setup");

  // Setup state
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StockItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [period, setPeriodState] = useState<Period>(DEFAULT_PERIOD);
  const [trainBars, setTrainBars] = useState(DEFAULT_TRAIN_BARS);
  const [startError, setStartError] = useState<string | null>(null);

  // Sidebar state (drawing tools only; indicators via ChartToolbar dropdown)
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const currentIndex = useTrainingStore((s) => s.currentIndex);
  const dataLength = useTrainingStore((s) => s.dataLength);

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

  const indicators = useChartStore((s) => s.indicators);
  const activeDrawingTool = useChartStore((s) => s.activeDrawingTool);
  const addIndicator = useChartStore((s) => s.addIndicator);
  const removeIndicator = useChartStore((s) => s.removeIndicator);
  const updateIndicator = useChartStore((s) => s.updateIndicator);
  const setActiveDrawingTool = useChartStore((s) => s.setActiveDrawingTool);
  const clearDrawings = useChartStore((s) => s.clearDrawings);

  // Extract MA params for canvas overlay
  const maIndicator = indicators.find((ind) => ind.name === "MA");
  const maParams: number[] = [];
  if (maIndicator) {
    for (let i = 1; i <= 10; i++) {
      const v = maIndicator.params[`p${i}`];
      if (v != null && v > 0) maParams.push(v);
    }
  }

  // Debounced search
  const debounceRef = useCallback(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    return (query: string) => {
      if (timer) clearTimeout(timer);
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }
      setSearchLoading(true);
      timer = setTimeout(async () => {
        try {
          const items = await stockApi.search(query.trim());
          setSearchResults(items);
        } catch {
          setSearchResults([]);
        } finally {
          setSearchLoading(false);
        }
      }, 300);
    };
  }, [])();

  // Resume training when route has an id param
  useEffect(() => {
    if (id) {
      resumeTraining(id)
        .then(() => setPhase("training"))
        .catch(() => navigate("/dashboard"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleStartWithStock(stock: StockItem) {
    // Always fetch FETCH_DATA_DAYS of data regardless of training length
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - FETCH_DATA_DAYS);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    setStarting(true);
    setStartError(null);
    try {
      await startTraining(stock.code, period, fmt(start), fmt(end), trainBars);
      setPhase("training");
    } catch (err) {
      const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } };
      const msg = axiosErr.response?.data?.detail
        ?? (err instanceof Error ? err.message : "啟動訓練失敗，請稍後再試");
      setStartError(msg);
      console.error("[TrainingPage] startTraining failed:", err);
    } finally {
      setStarting(false);
    }
  }

  async function handleRandomStart() {
    setStarting(true);
    setStartError(null);

    const MAX_RETRIES = 3;
    let lastError: string | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const stock = await stockApi.random();
        await handleStartWithStock(stock);
        return; // Success — exit function
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } };
        if (axiosErr.response?.status === 401) {
          setStartError("登入已過期，請重新登入");
          setStarting(false);
          return;
        }
        lastError = axiosErr.response?.data?.detail
          ?? (err instanceof Error ? err.message : "隨機選股失敗");
        console.error(`[TrainingPage] random attempt ${attempt + 1} failed:`, lastError);
      }
    }

    // All retries exhausted
    setStartError(`隨機訓練失敗（已嘗試 ${MAX_RETRIES} 隻股票）：${lastError}。請檢查網絡或更換週期後再試。`);
    setStarting(false);
  }

  async function handleSearchStart() {
    if (!selectedStock) return;
    await handleStartWithStock(selectedStock);
  }

  async function handleComplete() {
    await completeTraining();
    const updated = useTrainingStore.getState().currentTraining;
    if (updated) {
      setPhase("complete");
    }
  }

  function handleTryAgain() {
    reset();
    setPhase("setup");
    setSelectedStock(null);
    setStartError(null);
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
          <p className="setup-card__subtitle">選擇方式，開始訓練你的交易技巧</p>

          {/* Period selector */}
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

          {/* Training length */}
          <div className="setup-card__section">
            <label className="setup-card__label">訓練長度（根 K 線）</label>
            <Slider
              value={trainBars}
              min={10}
              max={200}
              step={10}
              onChange={setTrainBars}
            />
          </div>

          {/* Random start - blind training */}
          <div className="setup-card__section">
            <Button
              variant="accent"
              size="lg"
              onClick={handleRandomStart}
              disabled={starting}
              style={{ width: "100%" }}
            >
              {starting ? "載入中..." : "🎲 隨機訓練"}
            </Button>
            <p className="setup-card__hint">隨機選股，訓練結束後揭曉股票</p>
          </div>

          {/* Divider */}
          <div className="setup-card__divider">
            <span>或自行選股</span>
          </div>

          {/* Search and pick */}
          <div className="setup-card__section">
            <div className="setup-card__search">
              <input
                className="setup-card__search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  debounceRef(e.target.value);
                }}
                placeholder="搜尋股票代碼或名稱..."
              />
              {searchLoading && <span className="setup-card__search-spinner" />}
              {searchResults.length > 0 && (
                <div className="setup-card__search-results">
                  {searchResults.slice(0, 10).map((stock) => (
                    <button
                      key={stock.code}
                      className={`setup-card__search-option${selectedStock?.code === stock.code ? " setup-card__search-option--selected" : ""}`}
                      onClick={() => {
                        setSelectedStock(stock);
                        setSearchQuery(`${stock.code} ${stock.name}`);
                        setSearchResults([]);
                      }}
                    >
                      <span className="setup-card__search-code">{stock.code}</span>
                      <span className="setup-card__search-name">{stock.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedStock && (
              <div className="setup-card__selected">
                已選擇：<strong>{selectedStock.code}</strong> {selectedStock.name}
                <button
                  className="setup-card__selected-clear"
                  onClick={() => {
                    setSelectedStock(null);
                    setSearchQuery("");
                  }}
                >
                  ✕
                </button>
              </div>
            )}

            <Button
              variant="default"
              size="lg"
              disabled={!selectedStock || starting}
              onClick={handleSearchStart}
              style={{ width: "100%", marginTop: "8px" }}
            >
              {starting ? "載入中..." : "開始訓練"}
            </Button>
          </div>

          {startError && (
            <div className="setup-card__error">
              {startError}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---- Training Phase ----
  // Hide stock name/code during training (blind training)
  const blindMode = !currentTraining?.stock_name;

  return (
    <div className="training-layout">
      {/* Top Bar */}
      <div className="top-bar">
        <span className="top-bar__stock">
          {blindMode ? "????" : currentTraining?.stock_name ?? "--"} ({blindMode ? "????" : currentTraining?.stock_code ?? "--"})
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
        {/* Sidebar: icon bar (always visible) + drawing panel (when open) */}
        <div className={`sidebar${sidebarOpen ? " sidebar--open" : ""}`}>
          <div className="sidebar__icons">
            <button
              className={`sidebar__icon-btn${sidebarOpen ? " sidebar__icon-btn--active" : ""}`}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? "收起繪圖工具" : "展開繪圖工具"}
            >
              ✏️
            </button>
          </div>
          {sidebarOpen && (
            <div className="sidebar__panel">
              <DrawingTool
                activeTool={activeDrawingTool}
                onSelectTool={setActiveDrawingTool}
                onClearAll={clearDrawings}
              />
            </div>
          )}
        </div>

        <div className="chart-area">
          <ChartToolbar
            period={currentPeriod as Period ?? period}
            onPeriodChange={() => {}}
            indicators={indicators}
            onAddIndicator={addIndicator}
            onRemoveIndicator={removeIndicator}
            onUpdateIndicator={updateIndicator}
            onToggleDrawing={() => setSidebarOpen(!sidebarOpen)}
            activeDrawingTool={activeDrawingTool}
          />
          <div className="chart-area__canvas">
            <KlineChart maParams={maParams} />
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bottom-bar">
        <TradePanel />
        <div className="bottom-bar__divider" />
        <TrainingPanel />
      </div>

      {/* Complete Modal - reveals the stock */}
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

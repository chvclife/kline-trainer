import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { trainingApi } from "../services/api";
import KlineChart from "../components/chart/KlineChart";
import Skeleton from "../components/common/Skeleton";
import "./ReviewPage.css";
import Button from "../components/common/Button";
import type { TrainingRecord, TradeRecord } from "../types";

function fmtPct(v: number | null | undefined): string {
  if (v == null) return "--";
  const pct = v * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

function fmtNum(v: number | null | undefined, decimals = 2): string {
  if (v == null) return "--";
  return v.toFixed(decimals);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [training, setTraining] = useState<TrainingRecord | null>(null);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    async function fetch() {
      try {
        const [t, tr] = await Promise.all([
          trainingApi.get(id!),
          trainingApi.getTrades(id!),
        ]);
        setTraining(t);
        setTrades(tr);
      } catch {
        // Could show error
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [id]);

  if (loading) {
    return (
      <div className="review-page">
        <div className="review-page__header">
          <Skeleton height={32} variant="text" width="200px" />
        </div>
        <div className="review-page__body">
          <Skeleton height="400px" variant="rect" />
          <Skeleton height={100} variant="rect" width="320px" />
        </div>
      </div>
    );
  }

  if (!training) {
    return (
      <div className="review-page">
        <div className="review-page__error">
          <p>找不到訓練記錄</p>
          <Button variant="default" onClick={() => navigate("/dashboard")}>
            返回列表
          </Button>
        </div>
      </div>
    );
  }

  const isProfit = (training.total_return ?? 0) >= 0;

  return (
    <div className="review-page">
      <div className="review-page__header">
        <button
          className="review-page__back"
          onClick={() => navigate("/dashboard")}
        >
          &larr; 返回
        </button>
        <h1 className="review-page__title">
          {training.stock_name} ({training.stock_code})
        </h1>
        <span className="review-page__period">{training.period}</span>
        <span className="review-page__date">
          {fmtDate(training.created_at)}
        </span>
      </div>

      <div className="review-page__body">
        <div className="review-page__chart">
          <KlineChart />
        </div>

        <div className="review-page__sidebar">
          {/* Stats */}
          <div className="review-card">
            <h3 className="review-card__title">績效統計</h3>

            <div
              className={`review-card__big-num${isProfit ? " review-card__big-num--up" : " review-card__big-num--down"}`}
            >
              <span className="review-card__big-num-label">總收益</span>
              <span className="review-card__big-num-value">
                {fmtPct(training.total_return)}
              </span>
            </div>

            <div className="review-card__stats-grid">
              <div className="review-card__stat">
                <span className="review-card__stat-label">勝率</span>
                <span className="review-card__stat-value">
                  {training.win_rate != null
                    ? `${(training.win_rate * 100).toFixed(1)}%`
                    : "--"}
                </span>
              </div>
              <div className="review-card__stat">
                <span className="review-card__stat-label">盈虧比</span>
                <span className="review-card__stat-value">
                  {fmtNum(training.profit_loss_ratio)}
                </span>
              </div>
              <div className="review-card__stat">
                <span className="review-card__stat-label">最大回撤</span>
                <span className="review-card__stat-value">
                  {fmtPct(training.max_drawdown)}
                </span>
              </div>
              <div className="review-card__stat">
                <span className="review-card__stat-label">夏普比率</span>
                <span className="review-card__stat-value">
                  {fmtNum(training.sharpe_ratio)}
                </span>
              </div>
            </div>

            <div className="review-card__benchmark">
              <span className="review-card__stat-label">基準收益</span>
              <span className="review-card__stat-value">
                {fmtPct(training.benchmark_return)}
              </span>
            </div>
          </div>

          {/* Trades */}
          <div className="review-card">
            <h3 className="review-card__title">
              交易記錄 ({trades.length})
            </h3>
            {trades.length === 0 ? (
              <p className="review-card__empty">尚無交易記錄</p>
            ) : (
              <div className="review-card__trades">
                {trades.map((trade) => (
                  <div
                    key={trade.id}
                    className={`review-card__trade review-card__trade--${trade.action}`}
                  >
                    <span className="review-card__trade-action">
                      {trade.action === "buy" ? "▲ 買" : "▼ 賣"}
                    </span>
                    <span className="review-card__trade-info">
                      {trade.percentage}% @ {trade.price.toFixed(2)}
                    </span>
                    <span className="review-card__trade-position">
                      持倉: {(trade.position_after * 100).toFixed(0)}%
                    </span>
                    <span className="review-card__trade-time">
                      #{trade.kline_index}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Note */}
          {training.note && (
            <div className="review-card">
              <h3 className="review-card__title">筆記</h3>
              <p className="review-card__note">{training.note}</p>
            </div>
          )}

          <div className="review-page__actions">
            <Button
              variant="accent"
              onClick={() => navigate(`/training`)}
            >
              新建訓練
            </Button>
            <Button
              variant="default"
              onClick={() => navigate("/dashboard")}
            >
              返回列表
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
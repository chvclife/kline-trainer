import Modal from "../common/Modal";
import Button from "../common/Button";
import type { TrainingRecord } from "../../types";
import "./TrainingResult.css";

interface TrainingResultProps {
  isOpen: boolean;
  training: TrainingRecord;
  onReview: () => void;
  onTryAgain: () => void;
  onBackToDashboard: () => void;
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return "--";
  const pct = v * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

function fmtNum(v: number | null | undefined, decimals = 2): string {
  if (v == null) return "--";
  return v.toFixed(decimals);
}

export default function TrainingResult({
  isOpen,
  training,
  onReview,
  onTryAgain,
  onBackToDashboard,
}: TrainingResultProps) {
  const isProfit = (training.total_return ?? 0) >= 0;

  return (
    <Modal isOpen={isOpen} onClose={onBackToDashboard}>
      <div className="training-result">
        <h2 className="training-result__title">訓練完成</h2>

        <div
          className={`training-result__return${isProfit ? " training-result__return--profit" : " training-result__return--loss"}`}
        >
          <span className="training-result__return-label">總收益</span>
          <span className="training-result__return-value">
            {fmtPct(training.total_return)}
          </span>
        </div>

        <div className="training-result__stats">
          <div className="training-result__stat">
            <span className="training-result__stat-label">勝率</span>
            <span className="training-result__stat-value">
              {training.win_rate != null ? `${(training.win_rate * 100).toFixed(1)}%` : "--"}
            </span>
          </div>
          <div className="training-result__stat">
            <span className="training-result__stat-label">盈虧比</span>
            <span className="training-result__stat-value">
              {fmtNum(training.profit_loss_ratio)}
            </span>
          </div>
          <div className="training-result__stat">
            <span className="training-result__stat-label">最大回撤</span>
            <span className="training-result__stat-value">
              {fmtPct(training.max_drawdown)}
            </span>
          </div>
          <div className="training-result__stat">
            <span className="training-result__stat-label">夏普比率</span>
            <span className="training-result__stat-value">
              {fmtNum(training.sharpe_ratio)}
            </span>
          </div>
        </div>

        {training.note && (
          <div className="training-result__note">
            <span className="training-result__note-label">筆記</span>
            <p className="training-result__note-text">{training.note}</p>
          </div>
        )}

        <div className="training-result__actions">
          <Button variant="accent" onClick={onReview}>
            查看覆盤
          </Button>
          <Button variant="default" onClick={onTryAgain}>
            再來一次
          </Button>
          <Button variant="default" onClick={onBackToDashboard}>
            返回列表
          </Button>
        </div>
      </div>
    </Modal>
  );
}

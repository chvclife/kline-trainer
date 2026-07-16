# server/app/services/training_service.py
from collections import deque
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.training import (
    PositionSnapshot,
    Trade,
    TradeAction,
    Training,
    TrainingStatus,
)


# ── Training CRUD ──────────────────────────────────────────────────

def create_training(db: Session, user_id: str, data: dict) -> Training:
    """Create a new training record."""
    training = Training(
        user_id=user_id,
        stock_code=data["stock_code"],
        stock_name=data["stock_name"],
        period=data["period"],
        start_date=_parse_date(data["start_date"]),
        end_date=_parse_date(data["end_date"]),
        note=data.get("note"),
    )
    db.add(training)
    db.commit()
    db.refresh(training)
    return training


def get_trainings(db: Session, user_id: str, page: int = 1, size: int = 10) -> tuple[list[Training], int]:
    """List trainings for a user, paginated with newest first."""
    query = db.query(Training).filter(Training.user_id == user_id)
    total = query.count()
    trainings = (
        query.order_by(Training.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )
    return trainings, total


def get_training(db: Session, training_id: str, user_id: str) -> Training:
    """Get a single training with ownership check."""
    training = db.query(Training).filter(Training.id == training_id).first()
    if training is None:
        raise HTTPException(status_code=404, detail="Training not found")
    if training.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return training


def update_training(db: Session, training_id: str, user_id: str, data: dict) -> Training:
    """Partially update a training record."""
    training = get_training(db, training_id, user_id)

    updatable_fields = {"stock_code", "stock_name", "period", "start_date", "end_date",
                        "current_index", "status", "note"}
    for key, value in data.items():
        if key in updatable_fields and value is not None:
            if key in ("start_date", "end_date"):
                value = _parse_date(value)
            elif key == "status":
                value = TrainingStatus(value)
            setattr(training, key, value)

    training.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(training)
    return training


def delete_training(db: Session, training_id: str, user_id: str) -> None:
    """Delete a training along with its trades and snapshots."""
    training = get_training(db, training_id, user_id)
    db.query(PositionSnapshot).filter(PositionSnapshot.training_id == training_id).delete()
    db.query(Trade).filter(Trade.training_id == training_id).delete()
    db.delete(training)
    db.commit()


# ── Trade CRUD ─────────────────────────────────────────────────────

def add_trade(db: Session, training_id: str, data: dict) -> Trade:
    """Record a trade for a training session."""
    trade = Trade(
        training_id=training_id,
        action=TradeAction(data["action"]),
        price=data["price"],
        percentage=data["percentage"],
        position_after=data["position_after"],
        kline_time=_parse_date(data["kline_time"]),
        kline_index=data["kline_index"],
    )
    db.add(trade)
    db.commit()
    db.refresh(trade)
    return trade


def get_trades(db: Session, training_id: str) -> list[Trade]:
    """List all trades for a training session, ordered by creation time."""
    return (
        db.query(Trade)
        .filter(Trade.training_id == training_id)
        .order_by(Trade.created_at.asc())
        .all()
    )


# ── Snapshot CRUD ──────────────────────────────────────────────────

def add_snapshot(db: Session, training_id: str, data: dict) -> PositionSnapshot:
    """Record a position snapshot for a training session."""
    snapshot = PositionSnapshot(
        training_id=training_id,
        kline_index=data["kline_index"],
        position=data["position"],
        cost_price=data["cost_price"],
        market_value=data["market_value"],
        unrealized_pnl=data["unrealized_pnl"],
        realized_pnl=data.get("realized_pnl", 0.0),
    )
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    return snapshot


def get_snapshots(db: Session, training_id: str) -> list[PositionSnapshot]:
    """List all position snapshots for a training session."""
    return (
        db.query(PositionSnapshot)
        .filter(PositionSnapshot.training_id == training_id)
        .order_by(PositionSnapshot.kline_index.asc())
        .all()
    )


# ── Performance Calculation ────────────────────────────────────────

def calculate_performance(db: Session, training_id: str) -> dict:
    """Calculate performance metrics and persist them on the training record.

    Metrics:
        total_return: Final portfolio value relative to starting capital.
            Derived from last snapshot's market_value + realized_pnl.
            Uses the net cumulative PnL (unrealized + realized) over snapshots.
        win_rate: (# profitable trades) / (total completed buy-sell pairs).
            A "win" = sell trade where the sell price > preceding buy price.
        max_drawdown: Largest peak-to-trough decline in portfolio value curve.
        sharpe_ratio: (mean period return) / (std of period returns).
            Annualized assuming 252 trading days.
        profit_loss_ratio: avg win / |avg loss|.
    """
    training = db.query(Training).filter(Training.id == training_id).first()
    if training is None:
        raise HTTPException(status_code=404, detail="Training not found")

    trades = get_trades(db, training_id)
    snapshots = get_snapshots(db, training_id)

    # ── total_return ──
    # Compute from the equity curve: (equity + realized_pnl) at final vs at start.
    # Starting capital is captured by first snapshot's market_value (before any PnL).
    total_return = _calc_total_return(snapshots)

    # ── win_rate ──
    win_rate = _calc_win_rate(trades)

    # ── max_drawdown ──
    max_drawdown = _calc_max_drawdown(snapshots)

    # ── sharpe_ratio ──
    sharpe_ratio = _calc_sharpe_ratio(snapshots)

    # ── profit_loss_ratio ──
    profit_loss_ratio = _calc_profit_loss_ratio(trades)

    # Persist metrics
    training.total_return = total_return
    training.win_rate = win_rate
    training.max_drawdown = max_drawdown
    training.sharpe_ratio = sharpe_ratio
    training.profit_loss_ratio = profit_loss_ratio
    training.status = TrainingStatus.completed
    training.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(training)

    return {
        "total_return": total_return,
        "win_rate": win_rate,
        "max_drawdown": max_drawdown,
        "sharpe_ratio": sharpe_ratio,
        "profit_loss_ratio": profit_loss_ratio,
    }


# ── Helpers ─────────────────────────────────────────────────────────

def _parse_date(value: str | datetime) -> datetime:
    """Parse a date string or return a datetime as-is."""
    if isinstance(value, datetime):
        return value
    # Try ISO format first, then date-only
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return datetime.strptime(value, "%Y-%m-%d")


def _calc_total_return(snapshots: list[PositionSnapshot]) -> float | None:
    """Calculate total return from snapshots equity curve."""
    if not snapshots:
        return None
    first = snapshots[0]
    last = snapshots[-1]
    start_value = first.market_value + first.unrealized_pnl + (first.realized_pnl or 0.0)
    end_value = last.market_value + last.unrealized_pnl + (last.realized_pnl or 0.0)
    if start_value == 0:
        return 0.0
    return round((end_value - start_value) / start_value * 100, 4)


def _calc_win_rate(trades: list[Trade]) -> float | None:
    """Calculate win rate from paired buy-sell trades."""
    # Match sells to the earliest unmatched buy (FIFO)
    buys: deque[Trade] = deque()
    wins = 0
    pairs = 0

    for t in trades:
        if t.action == TradeAction.buy:
            buys.append(t)
        elif t.action == TradeAction.sell:
            if buys:
                last_buy = buys.popleft()
                if t.price > last_buy.price:
                    wins += 1
                pairs += 1

    if pairs == 0:
        return None
    return round(wins / pairs * 100, 2)


def _calc_max_drawdown(snapshots: list[PositionSnapshot]) -> float | None:
    """Calculate max drawdown from the equity curve."""
    if not snapshots:
        return None

    values = [
        s.market_value + s.unrealized_pnl + (s.realized_pnl or 0.0)
        for s in snapshots
    ]
    if not values:
        return None

    peak = values[0]
    max_dd = 0.0
    for v in values:
        if v > peak:
            peak = v
        dd = (peak - v) / peak if peak > 0 else 0.0
        if dd > max_dd:
            max_dd = dd

    return round(max_dd * 100, 2)


def _calc_sharpe_ratio(snapshots: list[PositionSnapshot]) -> float | None:
    """Calculate annualized Sharpe ratio from period returns."""
    if len(snapshots) < 2:
        return None

    returns = []
    for i in range(1, len(snapshots)):
        prev_value = snapshots[i - 1].market_value + snapshots[i - 1].unrealized_pnl + (snapshots[i - 1].realized_pnl or 0.0)
        curr_value = snapshots[i].market_value + snapshots[i].unrealized_pnl + (snapshots[i].realized_pnl or 0.0)
        if prev_value > 0:
            returns.append((curr_value - prev_value) / prev_value)

    if len(returns) < 2:
        return None

    mean_ret = sum(returns) / len(returns)
    variance = sum((r - mean_ret) ** 2 for r in returns) / (len(returns) - 1)
    std_ret = variance ** 0.5

    if std_ret == 0:
        return 0.0

    # Annualize (assuming daily-ish snapshots, 252 trading days)
    sharpe = (mean_ret / std_ret) * (252 ** 0.5)
    return round(sharpe, 4)


def _calc_profit_loss_ratio(trades: list[Trade]) -> float | None:
    """Calculate profit/loss ratio from paired trades."""
    buys: deque[Trade] = deque()
    profits: list[float] = []
    losses: list[float] = []

    for t in trades:
        if t.action == TradeAction.buy:
            buys.append(t)
        elif t.action == TradeAction.sell:
            if buys:
                last_buy = buys.popleft()
                pnl = (t.price - last_buy.price) / last_buy.price
                if pnl > 0:
                    profits.append(pnl)
                elif pnl < 0:
                    losses.append(abs(pnl))

    if not profits or not losses:
        return None

    avg_profit = sum(profits) / len(profits)
    avg_loss = sum(losses) / len(losses)
    if avg_loss == 0:
        return None

    return round(avg_profit / avg_loss, 4)

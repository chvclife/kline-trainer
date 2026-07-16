# server/app/routers/training.py
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.training import Training, TrainingStatus
from app.models.user import User
from app.services.auth_service import get_current_user
from app.services.training_service import (
    add_snapshot,
    add_trade,
    calculate_performance,
    create_training,
    delete_training,
    get_snapshots,
    get_trades,
    get_training,
    get_trainings,
    update_training,
)

router = APIRouter(prefix="/api/trainings", tags=["trainings"])


# ── Pydantic schemas ───────────────────────────────────────────────

class CreateTrainingRequest(BaseModel):
    stock_code: str = Field(..., min_length=1, max_length=10)
    stock_name: str = Field(..., min_length=1, max_length=50)
    period: str = Field(..., min_length=1, max_length=10)
    start_date: str
    end_date: str
    note: str | None = None


class UpdateTrainingRequest(BaseModel):
    stock_code: str | None = None
    stock_name: str | None = None
    period: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    current_index: int | None = None
    status: str | None = None
    note: str | None = None


class AddTradeRequest(BaseModel):
    action: str = Field(..., pattern="^(buy|sell)$")
    price: float = Field(..., gt=0)
    percentage: float = Field(..., gt=0)
    position_after: float = Field(..., ge=0)
    kline_time: str
    kline_index: int = Field(..., ge=0)


class AddSnapshotRequest(BaseModel):
    kline_index: int = Field(..., ge=0)
    position: float = Field(..., ge=0)
    cost_price: float = Field(..., ge=0)
    market_value: float = Field(..., ge=0)
    unrealized_pnl: float
    realized_pnl: float = 0.0


# ── Helper: serialize model objects ────────────────────────────────

def _training_to_dict(t: Training) -> dict:
    return {
        "id": t.id,
        "user_id": t.user_id,
        "stock_code": t.stock_code,
        "stock_name": t.stock_name,
        "period": t.period,
        "start_date": t.start_date.isoformat() if t.start_date else None,
        "end_date": t.end_date.isoformat() if t.end_date else None,
        "current_index": t.current_index,
        "status": t.status.value if t.status else None,
        "total_return": t.total_return,
        "benchmark_return": t.benchmark_return,
        "win_rate": t.win_rate,
        "profit_loss_ratio": t.profit_loss_ratio,
        "max_drawdown": t.max_drawdown,
        "sharpe_ratio": t.sharpe_ratio,
        "note": t.note,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }


def _trade_to_dict(t) -> dict:
    return {
        "id": t.id,
        "training_id": t.training_id,
        "action": t.action.value if t.action else None,
        "price": t.price,
        "percentage": t.percentage,
        "position_after": t.position_after,
        "kline_time": t.kline_time.isoformat() if t.kline_time else None,
        "kline_index": t.kline_index,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }


def _snapshot_to_dict(s) -> dict:
    return {
        "id": s.id,
        "training_id": s.training_id,
        "kline_index": s.kline_index,
        "position": s.position,
        "cost_price": s.cost_price,
        "market_value": s.market_value,
        "unrealized_pnl": s.unrealized_pnl,
        "realized_pnl": s.realized_pnl,
    }


# ── Endpoints ──────────────────────────────────────────────────────

@router.post("", status_code=201)
def create(payload: CreateTrainingRequest, db: Session = Depends(get_db),
           current_user: User = Depends(get_current_user)):
    """Create a new training session."""
    training = create_training(db, current_user.id, payload.model_dump())
    return _training_to_dict(training)


@router.get("")
def list_trainings(page: int = Query(default=1, ge=1), size: int = Query(default=10, ge=1, le=100),
                   db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)):
    """List training sessions for the current user, newest first."""
    trainings, total = get_trainings(db, current_user.id, page, size)
    return {
        "items": [_training_to_dict(t) for t in trainings],
        "total": total,
        "page": page,
        "size": size,
    }


@router.get("/{training_id}")
def get_one(training_id: str, db: Session = Depends(get_db),
            current_user: User = Depends(get_current_user)):
    """Get a training session with its trades and snapshots."""
    training = get_training(db, training_id, current_user.id)
    trades = get_trades(db, training_id)
    snapshots = get_snapshots(db, training_id)
    return {
        ** _training_to_dict(training),
        "trades": [_trade_to_dict(t) for t in trades],
        "snapshots": [_snapshot_to_dict(s) for s in snapshots],
    }


@router.put("/{training_id}")
def update(training_id: str, payload: UpdateTrainingRequest,
           db: Session = Depends(get_db),
           current_user: User = Depends(get_current_user)):
    """Update a training session (partial update)."""
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    training = update_training(db, training_id, current_user.id, data)
    return _training_to_dict(training)


@router.delete("/{training_id}", status_code=204)
def delete(training_id: str, db: Session = Depends(get_db),
           current_user: User = Depends(get_current_user)):
    """Delete a training session and all associated data."""
    delete_training(db, training_id, current_user.id)


@router.post("/{training_id}/trades", status_code=201)
def add_trade_endpoint(training_id: str, payload: AddTradeRequest,
                       db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    """Record a trade for a training session."""
    # Verify ownership
    get_training(db, training_id, current_user.id)
    trade = add_trade(db, training_id, payload.model_dump())
    return _trade_to_dict(trade)


@router.get("/{training_id}/trades")
def list_trades(training_id: str, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    """List all trades for a training session."""
    get_training(db, training_id, current_user.id)
    trades = get_trades(db, training_id)
    return {"trades": [_trade_to_dict(t) for t in trades]}


@router.post("/{training_id}/snapshots", status_code=201)
def add_snapshot_endpoint(training_id: str, payload: AddSnapshotRequest,
                          db: Session = Depends(get_db),
                          current_user: User = Depends(get_current_user)):
    """Record a position snapshot for a training session."""
    get_training(db, training_id, current_user.id)
    snapshot = add_snapshot(db, training_id, payload.model_dump())
    return _snapshot_to_dict(snapshot)


@router.get("/{training_id}/snapshots")
def list_snapshots(training_id: str, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)):
    """List all position snapshots for a training session."""
    get_training(db, training_id, current_user.id)
    snapshots = get_snapshots(db, training_id)
    return {"snapshots": [_snapshot_to_dict(s) for s in snapshots]}


@router.post("/{training_id}/complete")
def complete_training(training_id: str, db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    """Complete a training session and calculate performance metrics."""
    get_training(db, training_id, current_user.id)
    metrics = calculate_performance(db, training_id)
    return metrics
from datetime import datetime, timedelta, timezone

from app.models.training import (
    PositionSnapshot,
    Trade,
    TradeAction,
    Training,
    TrainingStatus,
)
from app.models.user import User


def test_create_user(db_session):
    user = User(username="testuser", password_hash="hashed_abc")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    assert user.id is not None
    assert len(user.id) == 36  # UUID
    assert user.username == "testuser"
    assert user.password_hash == "hashed_abc"
    assert user.created_at is not None


def test_user_unique_username(db_session):
    user1 = User(username="unique", password_hash="hash1")
    db_session.add(user1)
    db_session.commit()

    user2 = User(username="unique", password_hash="hash2")
    db_session.add(user2)
    try:
        db_session.commit()
        assert False, "Should have raised IntegrityError"
    except Exception:
        db_session.rollback()


def test_create_training(db_session):
    user = User(username="trader", password_hash="hash")
    db_session.add(user)
    db_session.commit()

    training = Training(
        user_id=user.id,
        stock_code="2330",
        stock_name="台積電",
        period="daily",
        start_date=datetime(2024, 1, 1),
        end_date=datetime(2024, 6, 30),
    )
    db_session.add(training)
    db_session.commit()
    db_session.refresh(training)

    assert training.id is not None
    assert training.user_id == user.id
    assert training.status == TrainingStatus.in_progress
    assert training.current_index == 0
    assert training.total_return is None
    assert training.created_at is not None
    assert training.updated_at is not None


def test_training_with_metrics(db_session):
    user = User(username="metrics_user", password_hash="hash")
    db_session.add(user)
    db_session.commit()

    training = Training(
        user_id=user.id,
        stock_code="AAPL",
        stock_name="Apple Inc.",
        period="daily",
        start_date=datetime(2024, 1, 1),
        end_date=datetime(2024, 6, 30),
        total_return=0.15,
        benchmark_return=0.10,
        win_rate=0.65,
        profit_loss_ratio=2.1,
        max_drawdown=-0.08,
        sharpe_ratio=1.5,
        note="Good performance",
    )
    db_session.add(training)
    db_session.commit()
    db_session.refresh(training)

    assert training.total_return == 0.15
    assert training.benchmark_return == 0.10
    assert training.win_rate == 0.65
    assert training.profit_loss_ratio == 2.1
    assert training.max_drawdown == -0.08
    assert training.sharpe_ratio == 1.5
    assert training.note == "Good performance"


def test_create_trade(db_session):
    user = User(username="trade_user", password_hash="hash")
    db_session.add(user)
    db_session.commit()

    training = Training(
        user_id=user.id,
        stock_code="2330",
        stock_name="台積電",
        period="daily",
        start_date=datetime(2024, 1, 1),
        end_date=datetime(2024, 6, 30),
    )
    db_session.add(training)
    db_session.commit()

    trade = Trade(
        training_id=training.id,
        action=TradeAction.buy,
        price=600.0,
        percentage=50.0,
        position_after=0.5,
        kline_time=datetime(2024, 1, 15, tzinfo=timezone.utc),
        kline_index=10,
    )
    db_session.add(trade)
    db_session.commit()
    db_session.refresh(trade)

    assert trade.id is not None
    assert trade.training_id == training.id
    assert trade.action == TradeAction.buy
    assert trade.price == 600.0
    assert trade.percentage == 50.0
    assert trade.position_after == 0.5


def test_create_position_snapshot(db_session):
    user = User(username="snapshot_user", password_hash="hash")
    db_session.add(user)
    db_session.commit()

    training = Training(
        user_id=user.id,
        stock_code="2330",
        stock_name="台積電",
        period="daily",
        start_date=datetime(2024, 1, 1),
        end_date=datetime(2024, 6, 30),
    )
    db_session.add(training)
    db_session.commit()

    snapshot = PositionSnapshot(
        training_id=training.id,
        kline_index=5,
        position=1000.0,
        cost_price=580.0,
        market_value=600000.0,
        unrealized_pnl=20000.0,
        realized_pnl=None,
    )
    db_session.add(snapshot)
    db_session.commit()
    db_session.refresh(snapshot)

    assert snapshot.id is not None
    assert snapshot.training_id == training.id
    assert snapshot.kline_index == 5
    assert snapshot.position == 1000.0
    assert snapshot.cost_price == 580.0
    assert snapshot.market_value == 600000.0
    assert snapshot.unrealized_pnl == 20000.0
    assert snapshot.realized_pnl is None


def test_training_completed_status(db_session):
    user = User(username="completed_user", password_hash="hash")
    db_session.add(user)
    db_session.commit()

    training = Training(
        user_id=user.id,
        stock_code="2330",
        stock_name="台積電",
        period="daily",
        start_date=datetime(2024, 1, 1),
        end_date=datetime(2024, 6, 30),
        status=TrainingStatus.completed,
    )
    db_session.add(training)
    db_session.commit()
    db_session.refresh(training)

    assert training.status == TrainingStatus.completed


def test_trade_sell_action(db_session):
    user = User(username="seller", password_hash="hash")
    db_session.add(user)
    db_session.commit()

    training = Training(
        user_id=user.id,
        stock_code="AAPL",
        stock_name="Apple",
        period="daily",
        start_date=datetime(2024, 1, 1),
        end_date=datetime(2024, 6, 30),
    )
    db_session.add(training)
    db_session.commit()

    trade = Trade(
        training_id=training.id,
        action=TradeAction.sell,
        price=650.0,
        percentage=100.0,
        position_after=0.0,
        kline_time=datetime(2024, 3, 1, tzinfo=timezone.utc),
        kline_index=42,
    )
    db_session.add(trade)
    db_session.commit()
    db_session.refresh(trade)

    assert trade.action == TradeAction.sell
    assert trade.position_after == 0.0


def test_api_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
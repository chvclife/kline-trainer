# K 線訓練器 實現計劃

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 構建一個支持 A 股全週期的 K 線買賣訓練 Web 應用，用戶在隱藏未來數據下訓練買賣決策，系統記錄完整數據供覆盤分析。

**Architecture:** 前後端分離架構。React + Vite + TypeScript 前端負責 K 線渲染、技術指標計算、訓練交互；FastAPI + Python 後端負責 A 股數據獲取（EFinance/AkShare/BaoStock 三源容錯）、JWT 用戶認證、訓練記錄持久化；SQLite 開發 / MySQL 生產。

**Tech Stack:** React 18, TypeScript, Vite, KLineChart, Zustand, React Router v6, Axios, CSS Modules, FastAPI, SQLAlchemy 2.0, Alembic, python-jose, bcrypt, EFinance, AkShare, BaoStock

---

## 文件結構地圖

### 後端文件

| 文件 | 職責 |
|------|------|
| `server/app/main.py` | FastAPI 應用入口，CORS，路由掛載 |
| `server/app/config.py` | 環境配置（DB URL、JWT 密鑰、數據源設定） |
| `server/app/database.py` | SQLAlchemy 引擎、Session、Base |
| `server/app/models/user.py` | User ORM 模型 |
| `server/app/models/training.py` | Training, Trade, PositionSnapshot ORM 模型 |
| `server/app/routers/auth.py` | 認證路由（register/login/me） |
| `server/app/routers/stock.py` | 股票數據路由（search/random/kline） |
| `server/app/routers/training.py` | 訓練 CRUD + 統計路由 |
| `server/app/services/auth_service.py` | 密碼哈希、JWT 生成/驗證、用戶查詢 |
| `server/app/services/stock_service.py` | 股票搜索、隨機選股 |
| `server/app/services/training_service.py` | 訓練記錄 CRUD、績效計算 |
| `server/app/data/base.py` | DataSource 抽象基類 |
| `server/app/data/efinance_source.py` | EFinance 數據源實現 |
| `server/app/data/akshare_source.py` | AkShare 數據源實現 |
| `server/app/data/baostock_source.py` | BaoStock 數據源實現 |
| `server/app/data/manager.py` | DataSourceManager（優先級切換） |
| `server/requirements.txt` | Python 依賴 |
| `server/alembic.ini` | Alembic 配置 |
| `server/alembic/env.py` | Alembic 遷移環境 |
| `server/tests/conftest.py` | 測試 fixtures |
| `server/tests/test_auth.py` | 認證測試 |
| `server/tests/test_stock.py` | 股票數據測試 |
| `server/tests/test_training.py` | 訓練 CRUD 測試 |

### 前端文件

| 文件 | 職責 |
|------|------|
| `client/vite.config.ts` | Vite 配置，API 代理 |
| `client/tsconfig.json` | TypeScript 配置 |
| `client/package.json` | 前端依賴 |
| `client/src/main.tsx` | React 入口 |
| `client/src/App.tsx` | 路由定義 |
| `client/src/types/index.ts` | 全局 TypeScript 類型定義 |
| `client/src/styles/variables.css` | CSS 變量（色彩/字體/間距 token） |
| `client/src/styles/global.css` | 全局樣式（reset、字體引入） |
| `client/src/services/api.ts` | Axios 實例、API 調用函數 |
| `client/src/store/authStore.ts` | 認證狀態 |
| `client/src/store/trainingStore.ts` | 訓練狀態（倉位、K 線數據、交易） |
| `client/src/store/chartStore.ts` | 圖表狀態（指標、副圖、畫線） |
| `client/src/indicators/ma.ts` | MA 計算 |
| `client/src/indicators/ema.ts` | EMA 計算 |
| `client/src/indicators/boll.ts` | 布林帶計算 |
| `client/src/indicators/macd.ts` | MACD 計算 |
| `client/src/indicators/rsi.ts` | RSI 計算 |
| `client/src/indicators/kdj.ts` | KDJ 計算 |
| `client/src/indicators/index.ts` | 指標註冊表 |
| `client/src/hooks/useTraining.ts` | 訓練流程控制 hook |
| `client/src/hooks/useTrade.ts` | 買賣邏輯 hook |
| `client/src/hooks/useChart.ts` | 圖表控制 hook |
| `client/src/components/auth/LoginForm.tsx` | 登錄表單 |
| `client/src/components/auth/RegisterForm.tsx` | 註冊表單 |
| `client/src/components/common/Button.tsx` | 通用按鈕組件 |
| `client/src/components/common/Slider.tsx` | 百分比滑桿組件 |
| `client/src/components/common/Modal.tsx` | 通用模態框 |
| `client/src/components/common/Skeleton.tsx` | 骨架屏組件 |
| `client/src/components/stock/StockSelector.tsx` | 股票搜索選擇 |
| `client/src/components/stock/RandomStock.tsx` | 隨機選股按鈕 |
| `client/src/components/chart/KlineChart.tsx` | K 線圖主組件 |
| `client/src/components/chart/ChartToolbar.tsx` | 圖表工具欄（週期/指標/畫線） |
| `client/src/components/chart/SubChartSelector.tsx` | 副圖指標選擇 |
| `client/src/components/chart/DrawingTool.tsx` | 畫線工具 |
| `client/src/components/training/TrainingPanel.tsx` | 訓練控制面板 |
| `client/src/components/training/TradePanel.tsx` | 買賣操作面板 |
| `client/src/components/training/PositionBar.tsx` | 倉位條 |
| `client/src/components/training/TrainingResult.tsx` | 訓練結果報告 |
| `client/src/pages/LoginPage.tsx` | 登錄頁 |
| `client/src/pages/DashboardPage.tsx` | 訓練總覽頁 |
| `client/src/pages/TrainingPage.tsx` | 訓練主頁（核心） |
| `client/src/pages/ReviewPage.tsx` | 覆盤頁 |
| `client/index.html` | HTML 入口 |

---

## Task 1: 後端項目初始化 + 配置

**Files:**
- Create: `server/requirements.txt`
- Create: `server/app/__init__.py`
- Create: `server/app/main.py`
- Create: `server/app/config.py`
- Create: `server/app/database.py`

- [ ] **Step 1: 創建 server 目錄結構和 requirements.txt**

```txt
# server/requirements.txt
fastapi==0.115.0
uvicorn[standard]==0.30.0
sqlalchemy==2.0.35
alembic==1.13.0
python-jose[cryptography]==3.3.0
bcrypt==4.2.0
pydantic==2.9.0
pydantic-settings==2.5.0
efinance==0.5.5
akshare==1.14.0
baostock==0.8.9
httpx==0.27.0
pytest==8.3.0
pytest-asyncio==0.24.0
```

- [ ] **Step 2: 安裝依賴**

Run: `cd server && pip install -r requirements.txt`
Expected: 所有包成功安裝

- [ ] **Step 3: 創建 config.py**

```python
# server/app/config.py
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./kline_trainer.db"
    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
```

- [ ] **Step 4: 創建 database.py**

```python
# server/app/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},  # SQLite 需要
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- [ ] **Step 5: 創建 main.py**

```python
# server/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

app = FastAPI(title="K線訓練器", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
```

- [ ] **Step 6: 創建 __init__.py**

```python
# server/app/__init__.py
```

- [ ] **Step 7: 啟動驗證**

Run: `cd server && uvicorn app.main:app --reload --port 8000`
Expected: 服務器啟動成功，訪問 http://localhost:8000/api/health 返回 `{"status":"ok"}`

- [ ] **Step 8: Commit**

```bash
git init
git add server/
git commit -m "feat: initialize FastAPI backend with config and database"
```

---

## Task 2: 數據模型 + Alembic 遷移

**Files:**
- Create: `server/app/models/__init__.py`
- Create: `server/app/models/user.py`
- Create: `server/app/models/training.py`
- Create: `server/tests/conftest.py`
- Create: `server/tests/test_models.py`

- [ ] **Step 1: 創建 User 模型**

```python
# server/app/models/user.py
import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
```

- [ ] **Step 2: 創建 Training / Trade / PositionSnapshot 模型**

```python
# server/app/models/training.py
import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text, func)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class TrainingStatus(str, PyEnum):
    in_progress = "in_progress"
    completed = "completed"


class TradeAction(str, PyEnum):
    buy = "buy"
    sell = "sell"


class Training(Base):
    __tablename__ = "trainings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    stock_code: Mapped[str] = mapped_column(String(10), nullable=False)
    stock_name: Mapped[str] = mapped_column(String(50), nullable=False)
    period: Mapped[str] = mapped_column(String(10), nullable=False)
    start_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    current_index: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[TrainingStatus] = mapped_column(Enum(TrainingStatus), default=TrainingStatus.in_progress)
    total_return: Mapped[float | None] = mapped_column(Float, nullable=True)
    benchmark_return: Mapped[float | None] = mapped_column(Float, nullable=True)
    win_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    profit_loss_ratio: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_drawdown: Mapped[float | None] = mapped_column(Float, nullable=True)
    sharpe_ratio: Mapped[float | None] = mapped_column(Float, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class Trade(Base):
    __tablename__ = "trades"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    training_id: Mapped[str] = mapped_column(String(36), ForeignKey("trainings.id"), nullable=False, index=True)
    action: Mapped[TradeAction] = mapped_column(Enum(TradeAction), nullable=False)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    percentage: Mapped[float] = mapped_column(Float, nullable=False)
    position_after: Mapped[float] = mapped_column(Float, nullable=False)
    kline_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    kline_index: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class PositionSnapshot(Base):
    __tablename__ = "position_snapshots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    training_id: Mapped[str] = mapped_column(String(36), ForeignKey("trainings.id"), nullable=False, index=True)
    kline_index: Mapped[int] = mapped_column(Integer, nullable=False)
    position: Mapped[float] = mapped_column(Float, nullable=False)
    cost_price: Mapped[float] = mapped_column(Float, nullable=False)
    market_value: Mapped[float] = mapped_column(Float, nullable=False)
    unrealized_pnl: Mapped[float] = mapped_column(Float, nullable=False)
    realized_pnl: Mapped[float] = mapped_column(Float, nullable=False)
```

- [ ] **Step 3: 創建 models __init__.py**

```python
# server/app/models/__init__.py
from app.models.training import PositionSnapshot, Trade, Training, TrainingStatus, TradeAction
from app.models.user import User
```

- [ ] **Step 4: 初始化 Alembic**

Run: `cd server && alembic init alembic`
Expected: 生成 alembic/ 目錄和 alembic.ini

- [ ] **Step 5: 配置 alembic/env.py**

在 `alembic/env.py` 中，將 `target_metadata` 替換為：

```python
from app.database import Base
from app.models import User, Training, Trade, PositionSnapshot  # noqa: F401

target_metadata = Base.metadata
```

同時將 `sqlalchemy.url` 改為從 config 讀取：

```python
from app.config import settings
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
```

- [ ] **Step 6: 生成初始遷移**

Run: `cd server && alembic revision --autogenerate -m "create initial tables"`
Expected: 生成遷移文件，包含 users, trainings, trades, position_snapshots 四張表

- [ ] **Step 7: 執行遷移**

Run: `cd server && alembic upgrade head`
Expected: 創建 kline_trainer.db 文件，包含四張表

- [ ] **Step 8: 創建測試 fixtures**

```python
# server/tests/conftest.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app

TEST_DATABASE_URL = "sqlite:///./test_kline_trainer.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)
```

- [ ] **Step 9: 創建模型測試**

```python
# server/tests/test_models.py
from app.models import User, Training, TrainingStatus, Trade, TradeAction, PositionSnapshot


def test_create_user(db):
    user = User(username="testuser", password_hash="hashed")
    db.add(user)
    db.commit()
    assert user.id is not None
    assert user.username == "testuser"


def test_create_training(db):
    user = User(username="testuser", password_hash="hashed")
    db.add(user)
    db.commit()
    training = Training(
        user_id=user.id,
        stock_code="000001",
        stock_name="平安銀行",
        period="1d",
        start_date="2024-01-01",
        end_date="2024-12-31",
    )
    db.add(training)
    db.commit()
    assert training.status == TrainingStatus.in_progress
    assert training.current_index == 0
```

- [ ] **Step 10: Commit**

```bash
git add server/
git commit -m "feat: add data models with Alembic migrations"
```

---

## Task 3: 認證系統（JWT）

**Files:**
- Create: `server/app/services/auth_service.py`
- Create: `server/app/routers/auth.py`
- Create: `server/tests/test_auth.py`

- [ ] **Step 1: 創建 auth_service.py**

```python
# server/app/services/auth_service.py
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.models.user import User


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "exp": expire, "type": "access"}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm="HS256")


def create_refresh_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {"sub": user_id, "exp": expire, "type": "refresh"}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm="HS256")


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
    except JWTError:
        return None


def get_user_by_username(db: Session, username: str) -> User | None:
    return db.query(User).filter(User.username == username).first()


def create_user(db: Session, username: str, password: str) -> User:
    user = User(username=username, password_hash=hash_password(password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, username: str, password: str) -> User | None:
    user = get_user_by_username(db, username)
    if not user or not verify_password(password, user.password_hash):
        return None
    return user
```

- [ ] **Step 2: 創建 auth 路由**

```python
# server/app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    username: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    username: str


@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if auth_service.get_user_by_username(db, req.username):
        raise HTTPException(status_code=400, detail="用戶名已存在")
    if len(req.username) < 3 or len(req.username) > 50:
        raise HTTPException(status_code=400, detail="用戶名長度需為 3-50 字符")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="密碼長度至少 6 字符")
    user = auth_service.create_user(db, req.username, req.password)
    return TokenResponse(
        access_token=auth_service.create_access_token(user.id),
        refresh_token=auth_service.create_refresh_token(user.id),
    )


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = auth_service.authenticate_user(db, req.username, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="用戶名或密碼錯誤")
    return TokenResponse(
        access_token=auth_service.create_access_token(user.id),
        refresh_token=auth_service.create_refresh_token(user.id),
    )


@router.get("/me", response_model=UserResponse)
def get_me(user_id: str = Depends(auth_service.decode_token)):
    # 將在 Task 中補充 get_current_user 依賴
    pass
```

- [ ] **Step 3: 添加 get_current_user 依賴到 auth_service.py**

在 `auth_service.py` 末尾添加：

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    payload = decode_token(credentials.credentials)
    if payload is None or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="無效的認證憑證")
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用戶不存在")
    return user
```

- [ ] **Step 4: 更新 auth 路由中的 /me 端點**

```python
@router.get("/me", response_model=UserResponse)
def get_me(user: User = Depends(auth_service.get_current_user)):
    return UserResponse(id=user.id, username=user.username)
```

- [ ] **Step 5: 掛載路由到 main.py**

在 `main.py` 中添加：

```python
from app.routers import auth

app.include_router(auth.router)
```

- [ ] **Step 6: 創建認證測試**

```python
# server/tests/test_auth.py
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_register_success():
    resp = client.post("/api/auth/register", json={"username": "testuser", "password": "test123456"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


def test_register_duplicate_username():
    client.post("/api/auth/register", json={"username": "testuser", "password": "test123456"})
    resp = client.post("/api/auth/register", json={"username": "testuser", "password": "test123456"})
    assert resp.status_code == 400


def test_register_short_username():
    resp = client.post("/api/auth/register", json={"username": "ab", "password": "test123456"})
    assert resp.status_code == 400


def test_register_short_password():
    resp = client.post("/api/auth/register", json={"username": "testuser", "password": "12345"})
    assert resp.status_code == 400


def test_login_success():
    client.post("/api/auth/register", json={"username": "testuser", "password": "test123456"})
    resp = client.post("/api/auth/login", json={"username": "testuser", "password": "test123456"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_login_wrong_password():
    client.post("/api/auth/register", json={"username": "testuser", "password": "test123456"})
    resp = client.post("/api/auth/login", json={"username": "testuser", "password": "wrong"})
    assert resp.status_code == 401


def test_get_me():
    reg = client.post("/api/auth/register", json={"username": "testuser", "password": "test123456"})
    token = reg.json()["access_token"]
    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["username"] == "testuser"
```

- [ ] **Step 7: 運行測試**

Run: `cd server && pytest tests/test_auth.py -v`
Expected: 全部 7 個測試通過

- [ ] **Step 8: Commit**

```bash
git add server/
git commit -m "feat: add JWT authentication with register/login/me endpoints"
```

---

## Task 4: 數據源層（EFinance / AkShare / BaoStock）

**Files:**
- Create: `server/app/data/__init__.py`
- Create: `server/app/data/base.py`
- Create: `server/app/data/efinance_source.py`
- Create: `server/app/data/akshare_source.py`
- Create: `server/app/data/baostock_source.py`
- Create: `server/app/data/manager.py`
- Create: `server/tests/test_data_sources.py`

- [ ] **Step 1: 創建抽象基類**

```python
# server/app/data/base.py
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime


@dataclass
class KlineBar:
    time: str          # YYYY-MM-DD or YYYY-MM-DD HH:mm
    open: float
    high: float
    low: float
    close: float
    volume: int


class DataSource(ABC):
    name: str

    @abstractmethod
    def get_kline(
        self, code: str, period: str, start: str, end: str
    ) -> list[KlineBar]:
        """獲取K線數據。code 為純數字如 '000001'，period 為 '1m'/'5m'/'1d' 等。"""
        ...

    @abstractmethod
    def search_stocks(self, keyword: str) -> list[dict]:
        """搜索股票，返回 [{"code": "000001", "name": "平安銀行"}]"""
        ...

    @abstractmethod
    def is_available(self) -> bool:
        """檢查數據源是否可用"""
        ...
```

- [ ] **Step 2: 創建 EFinance 數據源**

```python
# server/app/data/efinance_source.py
from datetime import datetime

import efinance as ef

from app.data.base import DataSource, KlineBar

PERIOD_MAP = {
    "1m": "1",
    "5m": "5",
    "15m": "15",
    "30m": "30",
    "60m": "60",
    "1d": "101",
    "1w": "102",
    "1M": "103",
}


class EFinanceSource(DataSource):
    name = "efinance"

    def is_available(self) -> bool:
        try:
            ef.stock.get_realtime_quotes()
            return True
        except Exception:
            return False

    def get_kline(self, code: str, period: str, start: str, end: str) -> list[KlineBar]:
        kline_type = PERIOD_MAP.get(period)
        if kline_type is None:
            raise ValueError(f"不支持的週期: {period}")

        # EFinance 使用市場代碼格式
        market_code = self._to_market_code(code)
        df = ef.stock.get_quote_history(
            market_code,
            beg=start.replace("-", ""),
            end=end.replace("-", ""),
            klt=kline_type,
            fqt="1",  # 前復權
        )
        if df is None or df.empty:
            return []

        bars = []
        for _, row in df.iterrows():
            bars.append(KlineBar(
                time=str(row["日期"]) if "日期" in df.columns else str(row.iloc[0]),
                open=float(row["開盤"]),
                high=float(row["最高"]),
                low=float(row["最低"]),
                close=float(row["收盤"]),
                volume=int(row["成交量"]),
            ))
        return bars

    def search_stocks(self, keyword: str) -> list[dict]:
        df = ef.stock.get_realtime_quotes()
        if df is None or df.empty:
            return []
        mask = df["股票名稱"].str.contains(keyword, na=False) | df["股票代碼"].str.contains(keyword, na=False)
        results = df[mask].head(20)
        return [{"code": row["股票代碼"][:6], "name": row["股票名稱"]} for _, row in results.iterrows()]

    def _to_market_code(self, code: str) -> str:
        """純數字轉 EFinance 市場代碼，如 000001 → 000001"""
        if code.startswith("6"):
            return code  # 滬市
        return code  # 深市
```

- [ ] **Step 3: 創建 AkShare 數據源**

```python
# server/app/data/akshare_source.py
import akshare as ak

from app.data.base import DataSource, KlineBar

PERIOD_MAP = {
    "1m": "1",
    "5m": "5",
    "15m": "15",
    "30m": "30",
    "60m": "60",
    "1d": "daily",
    "1w": "weekly",
    "1M": "monthly",
}


class AkShareSource(DataSource):
    name = "akshare"

    def is_available(self) -> bool:
        try:
            ak.stock_zh_a_spot_em()
            return True
        except Exception:
            return False

    def get_kline(self, code: str, period: str, start: str, end: str) -> list[KlineBar]:
        ak_period = PERIOD_MAP.get(period)
        if ak_period is None:
            raise ValueError(f"不支持的週期: {period}")

        if period in ("1m", "5m", "15m", "30m", "60m"):
            df = ak.stock_zh_a_hist_min_em(
                symbol=code,
                period=ak_period,
                start_date=start.replace("-", " ") + " 09:30:00",
                end_date=end.replace("-", " ") + " 15:00:00",
                adjust="qfq",
            )
        else:
            df = ak.stock_zh_a_hist(
                symbol=code,
                period=ak_period,
                start_date=start.replace("-", ""),
                end_date=end.replace("-", ""),
                adjust="qfq",
            )

        if df is None or df.empty:
            return []

        bars = []
        for _, row in df.iterrows():
            bars.append(KlineBar(
                time=str(row["日期"] if "日期" in df.columns else row["時間"]),
                open=float(row["開盤"]),
                high=float(row["最高"]),
                low=float(row["最低"]),
                close=float(row["收盤"]),
                volume=int(row["成交量"]),
            ))
        return bars

    def search_stocks(self, keyword: str) -> list[dict]:
        df = ak.stock_zh_a_spot_em()
        if df is None or df.empty:
            return []
        mask = df["名稱"].str.contains(keyword, na=False) | df["代碼"].str.contains(keyword, na=False)
        results = df[mask].head(20)
        return [{"code": row["代碼"], "name": row["名稱"]} for _, row in results.iterrows()]
```

- [ ] **Step 4: 創建 BaoStock 數據源**

```python
# server/app/data/baostock_source.py
import baostock as bs

from app.data.base import DataSource, KlineBar

PERIOD_MAP = {
    "5m": "5",
    "15m": "15",
    "30m": "30",
    "60m": "60",
    "1d": "d",
    "1w": "w",
    "1M": "m",
}


class BaoStockSource(DataSource):
    name = "baostock"

    def is_available(self) -> bool:
        try:
            lg = bs.login()
            available = lg.error_code == "0"
            bs.logout()
            return available
        except Exception:
            return False

    def get_kline(self, code: str, period: str, start: str, end: str) -> list[KlineBar]:
        bs_period = PERIOD_MAP.get(period)
        if bs_period is None:
            raise ValueError(f"BaoStock 不支持的週期: {period}")

        bs.login()
        try:
            # BaoStock 使用 sh.600000 / sz.000001 格式
            bs_code = self._to_bs_code(code)
            rs = bs.query_history_k_data_plus(
                bs_code,
                "date,time,open,high,low,close,volume",
                start_date=start.replace("-", ""),
                end_date=end.replace("-", ""),
                frequency=bs_period,
                adjustflag="2",  # 前復權
            )

            bars = []
            while rs.error_code == "0" and rs.next():
                row = rs.get_row_data()
                bars.append(KlineBar(
                    time=row[0],
                    open=float(row[2]),
                    high=float(row[3]),
                    low=float(row[4]),
                    close=float(row[5]),
                    volume=int(float(row[6])),
                ))
            return bars
        finally:
            bs.logout()

    def search_stocks(self, keyword: str) -> list[dict]:
        # BaoStock 不提供搜索，返回空列表
        return []

    def _to_bs_code(self, code: str) -> str:
        if code.startswith("6"):
            return f"sh.{code}"
        return f"sz.{code}"
```

- [ ] **Step 5: 創建 DataSourceManager**

```python
# server/app/data/manager.py
import logging

from app.data.akshare_source import AkShareSource
from app.data.baostock_source import BaoStockSource
from app.data.base import DataSource, KlineBar
from app.data.efinance_source import EFinanceSource

logger = logging.getLogger(__name__)


class DataSourceManager:
    """按優先級嘗試數據源，失敗自動切換"""

    def __init__(self):
        self.sources: list[DataSource] = [
            EFinanceSource(),
            AkShareSource(),
            BaoStockSource(),
        ]

    def get_kline(self, code: str, period: str, start: str, end: str) -> tuple[list[KlineBar], str]:
        """返回 (數據, 數據源名稱)"""
        for source in self.sources:
            try:
                data = source.get_kline(code, period, start, end)
                if data and len(data) > 0:
                    logger.info(f"從 {source.name} 獲取 {code} K線數據成功，共 {len(data)} 條")
                    return data, source.name
            except Exception as e:
                logger.warning(f"{source.name} 獲取失敗: {e}")
                continue
        raise RuntimeError(f"所有數據源均無法獲取 {code} 的K線數據")

    def search_stocks(self, keyword: str) -> list[dict]:
        for source in self.sources:
            try:
                results = source.search_stocks(keyword)
                if results:
                    return results
            except Exception as e:
                logger.warning(f"{source.name} 搜索失敗: {e}")
                continue
        return []


data_manager = DataSourceManager()
```

- [ ] **Step 6: 創建 __init__.py**

```python
# server/app/data/__init__.py
from app.data.manager import data_manager
```

- [ ] **Step 7: 手動驗證數據源**

Run: `cd server && python -c "from app.data import data_manager; bars, src = data_manager.get_kline('000001', '1d', '2024-01-01', '2024-03-01'); print(f'{src}: {len(bars)} bars')"`
Expected: 輸出數據源名稱和 K 線條數

- [ ] **Step 8: Commit**

```bash
git add server/
git commit -m "feat: add data source layer with EFinance/AkShare/BaoStock fallback"
```

---

## Task 5: 股票數據 API

**Files:**
- Create: `server/app/services/stock_service.py`
- Create: `server/app/routers/stock.py`
- Create: `server/tests/test_stock.py`

- [ ] **Step 1: 創建 stock_service.py**

```python
# server/app/services/stock_service.py
import random

from app.data import data_manager
from app.data.base import KlineBar


def search_stocks(keyword: str) -> list[dict]:
    return data_manager.search_stocks(keyword)


def get_kline(code: str, period: str, start: str, end: str) -> dict:
    bars, source = data_manager.get_kline(code, period, start, end)
    return {
        "code": code,
        "period": period,
        "source": source,
        "data": [
            {
                "time": bar.time,
                "open": bar.open,
                "high": bar.high,
                "low": bar.low,
                "close": bar.close,
                "volume": bar.volume,
            }
            for bar in bars
        ],
    }


# 預設活躍 A 股代碼池，用於隨機選股
POPULAR_STOCKS = [
    ("000001", "平安銀行"), ("000002", "萬科A"), ("000333", "美的集團"),
    ("000651", "格力電器"), ("000858", "五糧液"), ("002594", "比亞迪"),
    ("600036", "招商銀行"), ("600519", "貴州茅臺"), ("600887", "伊利股份"),
    ("601318", "中國平安"), ("601398", "工商銀行"), ("603259", "藥明康德"),
]


def get_random_stock() -> dict:
    code, name = random.choice(POPULAR_STOCKS)
    return {"code": code, "name": name}
```

- [ ] **Step 2: 創建 stock 路由**

```python
# server/app/routers/stock.py
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.models.user import User
from app.services import auth_service, stock_service

router = APIRouter(prefix="/api/stocks", tags=["stocks"])


class KlineResponse(BaseModel):
    code: str
    period: str
    source: str
    data: list[dict]


class StockItem(BaseModel):
    code: str
    name: str


@router.get("/search", response_model=list[StockItem])
def search(q: str = Query(..., min_length=1), user: User = Depends(auth_service.get_current_user)):
    return stock_service.search_stocks(q)


@router.get("/random", response_model=StockItem)
def random_stock(user: User = Depends(auth_service.get_current_user)):
    return stock_service.get_random_stock()


@router.get("/{code}/kline", response_model=KlineResponse)
def get_kline(
    code: str,
    period: str = Query(..., regex="^(1m|5m|15m|30m|60m|1d|1w|1M)$"),
    start: str = Query(..., description="YYYY-MM-DD"),
    end: str = Query(..., description="YYYY-MM-DD"),
    user: User = Depends(auth_service.get_current_user),
):
    return stock_service.get_kline(code, period, start, end)
```

- [ ] **Step 3: 掛載路由到 main.py**

```python
from app.routers import auth, stock

app.include_router(auth.router)
app.include_router(stock.router)
```

- [ ] **Step 4: 測試 API**

Run: `cd server && uvicorn app.main:app --reload --port 8000`
然後用 curl 或瀏覽器測試：
- `POST /api/auth/register` → 獲取 token
- `GET /api/stocks/search?q=平安&token=...` → 搜索結果
- `GET /api/stocks/random` → 隨機股票
- `GET /api/stocks/000001/kline?period=1d&start=2024-01-01&end=2024-03-01` → K 線數據

- [ ] **Step 5: Commit**

```bash
git add server/
git commit -m "feat: add stock data API with search/random/kline endpoints"
```

---

## Task 6: 訓練 CRUD API

**Files:**
- Create: `server/app/services/training_service.py`
- Create: `server/app/routers/training.py`
- Create: `server/tests/test_training.py`

- [ ] **Step 1: 創建 training_service.py**

```python
# server/app/services/training_service.py
import math
from datetime import datetime
from uuid import uuid4

from sqlalchemy.orm import Session

from app.models.training import PositionSnapshot, Trade, Training, TrainingStatus


def create_training(db: Session, user_id: str, data: dict) -> Training:
    training = Training(
        id=str(uuid4()),
        user_id=user_id,
        stock_code=data["stock_code"],
        stock_name=data["stock_name"],
        period=data["period"],
        start_date=data["start_date"],
        end_date=data["end_date"],
        current_index=data.get("current_index", 0),
    )
    db.add(training)
    db.commit()
    db.refresh(training)
    return training


def get_trainings(db: Session, user_id: str, page: int = 1, size: int = 20) -> list[Training]:
    offset = (page - 1) * size
    return (
        db.query(Training)
        .filter(Training.user_id == user_id)
        .order_by(Training.created_at.desc())
        .offset(offset)
        .limit(size)
        .all()
    )


def get_training(db: Session, training_id: str, user_id: str) -> Training | None:
    return db.query(Training).filter(Training.id == training_id, Training.user_id == user_id).first()


def update_training(db: Session, training_id: str, user_id: str, data: dict) -> Training | None:
    training = get_training(db, training_id, user_id)
    if not training:
        return None
    for key, value in data.items():
        if hasattr(training, key) and value is not None:
            setattr(training, key, value)
    db.commit()
    db.refresh(training)
    return training


def delete_training(db: Session, training_id: str, user_id: str) -> bool:
    training = get_training(db, training_id, user_id)
    if not training:
        return False
    db.query(Trade).filter(Trade.training_id == training_id).delete()
    db.query(PositionSnapshot).filter(PositionSnapshot.training_id == training_id).delete()
    db.delete(training)
    db.commit()
    return True


def add_trade(db: Session, training_id: str, data: dict) -> Trade:
    trade = Trade(
        id=str(uuid4()),
        training_id=training_id,
        action=data["action"],
        price=data["price"],
        percentage=data["percentage"],
        position_after=data["position_after"],
        kline_time=data["kline_time"],
        kline_index=data["kline_index"],
    )
    db.add(trade)
    db.commit()
    db.refresh(trade)
    return trade


def get_trades(db: Session, training_id: str) -> list[Trade]:
    return db.query(Trade).filter(Trade.training_id == training_id).order_by(Trade.kline_index).all()


def add_snapshot(db: Session, training_id: str, data: dict) -> PositionSnapshot:
    snapshot = PositionSnapshot(
        id=str(uuid4()),
        training_id=training_id,
        kline_index=data["kline_index"],
        position=data["position"],
        cost_price=data["cost_price"],
        market_value=data["market_value"],
        unrealized_pnl=data["unrealized_pnl"],
        realized_pnl=data["realized_pnl"],
    )
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    return snapshot


def get_snapshots(db: Session, training_id: str) -> list[PositionSnapshot]:
    return db.query(PositionSnapshot).filter(PositionSnapshot.training_id == training_id).order_by(PositionSnapshot.kline_index).all()


def calculate_performance(db: Session, training_id: str) -> dict:
    """計算訓練績效指標"""
    trades = get_trades(db, training_id)
    snapshots = get_snapshots(db, training_id)

    if not trades or not snapshots:
        return {}

    # 總收益率：最後快照的 unrealized_pnl + realized_pnl
    final = snapshots[-1]
    total_return = (final.unrealized_pnl + final.realized_pnl)

    # 勝率：盈利交易 / 總賣出交易
    sell_trades = [t for t in trades if t.action == "sell"]
    if sell_trades:
        winning = sum(1 for t in sell_trades if t.price > 0)  # 簡化，實際需比對成本
        win_rate = winning / len(sell_trades)
    else:
        win_rate = 0.0

    # 最大回撤
    peak = 0
    max_dd = 0
    for snap in snapshots:
        equity = snap.market_value + snap.realized_pnl
        if equity > peak:
            peak = equity
        dd = (peak - equity) / peak if peak > 0 else 0
        if dd > max_dd:
            max_dd = dd

    # 夏普比率（簡化，日收益率的均值/標準差 × sqrt(252)）
    returns = []
    for i in range(1, len(snapshots)):
        prev_equity = snapshots[i-1].market_value + snapshots[i-1].realized_pnl
        curr_equity = snapshots[i].market_value + snapshots[i].realized_pnl
        if prev_equity > 0:
            returns.append((curr_equity - prev_equity) / prev_equity)

    if len(returns) > 1:
        avg_ret = sum(returns) / len(returns)
        std_ret = math.sqrt(sum((r - avg_ret) ** 2 for r in returns) / (len(returns) - 1))
        sharpe = (avg_ret / std_ret) * math.sqrt(252) if std_ret > 0 else 0
    else:
        sharpe = 0.0

    # 盈虧比
    profits = []
    losses = []
    for t in sell_trades:
        pnl = t.price  # 簡化
        if pnl >= 0:
            profits.append(pnl)
        else:
            losses.append(abs(pnl))

    avg_profit = sum(profits) / len(profits) if profits else 0
    avg_loss = sum(losses) / len(losses) if losses else 1
    profit_loss_ratio = avg_profit / avg_loss if avg_loss > 0 else 0

    return {
        "total_return": total_return,
        "win_rate": win_rate,
        "max_drawdown": max_dd,
        "sharpe_ratio": sharpe,
        "profit_loss_ratio": profit_loss_ratio,
    }
```

- [ ] **Step 2: 創建 training 路由**

```python
# server/app/routers/training.py
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.services import auth_service, training_service

router = APIRouter(prefix="/api/trainings", tags=["trainings"])


class CreateTrainingRequest(BaseModel):
    stock_code: str
    stock_name: str
    period: str
    start_date: str
    end_date: str
    current_index: int = 0


class UpdateTrainingRequest(BaseModel):
    current_index: int | None = None
    status: str | None = None
    note: str | None = None
    total_return: float | None = None
    benchmark_return: float | None = None
    win_rate: float | None = None
    profit_loss_ratio: float | None = None
    max_drawdown: float | None = None
    sharpe_ratio: float | None = None


class CreateTradeRequest(BaseModel):
    action: str          # buy / sell
    price: float
    percentage: float
    position_after: float
    kline_time: str
    kline_index: int


class CreateSnapshotRequest(BaseModel):
    kline_index: int
    position: float
    cost_price: float
    market_value: float
    unrealized_pnl: float
    realized_pnl: float


@router.post("")
def create_training(req: CreateTrainingRequest, user: User = Depends(auth_service.get_current_user), db: Session = Depends(get_db)):
    return training_service.create_training(db, user.id, req.model_dump())


@router.get("")
def list_trainings(page: int = 1, size: int = 20, user: User = Depends(auth_service.get_current_user), db: Session = Depends(get_db)):
    return training_service.get_trainings(db, user.id, page, size)


@router.get("/{training_id}")
def get_training(training_id: str, user: User = Depends(auth_service.get_current_user), db: Session = Depends(get_db)):
    training = training_service.get_training(db, training_id, user.id)
    if not training:
        raise HTTPException(status_code=404, detail="訓練記錄不存在")
    trades = training_service.get_trades(db, training_id)
    snapshots = training_service.get_snapshots(db, training_id)
    return {
        **training.__dict__,
        "trades": [t.__dict__ for t in trades],
        "snapshots": [s.__dict__ for s in snapshots],
    }


@router.put("/{training_id}")
def update_training(training_id: str, req: UpdateTrainingRequest, user: User = Depends(auth_service.get_current_user), db: Session = Depends(get_db)):
    result = training_service.update_training(db, training_id, user.id, req.model_dump(exclude_none=True))
    if not result:
        raise HTTPException(status_code=404, detail="訓練記錄不存在")
    return result


@router.delete("/{training_id}")
def delete_training(training_id: str, user: User = Depends(auth_service.get_current_user), db: Session = Depends(get_db)):
    if not training_service.delete_training(db, training_id, user.id):
        raise HTTPException(status_code=404, detail="訓練記錄不存在")
    return {"detail": "已刪除"}


@router.post("/{training_id}/trades")
def add_trade(training_id: str, req: CreateTradeRequest, user: User = Depends(auth_service.get_current_user), db: Session = Depends(get_db)):
    training = training_service.get_training(db, training_id, user.id)
    if not training:
        raise HTTPException(status_code=404, detail="訓練記錄不存在")
    return training_service.add_trade(db, training_id, req.model_dump())


@router.get("/{training_id}/trades")
def get_trades(training_id: str, user: User = Depends(auth_service.get_current_user), db: Session = Depends(get_db)):
    return training_service.get_trades(db, training_id)


@router.post("/{training_id}/snapshots")
def add_snapshot(training_id: str, req: CreateSnapshotRequest, user: User = Depends(auth_service.get_current_user), db: Session = Depends(get_db)):
    training = training_service.get_training(db, training_id, user.id)
    if not training:
        raise HTTPException(status_code=404, detail="訓練記錄不存在")
    return training_service.add_snapshot(db, training_id, req.model_dump())


@router.post("/{training_id}/complete")
def complete_training(training_id: str, user: User = Depends(auth_service.get_current_user), db: Session = Depends(get_db)):
    training = training_service.get_training(db, training_id, user.id)
    if not training:
        raise HTTPException(status_code=404, detail="訓練記錄不存在")
    perf = training_service.calculate_performance(db, training_id)
    training.status = "completed"
    for key, value in perf.items():
        setattr(training, key, value)
    db.commit()
    db.refresh(training)
    return training
```

- [ ] **Step 3: 掛載路由並測試**

更新 `main.py` 掛載所有路由，啟動服務器測試 CRUD 操作。

- [ ] **Step 4: Commit**

```bash
git add server/
git commit -m "feat: add training CRUD API with trades and snapshots"
```

---

## Task 7: 前端項目初始化

**Files:**
- Create: `client/package.json`
- Create: `client/vite.config.ts`
- Create: `client/tsconfig.json`
- Create: `client/index.html`
- Create: `client/src/main.tsx`
- Create: `client/src/App.tsx`
- Create: `client/src/types/index.ts`
- Create: `client/src/styles/variables.css`
- Create: `client/src/styles/global.css`

- [ ] **Step 1: 用 Vite 創建 React + TypeScript 項目**

Run: `cd "f:/AI code/kline-trainer" && npm create vite@latest client -- --template react-ts`

- [ ] **Step 2: 安裝依賴**

Run: `cd client && npm install && npm install klinecharts zustand react-router-dom axios`

- [ ] **Step 3: 配置 vite.config.ts（API 代理）**

```typescript
// client/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 4: 創建 CSS 變量文件**

```css
/* client/src/styles/variables.css */
:root {
  /* Surface */
  --surface-0: oklch(0.14 0.008 260);
  --surface-1: oklch(0.18 0.008 260);
  --surface-2: oklch(0.22 0.010 260);
  --surface-3: oklch(0.28 0.010 260);

  /* Text */
  --text-primary: oklch(0.90 0.005 260);
  --text-secondary: oklch(0.62 0.008 260);
  --text-muted: oklch(0.45 0.008 260);

  /* Accent */
  --accent: oklch(0.72 0.15 200);
  --accent-hover: oklch(0.78 0.18 200);

  /* A股語義色：紅漲綠跌 */
  --bull: oklch(0.65 0.20 145);     /* 漲 - 紅 */
  --bear: oklch(0.60 0.22 25);      /* 跌 - 綠 */
  --bull-text: oklch(0.82 0.15 145);
  --bear-text: oklch(0.78 0.18 25);

  /* 狀態 */
  --success: oklch(0.70 0.16 145);
  --warning: oklch(0.75 0.15 85);
  --error: oklch(0.62 0.22 25);
  --info: oklch(0.72 0.12 240);

  /* 字體 */
  --font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  --font-data: 1.5rem;
  --font-title: 1.25rem;
  --font-section: 1rem;
  --font-body: 0.875rem;
  --font-label: 0.75rem;
  --font-micro: 0.625rem;
  --line-height: 1.4;

  /* 間距 */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;

  /* 圓角 */
  --radius-sm: 4px;
  --radius-md: 8px;

  /* 頂部欄 / 底部欄 */
  --topbar-height: 48px;
  --bottombar-height: 56px;
  --sidebar-width: 200px;
}
```

- [ ] **Step 5: 創建全局樣式**

```css
/* client/src/styles/global.css */
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");
@import "./variables.css";

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body, #root {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

body {
  font-family: var(--font-family);
  font-size: var(--font-body);
  line-height: var(--line-height);
  color: var(--text-primary);
  background-color: var(--surface-0);
  -webkit-font-smoothing: antialiased;
}

a { color: var(--accent); text-decoration: none; }
a:hover { color: var(--accent-hover); }

::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--surface-1); }
::-webkit-scrollbar-thumb { background: var(--surface-3); border-radius: 3px; }
```

- [ ] **Step 6: 創建類型定義**

```typescript
// client/src/types/index.ts
export interface KlineBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface KlineResponse {
  code: string;
  period: string;
  source: string;
  data: KlineBar[];
}

export interface StockItem {
  code: string;
  name: string;
}

export interface TradeRecord {
  id: string;
  training_id: string;
  action: "buy" | "sell";
  price: number;
  percentage: number;
  position_after: number;
  kline_time: string;
  kline_index: number;
}

export interface TrainingRecord {
  id: string;
  user_id: string;
  stock_code: string;
  stock_name: string;
  period: string;
  start_date: string;
  end_date: string;
  current_index: number;
  status: "in_progress" | "completed";
  total_return: number | null;
  benchmark_return: number | null;
  win_rate: number | null;
  profit_loss_ratio: number | null;
  max_drawdown: number | null;
  sharpe_ratio: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  trades?: TradeRecord[];
  snapshots?: PositionSnapshot[];
}

export interface PositionSnapshot {
  id: string;
  training_id: string;
  kline_index: number;
  position: number;
  cost_price: number;
  market_value: number;
  unrealized_pnl: number;
  realized_pnl: number;
}

export type Period = "1m" | "5m" | "15m" | "30m" | "60m" | "1d" | "1w" | "1M";

export interface IndicatorConfig {
  name: string;
  type: "overlay" | "subchart";
  params: Record<string, number>;
}

export interface Drawing {
  id: string;
  type: "trendline" | "horizontal" | "channel" | "rectangle";
  points: { klineIndex: number; price: number }[];
}
```

- [ ] **Step 7: 創建 App.tsx 路由骨架**

```tsx
// client/src/App.tsx
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import TrainingPage from "./pages/TrainingPage";
import ReviewPage from "./pages/ReviewPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/training" element={<TrainingPage />} />
        <Route path="/training/:id" element={<TrainingPage />} />
        <Route path="/review/:id" element={<ReviewPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 8: 創建頁面佔位組件**

每個頁面先創建最小佔位：

```tsx
// client/src/pages/LoginPage.tsx
export default function LoginPage() {
  return <div>LoginPage</div>;
}
```

同樣方式創建 DashboardPage、TrainingPage、ReviewPage。

- [ ] **Step 9: 更新 main.tsx**

```tsx
// client/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 10: 啟動驗證**

Run: `cd client && npm run dev`
Expected: 瀏覽器打開 http://localhost:5173 顯示佔位頁面

- [ ] **Step 11: Commit**

```bash
git add client/
git commit -m "feat: initialize React frontend with Vite, routing, and design tokens"
```

---

## Task 8: 前端 API 層 + 認證 Store

**Files:**
- Create: `client/src/services/api.ts`
- Create: `client/src/store/authStore.ts`

- [ ] **Step 1: 創建 Axios API 層**

```typescript
// client/src/services/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 30000,
});

// 請求攔截器：注入 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 響應攔截器：401 時嘗試 refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        try {
          const resp = await axios.post("/api/auth/login", { refresh_token: refreshToken });
          localStorage.setItem("access_token", resp.data.access_token);
          error.config.headers.Authorization = `Bearer ${resp.data.access_token}`;
          return api(error.config);
        } catch {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  register: (username: string, password: string) =>
    api.post("/auth/register", { username, password }),
  login: (username: string, password: string) =>
    api.post("/auth/login", { username, password }),
  getMe: () => api.get("/auth/me"),
};

// Stocks
export const stockApi = {
  search: (q: string) => api.get(`/stocks/search?q=${q}`),
  random: () => api.get("/stocks/random"),
  getKline: (code: string, period: string, start: string, end: string) =>
    api.get(`/stocks/${code}/kline?period=${period}&start=${start}&end=${end}`),
};

// Trainings
export const trainingApi = {
  create: (data: object) => api.post("/trainings", data),
  list: (page = 1, size = 20) => api.get(`/trainings?page=${page}&size=${size}`),
  get: (id: string) => api.get(`/trainings/${id}`),
  update: (id: string, data: object) => api.put(`/trainings/${id}`, data),
  delete: (id: string) => api.delete(`/trainings/${id}`),
  complete: (id: string) => api.post(`/trainings/${id}/complete`),
  addTrade: (id: string, data: object) => api.post(`/trainings/${id}/trades`, data),
  getTrades: (id: string) => api.get(`/trainings/${id}/trades`),
  addSnapshot: (id: string, data: object) => api.post(`/trainings/${id}/snapshots`, data),
};

export default api;
```

- [ ] **Step 2: 創建 authStore**

```typescript
// client/src/store/authStore.ts
import { create } from "zustand";
import { authApi } from "../services/api";

interface AuthState {
  user: { id: string; username: string } | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem("access_token"),

  login: async (username, password) => {
    const resp = await authApi.login(username, password);
    localStorage.setItem("access_token", resp.data.access_token);
    localStorage.setItem("refresh_token", resp.data.refresh_token);
    const me = await authApi.getMe();
    set({ user: me.data, isAuthenticated: true });
  },

  register: async (username, password) => {
    const resp = await authApi.register(username, password);
    localStorage.setItem("access_token", resp.data.access_token);
    localStorage.setItem("refresh_token", resp.data.refresh_token);
    const me = await authApi.getMe();
    set({ user: me.data, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    try {
      const me = await authApi.getMe();
      set({ user: me.data, isAuthenticated: true });
    } catch {
      set({ user: null, isAuthenticated: false });
    }
  },
}));
```

- [ ] **Step 3: Commit**

```bash
git add client/
git commit -m "feat: add API service layer and auth store"
```

---

## Task 9: 登錄/註冊頁面

**Files:**
- Create: `client/src/components/auth/LoginForm.tsx`
- Create: `client/src/components/auth/RegisterForm.tsx`
- Modify: `client/src/pages/LoginPage.tsx`

- [ ] **Step 1: 創建 LoginForm 組件**

包含用戶名/密碼輸入框、登錄按鈕、切換到註冊的連結。使用設計 token 的深色主題樣式。

- [ ] **Step 2: 創建 RegisterForm 組件**

同上，但為註冊邏輯。

- [ ] **Step 3: 組裝 LoginPage**

登錄/註冊表單切換，居中佈局。

- [ ] **Step 4: 驗證登錄流程**

啟動前後端，測試註冊→登錄→跳轉 Dashboard。

- [ ] **Step 5: Commit**

```bash
git add client/
git commit -m "feat: add login and register pages"
```

---

## Task 10: Training Store + 買賣邏輯 Hook

**Files:**
- Create: `client/src/store/trainingStore.ts`
- Create: `client/src/store/chartStore.ts`
- Create: `client/src/hooks/useTrade.ts`
- Create: `client/src/hooks/useTraining.ts`

- [ ] **Step 1: 創建 trainingStore**

管理：allKlineData、visibleData、currentIndex、position、costPrice、trades、playMode、playSpeed、currentTraining。核心方法：setData、stepForward、buy、sell、save。

```typescript
// client/src/store/trainingStore.ts
import { create } from "zustand";
import type { KlineBar, TradeRecord, TrainingRecord, Period } from "../types";

interface TrainingState {
  // 數據
  allKlineData: KlineBar[];
  currentIndex: number;
  position: number;        // 0~1
  costPrice: number;
  trades: TradeRecord[];
  currentTraining: TrainingRecord | null;

  // 控制
  playMode: "manual" | "replay";
  playSpeed: number;       // 0.5, 1, 2, 5, 10
  dataLength: number;      // 默認 200
  isTraining: boolean;

  // 計算屬性
  visibleData: () => KlineBar[];

  // 方法
  setKlineData: (data: KlineBar[]) => void;
  stepForward: () => void;
  buy: (percentage: number) => void;
  sell: (percentage: number) => void;
  setPlayMode: (mode: "manual" | "replay") => void;
  setPlaySpeed: (speed: number) => void;
  setCurrentTraining: (training: TrainingRecord) => void;
  reset: () => void;
}

export const useTrainingStore = create<TrainingState>((set, get) => ({
  allKlineData: [],
  currentIndex: 0,
  position: 0,
  costPrice: 0,
  trades: [],
  currentTraining: null,
  playMode: "manual",
  playSpeed: 1,
  dataLength: 200,
  isTraining: false,

  visibleData: () => {
    const { allKlineData, currentIndex } = get();
    return allKlineData.slice(0, currentIndex + 1);
  },

  setKlineData: (data) => set({ allKlineData: data, currentIndex: 30, isTraining: true }),

  stepForward: () => {
    const { currentIndex, allKlineData } = get();
    if (currentIndex < allKlineData.length - 1) {
      set({ currentIndex: currentIndex + 1 });
    }
  },

  buy: (percentage) => {
    const { position, costPrice, currentIndex, allKlineData } = get();
    const price = allKlineData[currentIndex].close;
    const pct = percentage / 100;
    const newPosition = position + (1 - position) * pct;
    const newCostPrice = position === 0
      ? price
      : (costPrice * position + price * (newPosition - position)) / newPosition;
    set({ position: newPosition, costPrice: newCostPrice });
  },

  sell: (percentage) => {
    const { position, costPrice, currentIndex, allKlineData } = get();
    const price = allKlineData[currentIndex].close;
    const pct = percentage / 100;
    const newPosition = position * (1 - pct);
    set({ position: newPosition, costPrice: newPosition === 0 ? 0 : costPrice });
  },

  setPlayMode: (mode) => set({ playMode: mode }),
  setPlaySpeed: (speed) => set({ playSpeed: speed }),
  setCurrentTraining: (training) => set({ currentTraining: training }),
  reset: () => set({
    allKlineData: [], currentIndex: 0, position: 0, costPrice: 0,
    trades: [], currentTraining: null, isTraining: false, playMode: "manual", playSpeed: 1,
  }),
}));
```

- [ ] **Step 2: 創建 chartStore**

管理：indicators（已啟用列表）、subChartCount、drawingTool、drawings。

```typescript
// client/src/store/chartStore.ts
import { create } from "zustand";
import type { IndicatorConfig, Drawing } from "../types";

interface ChartState {
  indicators: IndicatorConfig[];
  subChartCount: number;
  activeDrawingTool: string | null;
  drawings: Drawing[];

  addIndicator: (indicator: IndicatorConfig) => void;
  removeIndicator: (name: string) => void;
  setSubChartCount: (count: number) => void;
  setActiveDrawingTool: (tool: string | null) => void;
  addDrawing: (drawing: Drawing) => void;
  removeDrawing: (id: string) => void;
  clearDrawings: () => void;
}

export const useChartStore = create<ChartState>((set) => ({
  indicators: [
    { name: "MA", type: "overlay", params: { period1: 5, period2: 10, period3: 20 } },
  ],
  subChartCount: 1,
  activeDrawingTool: null,
  drawings: [],

  addIndicator: (indicator) => set((s) => ({ indicators: [...s.indicators, indicator] })),
  removeIndicator: (name) => set((s) => ({ indicators: s.indicators.filter((i) => i.name !== name) })),
  setSubChartCount: (count) => set({ subChartCount: Math.max(0, Math.min(4, count)) }),
  setActiveDrawingTool: (tool) => set({ activeDrawingTool: tool }),
  addDrawing: (drawing) => set((s) => ({ drawings: [...s.drawings, drawing] })),
  removeDrawing: (id) => set((s) => ({ drawings: s.drawings.filter((d) => d.id !== id) })),
  clearDrawings: () => set({ drawings: [] }),
}));
```

- [ ] **Step 3: 創建 useTrade hook**

封裝買賣操作 + 自動保存交易記錄到後端。

```typescript
// client/src/hooks/useTrade.ts
import { useTrainingStore } from "../store/trainingStore";
import { trainingApi } from "../services/api";

export function useTrade() {
  const { position, costPrice, currentIndex, allKlineData, currentTraining } = useTrainingStore();

  const executeBuy = async (percentage: number) => {
    useTrainingStore.getState().buy(percentage);
    const state = useTrainingStore.getState();
    if (currentTraining) {
      await trainingApi.addTrade(currentTraining.id, {
        action: "buy",
        price: allKlineData[currentIndex].close,
        percentage,
        position_after: state.position,
        kline_time: allKlineData[currentIndex].time,
        kline_index: currentIndex,
      });
    }
  };

  const executeSell = async (percentage: number) => {
    useTrainingStore.getState().sell(percentage);
    const state = useTrainingStore.getState();
    if (currentTraining) {
      await trainingApi.addTrade(currentTraining.id, {
        action: "sell",
        price: allKlineData[currentIndex].close,
        percentage,
        position_after: state.position,
        kline_time: allKlineData[currentIndex].time,
        kline_index: currentIndex,
      });
    }
  };

  return { executeBuy, executeSell, position, costPrice };
}
```

- [ ] **Step 4: 創建 useTraining hook**

封裝訓練流程控制：開始訓練、前進、回放、保存、結束。

```typescript
// client/src/hooks/useTraining.ts
import { useEffect, useRef, useCallback } from "react";
import { useTrainingStore } from "../store/trainingStore";
import { stockApi, trainingApi } from "../services/api";
import type { Period } from "../types";

export function useTraining() {
  const store = useTrainingStore();
  const replayTimer = useRef<number | null>(null);

  const startTraining = async (code: string, period: Period, start: string, end: string) => {
    const resp = await stockApi.getKline(code, period, start, end);
    store.setKlineData(resp.data.data);
    const trainingResp = await trainingApi.create({
      stock_code: code,
      stock_name: "", // 將從 kline 響應補充
      period,
      start_date: start,
      end_date: end,
    });
    store.setCurrentTraining(trainingResp.data);
  };

  const stepForward = useCallback(() => {
    store.stepForward();
  }, [store]);

  const startReplay = useCallback(() => {
    store.setPlayMode("replay");
    const tick = () => {
      const { currentIndex, allKlineData, playSpeed } = useTrainingStore.getState();
      if (currentIndex < allKlineData.length - 1) {
        useTrainingStore.getState().stepForward();
        replayTimer.current = window.setTimeout(tick, 1000 / playSpeed);
      } else {
        stopReplay();
      }
    };
    tick();
  }, [store]);

  const stopReplay = useCallback(() => {
    if (replayTimer.current) {
      clearTimeout(replayTimer.current);
      replayTimer.current = null;
    }
    store.setPlayMode("manual");
  }, [store]);

  // 自動保存：每 5 根 K 線保存 current_index
  useEffect(() => {
    if (store.currentTraining && store.currentIndex % 5 === 0) {
      trainingApi.update(store.currentTraining.id, { current_index: store.currentIndex });
    }
  }, [store.currentIndex, store.currentTraining]);

  // 清理
  useEffect(() => {
    return () => {
      if (replayTimer.current) clearTimeout(replayTimer.current);
    };
  }, []);

  return { ...store, startTraining, stepForward, startReplay, stopReplay };
}
```

- [ ] **Step 5: Commit**

```bash
git add client/
git commit -m "feat: add training/chart stores and trade/training hooks"
```

---

## Task 11: 技術指標計算模塊

**Files:**
- Create: `client/src/indicators/ma.ts`
- Create: `client/src/indicators/ema.ts`
- Create: `client/src/indicators/boll.ts`
- Create: `client/src/indicators/macd.ts`
- Create: `client/src/indicators/rsi.ts`
- Create: `client/src/indicators/kdj.ts`
- Create: `client/src/indicators/index.ts`

- [ ] **Step 1: 創建 MA 指標**

```typescript
// client/src/indicators/ma.ts
import type { KlineBar } from "../types";

export function calculateMA(data: KlineBar[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((s, bar) => s + bar.close, 0);
      result.push(sum / period);
    }
  }
  return result;
}
```

- [ ] **Step 2: 創建 EMA 指標**

```typescript
// client/src/indicators/ema.ts
import type { KlineBar } from "../types";

export function calculateEMA(data: KlineBar[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const k = 2 / (period + 1);

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      const sum = data.slice(0, period).reduce((s, bar) => s + bar.close, 0);
      result.push(sum / period);
    } else {
      const prev = result[i - 1]!;
      result.push(data[i].close * k + prev * (1 - k));
    }
  }
  return result;
}
```

- [ ] **Step 3: 創建布林帶指標**

```typescript
// client/src/indicators/boll.ts
import type { KlineBar } from "../types";

export function calculateBOLL(data: KlineBar[], period: number, multiplier: number) {
  const middle: (number | null)[] = [];
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      middle.push(null);
      upper.push(null);
      lower.push(null);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      const avg = slice.reduce((s, bar) => s + bar.close, 0) / period;
      const std = Math.sqrt(slice.reduce((s, bar) => s + (bar.close - avg) ** 2, 0) / period);
      middle.push(avg);
      upper.push(avg + multiplier * std);
      lower.push(avg - multiplier * std);
    }
  }
  return { middle, upper, lower };
}
```

- [ ] **Step 4: 創建 MACD 指標**

```typescript
// client/src/indicators/macd.ts
import type { KlineBar } from "../types";
import { calculateEMA } from "./ema";

export function calculateMACD(data: KlineBar[], fast = 12, slow = 26, signal = 9) {
  const emaFast = calculateEMA(data, fast);
  const emaSlow = calculateEMA(data, slow);

  const dif: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (emaFast[i] === null || emaSlow[i] === null) {
      dif.push(null);
    } else {
      dif.push(emaFast[i]! - emaSlow[i]!);
    }
  }

  // DEA: DIF 的 EMA
  const dea: (number | null)[] = [];
  const k = 2 / (signal + 1);
  for (let i = 0; i < data.length; i++) {
    if (dif[i] === null) {
      dea.push(null);
    } else if (dea.filter((v) => v !== null).length === 0) {
      dea.push(dif[i]);
    } else {
      const prevDea = dea[i - 1] ?? 0;
      dea.push(dif[i]! * k + prevDea * (1 - k));
    }
  }

  const macd: (number | null)[] = dif.map((d, i) =>
    d !== null && dea[i] !== null ? 2 * (d - dea[i]!) : null
  );

  return { dif, dea, macd };
}
```

- [ ] **Step 5: 創建 RSI 指標**

```typescript
// client/src/indicators/rsi.ts
import type { KlineBar } from "../types";

export function calculateRSI(data: KlineBar[], period = 14): (number | null)[] {
  const result: (number | null)[] = [];
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(null);
      continue;
    }
    const change = data[i].close - data[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    if (i <= period) {
      avgGain += gain;
      avgLoss += loss;
      if (i === period) {
        avgGain /= period;
        avgLoss /= period;
        const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
        result.push(rsi);
      } else {
        result.push(null);
      }
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
      result.push(rsi);
    }
  }
  return result;
}
```

- [ ] **Step 6: 創建 KDJ 指標**

```typescript
// client/src/indicators/kdj.ts
import type { KlineBar } from "../types";

export function calculateKDJ(data: KlineBar[], n = 9, m1 = 3, m2 = 3) {
  const kValues: (number | null)[] = [];
  const dValues: (number | null)[] = [];
  const jValues: (number | null)[] = [];
  let prevK = 50;
  let prevD = 50;

  for (let i = 0; i < data.length; i++) {
    if (i < n - 1) {
      kValues.push(null);
      dValues.push(null);
      jValues.push(null);
    } else {
      const slice = data.slice(i - n + 1, i + 1);
      const highN = Math.max(...slice.map((b) => b.high));
      const lowN = Math.min(...slice.map((b) => b.low));
      const rsv = highN === lowN ? 50 : ((data[i].close - lowN) / (highN - lowN)) * 100;
      const k = (2 / m1) * prevK + (1 / m1) * rsv;
      const d = (2 / m2) * prevD + (1 / m2) * k;
      const j = 3 * k - 2 * d;
      kValues.push(k);
      dValues.push(d);
      jValues.push(j);
      prevK = k;
      prevD = d;
    }
  }
  return { k: kValues, d: dValues, j: jValues };
}
```

- [ ] **Step 7: 創建指標註冊表**

```typescript
// client/src/indicators/index.ts
import type { IndicatorConfig } from "../types";
import { calculateMA } from "./ma";
import { calculateEMA } from "./ema";
import { calculateBOLL } from "./boll";
import { calculateMACD } from "./macd";
import { calculateRSI } from "./rsi";
import { calculateKDJ } from "./kdj";

export const INDICATOR_REGISTRY: Record<string, {
  config: IndicatorConfig;
  calculate: (data: any[], params: Record<string, number>) => any;
}> = {
  MA: {
    config: { name: "MA", type: "overlay", params: { period1: 5, period2: 10, period3: 20 } },
    calculate: (data, params) => ({
      ma1: calculateMA(data, params.period1),
      ma2: calculateMA(data, params.period2),
      ma3: calculateMA(data, params.period3),
    }),
  },
  EMA: {
    config: { name: "EMA", type: "overlay", params: { period1: 5, period2: 20 } },
    calculate: (data, params) => ({
      ema1: calculateEMA(data, params.period1),
      ema2: calculateEMA(data, params.period2),
    }),
  },
  BOLL: {
    config: { name: "BOLL", type: "overlay", params: { period: 20, multiplier: 2 } },
    calculate: (data, params) => calculateBOLL(data, params.period, params.multiplier),
  },
  MACD: {
    config: { name: "MACD", type: "subchart", params: { fast: 12, slow: 26, signal: 9 } },
    calculate: (data, params) => calculateMACD(data, params.fast, params.slow, params.signal),
  },
  RSI: {
    config: { name: "RSI", type: "subchart", params: { period: 14 } },
    calculate: (data, params) => ({ rsi: calculateRSI(data, params.period) }),
  },
  KDJ: {
    config: { name: "KDJ", type: "subchart", params: { n: 9, m1: 3, m2: 3 } },
    calculate: (data, params) => calculateKDJ(data, params.n, params.m1, params.m2),
  },
};
```

- [ ] **Step 8: Commit**

```bash
git add client/
git commit -m "feat: add technical indicator calculation modules (MA/EMA/BOLL/MACD/RSI/KDJ)"
```

---

## Task 12: K 線圖組件（核心）

**Files:**
- Create: `client/src/components/chart/KlineChart.tsx`
- Create: `client/src/components/chart/ChartToolbar.tsx`
- Create: `client/src/hooks/useChart.ts`

- [ ] **Step 1: 創建 useChart hook**

封裝 KLineChart 實例管理、數據更新、指標疊加邏輯。

- [ ] **Step 2: 創建 KlineChart 主組件**

使用 KLineChart 渲染 K 線，接收 visibleData（截斷後的數據），配置 A 股紅漲綠跌主題，疊加主圖指標，添加副圖區域。

- [ ] **Step 3: 創建 ChartToolbar 組件**

包含：週期切換、指標添加/移除、畫線工具入口。

- [ ] **Step 4: 驗證 K 線渲染**

啟動前後端，加載真實 A 股數據，確認 K 線正確渲染（紅漲綠跌）。

- [ ] **Step 5: Commit**

```bash
git add client/
git commit -m "feat: add KlineChart component with A-share theme and indicator overlay"
```

---

## Task 13: 訓練操作面板

**Files:**
- Create: `client/src/components/training/TradePanel.tsx`
- Create: `client/src/components/training/PositionBar.tsx`
- Create: `client/src/components/training/TrainingPanel.tsx`
- Create: `client/src/components/common/Slider.tsx`
- Create: `client/src/components/common/Button.tsx`

- [ ] **Step 1: 創建 Button 通用組件**

四態（default/hover/active/disabled），Bull/Bear/Accent 三種色系。

- [ ] **Step 2: 創建 Slider 百分比滑桿組件**

即時數值顯示，Accent 色。

- [ ] **Step 3: 創建 TradePanel 組件**

買入按鈕 + 百分比滑桿、賣出按鈕 + 百分比滑桿。

- [ ] **Step 4: 創建 PositionBar 組件**

水平條形圖顯示倉位，百分比數字疊加。

- [ ] **Step 5: 創建 TrainingPanel 組件**

組合：前進按鈕、回放控制（播放/暫停/速度）、鍵盤快捷鍵綁定。

- [ ] **Step 6: 驗證交易操作**

在訓練頁面中測試買入/賣出/前進/回放。

- [ ] **Step 7: Commit**

```bash
git add client/
git commit -m "feat: add training control panel with trade/position/replay controls"
```

---

## Task 14: 訓練主頁面組裝

**Files:**
- Modify: `client/src/pages/TrainingPage.tsx`
- Create: `client/src/components/stock/StockSelector.tsx`
- Create: `client/src/components/stock/RandomStock.tsx`

- [ ] **Step 1: 創建 StockSelector 組件**

搜索框 + 結果列表，調用 stockApi.search。

- [ ] **Step 2: 創建 RandomStock 組件**

按鈕，調用 stockApi.random。

- [ ] **Step 3: 組裝 TrainingPage**

三階段：選股 → 開始訓練 → 訓練中。訓練中階段組裝頂部欄、左側面板、K 線圖、底部操作欄。

- [ ] **Step 4: 驗證完整訓練流程**

選股 → 加載數據 → 看到前 30 根 K 線 → 買入 → 前進 → 賣出 → 走完結束。

- [ ] **Step 5: Commit**

```bash
git add client/
git commit -m "feat: assemble training page with stock selection and full training flow"
```

---

## Task 15: 訓練結果報告

**Files:**
- Create: `client/src/components/training/TrainingResult.tsx`
- Create: `client/src/components/common/Modal.tsx`

- [ ] **Step 1: 創建 Modal 通用組件**

半透明覆蓋層 + 居中內容區。

- [ ] **Step 2: 創建 TrainingResult 組件**

展示：總收益率（大字）、勝率、盈虧比、最大回撤、夏普比率、基準對比。操作按鈕：查看覆盤 / 再來一次 / 返回總覽。

- [ ] **Step 3: 整合到訓練流程**

訓練結束時自動彈出結果報告。

- [ ] **Step 4: Commit**

```bash
git add client/
git commit -m "feat: add training result report modal"
```

---

## Task 16: Dashboard 頁面（歷史記錄 + 統計）

**Files:**
- Modify: `client/src/pages/DashboardPage.tsx`
- Create: `client/src/components/common/Skeleton.tsx`

- [ ] **Step 1: 創建 Skeleton 組件**

骨架屏加載態。

- [ ] **Step 2: 組裝 DashboardPage**

頂部統計卡片（總訓練次數、勝率、平均收益率），下方歷史訓練列表（股票、週期、收益率、狀態、時間），支持分頁。每條記錄可點擊進入覆盤。

- [ ] **Step 3: 驗證**

註冊 → 完成一次訓練 → 返回 Dashboard 看到記錄。

- [ ] **Step 4: Commit**

```bash
git add client/
git commit -m "feat: add dashboard page with training history and stats"
```

---

## Task 17: 覆盤頁面

**Files:**
- Modify: `client/src/pages/ReviewPage.tsx`
- Create: `client/src/components/chart/DrawingTool.tsx`
- Create: `client/src/components/chart/SubChartSelector.tsx`

- [ ] **Step 1: 創建 SubChartSelector 組件**

指標列表，勾選添加/移除，參數調整，主圖/副圖分類。

- [ ] **Step 2: 創建 DrawingTool 組件**

畫線工具選擇：趨勢線、水平線、平行通道、矩形。點擊圖表添加繪圖。

- [ ] **Step 3: 組裝 ReviewPage**

載入歷史訓練數據，完整渲染所有 K 線，標註交易點（買入▲/賣出▼），回放倉位變化，顯示績效報告 + 筆記。

- [ ] **Step 4: 驗證覆盤流程**

從 Dashboard 點擊歷史記錄 → 進入覆盤 → 看到交易標記 → 回放。

- [ ] **Step 5: Commit**

```bash
git add client/
git commit -m "feat: add review page with trade annotations and position replay"
```

---

## Task 18: 斷點續訓 + 訓練筆記

**Files:**
- Modify: `client/src/hooks/useTraining.ts`
- Modify: `client/src/pages/DashboardPage.tsx`

- [ ] **Step 1: 實現續訓邏輯**

從 Dashboard 點擊「繼續」按鈕，載入 in_progress 的訓練，重新拉取 K 線數據，從 current_index 恢復。

- [ ] **Step 2: 實現訓練筆記**

在訓練中和覆盤頁面添加筆記輸入框，保存到 training.note。

- [ ] **Step 3: 驗證**

中斷訓練 → 退出 → 回來繼續 → 從斷點恢復。

- [ ] **Step 4: Commit**

```bash
git add client/
git commit -m "feat: add resume training and training notes"
```

---

## Task 19: 鍵盤快捷鍵 + 畫線工具完善

**Files:**
- Modify: `client/src/pages/TrainingPage.tsx`
- Modify: `client/src/components/chart/DrawingTool.tsx`

- [ ] **Step 1: 綁定鍵盤快捷鍵**

→/Enter 前進、Space 暫停/繼續、B 買入、S 賣出、+/- 調整百分比、1-4 副圖數量、D 畫線工具。

- [ ] **Step 2: 完善畫線工具交互**

趨勢線：兩次點擊確定起終點。水平線：一次點擊確定價格。坐標綁定 K 線索引 + 價格。

- [ ] **Step 3: 驗證**

使用鍵盤快捷鍵完成一次完整訓練。畫線工具繪製趨勢線。

- [ ] **Step 4: Commit**

```bash
git add client/
git commit -m "feat: add keyboard shortcuts and drawing tool interactions"
```

---

## Task 20: 端到端測試 + 修復 + 打包

**Files:**
- Modify: 各文件修復問題

- [ ] **Step 1: 端到端流程測試**

1. 註冊新用戶
2. 搜索股票 → 選擇平安銀行日線
3. 開始訓練 → 看到前 30 根 K 線
4. 買入 50% → 前進 10 根 → 賣出 30% → 繼續前進
5. 中途退出 → 回來續訓
6. 走完所有 K 線 → 看到結果報告
7. 返回 Dashboard → 點擊覆盤 → 看到交易標記
8. 添加訓練筆記

- [ ] **Step 2: 修復發現的問題**

- [ ] **Step 3: 添加 .gitignore**

```
node_modules/
dist/
__pycache__/
*.pyc
*.db
.env
.superpowers/
```

- [ ] **Step 4: 配置 Git remote 並推送**

```bash
git remote add origin https://github.com/chvclife/kline-trainer.git
git push -u origin main
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: end-to-end testing, fixes, and initial release"
```

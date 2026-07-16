# K 線訓練器 — 設計文檔

## 概述

參考 TradingView 的訓練功能，構建一個支持 A 股 1 分鐘到月線全週期的 K 線買賣訓練應用。用戶在隱藏未來數據的條件下進行買賣決策訓練，系統完整記錄每次訓練用於覆盤分析。

## 目標市場

A 股（上海/深圳交易所），紅漲綠跌。

## 應用形式

Web 為主，後期用 Electron 打包為桌面應用。一套代碼，兩種分發。

## 架構方案：前後端分離

```
React 前端 (Vite + TypeScript)
        │ REST API (JWT)
FastAPI 後端 (Python)
        │
SQLite(開發) / MySQL(生產)
```

前端負責渲染、交互、技術指標計算；後端負責數據獲取、用戶認證、訓練記錄持久化。

---

## 項目結構

```
kline-trainer/
├── client/                    # React 前端
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── chart/         # K 線圖相關
│   │   │   │   ├── KlineChart.tsx
│   │   │   │   ├── ChartToolbar.tsx
│   │   │   │   ├── DrawingTool.tsx
│   │   │   │   └── SubChartSelector.tsx
│   │   │   ├── training/      # 訓練相關
│   │   │   │   ├── TrainingPanel.tsx
│   │   │   │   ├── TradePanel.tsx
│   │   │   │   ├── PositionBar.tsx
│   │   │   │   └── TrainingResult.tsx
│   │   │   ├── stock/
│   │   │   │   ├── StockSelector.tsx
│   │   │   │   └── RandomStock.tsx
│   │   │   ├── auth/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   └── RegisterForm.tsx
│   │   │   └── common/
│   │   ├── indicators/        # 技術指標計算（純 JS）
│   │   │   ├── ma.ts
│   │   │   ├── ema.ts
│   │   │   ├── boll.ts
│   │   │   ├── macd.ts
│   │   │   ├── rsi.ts
│   │   │   ├── kdj.ts
│   │   │   └── index.ts       # 指標註冊表
│   │   ├── hooks/
│   │   │   ├── useTraining.ts
│   │   │   ├── useTrade.ts
│   │   │   └── useChart.ts
│   │   ├── store/             # Zustand
│   │   │   ├── authStore.ts
│   │   │   ├── trainingStore.ts
│   │   │   └── chartStore.ts
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── TrainingPage.tsx
│   │   │   └── ReviewPage.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── server/                    # FastAPI 後端
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── training.py
│   │   │   └── trade.py
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── stock.py
│   │   │   ├── training.py
│   │   │   └── trade.py
│   │   ├── services/
│   │   │   ├── auth_service.py
│   │   │   ├── stock_service.py
│   │   │   └── training_service.py
│   │   └── data/              # 數據獲取層
│   │       ├── base.py        # 抽象接口
│   │       ├── efinance_source.py
│   │       ├── akshare_source.py
│   │       └── baostock_source.py
│   ├── requirements.txt
│   └── alembic/
│
├── electron/                  # Electron 殼（後期）
├── docs/
└── docker-compose.yml
```

---

## 數據模型

### users

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| username | String(50) | 唯一 |
| password_hash | String | bcrypt 加密 |
| created_at | DateTime | 註冊時間 |

### trainings

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| user_id | UUID | 外鍵 → users |
| stock_code | String(10) | 如 "000001" |
| stock_name | String(50) | 如 "平安銀行" |
| period | String(10) | "1m"/"5m"/"1d" 等 |
| start_date | DateTime | 訓練數據起始日 |
| end_date | DateTime | 訓練數據結束日 |
| current_index | Integer | 當前揭示位置（斷點續訓） |
| status | Enum | in_progress / completed |
| total_return | Float | 總收益率 |
| benchmark_return | Float | 同期基準收益率（滬深300） |
| win_rate | Float | 勝率 |
| profit_loss_ratio | Float | 盈虧比 |
| max_drawdown | Float | 最大回撤 |
| sharpe_ratio | Float | 夏普比率 |
| note | Text | 訓練筆記 |
| created_at | DateTime | 創建時間 |
| updated_at | DateTime | 更新時間 |

### trades

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| training_id | UUID | 外鍵 → trainings |
| action | Enum | buy / sell |
| price | Float | 成交價格 |
| percentage | Float | 倉位百分比 |
| position_after | Float | 操作後倉位 |
| kline_time | DateTime | 對應 K 線時間 |
| kline_index | Integer | 對應 K 線索引 |
| created_at | DateTime | 操作時間 |

### position_snapshots

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| training_id | UUID | 外鍵 → trainings |
| kline_index | Integer | K 線索引 |
| position | Float | 當前倉位比例 |
| cost_price | Float | 持倉成本價 |
| market_value | Float | 當前市值 |
| unrealized_pnl | Float | 未實現盈虧 |
| realized_pnl | Float | 已實現盈虧 |

---

## 核心業務流程

### 訓練啟動

1. 用戶選擇股票+週期（或隨機，從滬深兩市活躍股票中選取）
2. 前端請求後端獲取 K 線數據
3. 後端按 EFinance → AkShare → BaoStock 優先級獲取
4. 返回完整 K 線數據給前端
5. 前端只渲染前 N 根 K 線（隱藏未來），默認數據段長度 200 根 K 線，用戶可自定義
6. 創建訓練記錄（status=in_progress）

### 訓練進行

```
顯示當前 K 線 + 指標 + 倉位狀態
        │
   ┌────┴────┐
   │         │
 買入/賣出  前進 K 線
 (調整倉位) (手動/回放)
   │         │
   ▼         ▼
 記錄交易  揭示下一根 K 線
 更新倉位  更新指標計算
 記錄快照  記錄快照
   │         │
   └────┬────┘
        ▼
  還有未揭示的 K 線？
   │是          │否
   └──繼續     訓練結束
                   │
                   ▼
            計算績效指標
            更新訓練記錄
            顯示結果報告
```

### 買賣邏輯

- 資金概念：100% 全倉，不涉及具體金額
- 買入(percentage)：新倉位 = 當前倉位 + (1 - 當前倉位) × percentage
- 賣出(percentage)：新倉位 = 當前倉位 × (1 - percentage)
- 倉位上限 100%，不可超過
- 有默認百分比，用戶可調整
- 成本價 = 加權平均

### 數據截斷（防止看到未來）

- useTraining hook 維護 allKlineData（完整）和 visibleData（截斷後）
- visibleData = allKlineData.slice(0, currentIndex + 1)
- KlineChart 只接收 visibleData
- 指標計算也只基於 visibleData
- 用戶可縮放查看歷史，但右側邊界嚴格截止到 currentIndex
- 圖表右側留白，不顯示任何未來數據

### 斷點續訓

- 退出訓練時保存 current_index + 倉位狀態
- 回來時重新拉取同股票同時間段 K 線數據
- 從 current_index 恢復渲染，繼續訓練

### 訓練結束

- 走完整個數據段自動結束
- 計算：總收益率、勝率、盈虧比、最大回撤、夏普比率、基準對比
- 顯示結果報告

### 覆盤

- 載入歷史訓練的 K 線 + 交易記錄 + 倉位快照
- 完整渲染所有 K 線
- 圖上標註每筆交易（買入▲ / 賣出▼）
- 回放模式逐步展示倉位變化
- 查看績效報告 + 筆記

---

## 前端設計

### 場景定義

A 股交易者，深夜或收盤後，27 吋顯示器，長時間盯盤式專注訓練。需要高信息密度、低眼睛疲勞。

### 主題：深色

### 色彩策略：Restrained + 數據語義色

```
Surface-0 (背景):     oklch(0.14 0.008 260)
Surface-1 (面板):     oklch(0.18 0.008 260)
Surface-2 (卡片):     oklch(0.22 0.010 260)
Surface-3 (懸浮):     oklch(0.28 0.010 260)

Text-Primary:         oklch(0.90 0.005 260)
Text-Secondary:       oklch(0.62 0.008 260)
Text-Muted:           oklch(0.45 0.008 260)

Accent:               oklch(0.72 0.15 200)  冷青藍
Accent-Hover:         oklch(0.78 0.18 200)

Bull (漲/紅):         oklch(0.65 0.20 145)
Bear (跌/綠):         oklch(0.60 0.22 25)
Bull-Text:            oklch(0.82 0.15 145)
Bear-Text:            oklch(0.78 0.18 25)

Success:              oklch(0.70 0.16 145)
Warning:              oklch(0.75 0.15 85)
Error:                oklch(0.62 0.22 25)
Info:                 oklch(0.72 0.12 240)
```

K 線配色遵循 A 股慣例：紅漲綠跌，平盤同前一根色。

### 字體

Inter，一個家族覆蓋全部角色。固定 rem 階梯，不流式。

```
數據大字:  1.5rem
頁面標題:  1.25rem
區塊標題:  1rem
正文:      0.875rem
標籤:      0.75rem
微標籤:    0.625rem
行高:      1.4
```

### 佈局

```
┌─────────────────────────────────────────────────────────────┐
│  頂部欄 48px                                                │
│  ◉ K線訓練器   股票名 代碼   週期   倉位:xx%   ⏸ ▶ ▶▶     │
├──────────┬──────────────────────────────────────────────────┤
│  左側面板 │              K 線主圖                            │
│  200px   │         （含疊加指標：MA/布林帶）                  │
│  (可摺疊) │                                                  │
│  指標列表 ├──────────────────────────────────────────────────┤
│          │              副圖1                                │
│          ├──────────────────────────────────────────────────┤
│          │              副圖2                                │
│          ├──────────────────────────────────────────────────┤
│          │  底部操作欄 56px                                   │
│          │  [買入] % [賣出] % │ 前進 ▶ │ 回放 ▶▶ │ 📐       │
└──────────┴──────────────────────────────────────────────────┘
```

- 左側面板可摺疊，訓練時全屏看圖
- 副圖數量用戶可控（0~4），可拖拽調整高度
- 底部操作欄固定

### 技術指標

- 主圖疊加型：MA / EMA / 布林帶
- 副圖獨立型：MACD / RSI / KDJ / VOL
- 用戶選擇添加 → 主圖直接疊加 / 副圖新增區域
- 每個指標可設參數
- 前端 JS 計算，基於 visibleData

### 畫線工具

- 趨勢線、水平線、平行通道、矩形區域
- 坐標綁定 K 線索引 + 價格
- 保存到訓練記錄，覆盤可還原

### 鍵盤快捷鍵

| 按鍵 | 功能 |
|------|------|
| → / Enter | 前進 1 根 |
| Space | 暫停/繼續回放 |
| B | 買入 |
| S | 賣出 |
| + / - | 調整百分比 |
| 1-4 | 副圖數量 |
| D | 畫線工具 |

### 動效

僅狀態變化處，150-250ms，ease-out-quart。無裝飾性動畫。

### 組件規範

- 所有按鈕：default / hover / active / disabled 四態
- 買入按鈕：Bull 色 + ▲；賣出按鈕：Bear 色 + ▼
- 滑桿：即時數值顯示
- 骨架屏加載態
- 空狀態引導操作

---

## 後端 API

### 認證

```
POST   /api/auth/register
POST   /api/auth/login          → JWT (access 30min + refresh 7d)
GET    /api/auth/me
```

### 股票數據

```
GET    /api/stocks/search?q=
GET    /api/stocks/random
GET    /api/stocks/{code}/kline?period=&start=&end=
```

K 線響應包含 source 字段標明實際數據源。

### 訓練

```
POST   /api/trainings
GET    /api/trainings           (分頁)
GET    /api/trainings/{id}      (含交易+快照)
PUT    /api/trainings/{id}      (部分更新)
DELETE /api/trainings/{id}
```

### 交易

```
POST   /api/trades
GET    /api/trades?training_id=
```

### 統計

```
GET    /api/stats/overview
GET    /api/stats/period?from=&to=
```

### 數據源切換

後端 DataSourceManager 按優先級嘗試 EFinance → AkShare → BaoStock，失敗自動切換，對前端透明。

### 進度保存策略

- 交易操作：立即保存
- K 線前進：每 5 根保存 current_index
- 退出訓練：強制保存完整狀態

---

## 技術選型

| 層面 | 選擇 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| 構建工具 | Vite |
| K 線圖庫 | KLineChart |
| 狀態管理 | Zustand |
| 路由 | React Router v6 |
| HTTP 客戶端 | Axios |
| CSS | CSS Modules + CSS Variables |
| 後端框架 | FastAPI |
| ORM | SQLAlchemy 2.0 + Alembic |
| 數據庫(開發) | SQLite |
| 數據庫(生產) | MySQL |
| 認證 | JWT (python-jose) |
| 密碼 | bcrypt |
| 數據源 | EFinance(主) / AkShare(備) / BaoStock(備) |
| 桌面殼 | Electron（後期） |

---

## 部署

- 開發：本地運行，SQLite
- 生產：雲平台，MySQL
- 前端靜態文件 + 後端 API 獨立部署

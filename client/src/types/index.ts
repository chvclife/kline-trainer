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

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface UserInfo {
  id: string;
  username: string;
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

import axios from "axios";
import type {
  AuthTokens,
  UserInfo,
  StockItem,
  KlineResponse,
  TrainingRecord,
  TradeRecord,
  PositionSnapshot,
} from "../types";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

const api = axios.create({
  baseURL: "/api",
  timeout: 30000,
});

// Request interceptor: inject access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: on 401, redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function setTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// Auth API
export const authApi = {
  async register(username: string, password: string): Promise<AuthTokens> {
    const res = await api.post<AuthTokens>("/auth/register", {
      username,
      password,
    });
    return res.data;
  },

  async login(username: string, password: string): Promise<AuthTokens> {
    const res = await api.post<AuthTokens>("/auth/login", {
      username,
      password,
    });
    return res.data;
  },

  async me(): Promise<UserInfo> {
    const res = await api.get<UserInfo>("/auth/me");
    return res.data;
  },
};

// Stock API
export const stockApi = {
  async search(q: string): Promise<StockItem[]> {
    const res = await api.get<{ results: StockItem[] }>("/stocks/search", { params: { q } });
    return res.data.results;
  },
    return res.data;
  },

  async random(): Promise<StockItem> {
    const res = await api.get<StockItem>("/stocks/random");
    return res.data;
  },

  async getKline(
    code: string,
    period: string,
    start?: string,
    end?: string,
  ): Promise<KlineResponse> {
    const res = await api.get<KlineResponse>(`/stocks/${code}/kline`, {
      params: { period, start, end },
    });
    return res.data;
  },
};

// Training API
export const trainingApi = {
  async list(page: number = 1, size: number = 20): Promise<{ items: TrainingRecord[]; total: number }> {
    const res = await api.get<{ items: TrainingRecord[]; total: number }>("/trainings", {
      params: { page, size },
    });
    return res.data;
  },

  async get(id: string): Promise<TrainingRecord> {
    const res = await api.get<TrainingRecord>(`/trainings/${id}`);
    return res.data;
  },

  async create(data: {
    stock_code: string;
    stock_name: string;
    period: string;
    start_date: string;
    end_date: string;
  }): Promise<TrainingRecord> {
    const res = await api.post<TrainingRecord>("/trainings", data);
    return res.data;
  },

  async update(
    id: string,
    data: Partial<TrainingRecord>,
  ): Promise<TrainingRecord> {
    const res = await api.put<TrainingRecord>(`/trainings/${id}`, data);
    return res.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/trainings/${id}`);
  },

  async addTrade(
    id: string,
    trade: {
      action: "buy" | "sell";
      price: number;
      percentage: number;
      position_after: number;
      kline_time: string;
      kline_index: number;
    },
  ): Promise<TradeRecord> {
    const res = await api.post<TradeRecord>(`/trainings/${id}/trades`, trade);
    return res.data;
  },

  async getTrades(id: string): Promise<TradeRecord[]> {
    const res = await api.get<{ trades: TradeRecord[] }>(`/trainings/${id}/trades`);
    return res.data.trades;
  },

  async addSnapshot(
    id: string,
    snapshot: {
      kline_index: number;
      position: number;
      cost_price: number;
      market_value: number;
      unrealized_pnl: number;
      realized_pnl: number;
    },
  ): Promise<PositionSnapshot> {
    const res = await api.post<PositionSnapshot>(
      `/trainings/${id}/snapshots`,
      snapshot,
    );
    return res.data;
  },

  async complete(id: string): Promise<{
    total_return: number | null;
    win_rate: number | null;
    max_drawdown: number | null;
    sharpe_ratio: number | null;
    profit_loss_ratio: number | null;
  }> {
    const res = await api.post<{
      total_return: number | null;
      win_rate: number | null;
      max_drawdown: number | null;
      sharpe_ratio: number | null;
      profit_loss_ratio: number | null;
    }>(`/trainings/${id}/complete`);
    return res.data;
  },
};

export { getAccessToken, getRefreshToken, setTokens, clearTokens };
export default api;
import { create } from "zustand";
import { authApi, setTokens, clearTokens } from "../services/api";
import type { UserInfo } from "../types";

interface AuthState {
  user: UserInfo | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitializing: true,

  login: async (username: string, password: string) => {
    const tokens = await authApi.login(username, password);
    setTokens(tokens.access_token, tokens.refresh_token);
    const user = await authApi.me();
    set({ user, isAuthenticated: true });
  },

  register: async (username: string, password: string) => {
    const tokens = await authApi.register(username, password);
    setTokens(tokens.access_token, tokens.refresh_token);
    const user = await authApi.me();
    set({ user, isAuthenticated: true });
  },

  logout: () => {
    clearTokens();
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    set({ isInitializing: true });
    try {
      const user = await authApi.me();
      set({ user, isAuthenticated: true, isInitializing: false });
    } catch {
      clearTokens();
      set({ user: null, isAuthenticated: false, isInitializing: false });
    }
  },
}));
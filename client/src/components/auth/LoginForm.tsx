import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

export default function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password.trim()) {
      setError("請輸入用戶名和密碼");
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate("/dashboard");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } };
      const msg = axiosErr.response?.data?.detail
        ?? (err instanceof Error ? err.message : "登入失敗，請檢查用戶名和密碼");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <h2 className="auth-form__title">登入</h2>

      {error && <div className="auth-form__error">{error}</div>}

      <label className="auth-form__label">
        用戶名
        <input
          className="auth-form__input"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          placeholder="請輸入用戶名"
        />
      </label>

      <label className="auth-form__label">
        密碼
        <input
          className="auth-form__input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="請輸入密碼"
        />
      </label>

      <button className="auth-form__button" type="submit" disabled={loading}>
        {loading ? "登入中..." : "登入"}
      </button>

      <p className="auth-form__switch">
        還沒有帳號？
        <button
          type="button"
          className="auth-form__link"
          onClick={onSwitchToRegister}
        >
          註冊
        </button>
      </p>
    </form>
  );
}
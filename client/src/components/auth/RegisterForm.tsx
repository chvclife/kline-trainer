import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export default function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError("請輸入用戶名和密碼");
      return;
    }
    if (password !== confirmPassword) {
      setError("兩次密碼輸入不一致");
      return;
    }
    if (password.length < 6) {
      setError("密碼長度至少 6 位");
      return;
    }

    setLoading(true);
    try {
      await register(username.trim(), password);
      navigate("/dashboard");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } };
      const msg = axiosErr.response?.data?.detail
        ?? (err instanceof Error ? err.message : "註冊失敗，請稍後再試");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <h2 className="auth-form__title">註冊</h2>

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
          autoComplete="new-password"
          placeholder="請輸入密碼（至少 6 位）"
        />
      </label>

      <label className="auth-form__label">
        確認密碼
        <input
          className="auth-form__input"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          placeholder="請再次輸入密碼"
        />
      </label>

      <button className="auth-form__button" type="submit" disabled={loading}>
        {loading ? "註冊中..." : "註冊"}
      </button>

      <p className="auth-form__switch">
        已有帳號？
        <button
          type="button"
          className="auth-form__link"
          onClick={onSwitchToLogin}
        >
          登入
        </button>
      </p>
    </form>
  );
}
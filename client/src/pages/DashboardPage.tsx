import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { trainingApi } from "../services/api";
import { useAuthStore } from "../store/authStore";
import Skeleton from "../components/common/Skeleton";
import Button from "../components/common/Button";
import type { TrainingRecord } from "../types";
import "./DashboardPage.css";

function fmtPct(v: number | null | undefined): string {
  if (v == null) return "--";
  const pct = v * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

const STATUS_LABELS: Record<string, string> = {
  in_progress: "進行中",
  completed: "已完成",
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchRecords();
  }, []);

  async function fetchRecords() {
    try {
      const data = await trainingApi.list(1, 50);
      setRecords(data.items);
    } catch {
      // Could show error toast
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("確定要刪除這條訓練記錄嗎？")) return;
    setDeleting(id);
    try {
      await trainingApi.remove(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch {
      alert("刪除失敗，請稍後再試");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="dashboard-layout">
      <div className="dashboard-header">
        <h1 className="dashboard-header__title">訓練列表</h1>
        <div style={{ display: "flex", gap: "8px" }}>
          <Button variant="accent" onClick={() => navigate("/training")}>
            新建訓練
          </Button>
          <Button variant="default" onClick={() => { logout(); navigate("/login"); }}>
            登出
          </Button>
        </div>
      </div>

      <div className="dashboard-content">
        {loading ? (
          <div className="dashboard-skeleton">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="dashboard-skeleton__row">
                <Skeleton height={20} variant="text" width="120px" />
                <Skeleton height={20} variant="text" width="80px" />
                <Skeleton height={20} variant="text" width="60px" />
                <Skeleton height={20} variant="text" width="100px" />
              </div>
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="dashboard-empty">
            <p className="dashboard-empty__text">尚無訓練記錄</p>
            <Button variant="accent" onClick={() => navigate("/training")}>
              開始第一次訓練
            </Button>
          </div>
        ) : (
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>股票</th>
                <th>週期</th>
                <th>收益</th>
                <th>狀態</th>
                <th>日期</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="dashboard-table__row">
                  <td className="dashboard-table__stock">
                    <span className="dashboard-table__code">{r.stock_code}</span>
                    <span className="dashboard-table__name">{r.stock_name}</span>
                  </td>
                  <td>{r.period}</td>
                  <td
                    className={
                      (r.total_return ?? 0) >= 0
                        ? "dashboard-table__return--up"
                        : "dashboard-table__return--down"
                    }
                  >
                    {fmtPct(r.total_return)}
                  </td>
                  <td>
                    <span
                      className={`dashboard-table__status dashboard-table__status--${r.status}`}
                    >
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="dashboard-table__date">{fmtDate(r.created_at)}</td>
                  <td>
                    <button
                      className="dashboard-table__review-btn"
                      onClick={() => navigate(`/review/${r.id}`)}
                    >
                      查看
                    </button>
                    {r.status === "in_progress" && (
                      <button
                        className="dashboard-table__continue-btn"
                        onClick={() => navigate(`/training/${r.id}`)}
                      >
                        繼續
                      </button>
                    )}
                    <button
                      className="dashboard-table__delete-btn"
                      onClick={() => handleDelete(r.id)}
                      disabled={deleting === r.id}
                    >
                      {deleting === r.id ? "..." : "刪除"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

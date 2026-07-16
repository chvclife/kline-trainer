import { useState } from "react";
import { stockApi } from "../../services/api";
import type { StockItem } from "../../types";
import "./RandomStock.css";

interface RandomStockProps {
  onSelect: (stock: StockItem) => void;
}

export default function RandomStock({ onSelect }: RandomStockProps) {
  const [loading, setLoading] = useState(false);

  async function handleRandom() {
    setLoading(true);
    try {
      const stock = await stockApi.random();
      onSelect(stock);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      className="random-stock"
      onClick={handleRandom}
      disabled={loading}
    >
      {loading ? "載入中..." : "🎲 隨機選股"}
    </button>
  );
}
import { useState, useRef, useCallback, type ChangeEvent } from "react";
import { stockApi } from "../../services/api";
import type { StockItem } from "../../types";
import "./StockSelector.css";

interface StockSelectorProps {
  onSelect: (stock: StockItem) => void;
  placeholder?: string;
}

export default function StockSelector({
  onSelect,
  placeholder = "搜尋股票代碼或名稱...",
}: StockSelectorProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!value.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const items = await stockApi.search(value.trim());
        setResults(items);
        setIsOpen(items.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  function handleSelect(stock: StockItem) {
    setQuery(`${stock.code} ${stock.name}`);
    setIsOpen(false);
    setResults([]);
    onSelect(stock);
  }

  function handleFocus() {
    if (results.length > 0) {
      setIsOpen(true);
    }
  }

  return (
    <div className="stock-selector" ref={containerRef}>
      <div className="stock-selector__input-wrapper">
        <input
          className="stock-selector__input"
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder={placeholder}
        />
        {loading && <span className="stock-selector__spinner" />}
      </div>

      {isOpen && results.length > 0 && (
        <div className="stock-selector__dropdown">
          {results.map((stock) => (
            <button
              key={stock.code}
              className="stock-selector__option"
              onMouseDown={() => handleSelect(stock)}
            >
              <span className="stock-selector__code">{stock.code}</span>
              <span className="stock-selector__name">{stock.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

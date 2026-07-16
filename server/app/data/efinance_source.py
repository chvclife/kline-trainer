# server/app/data/efinance_source.py
"""EFinance data source implementation."""

import logging
from typing import Optional

import efinance as ef
import pandas as pd

from app.data.base import DataSource, KlineBar

logger = logging.getLogger(__name__)

# efinance klt parameter mapping
PERIOD_TO_KLT = {
    "1m": 1,
    "5m": 5,
    "15m": 15,
    "30m": 30,
    "60m": 60,
    "1d": 101,
    "1w": 102,
    "1M": 103,
}


class EFinanceSource(DataSource):
    """Data source using efinance (East Money)."""

    name = "efinance"

    def _normalize_date(self, date_str: str) -> str:
        """Convert YYYY-MM-DD to YYYYMMDD format expected by efinance."""
        return date_str.replace("-", "")

    def is_available(self) -> bool:
        """Check if efinance is available by attempting a light query."""
        try:
            # Use a lightweight query to test connectivity
            df = ef.stock.get_quote_history(
                "000001", beg="20250101", end="20250102", klt=101, fqt=1
            )
            return df is not None
        except Exception:
            return False

    def get_kline(
        self, code: str, period: str, start: str, end: str
    ) -> list[KlineBar]:
        """Get K-line data via efinance.

        Args:
            code: Pure digits stock code, e.g. '000001'.
            period: K-line period.
            start: Start date (YYYY-MM-DD or YYYYMMDD).
            end: End date (YYYY-MM-DD or YYYYMMDD).

        Returns:
            List of KlineBar objects.

        Raises:
            ValueError: If period is not supported.
            RuntimeError: If the API call fails.
        """
        klt = PERIOD_TO_KLT.get(period)
        if klt is None:
            raise ValueError(f"Unsupported period '{period}' for efinance")

        beg = self._normalize_date(start)
        end_date = self._normalize_date(end)

        try:
            df = ef.stock.get_quote_history(
                code, beg=beg, end=end_date, klt=klt, fqt=1
            )
        except Exception as e:
            logger.warning(f"efinance get_quote_history failed for {code}: {e}")
            raise RuntimeError(f"efinance query failed: {e}") from e

        if df is None:
            logger.warning(f"efinance returned None for {code}")
            return []

        if isinstance(df, pd.DataFrame) and df.empty:
            logger.warning(f"efinance returned empty DataFrame for {code}")
            return []

        return self._parse_dataframe(df)

    def _parse_dataframe(self, df: pd.DataFrame) -> list[KlineBar]:
        """Parse efinance DataFrame into KlineBar list.

        efinance column names are in Chinese. We handle both possible naming.
        """
        # Map Chinese column names to English
        col_map = {
            "日期": "date",
            "开盘": "open",
            "最高": "high",
            "最低": "low",
            "收盘": "close",
            "成交量": "volume",
        }

        # If columns are already in English (unlikely but safe), use directly
        if "日期" in df.columns:
            df = df.rename(columns=col_map)

        required_cols = {"date", "open", "high", "low", "close", "volume"}
        if not required_cols.issubset(set(df.columns)):
            missing = required_cols - set(df.columns)
            logger.error(f"efinance response missing columns: {missing}")
            return []

        bars: list[KlineBar] = []
        for _, row in df.iterrows():
            try:
                bar = KlineBar(
                    time=str(row["date"]),
                    open=float(row["open"]),
                    high=float(row["high"]),
                    low=float(row["low"]),
                    close=float(row["close"]),
                    volume=int(row["volume"]),
                )
                bars.append(bar)
            except (ValueError, TypeError) as e:
                logger.warning(f"Skipping malformed row in efinance data: {e}")
                continue

        return bars

    def search_stocks(self, keyword: str) -> list[dict]:
        """Search stocks by keyword using efinance realtime quotes.

        Args:
            keyword: Search keyword (name or code).

        Returns:
            List of dicts with 'code' and 'name' keys.
        """
        try:
            df = ef.stock.get_realtime_quotes(fs="沪深A股")
        except Exception as e:
            logger.warning(f"efinance get_realtime_quotes failed: {e}")
            return []

        if df is None or (isinstance(df, pd.DataFrame) and df.empty):
            return []

        # efinance column names for realtime quotes
        code_col = "代码" if "代码" in df.columns else "股票代码"
        name_col = "名称" if "名称" in df.columns else "股票名称"

        if code_col not in df.columns or name_col not in df.columns:
            logger.warning("efinance realtime quotes missing expected columns")
            return []

        keyword_lower = keyword.lower()
        results: list[dict] = []
        for _, row in df.iterrows():
            code_str = str(row[code_col])
            name_str = str(row[name_col])
            if keyword_lower in code_str.lower() or keyword_lower in name_str.lower():
                # Strip market prefix if present (sh/sz)
                pure_code = code_str.replace("SH", "").replace("SZ", "").replace("sh", "").replace("sz", "")
                results.append({"code": pure_code, "name": name_str})
                if len(results) >= 20:
                    break

        return results
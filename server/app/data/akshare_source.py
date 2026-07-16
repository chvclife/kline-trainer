# server/app/data/akshare_source.py
"""AkShare data source implementation."""

import logging
from typing import Optional

import akshare as ak
import pandas as pd

from app.data.base import DataSource, KlineBar

logger = logging.getLogger(__name__)

# Periods that require the minute API
_MINUTE_PERIODS = {"1m", "5m", "15m", "30m", "60m"}


class AkShareSource(DataSource):
    """Data source using AkShare library."""

    name = "akshare"

    def is_available(self) -> bool:
        """Check if akshare is available by attempting a light query."""
        try:
            df = ak.stock_zh_a_hist(
                symbol="000001", period="daily", start_date="20250101", end_date="20250102", adjust="qfq"
            )
            return df is not None
        except Exception:
            return False

    def get_kline(
        self, code: str, period: str, start: str, end: str
    ) -> list[KlineBar]:
        """Get K-line data via AkShare.

        For minute-level periods, uses stock_zh_a_hist_min_em.
        For daily and above, uses stock_zh_a_hist.

        Args:
            code: Pure digits stock code, e.g. '000001'.
            period: K-line period: '1m', '5m', '15m', '30m', '60m', '1d', '1w', '1M'.
            start: Start date (YYYY-MM-DD or YYYYMMDD).
            end: End date (YYYY-MM-DD or YYYYMMDD).

        Returns:
            List of KlineBar objects.

        Raises:
            ValueError: If period is not supported.
            RuntimeError: If the API call fails.
        """
        supported_periods = _MINUTE_PERIODS | {"1d", "1w", "1M"}
        if period not in supported_periods:
            raise ValueError(f"Unsupported period '{period}' for akshare")

        is_minute = period in _MINUTE_PERIODS

        try:
            if is_minute:
                df = ak.stock_zh_a_hist_min_em(
                    symbol=code,
                    period=period.replace("m", ""),
                    start_date=f"{start} 09:30:00",
                    end_date=f"{end} 15:00:00",
                    adjust="qfq",
                )
            else:
                df = ak.stock_zh_a_hist(
                    symbol=code,
                    period="daily",
                    start_date=start,
                    end_date=end,
                    adjust="qfq",
                )
        except Exception as e:
            logger.warning(f"akshare query failed for {code} period={period}: {e}")
            raise RuntimeError(f"akshare query failed: {e}") from e

        if df is None or (isinstance(df, pd.DataFrame) and df.empty):
            logger.warning(f"akshare returned empty data for {code}")
            return []

        return self._parse_dataframe(df)

    def _parse_dataframe(self, df: pd.DataFrame) -> list[KlineBar]:
        """Parse AkShare DataFrame into KlineBar list.

        AkShare columns depend on which API was called:
        - stock_zh_a_hist: 日期, 开盘, 最高, 最低, 收盘, 成交量
        - stock_zh_a_hist_min_em: 时间, 开盘, 最高, 最低, 收盘, 成交量
        """
        # Determine which time column name is present
        time_col = "时间" if "时间" in df.columns else "日期"

        col_map = {
            time_col: "time",
            "开盘": "open",
            "最高": "high",
            "最低": "low",
            "收盘": "close",
            "成交量": "volume",
        }
        df = df.rename(columns=col_map)

        required_cols = {"time", "open", "high", "low", "close", "volume"}
        if not required_cols.issubset(set(df.columns)):
            missing = required_cols - set(df.columns)
            logger.error(f"akshare response missing columns: {missing}")
            return []

        bars: list[KlineBar] = []
        for _, row in df.iterrows():
            try:
                bar = KlineBar(
                    time=str(row["time"]),
                    open=float(row["open"]),
                    high=float(row["high"]),
                    low=float(row["low"]),
                    close=float(row["close"]),
                    volume=int(row["volume"]),
                )
                bars.append(bar)
            except (ValueError, TypeError) as e:
                logger.warning(f"Skipping malformed row in akshare data: {e}")
                continue

        return bars

    def search_stocks(self, keyword: str) -> list[dict]:
        """Search stocks by keyword using AkShare spot market data.

        Args:
            keyword: Search keyword (name or code).

        Returns:
            List of dicts with 'code' and 'name' keys.
        """
        try:
            df = ak.stock_zh_a_spot_em()
        except Exception as e:
            logger.warning(f"akshare stock_zh_a_spot_em failed: {e}")
            return []

        if df is None or (isinstance(df, pd.DataFrame) and df.empty):
            return []

        # Column names from stock_zh_a_spot_em: 代码, 名称, ...
        code_col = "代码"
        name_col = "名称"

        if code_col not in df.columns or name_col not in df.columns:
            logger.warning("akshare spot data missing expected columns: 代码, 名称")
            return []

        keyword_lower = keyword.lower()
        results: list[dict] = []
        for _, row in df.iterrows():
            code_str = str(row[code_col])
            name_str = str(row[name_col])
            if keyword_lower in code_str.lower() or keyword_lower in name_str.lower():
                results.append({"code": code_str, "name": name_str})
                if len(results) >= 20:
                    break

        return results
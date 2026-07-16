# server/app/data/baostock_source.py
"""BaoStock data source implementation."""

import logging
from typing import Optional

import baostock as bs
import pandas as pd

from app.data.base import DataSource, KlineBar

logger = logging.getLogger(__name__)

# BaoStock frequency parameter mapping
# Note: BaoStock does NOT support 1m period
PERIOD_TO_FREQUENCY = {
    "5m": "5",
    "15m": "15",
    "30m": "30",
    "60m": "60",
    "1d": "d",
    "1w": "w",
    "1M": "m",
}

# Fields to query
KLINE_FIELDS = "date,open,high,low,close,volume"

# Market prefix mapping for common A-share codes
# SH: 600xxx, 601xxx, 603xxx, 605xxx, 688xxx
# SZ: 000xxx, 001xxx, 002xxx, 003xxx, 300xxx, 301xxx
_SZ_PREFIXES = ("00", "001", "002", "003", "30", "301")


def _add_market_prefix(code: str) -> str:
    """Add sh/sz prefix to pure digit code for BaoStock.

    Args:
        code: Pure digits stock code, e.g. '000001'.

    Returns:
        Code with market prefix, e.g. 'sz.000001'.
    """
    code = code.strip()
    if "." in code:
        return code  # Already has prefix

    if code.startswith("6") or code.startswith("9"):
        return f"sh.{code}"
    return f"sz.{code}"


def _normalize_baostock_date(date_str: str) -> str:
    """Normalize date to YYYY-MM-DD format for baostock.

    Accepts both YYYYMMDD and YYYY-MM-DD formats.
    """
    date_str = date_str.replace("-", "")
    if len(date_str) == 8:
        return f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
    return date_str  # Return as-is if unexpected format


class BaoStockSource(DataSource):
    """Data source using BaoStock library.

    BaoStock requires login/logout around each query session.
    Does NOT support 1m period.
    Has no search API (search_stocks returns empty list).
    """

    name = "baostock"

    def is_available(self) -> bool:
        """Check if BaoStock is available by attempting login."""
        try:
            lg = bs.login()
            if lg.error_code == "0":
                bs.logout()
                return True
            bs.logout()
            return False
        except Exception:
            return False

    def get_kline(
        self, code: str, period: str, start: str, end: str
    ) -> list[KlineBar]:
        """Get K-line data via BaoStock.

        Args:
            code: Pure digits stock code, e.g. '000001'.
            period: K-line period (1m is NOT supported).
            start: Start date (YYYY-MM-DD or YYYYMMDD).
            end: End date (YYYY-MM-DD or YYYYMMDD).

        Returns:
            List of KlineBar objects.

        Raises:
            ValueError: If period is not supported (including 1m).
            RuntimeError: If the API call or login fails.
        """
        if period not in PERIOD_TO_FREQUENCY:
            raise ValueError(
                f"Unsupported period '{period}' for baostock. "
                f"Supported: {list(PERIOD_TO_FREQUENCY.keys())}"
            )

        frequency = PERIOD_TO_FREQUENCY[period]
        bs_code = _add_market_prefix(code)

        # Normalize dates to YYYY-MM-DD for baostock
        start_date = _normalize_baostock_date(start)
        end_date = _normalize_baostock_date(end)

        # Login
        lg = bs.login()
        if lg.error_code != "0":
            logger.error(f"baostock login failed: {lg.error_msg}")
            raise RuntimeError(f"baostock login failed: {lg.error_msg}")

        try:
            rs = bs.query_history_k_data_plus(
                bs_code,
                KLINE_FIELDS,
                start_date=start_date,
                end_date=end_date,
                frequency=frequency,
                adjustflag="2",  # 前复权
            )

            if rs is None:
                logger.warning(
                    f"baostock query returned None for {bs_code} "
                    f"({start_date} to {end_date})"
                )
                return []

            if rs.error_code != "0":
                logger.warning(
                    f"baostock query failed for {bs_code}: {rs.error_msg}"
                )
                return []

            data_list: list[list[str]] = []
            while rs.next():
                data_list.append(rs.get_row_data())

            return self._parse_rows(rs.fields, data_list)

        except Exception as e:
            logger.warning(f"baostock query error for {bs_code}: {e}")
            raise RuntimeError(f"baostock query failed: {e}") from e
        finally:
            bs.logout()

    def _parse_rows(
        self, fields: list[str], rows: list[list[str]]
    ) -> list[KlineBar]:
        """Parse BaoStock query result rows into KlineBar list.

        Args:
            fields: Column names from the query result.
            rows: List of row data lists.

        Returns:
            List of KlineBar objects.
        """
        if not rows:
            return []

        bars: list[KlineBar] = []
        for row in rows:
            try:
                row_dict = dict(zip(fields, row))
                bar = KlineBar(
                    time=row_dict["date"],
                    open=float(row_dict["open"]),
                    high=float(row_dict["high"]),
                    low=float(row_dict["low"]),
                    close=float(row_dict["close"]),
                    volume=int(row_dict["volume"]),
                )
                bars.append(bar)
            except (ValueError, TypeError, KeyError) as e:
                logger.warning(f"Skipping malformed row in baostock data: {e}")
                continue

        return bars

    def search_stocks(self, keyword: str) -> list[dict]:
        """Search stocks by keyword.

        Note: BaoStock has no search/scan API, so this always returns an empty list.

        Args:
            keyword: Search keyword (ignored).

        Returns:
            Empty list.
        """
        logger.debug("baostock does not support search_stocks, returning empty")
        return []
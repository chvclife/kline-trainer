# server/app/data/base.py
"""Abstract base classes for data sources."""

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class KlineBar:
    """Single K-line bar data."""
    time: str          # YYYY-MM-DD or YYYY-MM-DD HH:mm
    open: float
    high: float
    low: float
    close: float
    volume: int


class DataSource(ABC):
    """Abstract base class for stock data sources."""

    name: str

    @abstractmethod
    def get_kline(self, code: str, period: str, start: str, end: str) -> list[KlineBar]:
        """Get K-line data for a stock.

        Args:
            code: Pure digits stock code, e.g. '000001'.
            period: K-line period: '1m', '5m', '15m', '30m', '60m', '1d', '1w', '1M'.
            start: Start date string (YYYY-MM-DD or YYYYMMDD).
            end: End date string (YYYY-MM-DD or YYYYMMDD).

        Returns:
            List of KlineBar objects.
        """
        ...

    @abstractmethod
    def search_stocks(self, keyword: str) -> list[dict]:
        """Search for stocks by keyword.

        Args:
            keyword: Search keyword (name or code).

        Returns:
            List of dicts like [{"code": "000001", "name": "平安银行"}].
        """
        ...

    @abstractmethod
    def is_available(self) -> bool:
        """Check if the data source is available for use.

        Returns:
            True if the source is available, False otherwise.
        """
        ...

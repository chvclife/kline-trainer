# server/app/data/manager.py
"""Data source manager with fallback across multiple sources."""

import logging
from typing import Optional

from app.data.base import DataSource, KlineBar
from app.data.efinance_source import EFinanceSource
from app.data.akshare_source import AkShareSource
from app.data.baostock_source import BaoStockSource

logger = logging.getLogger(__name__)


class DataSourceManager:
    """Manages multiple data sources with automatic fallback.

    Tries each source in order: efinance -> akshare -> baostock.
    Returns data from the first source that succeeds.
    """

    def __init__(self) -> None:
        self.sources: list[DataSource] = [
            EFinanceSource(),
            AkShareSource(),
            BaoStockSource(),
        ]

    def get_kline(
        self, code: str, period: str, start: str, end: str
    ) -> tuple[list[KlineBar], str]:
        """Get K-line data, trying each source in order.

        Args:
            code: Pure digits stock code, e.g. '000001'.
            period: K-line period.
            start: Start date.
            end: End date.

        Returns:
            Tuple of (list of KlineBar, source name).

        Raises:
            RuntimeError: If all sources fail.
        """
        errors: list[str] = []

        for source in self.sources:
            try:
                # Skip 1m for baostock (not supported)
                if source.name == "baostock" and period == "1m":
                    logger.debug(f"Skipping baostock (1m not supported)")
                    continue

                data = source.get_kline(code, period, start, end)
                if data:
                    logger.info(
                        f"Got {len(data)} bars from {source.name} for {code}"
                    )
                    return data, source.name
                else:
                    logger.warning(
                        f"Source '{source.name}' returned empty data for {code}"
                    )
                    errors.append(f"{source.name}: returned empty data")
            except ValueError as e:
                # Unsupported period - skip this source gracefully
                logger.debug(
                    f"Source '{source.name}' does not support period '{period}': {e}"
                )
                errors.append(f"{source.name}: {e}")
            except Exception as e:
                logger.warning(f"Source '{source.name}' failed for {code}: {e}")
                errors.append(f"{source.name}: {e}")

        error_detail = "; ".join(errors)
        raise RuntimeError(
            f"All data sources failed for {code} (period={period}): {error_detail}"
        )

    def search_stocks(self, keyword: str) -> list[dict]:
        """Search stocks, trying each source and returning first non-empty result.

        Args:
            keyword: Search keyword.

        Returns:
            List of dicts with 'code' and 'name' keys. Empty if all sources fail.
        """
        for source in self.sources:
            try:
                # Skip baostock for search (no API)
                if source.name == "baostock":
                    continue

                results = source.search_stocks(keyword)
                if results:
                    logger.info(
                        f"Found {len(results)} stocks from {source.name} for '{keyword}'"
                    )
                    return results
                else:
                    logger.debug(
                        f"Source '{source.name}' returned no results for '{keyword}'"
                    )
            except Exception as e:
                logger.warning(
                    f"Source '{source.name}' search failed for '{keyword}': {e}"
                )

        logger.warning(f"No search results found for '{keyword}' from any source")
        return []

    def available_sources(self) -> list[str]:
        """Return list of currently available source names."""
        return [s.name for s in self.sources if s.is_available()]


# Singleton instance
data_manager = DataSourceManager()
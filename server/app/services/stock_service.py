# server/app/services/stock_service.py
import random

from app.data import data_manager
from app.data.base import KlineBar

POPULAR_STOCKS = [
    ("000001", "平安银行"), ("000002", "万科A"), ("000333", "美的集团"),
    ("000651", "格力电器"), ("000858", "五粮液"), ("002594", "比亚迪"),
    ("600036", "招商银行"), ("600519", "贵州茅台"), ("600887", "伊利股份"),
    ("601318", "中国平安"), ("601398", "工商银行"), ("603259", "药明康德"),
]

VALID_PERIODS = {"1m", "5m", "15m", "30m", "60m", "1d", "1w", "1M"}


def search_stocks(keyword: str) -> list[dict]:
    """Search stocks by keyword using the data manager."""
    return data_manager.search_stocks(keyword)


def get_kline(code: str, period: str, start: str, end: str) -> dict:
    """Get K-line data for a stock."""
    bars, source = data_manager.get_kline(code, period, start, end)
    return {
        "code": code,
        "period": period,
        "source": source,
        "data": [
            {
                "time": b.time,
                "open": b.open,
                "high": b.high,
                "low": b.low,
                "close": b.close,
                "volume": b.volume,
            }
            for b in bars
        ],
    }


def get_random_stock() -> dict:
    """Return a random stock from the popular list."""
    code, name = random.choice(POPULAR_STOCKS)
    return {"code": code, "name": name}

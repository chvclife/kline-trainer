# server/app/routers/stock.py
from fastapi import APIRouter, Depends, HTTPException, Query

from app.services.auth_service import get_current_user
from app.services.stock_service import (
    VALID_PERIODS,
    get_kline,
    get_random_stock,
    search_stocks,
)

router = APIRouter(prefix="/api/stocks", tags=["stocks"])


@router.get("/search")
def search(q: str = Query(..., min_length=1, description="Search keyword (name or code)"), current_user=Depends(get_current_user)):
    """Search stocks by name or code."""
    results = search_stocks(q)
    return {"results": results}


@router.get("/random")
def random_stock(current_user=Depends(get_current_user)):
    """Get a random stock from the popular list as a training suggestion."""
    return get_random_stock()


@router.get("/{code}/kline")
def kline(code: str, period: str = Query(default="1d", description="K-line period"),
          start: str = Query(default="2020-01-01", description="Start date YYYY-MM-DD"),
          end: str = Query(default="2025-12-31", description="End date YYYY-MM-DD"),
          current_user=Depends(get_current_user)):
    """Get K-line data for a stock."""
    if period not in VALID_PERIODS:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid period '{period}'. Must be one of: {', '.join(sorted(VALID_PERIODS))}",
        )

    try:
        return get_kline(code, period, start, end)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

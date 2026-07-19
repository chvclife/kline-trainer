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
def search(
    q: str = Query(..., min_length=1, description="搜尋關鍵字（股票代碼或名稱）"),
    current_user=Depends(get_current_user),
):
    """搜尋股票。"""
    results = search_stocks(q)
    if not results:
        return {"results": [], "message": f"未找到與「{q}」相關的股票"}
    return {"results": results}


@router.get("/random")
def random_stock(current_user=Depends(get_current_user)):
    """隨機獲取一隻股票作為訓練建議。"""
    stock = get_random_stock()
    if stock is None:
        raise HTTPException(
            status_code=503,
            detail="暫無可用股票數據，請稍後重試或自行搜尋股票",
        )
    return stock


@router.get("/{code}/kline")
def kline(
    code: str,
    period: str = Query(default="1d", description="K 線週期"),
    start: str = Query(default="2020-01-01", description="起始日期 YYYY-MM-DD"),
    end: str = Query(default="2025-12-31", description="結束日期 YYYY-MM-DD"),
    current_user=Depends(get_current_user),
):
    """獲取股票 K 線數據。"""
    if period not in VALID_PERIODS:
        raise HTTPException(
            status_code=422,
            detail=f"不支援的 K 線週期「{period}」，可選值：{', '.join(sorted(VALID_PERIODS))}（請使用 1d 日線或 1w 週線等）",
        )

    try:
        return get_kline(code, period, start, end)
    except RuntimeError as e:
        # Don't expose internal proxy errors to the user
        raise HTTPException(
            status_code=502,
            detail=f"無法獲取股票 {code} 的 K 線數據。可能原因：股票代碼不正確、日期範圍無數據、或數據源暫時不可用。請更換股票或調整日期範圍後重試。",
        )
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )

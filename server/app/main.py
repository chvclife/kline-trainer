# server/app/main.py
import os

# Bypass system proxy for domestic stock APIs (eastmoney, etc.)
for key in ["HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy", "ALL_PROXY", "all_proxy"]:
    os.environ.pop(key, None)
os.environ["NO_PROXY"] = "*"

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

app = FastAPI(title="K線訓練器", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routers import auth  # noqa: E402
from app.routers import stock  # noqa: E402
from app.routers import training  # noqa: E402

app.include_router(auth.router)
app.include_router(stock.router)
app.include_router(training.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}

# server/app/main.py
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
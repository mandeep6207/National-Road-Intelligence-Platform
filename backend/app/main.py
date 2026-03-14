"""
National Road Intelligence Platform — FastAPI Application Entry Point
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import connect_db, close_db
from app.api.v1 import router as api_v1_router
from app.services.pipeline_service import seed_pipeline_demo_data

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Starting National Road Intelligence Platform API...")
    try:
        await connect_db()
        logger.info("✅ MongoDB connected — database: roadguardian")
        await seed_pipeline_demo_data()
        logger.info("✅ Demo data check complete")
    except Exception as e:
        logger.warning(f"⚠️  MongoDB not available: {e}")
    yield
    logger.info("🛑 Shutting down NRIP API...")
    await close_db()


app = FastAPI(
    title=settings.APP_NAME,
    description="AI-Powered Road Infrastructure Management Platform for Government of India",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan
)

# ─── CORS ───────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Static files (uploads) ─────────────────────────────────────────────────
import os
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# ─── Routers ─────────────────────────────────────────────────────────────────
app.include_router(api_v1_router, prefix="/api/v1")


# ─── Root ────────────────────────────────────────────────────────────────────
@app.get("/", tags=["Root"])
async def root():
    return {
        "platform": "National Road Intelligence Platform",
        "version": "1.0.0",
        "ministry": "Ministry of Road Transport and Highways",
        "initiative": "Digital India",
        "status": "operational",
        "api_docs": "/api/docs"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "platform": settings.APP_NAME}


# ─── Global exception handler ────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please contact support."}
    )

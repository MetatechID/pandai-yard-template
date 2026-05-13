"""FastAPI app entrypoint for Nusantara Logistics modern backend.

Run locally:
    poetry run uvicorn nusantara_modern.main:app --reload

In prod, runs under uvicorn workers behind nginx (see infrastructure/nginx.conf).
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from nusantara_modern import __version__
from nusantara_modern.routers import handover, tracking

# Structured logging — JSON in prod, plain in dev.
# Bu Sari asked for this in 2023 after we couldn't grep the legacy logs at 3am.
structlog.configure(
    processors=[
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        (
            structlog.processors.JSONRenderer()
            if os.getenv("APP_ENV") == "production"
            else structlog.dev.ConsoleRenderer()
        ),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
)
log = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan: warm up DB pool, integrations. Tear down on shutdown."""
    log.info("startup", version=__version__, env=os.getenv("APP_ENV", "dev"))
    # TODO(2025-Q3): wire up the COD reconciliation worker here. Currently runs as a
    # separate systemd unit. We keep meaning to consolidate.
    yield
    log.info("shutdown")


app = FastAPI(
    title="Nusantara Logistics — Modern API",
    version=__version__,
    description=(
        "FastAPI service. Strangler-fig wrapper around the 2008 PHP backend. "
        "New work goes here. Customer-facing endpoints under /api."
    ),
    lifespan=lifespan,
)

# CORS — open to the customer portal and admin in dev.
# In prod the nginx layer handles this; this is for poetry-run-uvicorn dev.
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ALLOW_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(tracking.router, prefix="/api/tracking", tags=["tracking"])
app.include_router(handover.router, prefix="/api/handover", tags=["handover"])


@app.get("/healthz", tags=["meta"])
async def healthz() -> dict:
    """Health check — used by nginx upstream and the on-call runbooks."""
    return {
        "ok": True,
        "service": "backend-modern",
        "version": __version__,
        "env": os.getenv("APP_ENV", "dev"),
    }


@app.get("/readyz", tags=["meta"])
async def readyz() -> dict:
    """Readiness — passes when DB pool + redis are reachable.

    NOTE: we do NOT check the legacy here. The legacy can be down and we'll degrade
    gracefully on tracking. (Or so we tell ourselves.)
    """
    # Real implementation would ping the DB and redis. Stub for now.
    return {"ready": True}

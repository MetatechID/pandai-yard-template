"""Tracking router.

GET /api/tracking/{awb}

Resolves a shipment AWB to its current state. Falls back to the legacy backend for
shipments older than 18 months (the modern Postgres only carries the last 18mo).
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Literal

import httpx
import structlog
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

log = structlog.get_logger()
router = APIRouter()

LEGACY_BASE_URL = "http://backend-legacy"  # overridden by env in real deployments


class TrackingEvent(BaseModel):
    at: datetime
    code: str
    location: str | None = None
    label_id: str = Field(..., description="Bahasa Indonesia label")
    label_en: str = Field(..., description="English label")


class TrackingResponse(BaseModel):
    awb: str
    origin: str
    destination: str
    status_code: str
    status_label_id: str
    status_label_en: str
    created_at: datetime
    last_event_at: datetime | None
    events: list[TrackingEvent] = Field(default_factory=list)
    source: Literal["modern", "legacy", "merged"] = "modern"


# Status label maps. These are duplicated in the legacy controller (PHP) — see
# the note there about i18n being scoped/descoped multiple times. Until we have
# a real i18n service, keep these in sync by hand.
_STATUS_ID = {
    "CREATED": "Pengiriman dibuat",
    "PICKED_UP": "Sudah dijemput",
    "IN_TRANSIT": "Dalam perjalanan",
    "AT_GUDANG": "Tiba di gudang",
    "OUT_FOR_DELIVERY": "Sedang diantar",
    "DELIVERED": "Telah diterima",
    "EXCEPTION": "Bermasalah — hubungi customer service",
}
_STATUS_EN = {
    "CREATED": "Shipment created",
    "PICKED_UP": "Picked up",
    "IN_TRANSIT": "In transit",
    "AT_GUDANG": "Arrived at warehouse",
    "OUT_FOR_DELIVERY": "Out for delivery",
    "DELIVERED": "Delivered",
    "EXCEPTION": "Exception — contact customer service",
}


@router.get("/{awb}", response_model=TrackingResponse)
async def get_tracking(
    awb: str,
    include_events: bool = Query(default=True, description="Include event history"),
) -> TrackingResponse:
    """Look up a shipment by AWB (resi).

    Modern path:
      1. Try the Postgres `tracking_events` projection.
      2. If not found, fall back to the legacy backend (which itself has a Postgres
         mirror -> Oracle fallback chain — see backend-legacy/app/models/Shipment.php).
      3. If still nothing, 404.
    """
    awb = awb.strip().upper()
    if not awb or len(awb) > 24:
        raise HTTPException(status_code=400, detail="invalid awb")

    # ── Modern lookup ────────────────────────────────────────────────────
    # In a real implementation, query the DB here. We stub for the skeleton.
    modern_row = await _modern_lookup(awb)
    if modern_row is not None:
        return modern_row

    # ── Legacy fallback ───────────────────────────────────────────────────
    # The legacy is slow and sometimes flaky. We give it 1.5s and a single retry.
    legacy_row = await _legacy_lookup(awb)
    if legacy_row is not None:
        return legacy_row

    raise HTTPException(status_code=404, detail="awb not found")


async def _modern_lookup(awb: str) -> TrackingResponse | None:
    """Stub: in a real impl, query SQLAlchemy `TrackingEvent` model.

    For now, returns None to demonstrate the fallback path.
    """
    # FOLLOW-UP: wire up the SQLAlchemy session here (see db/models.py).
    # Skeleton returns None deliberately so the customer portal demo
    # exercises the legacy fallback path.
    log.debug("modern.tracking.miss", awb=awb)
    return None


async def _legacy_lookup(awb: str) -> TrackingResponse | None:
    """Call backend-legacy's PHP shipment endpoint.

    The legacy can return:
      - 200 with a shipment dict (we adapt).
      - 404 (we return None).
      - 5xx (we log + return None — degrade rather than 500 the customer).
    """
    url = f"{LEGACY_BASE_URL}/legacy/shipment/{awb}"
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(1.5, connect=0.5)) as client:
            resp = await client.get(url)
    except httpx.HTTPError as e:
        log.warning("legacy.tracking.error", awb=awb, error=str(e))
        return None

    if resp.status_code == 404:
        return None
    if resp.status_code >= 500:
        # Legacy on fire. Don't propagate to the customer.
        log.warning("legacy.tracking.5xx", awb=awb, status=resp.status_code)
        return None

    body = resp.json()
    return TrackingResponse(
        awb=body["awb"],
        origin=body["origin"],
        destination=body["destination"],
        status_code=body["status"],
        status_label_id=body.get("status_label_id") or _STATUS_ID.get(body["status"], body["status"]),
        status_label_en=body.get("status_label_en") or _STATUS_EN.get(body["status"], body["status"]),
        created_at=datetime.fromisoformat(body["created_at"]),
        last_event_at=(
            datetime.fromisoformat(body["last_event_at"])
            if body.get("last_event_at")
            else None
        ),
        events=[],
        source="legacy",
    )


@router.get("", include_in_schema=False)
async def list_recent_for_dev(limit: int = 10) -> dict:
    """Dev helper — not exposed via nginx in prod.

    Returns a stub list. Real impl would query the modern DB.
    """
    cutoff = datetime.utcnow() - timedelta(days=1)
    return {"cutoff": cutoff.isoformat(), "items": [], "limit": limit}

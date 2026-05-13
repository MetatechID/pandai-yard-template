"""Handover (serah-terima) router.

Endpoints to record a handover between actors in the chain:
  - shipper → driver (pickup)
  - driver → warehouse (intake)
  - warehouse → driver (out for delivery)
  - driver → recipient (delivered)

Each handover writes to the `handovers` table and emits a tracking event.

Owned by the modern backend; no legacy fallback. New work only goes here.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Annotated

import structlog
from fastapi import APIRouter, HTTPException, Path
from pydantic import BaseModel, Field

log = structlog.get_logger()
router = APIRouter()


class HandoverKind(str, Enum):
    SHIPPER_TO_DRIVER = "shipper_to_driver"
    DRIVER_TO_WAREHOUSE = "driver_to_warehouse"
    WAREHOUSE_TO_DRIVER = "warehouse_to_driver"
    DRIVER_TO_RECIPIENT = "driver_to_recipient"


class HandoverRequest(BaseModel):
    awb: str = Field(..., min_length=4, max_length=24)
    kind: HandoverKind
    actor_id: str = Field(..., description="The driver / warehouse user / recipient id")
    location_lat: float | None = None
    location_lng: float | None = None
    photo_url: str | None = Field(
        default=None,
        description="Required for DRIVER_TO_RECIPIENT in most cases.",
    )
    signature_b64: str | None = None
    notes: str | None = Field(default=None, max_length=500)


class HandoverResponse(BaseModel):
    handover_id: int
    awb: str
    kind: HandoverKind
    recorded_at: datetime
    new_status_code: str


@router.post("", response_model=HandoverResponse, status_code=201)
async def create_handover(req: HandoverRequest) -> HandoverResponse:
    """Record a handover.

    For DRIVER_TO_RECIPIENT we require either photo_url OR signature_b64 (not neither).
    Bu Sari + ops decided this in 2024; the previous "either or none" allowed too many
    disputes. Don't change without ops sign-off.
    """
    if req.kind == HandoverKind.DRIVER_TO_RECIPIENT:
        if not req.photo_url and not req.signature_b64:
            raise HTTPException(
                status_code=400,
                detail="DRIVER_TO_RECIPIENT requires photo_url or signature_b64",
            )

    # FOLLOW-UP: wire up DB write (see db/models.py).
    # For the skeleton we return a stub.
    new_status = _next_status_for(req.kind)
    log.info(
        "handover.recorded",
        awb=req.awb,
        kind=req.kind.value,
        actor=req.actor_id,
        new_status=new_status,
    )
    return HandoverResponse(
        handover_id=0,
        awb=req.awb,
        kind=req.kind,
        recorded_at=datetime.utcnow(),
        new_status_code=new_status,
    )


@router.get("/{awb}", response_model=list[HandoverResponse])
async def list_handovers(awb: Annotated[str, Path(min_length=4, max_length=24)]) -> list[HandoverResponse]:
    """List all handovers for an AWB. Stub returns empty until DB is wired."""
    return []


def _next_status_for(kind: HandoverKind) -> str:
    return {
        HandoverKind.SHIPPER_TO_DRIVER: "PICKED_UP",
        HandoverKind.DRIVER_TO_WAREHOUSE: "AT_GUDANG",
        HandoverKind.WAREHOUSE_TO_DRIVER: "OUT_FOR_DELIVERY",
        HandoverKind.DRIVER_TO_RECIPIENT: "DELIVERED",
    }[kind]

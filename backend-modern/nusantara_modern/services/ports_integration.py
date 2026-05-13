"""BPN port system integration.

Talks to the (fictional) Badan Pertanahan / port-authority system at Tanjung Perak
and Tanjung Priok. Used to:
  - reserve a container slot for outbound shipment.
  - poll for arrival events on inbound containers.
  - reconcile customs (PIB/PEB) reference numbers.

The upstream is... how to put this... "characterful". They:
  - return XML on Tuesdays for some endpoints (don't ask).
  - add new optional fields without warning. Pydantic will validate them out unless
    we use `model_config = ConfigDict(extra='allow')`. We do.
  - rate-limit at "around 30 rps" (not documented, observed).
  - have a status page that lies. Trust the timeout, not the page.

If integration is throwing in prod: see runbook E in docs/03-on-call.md.
"""

from __future__ import annotations

import os
from datetime import datetime
from typing import Any

import httpx
import structlog
from pydantic import BaseModel, ConfigDict, Field

log = structlog.get_logger()


BPN_BASE_URL = os.getenv(
    "BPN_BASE_URL",
    "https://api.bpn-ports.example.id/v2",
)
# The hotline number for when their /status page is wrong, which is most of the time.
BPN_HOTLINE = "+62-xxx-xxx-xxxx"  # see #ops Confluence


class PortSlotReservation(BaseModel):
    """Response from POST /v2/slots/reserve."""

    model_config = ConfigDict(extra="allow")  # they add fields, see docstring above

    reservation_id: str
    container_no: str
    port_code: str = Field(..., examples=["PRK", "PRI"])
    slot_at: datetime
    expires_at: datetime
    fee_idr: int


class PortArrivalEvent(BaseModel):
    """Polled from GET /v2/arrivals."""

    model_config = ConfigDict(extra="allow")

    event_id: str
    container_no: str
    arrived_at: datetime
    berth: str | None = None
    customs_status: str | None = None  # 'CLEARED', 'HELD', 'PENDING', or values they invent on Tuesdays


class BPNClient:
    """Thin async client for the BPN port API.

    Usage:
        async with BPNClient() as bpn:
            res = await bpn.reserve_slot(container_no="...", port_code="PRK", at=...)
    """

    def __init__(self, base_url: str | None = None, timeout: float = 5.0) -> None:
        self._base_url = (base_url or BPN_BASE_URL).rstrip("/")
        self._timeout = httpx.Timeout(timeout, connect=2.0)
        self._client: httpx.AsyncClient | None = None

    async def __aenter__(self) -> "BPNClient":
        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            timeout=self._timeout,
            headers={
                "User-Agent": "nusantara-modern/0.7.3",
                "Accept": "application/json",
                # API key in env. Rotated quarterly. Kind of.
                "X-Api-Key": os.getenv("BPN_API_KEY", ""),
            },
        )
        return self

    async def __aexit__(self, *exc) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def reserve_slot(
        self,
        *,
        container_no: str,
        port_code: str,
        at: datetime,
    ) -> PortSlotReservation:
        assert self._client is not None
        payload = {
            "container_no": container_no,
            "port_code": port_code,
            "preferred_at": at.isoformat(),
        }
        resp = await self._client.post("/slots/reserve", json=payload)

        # The BPN API uses 200 with body.error for some failure modes (yes).
        if resp.status_code != 200:
            log.warning("bpn.reserve_slot.http_error", status=resp.status_code)
            resp.raise_for_status()
        body: dict[str, Any] = resp.json()
        if "error" in body:
            raise RuntimeError(f"bpn rejected reservation: {body['error']}")

        return PortSlotReservation.model_validate(body)

    async def poll_arrivals(self, *, port_code: str, since: datetime) -> list[PortArrivalEvent]:
        assert self._client is not None
        # Rate-limit: keep page sizes modest. We've been burned at 100+.
        params = {"port": port_code, "since": since.isoformat(), "limit": 50}
        resp = await self._client.get("/arrivals", params=params)
        resp.raise_for_status()

        body = resp.json()
        # On Tuesdays they sometimes wrap the list in a top-level "data" key.
        # On other days, not. We handle both. (Yes, we have logged this multiple times
        # and asked. The answer was "we'll fix it next sprint". That was 2024.)
        items = body if isinstance(body, list) else body.get("data", [])

        out: list[PortArrivalEvent] = []
        for item in items:
            try:
                out.append(PortArrivalEvent.model_validate(item))
            except Exception as e:  # noqa: BLE001
                log.warning("bpn.arrival.skip", reason=str(e), event_id=item.get("event_id"))
        return out

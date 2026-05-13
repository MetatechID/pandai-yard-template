# backend-modern

Python 3.11 / FastAPI service. Where new work goes.

Started in 2022 as a strangler-fig wrapper around the 2008 PHP. Has steadily absorbed
new functionality since. Today owns:

- Customer-facing tracking API (`/api/tracking/{awb}`).
- Handover (serah-terima) flows.
- Integrations: BPN port system, customs (PIB/PEB), 1 of 3 banks for COD reconciliation.
- New auth (OAuth2 / JWT), with a thin bridge back to the legacy session (don't ask).

## Stack

- Python 3.11
- FastAPI 0.110+
- SQLAlchemy 2.x (async)
- Alembic for migrations
- Pydantic v2
- Redis 7 (cache + lightweight queues)
- httpx for outbound integrations

## Run locally

```sh
poetry install
poetry run uvicorn nusantara_modern.main:app --reload
```

Or use `docker compose up backend-modern` from repo root.

## Layout

```
nusantara_modern/
  main.py             — FastAPI app, mounts routers
  routers/
    tracking.py       — GET /tracking/{awb} (calls legacy fallback for older shipments)
    handover.py       — serah-terima endpoints
  services/
    ports_integration.py  — BPN port system client (Tanjung Perak / Tanjung Priok)
  db/
    models.py         — SQLAlchemy models
alembic/              — schema migrations
tests/                — pytest. ~12 tests today. Aiming for ~80.
```

## Notes for contributors

- All new tables go here, not in `backend-legacy/sql/`.
- Migrations must be backward-compatible for at least one release (deploy lesson INC-1247).
- For tables not yet migrated off Oracle, call legacy via the modern client — don't query Oracle directly from Python.
- Pydantic schemas: keep them ruthless about validation. The BPN port system likes to return new fields without warning.

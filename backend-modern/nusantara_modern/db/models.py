"""SQLAlchemy 2.x models — modern backend.

Conventions:
  - Tablename = snake_case plural.
  - All timestamps are UTC, server-default NOW().
  - Money is integer cents (or rupiah; we don't fractionalise IDR).
  - We do NOT model the still-Oracle tables here. Those are read via the
    legacy adapter or via the `*_mirror` tables (see backend-legacy/sql/schema.sql).
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """Modern backend declarative base."""


class TrackingEvent(Base):
    """Append-only event log for shipment status changes.

    The customer-facing tracking timeline is rendered from rows in this table
    (newest first, deduped on `code` if multiple events arrive with the same code
    in <60s — we've seen the legacy worker double-emit during retries).

    Migrated to Postgres 2022-Q4. Was the first table where we removed the dual-read.
    """

    __tablename__ = "tracking_events"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    awb: Mapped[str] = mapped_column(String(24), index=True, nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    location: Mapped[str | None] = mapped_column(String(120))
    actor_id: Mapped[str | None] = mapped_column(String(64))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )

    __table_args__ = (
        Index("ix_tracking_events_awb_occurred", "awb", "occurred_at"),
    )


class Handover(Base):
    """A handover (serah-terima) between actors in the chain.

    See routers/handover.py for the kinds.
    """

    __tablename__ = "handovers"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    awb: Mapped[str] = mapped_column(String(24), index=True, nullable=False)
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    location_lat: Mapped[float | None] = mapped_column(Numeric(9, 6))
    location_lng: Mapped[float | None] = mapped_column(Numeric(9, 6))
    photo_url: Mapped[str | None] = mapped_column(String(500))
    signature_b64: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(String(500))
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )


class CodReconciliation(Base):
    """Cash-on-delivery reconciliation rows.

    !!! Finance-critical. Do NOT manually mutate. The reconciliation worker is the
    !!! single writer. Talk to ops + Finance IT before touching.
    """

    __tablename__ = "cod_reconciliations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    awb: Mapped[str] = mapped_column(String(24), index=True, nullable=False)
    bank_ref: Mapped[str | None] = mapped_column(String(80))
    amount_idr: Mapped[int] = mapped_column(Integer, nullable=False)
    state: Mapped[str] = mapped_column(
        String(32), nullable=False, default="PENDING"
    )  # PENDING, MATCHED, MISMATCHED, MANUAL_REVIEW
    matched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )


class BPNArrivalCache(Base):
    """We cache BPN port arrivals locally because their API rate-limits hard.

    Worker repopulates every 30s. We read from this table in normal flow.
    If the cache is older than 5 minutes, the tracking router falls back to a
    direct BPN call (with a circuit breaker around it).
    """

    __tablename__ = "bpn_arrivals_cache"

    event_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    container_no: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    port_code: Mapped[str] = mapped_column(String(8), nullable=False)
    arrived_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    customs_status: Mapped[str | None] = mapped_column(String(32))
    cached_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )

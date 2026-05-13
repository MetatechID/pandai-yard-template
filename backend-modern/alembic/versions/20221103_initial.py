"""initial schema — modern backend

Revision ID: 20221103_initial
Revises:
Create Date: 2022-11-03 14:22:08.114921+07:00

The first migration after we cut the modern backend out of the legacy. Establishes
tracking_events as the canonical event log. Was a lift-and-rename from the legacy
event table, with an extra index that the legacy had been missing for years.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20221103_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tracking_events",
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column("awb", sa.String(24), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("code", sa.String(32), nullable=False),
        sa.Column("location", sa.String(120)),
        sa.Column("actor_id", sa.String(64)),
        sa.Column("notes", sa.Text),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_tracking_events_awb", "tracking_events", ["awb"])
    op.create_index(
        "ix_tracking_events_awb_occurred",
        "tracking_events",
        ["awb", "occurred_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_tracking_events_awb_occurred", "tracking_events")
    op.drop_index("ix_tracking_events_awb", "tracking_events")
    op.drop_table("tracking_events")

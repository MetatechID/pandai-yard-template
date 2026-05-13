"""add handovers table

Revision ID: 20231215_add_handover_table
Revises: 20221103_initial
Create Date: 2023-12-15 11:08:43.221034+07:00

Carved out the serah-terima flow from the legacy. The legacy used to write directly
to a flat shipment_status_history table; we now write structured handover rows here
and synthesize tracking_events from them.

Backward compat: the legacy still writes its own status_history rows (for now). The
modern reader prefers handovers; falls back to status_history. We will retire
status_history when the legacy invoice path stops needing it. (Don't hold your breath.)
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20231215_add_handover_table"
down_revision = "20221103_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "handovers",
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column("awb", sa.String(24), nullable=False),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("actor_id", sa.String(64), nullable=False),
        sa.Column("location_lat", sa.Numeric(9, 6)),
        sa.Column("location_lng", sa.Numeric(9, 6)),
        sa.Column("photo_url", sa.String(500)),
        sa.Column("signature_b64", sa.Text),
        sa.Column("notes", sa.String(500)),
        sa.Column(
            "recorded_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_handovers_awb", "handovers", ["awb"])


def downgrade() -> None:
    op.drop_index("ix_handovers_awb", "handovers")
    op.drop_table("handovers")

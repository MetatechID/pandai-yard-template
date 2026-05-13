"""partial Oracle → Postgres migration (customer_profiles + auth schema)

Revision ID: 20240802_partial_oracle_migration
Revises: 20231215_add_handover_table
Create Date: 2024-08-02 09:14:51.005123+07:00

INCOMPLETE — see ADR 0003.

This migration is the Postgres half of the customer_profiles + auth_* table moves.
The Oracle half (drop tables, redirect any remaining writes) is documented in
docs/04-the-oracle-migration.md and has been "almost done" since this migration shipped.

We did NOT migrate `shipments`, `invoices`, or the warehouse intake tables in this
revision. They were originally scoped here. We descoped after the spike showed the
CONNECT BY rewrite alone was a 3-week piece. See PENDING in ADR 0003.

The cod_reconciliations + bpn_arrivals_cache tables are added here too (greenfield —
no Oracle counterpart). They could have been a separate revision but we batched them
because shipping a Friday migration alone in 2024-Q3 was politically sensitive
(post-INC-1247 we had a freeze on solo migrations).
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20240802_partial_oracle_migration"
down_revision = "20231215_add_handover_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # COD reconciliation rows (greenfield — modern only)
    op.create_table(
        "cod_reconciliations",
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column("awb", sa.String(24), nullable=False),
        sa.Column("bank_ref", sa.String(80)),
        sa.Column("amount_idr", sa.Integer, nullable=False),
        sa.Column("state", sa.String(32), nullable=False, server_default="PENDING"),
        sa.Column("matched_at", sa.DateTime(timezone=True)),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_cod_reconciliations_awb", "cod_reconciliations", ["awb"])

    # BPN arrivals cache (greenfield — modern only)
    op.create_table(
        "bpn_arrivals_cache",
        sa.Column("event_id", sa.String(64), primary_key=True),
        sa.Column("container_no", sa.String(32), nullable=False),
        sa.Column("port_code", sa.String(8), nullable=False),
        sa.Column("arrived_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("customs_status", sa.String(32)),
        sa.Column(
            "cached_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_bpn_arrivals_cache_container",
        "bpn_arrivals_cache",
        ["container_no"],
    )

    # PENDING — see docstring + ADR 0003. The shipments / invoices / warehouse_intake
    # tables would also be here when Phase 3 unblocks. They are not.
    #
    # PENDING — finalise auth_* table moves. We dual-write today; the next revision
    # should drop the Oracle writes once we have 30 days of clean dual-state metrics.
    # Owner: Eng Platform. Date: TBD.


def downgrade() -> None:
    op.drop_index("ix_bpn_arrivals_cache_container", "bpn_arrivals_cache")
    op.drop_table("bpn_arrivals_cache")
    op.drop_index("ix_cod_reconciliations_awb", "cod_reconciliations")
    op.drop_table("cod_reconciliations")

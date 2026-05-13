-- Nusantara Logistics — legacy-side Postgres schema.
--
-- This file is loaded into the local docker postgres on first boot.
-- It is NOT the production schema — production is managed by alembic on
-- backend-modern + manual SQL by VP Eng on backend-legacy. This file is a
-- close-enough approximation for local dev.
--
-- Yes, the column types look slightly Oracle-ish in places (NUMBER, VARCHAR2 in
-- comments). That's because much of this was ported from the Oracle DDL by
-- pasting and editing. Sorry.

-- ────────────────────────────────────────────────────────────────────────────
-- warehouses (fully migrated to Postgres, 2022-Q4)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS warehouses (
    id              VARCHAR(16) PRIMARY KEY,           -- e.g. SUB01, JKT03, MKS02
    name            VARCHAR(120) NOT NULL,
    city            VARCHAR(80) NOT NULL,
    province        VARCHAR(80),
    manager_email   VARCHAR(160),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);

-- ────────────────────────────────────────────────────────────────────────────
-- shipments_mirror (Postgres mirror; primary still Oracle — see ADR 0003)
--
-- The "_mirror" suffix is a tell. When the migration completes, this table
-- becomes "shipments" (drop suffix, drop the original Oracle table).
-- See docs/04-the-oracle-migration.md "Why shipments hasn't moved".
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shipments_mirror (
    awb              VARCHAR(24) PRIMARY KEY,           -- Oracle: VARCHAR2(24)
    origin_city      VARCHAR(80) NOT NULL,
    destination_city VARCHAR(80) NOT NULL,
    status_code      VARCHAR(32) NOT NULL,
    shipper_id       VARCHAR(32),                       -- Oracle: NUMBER(12) — coerced here
    kg               NUMERIC(10, 2),                    -- Oracle: NUMBER(10,2)
    created_at       TIMESTAMPTZ NOT NULL,
    last_event_at    TIMESTAMPTZ,
    -- _synced_at is mirror-only; the sync worker updates it.
    _synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS shipments_mirror_status_idx ON shipments_mirror(status_code);
CREATE INDEX IF NOT EXISTS shipments_mirror_shipper_idx ON shipments_mirror(shipper_id);
CREATE INDEX IF NOT EXISTS shipments_mirror_last_event_idx ON shipments_mirror(last_event_at);

-- ────────────────────────────────────────────────────────────────────────────
-- intake_events (Postgres-primary, but writes also propagate back to Oracle
-- via the legacy worker for the next 6 months — then we drop the Oracle copy)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS intake_events (
    id              BIGSERIAL PRIMARY KEY,
    warehouse_id    VARCHAR(16) NOT NULL REFERENCES warehouses(id),
    awb             VARCHAR(24) NOT NULL,
    manifest_id     VARCHAR(32),
    kg              NUMERIC(10, 2),
    arrived_at      TIMESTAMPTZ NOT NULL,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS intake_events_awb_idx ON intake_events(awb);
CREATE INDEX IF NOT EXISTS intake_events_warehouse_idx ON intake_events(warehouse_id, arrived_at);

-- ────────────────────────────────────────────────────────────────────────────
-- invoices_mirror + invoice_lines_mirror (still Oracle-primary; blocked on Finance IT)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices_mirror (
    id              BIGINT PRIMARY KEY,                 -- Oracle: NUMBER(18)
    customer_id     VARCHAR(32) NOT NULL,
    currency        CHAR(3) NOT NULL DEFAULT 'IDR',
    total_idr       NUMERIC(18, 2) NOT NULL,
    status          VARCHAR(16) NOT NULL,               -- DRAFT, ISSUED, PAID, VOID
    issued_at       TIMESTAMPTZ,
    due_at          TIMESTAMPTZ,
    _synced_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_lines_mirror (
    invoice_id      BIGINT NOT NULL REFERENCES invoices_mirror(id),
    line_no         INT NOT NULL,
    awb             VARCHAR(24),
    description     TEXT,
    kg              NUMERIC(10, 2),
    amount_idr      NUMERIC(18, 2) NOT NULL,
    PRIMARY KEY (invoice_id, line_no)
);

-- ────────────────────────────────────────────────────────────────────────────
-- Seed: a few warehouses so the local dev stack feels alive.
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO warehouses (id, name, city, province, manager_email) VALUES
    ('JKT01', 'Gudang Jakarta Pusat',     'Jakarta',   'DKI Jakarta',  'gudang.jkt01@nusantara.example'),
    ('JKT03', 'Gudang Cakung',            'Jakarta',   'DKI Jakarta',  'gudang.jkt03@nusantara.example'),
    ('SUB01', 'Gudang Tanjung Perak',     'Surabaya',  'Jawa Timur',   'gudang.sub01@nusantara.example'),
    ('MKS02', 'Gudang Makassar Selatan',  'Makassar',  'Sulawesi Selatan', 'gudang.mks02@nusantara.example')
ON CONFLICT (id) DO NOTHING;

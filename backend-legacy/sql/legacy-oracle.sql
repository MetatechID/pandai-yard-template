-- Nusantara Logistics — legacy Oracle DDL.
--
-- KEPT FOR REFERENCE ONLY. DO NOT RUN.
--
-- This is the schema as it exists on the Oracle 11g production database (titan-oracle-01).
-- We keep it in version control so engineers can read what they're up against without
-- needing Oracle access. The SQL below is the actual production DDL, sanitised
-- (passwords + tablespace names removed).
--
-- The corresponding Postgres-side DDL is in schema.sql. They are NOT 1:1.
-- See docs/04-the-oracle-migration.md for which tables have moved.

/*
-- ────────────────────────────────────────────────────────────────────────────
-- SHIPMENTS — still Oracle-primary as of 2026. Migration blocked.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE "SHIPMENTS" (
    "AWB"               VARCHAR2(24)    NOT NULL,
    "PARENT_AWB"        VARCHAR2(24),                 -- container consolidation hierarchy; CONNECT BY queries depend on this
    "ORIGIN_CITY"       VARCHAR2(80)    NOT NULL,
    "DESTINATION_CITY"  VARCHAR2(80)    NOT NULL,
    "STATUS_CODE"       VARCHAR2(32)    NOT NULL,
    "SHIPPER_ID"        NUMBER(12)      NOT NULL,
    "KG"                NUMBER(10,2),
    "DIM_CM"            VARCHAR2(40),
    "CREATED_AT"        DATE            DEFAULT SYSDATE NOT NULL,
    "LAST_EVENT_AT"     DATE,
    "LEGACY_NOTES"      VARCHAR2(4000),               -- free-text; ops dumps anything in here
    CONSTRAINT "PK_SHIPMENTS" PRIMARY KEY ("AWB")
)
TABLESPACE "TBS_NUS_DATA";

CREATE INDEX "IDX_SHIPMENTS_PARENT" ON "SHIPMENTS" ("PARENT_AWB");
CREATE INDEX "IDX_SHIPMENTS_STATUS" ON "SHIPMENTS" ("STATUS_CODE");
CREATE INDEX "IDX_SHIPMENTS_SHIPPER" ON "SHIPMENTS" ("SHIPPER_ID");
CREATE INDEX "IDX_SHIPMENTS_LASTEV" ON "SHIPMENTS" ("LAST_EVENT_AT");
-- (and 10 more indexes added over the years, half of which are probably redundant.
-- Audit pending. Estimated since 2022.)

CREATE SEQUENCE "SEQ_AWB" START WITH 100000 INCREMENT BY 1 NOCACHE NOCYCLE;

-- Triggers — when "shipments" finally moves to PG these become app-level.
CREATE OR REPLACE TRIGGER "TRG_SHIPMENTS_AUDIT"
    AFTER INSERT OR UPDATE OR DELETE ON "SHIPMENTS"
    FOR EACH ROW
BEGIN
    -- writes a row to SHIPMENT_AUDIT (not shown). Fired on EVERY write.
    -- This trigger is the main reason "drop the Oracle copy" is a multi-quarter project.
    NULL; -- (real body redacted; see VP Eng's gist)
END;
/

-- Stored procedure — used by the legacy invoice run.
-- We have ONE engineer who can read this end-to-end. (VP Eng.)
CREATE OR REPLACE PROCEDURE "PRC_GENERATE_INVOICE_RUN" (
    p_month_yyyymm IN VARCHAR2,
    p_run_id       OUT NUMBER
) AS
BEGIN
    -- ~700 lines of PL/SQL. Generates invoices for the month.
    -- Idempotent if you pass the same p_month_yyyymm. Mostly.
    -- See INC-1109 (2023-03) for the famous "mostly".
    NULL;
END;
/

-- ────────────────────────────────────────────────────────────────────────────
-- INVOICES — still Oracle-primary. Blocked on Finance IT sign-off (since 2023-11).
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE "INVOICES" (
    "ID"            NUMBER(18)      NOT NULL,
    "CUSTOMER_ID"   VARCHAR2(32)    NOT NULL,
    "CURRENCY"      CHAR(3)         DEFAULT 'IDR' NOT NULL,
    "TOTAL_IDR"     NUMBER(18,2)    NOT NULL,
    "STATUS"        VARCHAR2(16)    NOT NULL,
    "ISSUED_AT"     DATE,
    "DUE_AT"        DATE,
    CONSTRAINT "PK_INVOICES" PRIMARY KEY ("ID")
)
TABLESPACE "TBS_NUS_FIN";

-- Linked tables INVOICE_LINES, INVOICE_ADJUSTMENTS not shown for brevity.

-- ────────────────────────────────────────────────────────────────────────────
-- MISC — the famous misc schema. 47 tables. We know what 35 do. We do not know
-- what 12 do. See PENDING in ADR 0003. Not shown here. Audit pending.
-- ────────────────────────────────────────────────────────────────────────────

*/

-- (file intentionally commented out — this is reference only)

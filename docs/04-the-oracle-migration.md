# The Oracle Migration

aka "Project Lanjut" (project name from 2021, do not say it out loud at all-hands).

## Status

Started: 2021-Q3.
Originally scoped: 9 months.
Current state: ~60% done. Stalled since 2024-Q3.
Owner today: Eng Platform team (officially). VP Eng (in practice).
Tracking: see Jira epic `NUS-2107` — many open subtasks; some closed for political reasons rather than technical ones.

This document is the closest thing we have to a single source of truth on the state of the migration.

## Why we're doing it

Cost (Oracle licensing eats ~25% of the eng budget), agility (most of the team only knows Postgres),
and recruiting (the last person who could write PL/SQL well left in 2022). The strategic
case is sound. The execution has been... episodic.

## What's done

- ✅ Read-side mirror: Oracle → Postgres via a sync worker (`worker-oracle-sync`).
  Lag is usually <30s. When it's not, see Runbook B in `03-on-call.md`.
- ✅ All new tables created since 2022 are Postgres-only.
- ✅ `tracking_events` (the modern projection) is fully on Postgres, dual-read fallback removed.
- ✅ Customer profile tables migrated. Backfill verified.
- ✅ Auth schema migrated. (This one was painful. Three weekends.)

## What's NOT done

- ❌ `shipments` (the master shipment table). Still Oracle-primary, Postgres-mirror.
  This is the big one. It blocks 60% of the rest. See "Why shipments hasn't moved" below.
- ❌ `invoices`, `invoice_lines`, `invoice_adjustments`. Owned by Finance IT, not us. They have a separate plan. We have not seen the plan.
- ❌ Warehouse intake (`warehouse_arrivals`, `intake_events`). Migration written; never run on prod.
- ❌ XML B2B partner tables (`partner_feeds`, `partner_acks`). Nobody knows if any partner still uses XML. Audit pending. Pending since 2023.
- ❌ The "miscellaneous" schema we found in 2023 (literally named `misc`) that has 47 tables and nobody knows what 12 of them do. Discovery work needed before migration.

## Why `shipments` hasn't moved

1. The `shipments` table has 14 indexes, 6 triggers, and 4 stored procedures that fire on
   write. Nobody is sure all of them are still needed.
2. The legacy PHP code uses Oracle-specific SQL patterns (sequences, CONNECT BY for the
   parent-shipment hierarchy used in container consolidation). Porting requires either
   rewriting those queries or using a Postgres extension we haven't decided on.
3. We need a flag day. There's no clean way to dual-write because of the triggers. A flag
   day means a planned outage. A planned outage means going to the COO. We have not
   gotten that meeting on the calendar.
4. The CEO is asking for the new ASEAN consolidation feature instead of "internal infra
   things". So `shipments` migration keeps slipping.

## How the dual-state works today

Read path:
- New code goes to Postgres for everything that's been migrated.
- New code reads `shipments`, `invoices`, etc. from Postgres mirror (acceptable lag <30s).
- The legacy PHP still reads/writes Oracle directly for `shipments` and friends.
- The sync worker (`worker-oracle-sync`) flows changes from Oracle → Postgres on a 5s tick.
- For the few cases where modern code WRITES to a still-Oracle table: it goes through a
  thin Python wrapper that calls a stored procedure on Oracle. See
  `backend-modern/nusantara_modern/services/ports_integration.py` for an example pattern
  (it's dressed up as an integration, but functionally it's the same shape).

Write path on the legacy:
- `backend-legacy/app/lib/DBConnection.php` has both `getOraclePool()` and
  `getPostgresPool()` exposed. Code that has been ported uses Postgres. Code that hasn't
  uses Oracle. There is no central registry of which is which. **READ THE FILE.**

## What you should do

If your work touches a table:

1. Search this document for the table name.
2. If migrated → use Postgres only.
3. If NOT migrated → use Oracle (via legacy) only. Do not be clever and use the mirror for writes.
4. If you're not sure → ASK in `#tech-help`. Tag VP Eng.
5. Never write to both. We had a duplicate-write incident in 2023 that double-billed
   1,800 customers. We do not want a sequel.

## PENDING sections

> **PENDING:** A proper register of which tables are migrated, on what date, with what
> backfill verification. Today this lives in a spreadsheet someone keeps on their laptop.
> Eng Platform owns moving this into a proper README. **Estimate: Q3 2026.** (Same
> estimate as in 2024 and 2025.)

> **PENDING:** A decision on the Postgres equivalent of Oracle CONNECT BY (recursive CTEs
> are the obvious answer; the question is whether we rewrite the consolidation hierarchy
> at the same time or just port mechanically). **Owner: VP Eng + Eng Platform.** No date.

> **PENDING:** Sign-off from Finance IT on the invoices migration plan. We've been waiting
> since 2023-11. Re-pinged 2024-04, 2024-09, 2025-02. No reply.

> **PENDING:** A go/no-go on whether to stand up a dedicated PL/SQL contractor for the last
> 10% of stored-procedure rewrites, or whether to absorb that work into the Eng Platform
> roadmap. Sitting with the CTO since 2025-Q4.

## Lessons (so we remember)

- "Six months" is never six months on a cross-team migration.
- A schema migration without a rewrite of the calling code is half a job.
- The political work (getting Finance IT, COO buy-in) is harder than the technical work.
- Mirrors are a useful intermediate state. They are also a trap if you stay in the intermediate state for two years. (We have stayed for two years.)

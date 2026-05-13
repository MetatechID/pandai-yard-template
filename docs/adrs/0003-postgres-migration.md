# ADR 0003: Migrate primary database from Oracle 11g to Postgres 15

- Status: Accepted (in progress, ~60% done)
- Date: 2021-09-15 (original); revised 2023-06-02; revised 2024-09-18
- Deciders: CTO (then), VP Eng, Head of Eng Platform
- Related: `docs/04-the-oracle-migration.md` (operational state)

## Context

Nusantara has run Oracle 11g as its primary OLTP database since 2008. By 2021 the
problems were:

- License costs ~25% of the eng budget.
- Oracle 11g is unsupported by Oracle Corp (extended support ended 2020).
- The PL/SQL knowledge in-house has been declining since 2018 — the last engineer who
  could write a non-trivial stored procedure left in 2022.
- New hires don't know Oracle. We do not want them to need to.
- Postgres 13+ has reached parity for our workloads (verified by the Eng Platform team
  in a 2021-Q2 spike).

In parallel, the strangler-fig migration from `backend-legacy` (PHP) to `backend-modern`
(Python) had begun. A database migration aligned naturally — modern code on Postgres,
legacy code following.

## Decision

**Migrate from Oracle 11g to Postgres 15 over three phases:**

### Phase 1 (2021-Q3 to 2022-Q2): Mirror established. ✅ DONE
- Stand up Postgres 15.
- One-way sync worker reads Oracle, writes Postgres.
- All new tables (created from 2022-Q1 onward) are Postgres-only.

### Phase 2 (2022-Q3 to 2024-Q2): Migrate non-financial tables. ✅ MOSTLY DONE
- `tracking_events` — done.
- `customers`, `customer_profiles` — done.
- `auth_*` schema — done.
- `partner_feeds` — pending audit (see PENDING below).

### Phase 3 (2024-Q3 onward): Migrate financial + shipment-master tables. 🚧 IN PROGRESS / STALLED
- `shipments` — stalled (see PENDING below).
- `invoices`, `invoice_lines`, `invoice_adjustments` — blocked on Finance IT.
- `warehouse_arrivals`, `intake_events` — migration written, never run.
- `misc.*` (the 47-table mystery schema) — discovery work pending.

### Phase 4 (originally 2024-Q4; now TBD): Decommission Oracle.
- Cutover plan: not yet written.
- Estimated saving: ~25% of eng budget, ~$2.1M USD/year, currently theoretical.

## Consequences

### Good

- Eng Platform team has gotten very good at Postgres operations (logical replication,
  partitioning, vacuuming at scale).
- All new code is Postgres-only — no new Oracle dependencies have been added since 2022.
- Recruiting is easier; "Postgres" is uncontroversial.
- We've cut Oracle CPU licensing by ~30% by moving read traffic off Oracle.

### Bad

- We are stuck in the intermediate "two databases" state for far longer than planned.
  Operational complexity is a tax we pay every day.
- The sync worker (`worker-oracle-sync`) is a single point of failure. When it lags,
  modern code reads stale data, customers see stale tracking, support tickets spike.
- Knowledge transfer is incomplete. The PL/SQL stored procedures on Oracle are
  understood by exactly one person (VP Eng) and mostly through intuition.
- Cost savings have not materialised because we still pay full Oracle license — saving
  only happens at decommission.
- Every new engineer has to understand the dual-state. Onboarding tax.

## PENDING sections

> **PENDING:** A concrete cutover plan for `shipments`. The blocker is the legacy PHP's
> use of Oracle CONNECT BY for parent/child container hierarchy. Options under
> consideration: (a) rewrite legacy PHP to use Postgres recursive CTE; (b) introduce a
> Postgres extension that emulates CONNECT BY; (c) port the legacy paths to
> `backend-modern` first, then migrate the table. Owner: VP Eng. **No date.**

> **PENDING:** Sign-off from Finance IT on the invoices migration plan. We've been
> waiting since 2023-11. Three follow-ups, no reply. Escalation to COO discussed; not
> yet executed.

> **PENDING:** Audit of partner XML feeds. We don't know which of our 14 listed B2B
> partners still uses the XML interface. If zero: drop the table. If non-zero: migrate.
> **Owner: Eng Platform. Estimate: Q3 2026.** (Same estimate since 2024.)

> **PENDING:** Decision on `misc.*` schema. The 47 tables under `misc` were created
> ad-hoc between 2008 and 2018. Our 2023 audit identified the purpose of 35 of them.
> The remaining 12 are unknown. Approach: drop in shadow, monitor for breakage, drop
> for real after 90 days. **Not yet scheduled.**

> **PENDING:** A go/no-go on hiring a PL/SQL contractor for the last 10% of stored
> procedure rewrites. Sitting with the CTO since 2025-Q4. The CTO is reluctant to spend
> contractor budget on legacy work. The team is reluctant to do it themselves because
> nobody enjoys it. Stalemate.

## Revisit conditions

This ADR will be revisited if:

- Oracle Corp announces a policy change affecting our 11g usage.
- Phase 3 is unblocked (Finance IT signs off, or we decouple invoices from `shipments`).
- A board-level mandate to cut infrastructure cost forces a deadline.
- VP Eng's tenure status changes (PL/SQL knowledge bus factor).

The decision itself ("migrate to Postgres") is not in question. The execution timeline is.

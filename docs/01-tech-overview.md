# Tech Overview

Last meaningful update: 2024-11. Some of this is already wrong. Open a PR if you find drift.

## What we run

```
                          ┌────────────────────────────┐
                          │  nginx (titan-prod-01:80)  │
                          └──────────────┬─────────────┘
              ┌──────────────────────────┼──────────────────────────┐
              │                          │                          │
              ▼                          ▼                          ▼
   ┌───────────────────┐      ┌───────────────────┐      ┌────────────────────┐
   │ frontend-customer │      │  frontend-admin   │      │  backend-legacy    │
   │ portal (Next 14)  │      │  (CRA / React 16) │      │  (PHP 7.4)         │
   └─────────┬─────────┘      └─────────┬─────────┘      └─────────┬──────────┘
             │                          │                          │
             │                          │                          │
             ▼                          ▼                          ▼
                ┌────────────────────────────────────────────────────┐
                │           backend-modern (Python 3.11 / FastAPI)    │
                │       (also talks DIRECTLY to backend-legacy        │
                │        for ~12 endpoints — see services/)           │
                └─────────────────────┬───────────────────────────────┘
                                      │
                          ┌───────────┴────────────┐
                          ▼                        ▼
                 ┌─────────────────┐     ┌─────────────────────┐
                 │  Postgres 15    │     │  Oracle 11g (legacy)│
                 │  (primary)      │◄────│  (read-only mirror, │
                 │                 │     │   sync via worker)  │
                 └─────────────────┘     └─────────────────────┘
                          ▲
                          │
                ┌─────────┴─────────┐
                │   Redis 7         │
                │   (cache, queues) │
                └───────────────────┘
```

Yes, the diagram has Oracle in it. Yes, we said we were getting rid of Oracle. See `04-the-oracle-migration.md` and ADR 0003.

## Services, in plain words

### `backend-legacy/` — PHP 7.4

The 2008 system. Originally built by a vendor who folded in 2014. We have the source. We do not have any of the original developers. It does:

- Invoicing (the **only** thing that does invoicing — DO NOT migrate this without a six-month plan).
- Warehouse intake (gudang masuk).
- The "old" shipment tracker (the customer portal still falls back to it for shipments older than 18 months).
- A small amount of partner B2B XML feeds. Yes, XML. Yes, in 2026.

Routing pattern: `public/index.php` is the front controller; everything goes through `app/controllers/*Controller.php`. Models are Active Record-ish. Database access is via `app/lib/DBConnection.php`, which has both an Oracle pool (now mostly stubbed) and a Postgres pool. Read that file before doing anything else in `backend-legacy/`.

### `backend-modern/` — Python 3.11 / FastAPI

Where new work goes. Started in 2022 as a wrapper around the legacy ("Strangler Fig" — yes really, search that on Wikipedia). Now owns:

- Customer-facing tracking API (`/api/tracking/{awb}`).
- Handover (serah-terima) flow between trucks and warehouses.
- Integrations: BPN port system, customs (PIB/PEB), one of three banks for COD reconciliation.
- New auth (OAuth2 / JWT), gradually being adopted by the legacy via shared session bridge (don't ask).

Stack: FastAPI, SQLAlchemy 2.x, Alembic for migrations, Pydantic v2, Redis for caching and async tasks, plain `httpx` for outbound integrations.

### `frontend-customer-portal/` — Next.js 14

The website at `nusantara.id` (well, the tracking part of it; the marketing site is on a separate WordPress that we pretend doesn't exist). App Router. TypeScript. Mostly server components. Calls the modern backend through nginx at `/api`. Strings are bilingual (Bahasa + English) by design — see Bu Sari's note in `00-WELCOME`.

### `frontend-admin/` — React 16 / CRA

Internal admin tool for ops. Built in 2019 with Create React App. Still works. Still on react-router-dom v5. Class components in places. We have been "about to migrate to Next.js" since 2023. Ops loves it. Engineering tolerates it. Do not break it.

### `mobile/` — React Native 0.74

One app, two flavors (driver / customer) toggled by a feature flag at startup. iOS and Android. Pushes via Firebase. Talks to the modern backend.

### `data/` — Python + SQL

Analytics: monthly KPI rollups, ad-hoc Surabaya/Makassar/Jakarta cross-region queries, fraud scoring on COD. Mostly cron'd Python scripts that write to a Postgres reporting schema. There's also a small notebook directory used by the BI team.

## What we wish we had

- A single source of truth for "what is a shipment". Today there are at least three definitions: the legacy `shipments` table, the modern `tracking_events` projection, and whatever the customer portal pieces together.
- Real environments. We have prod and... a staging that is a snapshot of prod from January 2024. (No, really.)
- Unit tests on the legacy. We have ~6.
- A migration off Oracle (yes, still).
- An on-call schedule that does not have one of three engineers on it 80% of the time.

## Glossary

| Term       | Means                                                                |
| ---------- | -------------------------------------------------------------------- |
| AWB        | Air Waybill — our shipment ID. Often called `resi` in customer-facing UI. |
| resi       | Customer-facing word for AWB. Don't change to "AWB" in UI.           |
| gudang     | Warehouse.                                                           |
| kargo      | Cargo, freight.                                                      |
| serah-terima | Handover (truck → warehouse, warehouse → driver, etc.).            |
| BPN        | Badan Pertanahan Nasional — but in our context, the port system at Tanjung Perak/Priok. |
| COD        | Cash on Delivery. Important. Never touch the COD code without ops sign-off. |

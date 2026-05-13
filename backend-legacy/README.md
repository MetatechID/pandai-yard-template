# backend-legacy

The 2008-era PHP system. Originally written by an external vendor (folded 2014).

> **DO NOT TOUCH** unless you have read [`../docs/00-WELCOME-bu-sari.md`](../docs/00-WELCOME-bu-sari.md)
> AND [`../docs/adrs/0001-why-php-still.md`](../docs/adrs/0001-why-php-still.md).
>
> No, seriously. Read them first.

## What this is

A PHP 7.4 application that handles:

- **Invoicing** — the only path. Frozen feature-wise. Patched only for tax/security.
- **Warehouse intake** (gudang masuk) — the daily worker that ingests pallet manifests.
- **Historical shipment tracking** — fallback for shipments older than 18 months.
- **Partner B2B XML feeds** — yes, XML. ~14 listed partners. Audit pending (forever).

## Layout

```
public/             — webroot. apache/php-fpm serves this.
  index.php         — front controller. all routing happens here.
  .htaccess         — apache rewrites (also goes through nginx in prod)
app/
  controllers/      — one class per resource. Procedural-flavored "OOP".
  models/           — Active Record-ish. Mixes Oracle and Postgres calls.
  lib/              — DB pools, helpers, the bits that hold the place together.
sql/                — schema.sql (current Postgres-ish), legacy-oracle.sql (kept for reference).
vendor/             — committed (yes, intentionally — see ADR 0001).
```

## Running locally

You don't, really. Use `docker compose up backend-legacy` from the repo root.

If you absolutely must run on host:
- PHP 7.4 (good luck installing this in 2026)
- Apache 2.4 with mod_php or PHP-FPM
- Postgres reachable at `localhost:5432`
- The Oracle adapter (`oci8`) is only needed if `ORACLE_FALLBACK=true` — almost never.

## What you can change

- Bug fixes with a runbook.
- Tax-rule updates (Finance IT will hand you the SQL).
- Comment-only PRs to clarify the unclear (please).

## What you cannot change

- The Active Record style in models. Don't introduce an ORM.
- The DB connection layer (`app/lib/DBConnection.php`). VP Eng owns this.
- The composer.json / vendor/ pinning. We cannot reproduce a clean install.
- The procedural style in controllers. Refactoring into a "real" framework is a six-month project.

## Why the comments are weird

Many comments are 5-15 years old. They reflect the assumptions of someone who is no longer
here. Trust them, then verify. If a comment says "do not remove this — depends on legacy
timezone bug", believe it.

## If the legacy is on fire

See `../docs/03-on-call.md`, runbooks B and C. Page VP Eng for anything DB-pool related.

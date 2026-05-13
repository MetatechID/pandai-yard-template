# frontend-admin

The internal admin tool for ops. Built in 2019 with Create React App.

> **We keep meaning to migrate this to Next.js.**
> Has been "next quarter" since 2023. Open ticket: NUS-2412 (assigned to nobody).

## Stack (vintage)

- React 16.14
- react-router-dom 5.x
- Plain JavaScript (not TypeScript)
- Some class components in older pages
- Old service worker from 2020 (please don't add a new one — the old one already
  causes occasional cache-bust headaches)

## Run locally

```sh
npm install
npm start
```

Listens on `:3000` (so don't run it at the same time as the customer portal — use
docker-compose, which puts admin on 3001).

## What it does

Ops uses this daily for:

- Looking up shipments + manually correcting state when the legacy gets stuck.
- Issuing manual handovers (truck → warehouse override).
- Monitoring the daily intake at each gudang.
- Pulling COD reconciliation reports.

It is NOT a finance tool. Ops do not touch invoices through here. The (real) invoice
admin is a desktop application maintained by Finance IT — yes, in 2026 — and it talks
directly to Oracle. Don't go near it. Don't try to integrate it into here.

## What you can change

- Bug fixes.
- Small UI tweaks ops requests directly.
- Adding new read-only screens (e.g. a new gudang summary).

## What you should NOT change

- The build pipeline. CRA is unmaintained but works for us.
- The router structure (deep links are bookmarked by ops; breaking URLs breaks workflows).
- The 2020 service worker. Just don't.

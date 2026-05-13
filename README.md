# PT Nusantara Logistics — Tech

Welcome to the Nusantara Logistics engineering codebase.

> **New here?** Start with [`docs/00-WELCOME-bu-sari.md`](./docs/00-WELCOME-bu-sari.md). Bu Sari will walk you through it. Don't go poking around `backend-legacy/` until you've finished the welcome docs — there are reasons it looks like that.

---

## What we do

PT Nusantara Logistics ("Nusantara" internally) is an inter-island logistics and warehousing operator. Founded 2003. Roughly 15,000 employees across the archipelago. Tech team is around 80 engineers split across Jakarta (HQ), Surabaya, and Makassar.

We move kargo. We run gudang. We track resi. We bill shippers. We answer angry phone calls when a container sits at Tanjung Perak for three days because of a paperwork problem.

## Tech, in one paragraph

We are five years into a digital transformation that was scoped for two. The 2008-era PHP system (`backend-legacy/`) still runs invoicing and a depressing amount of warehouse intake. New work goes into `backend-modern/` (Python 3.11 / FastAPI). The customer portal (`frontend-customer-portal/`) is Next.js 14. The internal admin (`frontend-admin/`) is React 16 from a 2019 CRA template that nobody has had time to migrate. The mobile app (`mobile/`) is React Native 0.74. The database is mostly Postgres 15, except for the parts that are still Oracle, which are documented (badly) in `docs/04-the-oracle-migration.md`.

## Repo layout

| Folder                       | What                                                       |
| ---------------------------- | ---------------------------------------------------------- |
| `docs/`                      | Onboarding, runbooks, ADRs. **Read in order.**             |
| `backend-legacy/`            | The 2008 PHP monolith. Touch with care.                    |
| `backend-modern/`            | Python / FastAPI services. Where new work goes.            |
| `frontend-customer-portal/`  | Next.js 14. Shipper-facing tracking UI.                    |
| `frontend-admin/`            | React 16 internal admin. Ops uses it daily.                |
| `mobile/`                    | React Native 0.74. Driver app + customer app.              |
| `data/`                      | Analytics pipelines + ad-hoc SQL + notebooks.              |
| `infrastructure/`            | nginx, docker-compose, deployment notes.                   |
| `ARCHIVE/`                   | Things we tried. Don't run anything in here.               |

## Local dev

```sh
docker compose up
```

This *should* bring up Postgres, Redis, the four service containers, and nginx fronting them on `localhost:8080`. In practice you will hit at least two issues on first run; check `docs/02-deployment.md` and search Slack `#tech-help` for the error message — usually someone has fixed it before.

## On call

Rotation is in `docs/03-on-call.md`. If you are on call and the warehouse intake worker (`backend-legacy/app/lib/DBConnection.php`) is throwing Oracle pool errors at 3am, page VP Eng. Don't try to be a hero on that one.

## Stuff we keep meaning to do

- Migrate the rest of the Oracle tables to Postgres (see ADR 0003).
- Rewrite `frontend-admin/` in Next.js (we have been "about to" for two years).
- Decommission the 2008 PHP. We have been "about to" for five years.
- Untangle the deploy story (currently: ssh into `titan-prod-01`, then ansible, then pray).

— Tim Engineering, PT Nusantara Logistics

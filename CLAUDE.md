# apps/yard — The Yard (Nusantara Logistics) Template

## Scope

This directory holds the canonical template of PT Nusantara Logistics — a fictional Indonesian SOE codebase students live inside for 12 weeks. Per Gogo (2026-05-10), it lives in the Pandai monorepo as the source of truth. Per-student instances are forked into private repos at cohort start.

## Read first

1. `/docs/canon.md` (the Yard / Nusantara Logistics section)
2. `/docs/tech-decisions.md`
3. `/docs/pillars/02-yard.md` (the full Yard Pillar spec — your prompt seed)
4. The marker file `apps/yard/.yard-template-marker` (DO NOT remove)

## Per-student fork model

- This directory = template (canonical source of truth in the Pandai monorepo).
- Student instances live at `github.com/pandai-students/{cohort}-{student-id}-yard` (private).
- Provisioning script (Operations Pillar — `docs/follow-ups/01-yard-provisioning.md`) spawns these on student admission.
- Each student gets read-write access to their own fork only; they never see this template repo or the Pandai monorepo.

## Stack (from bootstrap spec)

Mix by module — deliberately heterogeneous to mirror a real half-migrated SOE codebase:

- **Legacy backend**: PHP 7.4
- **Modern backend**: Python 3.11
- **Frontend**: Next.js + older React
- **Mobile**: React Native 0.74
- **Data**: Python + SQL
- **Database**: Postgres 15 with simulated half-migrated Oracle artifacts (legacy schema fragments, Oracle-style identifiers, partial migration scripts)

## Constraints

- Codebase must feel realistically half-finished — 5 years into a digital transformation.
- Mix of code styles, deliberate technical debt, but functioning.
- **No mention of Peruri.** The company is fictional — Nusantara Logistics is logistics, NOT payments/printing. The choice is deliberate to avoid suggesting Peruri.
- Recurring NPCs:
  - **Bu Sari** — Customer Success Lead, 8-year veteran.
  - **VP Eng** — 12-year veteran.
  - **CTO** — joined 18 months ago.

## What lives here (placeholders the Yard Pillar fills)

- `backend/` — legacy PHP 7.4 services + modern Python 3.11 services.
- `frontend-customer-portal/` — Next.js + older React.
- `frontend-admin/` — internal tooling, mixed style.
- `mobile/` — React Native 0.74 app.
- `infrastructure/` — Postgres 15 + simulated Oracle migration artifacts, deploy scripts.
- `docs/` — internal Yard SOPs, half-finished migration plans, runbooks, and similar in-world artifacts.

## What does NOT live here

- **Per-student state** — lives in each student's private fork.
- **Eval-harness scrapers** — these live in `services/api/src/routes/yard-eval/` (to be added by Yard Pillar; flagged as `FOLLOW-UP: docs/pillars/02-yard.md`).

## Don't

- Don't remove `.yard-template-marker`.
- Don't mix any Pandai monorepo code (UI components, shared packages, Pandai-branded assets) into this directory — it's a different "company".
- Don't reference Pandai or Metatech anywhere in the Nusantara Logistics codebase.

## Get started

Read `/docs/pillars/02-yard.md` to begin the architecture skeleton.

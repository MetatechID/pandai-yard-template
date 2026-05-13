# frontend-customer-portal

Next.js 14 (App Router). The customer-facing tracking site at `nusantara.id`.

> **Note:** the marketing site (`/about`, `/services`, `/karir`) is on a separate
> WordPress instance. We pretend it doesn't exist. Don't try to add marketing pages
> here — Bu Sari will redirect the request to the (non-engineering) Marketing IT team.

## Run locally

```sh
pnpm install
pnpm dev
```

Listens on `:3000`. In `docker compose up`, nginx fronts this at `localhost:8080/`.

## Stack

- Next.js 14, App Router
- React 18, TypeScript
- Server Components by default; client components opt-in
- No CSS framework today — plain CSS modules. (Tailwind PR has been open since 2024-09. Stalled in design review.)
- API calls go to backend-modern via `/api/*` (proxied by nginx in prod, by `next.config.mjs` in dev)

## i18n

Bilingual: Bahasa Indonesia + English. Both render simultaneously in many UI contexts
(e.g. status labels: "Sudah dijemput / Picked up"). This is a deliberate UX choice —
see the welcome doc and Bu Sari's note about not standardising.

## Layout

```
app/
  layout.tsx              — root layout
  page.tsx                — landing
  tracking/[awb]/page.tsx — AWB lookup page (server component, calls /api/tracking/{awb})
components/
  TrackingTimeline.tsx    — bilingual timeline component
```

## Things you should know

- Top 200 AWBs are pre-warmed via ISR cache after each deploy.
- The status label strings are duplicated between here, the legacy PHP, and the modern
  Python backend. We have an open ticket to centralise (NUS-2701). It will not be done soon.
- Don't introduce a state management library for tracking. The pages are mostly server
  components and don't need it.

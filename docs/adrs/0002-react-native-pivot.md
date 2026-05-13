# ADR 0002: Pivot to React Native for the mobile app

- Status: Accepted
- Date: 2023-08-30
- Deciders: CTO, VP Eng, Mobile Lead (since departed)

## Context

Up to mid-2023 we shipped two native mobile apps: an iOS app in Swift and an Android app
in Kotlin. Two codebases, two release trains, two QA sweeps, two pager rotations. The
mobile team was four engineers (2 iOS, 2 Android) and we were chronically behind on
parity — features would land on Android first and ship to iOS three weeks later, or
vice versa.

The driver app (used by ~3,000 contracted truck drivers) and the customer app (free,
public) had ~70% functional overlap. We had been duplicating work for years.

In 2023-Q2 we lost both senior iOS engineers in a six-week window (one to a bigger
company, one to family relocation to Makassar — actually still at Nusantara, just no longer
on mobile). Hiring senior iOS in Jakarta proved very hard at the comp band finance was
willing to approve.

## Decision

**Migrate to a single React Native 0.74 codebase that produces both iOS and Android
builds and serves both the driver and customer apps via a feature flag.**

- Target: React Native 0.74 (latest stable at time of decision; chosen over Flutter
  because the broader frontend org has React fluency).
- Single repo at `mobile/`.
- Feature flag at startup determines driver vs customer flavor.
- Native modules retained for: barcode scanning (driver), background location (driver),
  push notifications (Firebase). Everything else in JS/TS.
- Existing Swift and Kotlin code archived (see `ARCHIVE/`) but not actively maintained
  after 2024-01-31.

## Consequences

### Good

- Single codebase for two apps. Initial estimate: ~40% engineering time reclaimed. Actual
  (measured 2024-Q4): ~30%. Still a large win.
- We can hire React engineers, who are abundant in Jakarta. Mobile team grew from 2 (post-attrition)
  to 4 within three months of the decision.
- Feature parity between iOS and Android went from "weeks behind" to "same release".
- Shared components between mobile and `frontend-customer-portal` (Next.js) — same brand
  language, in some cases literal copy-paste of small components.

### Bad

- Native module maintenance is now a specialised skill we have less of. We rely on a
  small set of community packages for barcode scanning + background location; one of them
  was abandoned in 2024 and we are pinned to an old version.
- iOS App Store reviews became more sensitive — we had two rejections in 2024 over
  background location entitlement strings. Fixed, but each cost a week.
- Driver app performance on cheap Android phones (the median driver phone is ~$120 USD)
  is noticeably worse than the native Kotlin version was. We've optimised; it's "okay" now,
  not "good". Field complaints ongoing.
- Push notifications via Firebase have a known delivery issue on certain Xiaomi devices
  in Indonesia (battery-saver kills the service). This was true for the native version
  too, but we used to have an Android engineer who knew how to work around it. Now we
  don't.

## Lessons

- One person knowing the platform deeply > four people knowing the framework superficially.
  We should have kept one strong native Android engineer for the driver app's perf-critical paths.
- The "single codebase saves time" math is real but is reduced by ~25% by the platform-specific
  edges (entitlements, store reviews, OEM quirks). Plan for that.
- Feature-flagging two apps in one binary is operationally simpler than I expected and
  has not caused the kind of accidents we feared.

## Status today (2026)

The decision has paid off net-positive. The mobile team is stable. We ship roughly weekly.
The driver app is the friction point — see ongoing project NUS-3402 ("Driver App Perf").
We are not going back to native. We are also not migrating to Flutter, no matter how many
times the question gets asked at all-hands.

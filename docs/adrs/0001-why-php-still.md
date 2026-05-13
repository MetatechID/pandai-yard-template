# ADR 0001: Why the 2008 PHP system is still load-bearing

- Status: Accepted (perpetually)
- Date: 2023-04-12 (most recent re-affirmation; original decision predates this ADR format)
- Deciders: VP Eng, CTO, Head of Finance IT, COO

## Context

Nusantara's invoicing, gudang intake, partner XML feeds, and historical shipment lookups
(>18 months old) are still served by `backend-legacy/`, a PHP 7.4 codebase originally
written by an external vendor in 2008. The vendor folded in 2014; we own the source but
have none of the original engineers.

Every CTO since 2018 has proposed retiring it. Every plan has either been deferred,
descoped, or partially executed and stalled. The current state of "modernise or wrap"
has been the de facto answer for five years.

This ADR exists so we stop having the same conversation every six months. New engineers
read this first.

## Decision

**Keep `backend-legacy/` running. Do not attempt a wholesale rewrite. Strangler-fig only —
new functionality goes into `backend-modern/`, and we only port a legacy subsystem when
there is a concrete product reason to do so.**

Specifically:

1. The legacy invoicing module is **frozen feature-wise** but kept patched for security
   and tax-rule changes. Owners: Finance IT (rules), VP Eng (security).
2. New shipment-related functionality is built in `backend-modern/`, with the legacy as
   the historical system of record for shipments older than 18 months (read-only fallback).
3. The legacy `vendor/` directory is **committed to git** because the original `composer.lock`
   pins packages that are no longer reachable on packagist (deleted, renamed, or the
   maintainer pulled them). We cannot reproduce a clean install. Treat `vendor/` as a binary.
4. No PRs to "clean up" the legacy without a concrete product motivation and a written
   rollback plan. VP Eng must approve every legacy PR.

## Consequences

### Good

- We don't burn 18+ engineer-months on a rewrite that has historically failed at this
  company (see ARCHIVE/2019-rewrite-attempt/).
- Invoicing, the most regulated and most fragile subsystem, doesn't move while we have
  no test coverage on it.
- Engineers focus on customer-visible work in `backend-modern/`.

### Bad

- We are stuck on PHP 7.4, which is EOL upstream. We pin a mirror image. Security risk
  is real; we mitigate with a thin nginx WAF and by not exposing legacy directly.
- Recruiting is harder — candidates ask "what stack" and "PHP" lands badly even though
  it's a small fraction of new work.
- Onboarding is harder. Every new engineer has to read this ADR and understand the
  half-state. We accept this cost.
- Every six months a new exec asks "why is PHP still here". This document is the answer.

### Mitigations

- We invest in observability around the legacy (logs, request traces) so we can debug
  blind, since we don't write tests for it.
- The Oracle migration (ADR 0003) eats into the legacy from below — every table moved to
  Postgres makes a future legacy retirement easier.
- We keep VP Eng (12-year veteran) as the single point of escalation for legacy issues.
  This is a known bus factor risk; the mitigation is detailed runbooks, not a second person.

## Revisit conditions

We will revisit this ADR if any of:

- VP Eng leaves (forces a knowledge-transfer plan).
- A regulator mandates a security update we cannot apply on PHP 7.4.
- The Oracle migration completes (then a legacy-retirement plan becomes feasible).
- We ship the consolidated invoicing module in `backend-modern/` (target: TBD; nothing imminent).

Until then: do not touch `backend-legacy/` without approval. We are not being lazy. We
are being deliberate.

# 2019 Rewrite Attempt

In 2019 we tried to rewrite the entire backend in Go. We did not ship.

## What we tried

A small team (3 engineers, including the then-CTO) spent ~7 months building "Nusantara
v2" — a Go monolith intended to replace the 2008 PHP system. The plan was a 9-month
write-and-cutover.

## What happened

- Month 1-3: Greenfield felt great. We rebuilt tracking, intake, and warehouse models cleanly.
- Month 4: Realized invoicing was harder than estimated. Specifically: the legacy PHP's
  invoicing has 5 years of accumulated business rules (SLA exceptions for specific shippers,
  weekend rate adjustments, regional tax rules, and ~40 customer-specific overrides) that
  are not documented anywhere except in the SQL of the legacy stored procedures. Rewriting
  required reverse-engineering them all. We started.
- Month 5-6: We discovered that the partner XML feed schema was undocumented and used by
  14 listed partners with subtly different dialects. Reverse-engineering this would have
  required coordination with every partner.
- Month 6: The CTO left.
- Month 7: New CTO inherited the project, did a frank assessment, killed it.

The Go code is preserved here in spirit (we're not actually checking in the code; the
repo got deleted in 2021 storage cleanup — see the irony).

## What we kept

- The lessons (see ADRs 0001 and 0003).
- The strangler-fig approach in `backend-modern/` started after this — built carefully
  to AVOID the trap of "rewrite from scratch".
- A vague residual sadness about Go.

## Why this directory exists

So that when the question comes up — "why don't we just rewrite the whole thing?" —
we have a documented answer. We tried. It went poorly. The new approach (strangler-fig
into `backend-modern/`) is the lesson.

If you're a new engineer reading this and thinking "but we could do it better this time":
maybe. Bring evidence. Read ADR 0001 first.

— VP Eng, written 2021, lightly updated 2024

# On-Call

We have an on-call rotation. It is not great. We are working on it.

## Rotation

Weekly, Monday 09:00 to Monday 09:00 WIB (Jakarta time). Rotation is in PagerDuty —
search for the "Nusantara Engineering Primary" schedule.

Current rotation (as of Q1 2026):

| Week starting | Primary       | Secondary    |
| ------------- | ------------- | ------------ |
| 2026-01-06    | Andi          | Maya         |
| 2026-01-13    | Maya          | Rizki        |
| 2026-01-20    | Rizki         | Andi         |
| 2026-01-27    | Andi          | Maya         |
| ...           | ...           | ...          |

(Yes, three names. That's the current eng-on-call pool. We're trying to get to five.
If you onboard and want to join the rotation, talk to VP Eng — but please don't volunteer
in your first 90 days.)

## Pages

A page comes via PagerDuty SMS + phone call. If you get one and you're not on call,
ignore it (someone has misconfigured something — happens once a quarter).

Page sources:

| Source                              | Severity | What to do                                                |
| ----------------------------------- | -------- | --------------------------------------------------------- |
| `nusantara-portal-down`             | P1       | Customer site down. Start at runbook A.                   |
| `nusantara-tracking-error-rate`     | P1       | Tracking API error rate >5%. Runbook B.                   |
| `nusantara-legacy-db-pool`          | P1       | Legacy PHP can't reach the DB pool. Runbook C. **Page VP Eng.**  |
| `nusantara-modern-5xx`              | P2       | Backend-modern is throwing 5xx. Runbook D.                |
| `nusantara-bpn-integration-down`    | P2       | Port system at Tanjung Perak is unreachable. Runbook E. (often it's their side; wait 10 min before paging anyone.) |
| `nusantara-cod-reconciliation-lag`  | P2       | COD recon job is behind. Runbook F. **Don't restart it without ops.** |
| `nusantara-disk-full-titan`         | P2       | titan-prod-01 disk >90%. Runbook G.                       |
| `nusantara-cert-expiring`           | P3       | TLS cert <14 days. Renew during business hours.           |

## Runbooks (one-liners — full versions in Confluence)

**A. Portal down.** Check nginx on titan first. Then backend-modern. Then DB. Don't
restart Next.js until you've ruled out the other three — restarting it eats 10 minutes
of cache rewarm and angers Bu Sari.

**B. Tracking error rate.** First: is the legacy reachable from backend-modern?
`curl -s http://backend-legacy/healthz.php` from a backend-modern pod. If no, see Runbook C.
If yes, check the Oracle sync worker — if it died, the modern's tracking router falls
back to the legacy, which falls back to Oracle, which is now stub-only. Cascading sadness.

**C. Legacy DB pool.** Page VP Eng. Don't try to fix it. The connection string handling in
`backend-legacy/app/lib/DBConnection.php` has at least three known footguns and "fixing it"
without context will turn a 1-hour outage into a 6-hour outage.

**D. Backend-modern 5xx.** Check Sentry for the top error. 80% of the time it's a Pydantic
validation error from the BPN port system returning new fields we haven't handled. Patch in
`services/ports_integration.py`, ship.

**E. BPN down.** Check `https://status.bpn.example/` (their fictional status page).
If they're red: nothing we can do; tell ops; we have a 4-hour SLA grace for upstream.
If they're green: page their support. We have a hotline.

**F. COD reconciliation lag.** This is finance-critical. **Do not restart it.** Page the
on-call SRE *and* the finance ops liaison (number in PagerDuty). Restarting it mid-batch
double-charges customers. Yes, this happened. Yes, it was bad.

**G. Disk full on titan.** 99% of the time it's `/var/log/nusantara/deploy.log` because
the rotator died. `sudo logrotate -f /etc/logrotate.d/nusantara`. If that doesn't free
enough: `du -sh /var/log/* | sort -h` and find the offender.

## Escalation

```
Primary on-call → Secondary → VP Eng → CTO
```

VP Eng wants to be paged for: anything legacy, anything financial, any data loss event.
CTO wants to be paged for: anything that hits social media or a regulator. (Don't worry,
you'll know when.)

## Common firefights (be ready)

**Friday 5pm Surabaya cargo intake spike.** Every Friday. Like clockwork. If the warehouse
intake worker starts complaining, scale the legacy pool to 3 nodes. (Yes, we know we should
auto-scale. See `infrastructure/deployment/titan-prod.md` — search "FOLLOW-UP autoscale".)

**End-of-month invoice run.** Last business day, 22:00 WIB. Backend-legacy gets hammered.
Don't deploy anything that night. Don't even ship a config change. Treat it as a freeze.

**National holiday surge.** Lebaran, Christmas, Imlek. Volume can 3-4x. We pre-warm caches.
There's a checklist in Confluence — "Hari Raya Readiness". Owner: Maya.

**The 3am Oracle pool error.** If you see `ORA-12514` or anything Oracle in the legacy logs at
3am: do NOT try to fix it. Page VP Eng. Go back to bed if VP Eng confirms they've got it.
This one has a fix in flight — see ADR 0003. We are not there yet.

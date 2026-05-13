# Deployment

This document is what we *actually* do, not what the playbook says. The playbook is in
`infrastructure/deployment/` if you want the official version. This file is the truth.

## tl;dr

```
1. merge to main
2. CI builds artifacts (sometimes)
3. ssh into titan-prod-01
4. cd /opt/nusantara/deploy
5. ./deploy.sh <service-name>     # this calls ansible
6. tail -f /var/log/nusantara/deploy.log
7. if it goes wrong: ./rollback.sh <service-name> <previous-tag>
8. tell ops in #ops-deploy
```

## What's titan-prod-01

The deploy bastion. Lives in a rack at the Cyber building. SSH key is held by VP Eng,
the SRE on rotation, and (for emergencies) by Bu Sari. Don't ask me why Bu Sari has it
— there was an incident in 2022 and it was easier to give her a key than to explain
the same thing twice. Don't lose it.

If you're new and you don't have the key yet: you don't deploy yet. Pair with someone
who does for the first ~5 deploys.

## Per-service notes

### backend-modern (Python)

- CI builds a Docker image, pushes to internal registry.
- `./deploy.sh backend-modern` pulls the image on each app node and rolls them.
- Runs alembic migrations *before* rolling — make sure your migration is backward-compatible
  for at least one release. (Yes, we got bitten in 2024-08. See incident #INC-1247.)

### backend-legacy (PHP)

- No Docker. Yes, really.
- `./deploy.sh backend-legacy` rsyncs `backend-legacy/` to each app node and reloads PHP-FPM.
- Migrations are applied by hand by VP Eng. There is a script. He doesn't trust it.
- If you need a schema change in legacy: open a ticket, write the SQL, **wait for VP Eng**.
- Do NOT run `composer install` on prod. The vendor/ directory is committed (yes, on purpose,
  see ADR 0001 for why).

### frontend-customer-portal (Next.js)

- CI builds, pushes to registry.
- `./deploy.sh frontend-customer-portal` rolls the Next.js containers.
- ISR cache lives on each node — purges on deploy, gets rewarmed by a cron that hits the
  top 200 AWBs from yesterday.

### frontend-admin (React 16 CRA)

- `npm run build` produces a `build/` dir. CI uploads to S3-compatible bucket.
- nginx serves it from `/admin`.
- Cache-bust is via filename hash. If the page won't update, hard-refresh and check the network
  tab — sometimes the old service worker (yes, we still have one from 2020) gets in the way.

### mobile

- We don't deploy mobile from titan. We deploy from a CI runner with the Apple/Google credentials.
- TestFlight + Play internal track first, **always**, even for hotfixes. We lost a week in 2023
  shipping a broken APK directly. Never again.

## What can go wrong

### "Site is down"

Order of investigation:

1. Is `nginx` up on titan? `ssh titan-prod-01; sudo systemctl status nginx`
2. Is backend-modern healthy? `curl http://localhost:8002/healthz` from titan.
3. Is the DB up? `pg_isready -h db-prod-01 -p 5432`
4. Is the legacy up? `curl http://localhost:8001/healthz.php` (yes, php).
5. Are we being hugged-of-death by a flash sale customer? Check the BPN queue depth.

### "Customer can't see their tracking"

Almost always one of:

- The AWB is older than 18 months and the legacy fallback is timing out.
- The Oracle mirror sync worker died (check `worker-oracle-sync` logs).
- The customer typed `O` instead of `0` and we are too kind to validate. (Yes.)

### "Invoices won't generate"

- This is always backend-legacy. Page VP Eng. **Do not try to fix this yourself unless
  you have personally written PHP in the last 12 months.**

## Things we keep meaning to fix

- Move backend-legacy into Docker so we can stop SSHing into it.
- A real CI/CD with auto-rollback. Currently rollback is "ssh in and run a script and pray".
- Per-PR preview environments. (Lol.)
- A staging environment that isn't a 14-month-old snapshot.

## Who has prod access

| Person       | Role                       | Access         |
| ------------ | -------------------------- | -------------- |
| VP Eng       | Eng leadership             | full root      |
| SRE rotation | Rotates weekly             | sudo           |
| Bu Sari      | Customer Success Lead      | read + restart |
| CTO          | Should not need it         | read           |
| You          | Probably nothing yet       | TBD            |

If you need access: open a ticket against `#it-access`, get VP Eng to approve, set up
hardware key, then pair with the SRE on rotation for your first prod operation.

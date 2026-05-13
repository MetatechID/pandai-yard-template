# titan-prod-01

The deploy bastion. Lives in a rack at the Cyber building, Jakarta. Single host.

> Yes, single host. Yes, we know. There's a project to add `titan-prod-02` for HA.
> Has been "next quarter" since 2023. See FOLLOW-UP autoscale notes below.

## What's on it

- ansible (running locally on titan, pointed at the app fleet)
- the `deploy.sh` and `rollback.sh` scripts (in `/opt/nusantara/deploy/`)
- a copy of all per-service env files (in `/etc/nusantara/env/`, mode 0600, owned root)
- /var/log/nusantara/* — the deploy logs
- the renderer for the prod nginx.conf (ansible template)
- the systemd timer for the monthly invoice runner trigger

## What it does NOT have

- Application code. Apps run on the app fleet (`app-prod-01..05`), not on titan.
- The DB. Postgres is on `db-prod-01`. Oracle is on `titan-oracle-01` (NB: the naming
  is unfortunate; that's a separate machine despite the name).

## Access

SSH key gate:
- VP Eng: full root.
- SRE rotation: sudo, no root shell.
- Bu Sari: read-only + restart for the customer-facing services. (Story: 2022 incident,
  too long to retell here. See Confluence "Why Bu Sari has prod restart".)
- CTO: read-only.

You don't get a key your first 30 days. You can pair-deploy via tmux with someone who
has one. Use it to learn; don't get cute.

## Deploys

```sh
ssh titan-prod-01
cd /opt/nusantara/deploy
./deploy.sh <service-name>          # e.g. ./deploy.sh backend-modern
tail -f /var/log/nusantara/deploy.log
```

## Rollback

```sh
ssh titan-prod-01
cd /opt/nusantara/deploy
./rollback.sh <service-name> <previous-tag>
# e.g. ./rollback.sh backend-modern v0.7.2
```

The script will refuse to roll back across a database migration boundary unless you pass
`--i-know-what-i-am-doing`. Don't pass that flag without paging VP Eng. See INC-1247
for the case study.

## FOLLOW-UPs

- **autoscale**: The `backend-legacy` PHP fleet does not autoscale. We manually scale
  to 3 nodes on Friday afternoons (Surabaya intake spike) and back to 2 on Monday
  mornings. There's a story to add this to ansible. There's been a story since 2023-Q2.
  Owner: SRE. ETA: untouched.

- **titan-prod-02**: Build a passive secondary so we can survive titan-prod-01 going down.
  Today, titan dying = we cannot deploy or rollback for the duration. We've had two
  hour-long titan outages in 2025; both during business hours; both stressful. Owner:
  SRE + VP Eng. ETA: keeps slipping.

- **infra-as-code**: Move from "shell scripts on titan" to ansible playbooks in a
  separate ops repo. Halfway done. The ansible playbooks exist; some shell scripts
  haven't been converted; some of the conversion was done badly and has been
  silently breaking on edge cases. Cleanup project NUS-2890.

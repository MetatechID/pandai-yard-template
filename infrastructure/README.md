# infrastructure

What's here:

- `nginx.conf` — the reverse proxy config. Routes `/api → backend-modern`,
  `/legacy → backend-legacy`, `/admin → frontend-admin`, `/ → frontend-customer-portal`.
- `docker-compose.yml` — local dev stack (also referenced by the top-level docker-compose).
- `deployment/` — the (loose, tribal) deployment notes for `titan-prod-01`.

The real prod infrastructure is **not** in this repo. It's managed through ansible
playbooks in a separate ops repo + a small amount of Terraform (also separate). What
lives here is local-dev and notes.

## Why so thin

Historical reasons. The infra-as-code journey hasn't reached this app yet — we're
midway through migrating prod infra to managed ansible + Terraform from a previous
"shell scripts on titan" world. ETA forever.

# data

Analytics + ad-hoc SQL + notebooks for the BI team.

## What lives here

- `notebooks/` — Jupyter notebooks. Mostly used by the BI team in Surabaya for ad-hoc
  monthly digging. Don't put any prod logic in notebooks.
- `pipelines/` — Python ETL scripts. Cron'd via airflow (managed externally). The
  scripts live here; the airflow DAG glue is in a separate ops repo.
- `sql/` — KPI rollup SQL. Runs against the read replica. Not against prod-primary.

## Run a notebook

```sh
cd notebooks
jupyter lab
```

You'll need read access to the Postgres reporting schema. Bu Sari can grant it; she
has been the de facto data-access steward since the Data Engineer left in 2024.

## ETL conventions

- All scripts read from env-configured DB (`DATABASE_URL_REPLICA`).
- Write into `reporting.*` schema, never into the OLTP tables.
- Idempotent — re-running a script for the same date partition should produce the same result.
- If you need to run against the legacy Oracle: don't. Pipe through the Postgres mirror
  instead, even if lag is up to 30s. We've been bitten by Oracle session limits twice in 2024.

## Audience

- BI team in Surabaya (Maya leads).
- Finance reports out to leadership monthly.
- Occasionally Bu Sari pulls something for a customer post-mortem.

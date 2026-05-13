"""shipment_etl — daily shipment rollup into reporting.daily_shipments.

Cron'd via airflow at 02:30 WIB. The DAG glue is in the ops repo (not here);
this script is the actual logic.

Idempotent: running twice for the same date partition produces the same result
(uses INSERT ... ON CONFLICT DO UPDATE).

Reads from the read replica via DATABASE_URL_REPLICA. Writes to reporting.* via
DATABASE_URL_REPORTING. Yes, two URLs. The reporting DB is on a separate Postgres
instance specifically because we don't want analytics to be able to OOM the OLTP.
"""

from __future__ import annotations

import os
import sys
from datetime import date, datetime, timedelta

import click
import structlog
from sqlalchemy import create_engine, text

log = structlog.get_logger()


def _engines() -> tuple:
    src_url = os.getenv("DATABASE_URL_REPLICA")
    dst_url = os.getenv("DATABASE_URL_REPORTING")
    if not src_url or not dst_url:
        log.error("missing DATABASE_URL_REPLICA or DATABASE_URL_REPORTING")
        sys.exit(2)
    return create_engine(src_url), create_engine(dst_url)


@click.command()
@click.option(
    "--for-date",
    "for_date",
    default=None,
    help="ISO date (YYYY-MM-DD). Defaults to yesterday WIB.",
)
def main(for_date: str | None) -> None:
    """Roll up shipment counts by hub for a given date."""
    if for_date is None:
        # WIB-ish — close enough for a daily rollup.
        target = (datetime.utcnow() + timedelta(hours=7) - timedelta(days=1)).date()
    else:
        target = date.fromisoformat(for_date)

    src, dst = _engines()

    log.info("etl.start", date=target.isoformat())

    with src.connect() as s:
        rows = s.execute(
            text(
                """
                SELECT origin_city,
                       count(*)                             AS shipments,
                       sum(CASE WHEN status_code = 'EXCEPTION' THEN 1 ELSE 0 END) AS exceptions,
                       sum(kg)                              AS total_kg
                  FROM shipments_mirror
                 WHERE created_at::date = :d
                 GROUP BY origin_city
                """
            ),
            {"d": target},
        ).fetchall()

    if not rows:
        log.warning("etl.no_rows", date=target.isoformat())
        return

    with dst.begin() as d:
        for r in rows:
            d.execute(
                text(
                    """
                    INSERT INTO reporting.daily_shipments
                                (for_date, origin_city, shipments, exceptions, total_kg)
                         VALUES (:d, :city, :n, :ex, :kg)
                    ON CONFLICT (for_date, origin_city) DO UPDATE
                        SET shipments  = EXCLUDED.shipments,
                            exceptions = EXCLUDED.exceptions,
                            total_kg   = EXCLUDED.total_kg,
                            updated_at = NOW()
                    """
                ),
                {
                    "d": target,
                    "city": r.origin_city,
                    "n": r.shipments,
                    "ex": r.exceptions,
                    "kg": r.total_kg,
                },
            )

    log.info("etl.done", date=target.isoformat(), hubs=len(rows))


if __name__ == "__main__":
    main()

-- monthly KPI rollup. Run against the read replica (NEVER prod-primary).
--
-- This SQL is the source for the monthly leadership report. Owner: Maya (BI, Surabaya).
-- Output is two result sets:
--
--   1. Volume + on-time rate by origin city.
--   2. Top 10 problem routes (highest exception rate, min 50 shipments).
--
-- The "on-time" definition is "delivered within SLA window for the route". The SLA
-- table is in `reporting.route_sla`. Surabaya↔Makassar SLAs are intentionally
-- generous because of ferry / weather variance. Don't tighten without ops sign-off.

\set the_month '2025-09'
\set start_date '2025-09-01'
\set end_date   '2025-10-01'

-- ── 1) Volume + on-time rate by origin ────────────────────────────────────────
WITH base AS (
    SELECT s.awb,
           s.origin_city,
           s.destination_city,
           s.created_at,
           s.last_event_at,
           s.status_code,
           sla.sla_hours
      FROM shipments_mirror s
      LEFT JOIN reporting.route_sla sla
             ON sla.origin_city      = s.origin_city
            AND sla.destination_city = s.destination_city
     WHERE s.created_at >= :'start_date'::date
       AND s.created_at <  :'end_date'::date
),
classified AS (
    SELECT origin_city,
           awb,
           CASE WHEN status_code = 'DELIVERED'
                 AND EXTRACT(EPOCH FROM (last_event_at - created_at)) / 3600 <= sla_hours
                THEN 1 ELSE 0 END AS on_time,
           CASE WHEN status_code = 'EXCEPTION' THEN 1 ELSE 0 END AS is_exception
      FROM base
)
SELECT origin_city,
       count(*)                                                AS shipments,
       sum(on_time)                                            AS on_time_count,
       round(sum(on_time)::numeric / count(*) * 100, 2)        AS on_time_pct,
       sum(is_exception)                                       AS exception_count,
       round(sum(is_exception)::numeric / count(*) * 100, 2)   AS exception_pct
  FROM classified
 GROUP BY origin_city
 ORDER BY shipments DESC;


-- ── 2) Top 10 problem routes ──────────────────────────────────────────────────
SELECT origin_city,
       destination_city,
       count(*)                                                  AS shipments,
       sum(CASE WHEN status_code = 'EXCEPTION' THEN 1 ELSE 0 END) AS exceptions,
       round(
           sum(CASE WHEN status_code = 'EXCEPTION' THEN 1 ELSE 0 END)::numeric
             / NULLIF(count(*), 0) * 100, 2
       )                                                          AS exception_pct
  FROM shipments_mirror
 WHERE created_at >= :'start_date'::date
   AND created_at <  :'end_date'::date
 GROUP BY origin_city, destination_city
 HAVING count(*) >= 50
 ORDER BY exception_pct DESC
 LIMIT 10;

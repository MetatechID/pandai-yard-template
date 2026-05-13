<?php
namespace Nusantara\Legacy\Models;

use Nusantara\Legacy\Lib\DBConnection;

/**
 * Shipment — Active Record-ish.
 *
 * Mixes Postgres (mirror) and Oracle (primary) reads. Writes go to Oracle in prod
 * (via the legacy connection) and the sync worker propagates to the mirror.
 *
 * The "_source" public field tells you where the data came from. Useful for debugging.
 * Do not surface it in customer-facing UI.
 */
class Shipment
{
    public ?string $awb = null;
    public ?string $origin_city = null;
    public ?string $destination_city = null;
    public ?string $status_code = null;
    public ?string $created_at = null;
    public ?string $last_event_at = null;
    public ?string $shipper_id = null;
    public ?float  $kg = null;
    public string $_source = 'unknown';

    public static function findByAwb(string $awb): ?self
    {
        // Try Postgres mirror first.
        $pg = DBConnection::getPostgresPool();
        $stmt = $pg->prepare(
            'SELECT awb, origin_city, destination_city, status_code,
                    created_at, last_event_at, shipper_id, kg
               FROM shipments_mirror
              WHERE awb = ?'
        );
        $stmt->execute([$awb]);
        $row = $stmt->fetch();
        if ($row) {
            return self::fromRow($row, 'pg');
        }

        // Mirror miss — try Oracle if available. (For very fresh shipments not yet replicated,
        // or for very old shipments archived out of the mirror.)
        if (DBConnection::isOracleAvailable()) {
            $oci = DBConnection::getOraclePool();
            // Quoted identifiers because Oracle is uppercase by default and our schema
            // happens to be quoted-mixed-case. Long story.
            $stid = oci_parse(
                $oci,
                'SELECT "AWB", "ORIGIN_CITY", "DESTINATION_CITY", "STATUS_CODE",
                        TO_CHAR("CREATED_AT", \'YYYY-MM-DD"T"HH24:MI:SS\') AS "CREATED_AT",
                        TO_CHAR("LAST_EVENT_AT", \'YYYY-MM-DD"T"HH24:MI:SS\') AS "LAST_EVENT_AT",
                        "SHIPPER_ID", "KG"
                   FROM "SHIPMENTS"
                  WHERE "AWB" = :awb'
            );
            oci_bind_by_name($stid, ':awb', $awb);
            @oci_execute($stid);
            $orow = oci_fetch_assoc($stid);
            if ($orow) {
                $normalised = [];
                foreach ($orow as $k => $v) {
                    $normalised[strtolower($k)] = $v;
                }
                return self::fromRow($normalised, 'oracle');
            }
        }

        return null;
    }

    public static function create(array $body): self
    {
        // Writes go to Oracle in prod. In dev/stub, we write to the PG mirror as if it were primary.
        if (DBConnection::isOracleAvailable()) {
            // Real Oracle insert path. Sequence-driven AWB if not provided.
            $oci = DBConnection::getOraclePool();
            $awb = $body['awb'] ?? null;
            if (!$awb) {
                $stid = oci_parse($oci, 'SELECT "SEQ_AWB".NEXTVAL AS "AWB" FROM DUAL');
                @oci_execute($stid);
                $r = oci_fetch_assoc($stid);
                $awb = 'NL' . $r['AWB'];
            }
            $insert = oci_parse(
                $oci,
                'INSERT INTO "SHIPMENTS" ("AWB", "ORIGIN_CITY", "DESTINATION_CITY",
                                          "STATUS_CODE", "SHIPPER_ID", "KG", "CREATED_AT")
                 VALUES (:awb, :origin, :dest, \'CREATED\', :shipper, :kg, SYSDATE)'
            );
            oci_bind_by_name($insert, ':awb', $awb);
            oci_bind_by_name($insert, ':origin', $body['origin_city']);
            oci_bind_by_name($insert, ':dest', $body['destination_city']);
            oci_bind_by_name($insert, ':shipper', $body['shipper_id']);
            $kg = (float)($body['kg'] ?? 0);
            oci_bind_by_name($insert, ':kg', $kg);
            @oci_execute($insert);
            oci_commit($oci);

            $s = new self();
            $s->awb = $awb;
            $s->origin_city = $body['origin_city'];
            $s->destination_city = $body['destination_city'];
            $s->status_code = 'CREATED';
            $s->shipper_id = $body['shipper_id'];
            $s->kg = $kg;
            $s->_source = 'oracle';
            return $s;
        }

        // Stub path (dev) — write straight to mirror.
        $pg = DBConnection::getPostgresPool();
        $awb = $body['awb'] ?? ('NL' . random_int(100000, 999999));
        $stmt = $pg->prepare(
            'INSERT INTO shipments_mirror (awb, origin_city, destination_city,
                                           status_code, shipper_id, kg, created_at)
             VALUES (?, ?, ?, \'CREATED\', ?, ?, NOW())'
        );
        $stmt->execute([
            $awb,
            $body['origin_city'],
            $body['destination_city'],
            $body['shipper_id'],
            $body['kg'],
        ]);

        $s = new self();
        $s->awb = $awb;
        $s->origin_city = $body['origin_city'];
        $s->destination_city = $body['destination_city'];
        $s->status_code = 'CREATED';
        $s->shipper_id = $body['shipper_id'];
        $s->kg = (float)$body['kg'];
        $s->_source = 'pg';
        return $s;
    }

    private static function fromRow(array $row, string $source): self
    {
        $s = new self();
        $s->awb = $row['awb'] ?? null;
        $s->origin_city = $row['origin_city'] ?? null;
        $s->destination_city = $row['destination_city'] ?? null;
        $s->status_code = $row['status_code'] ?? null;
        $s->created_at = $row['created_at'] ?? null;
        $s->last_event_at = $row['last_event_at'] ?? null;
        $s->shipper_id = $row['shipper_id'] ?? null;
        $s->kg = isset($row['kg']) ? (float)$row['kg'] : null;
        $s->_source = $source;
        return $s;
    }
}

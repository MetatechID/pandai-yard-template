<?php
namespace Nusantara\Legacy\Models;

use Nusantara\Legacy\Lib\DBConnection;

/**
 * Warehouse — gudang master data.
 *
 * The warehouses table is fully on Postgres (migrated 2022-Q4).
 * This model is straightforward AR-style. No Oracle path here.
 */
class Warehouse
{
    public string $id;
    public string $name;
    public string $city;
    public ?string $province = null;
    public ?string $manager_email = null;
    public bool $is_active = true;

    public static function find(string $id): ?self
    {
        $pdo = DBConnection::getPostgresPool();
        $stmt = $pdo->prepare(
            'SELECT id, name, city, province, manager_email, is_active
               FROM warehouses
              WHERE id = ?
                AND is_active = TRUE'
        );
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            return null;
        }

        $w = new self();
        $w->id = $row['id'];
        $w->name = $row['name'];
        $w->city = $row['city'];
        $w->province = $row['province'];
        $w->manager_email = $row['manager_email'];
        $w->is_active = (bool)$row['is_active'];
        return $w;
    }

    /**
     * For ops dashboards. Returns all active warehouses.
     */
    public static function allActive(): array
    {
        $pdo = DBConnection::getPostgresPool();
        $rows = $pdo->query(
            'SELECT id, name, city, province
               FROM warehouses
              WHERE is_active = TRUE
              ORDER BY city, name'
        )->fetchAll();
        $out = [];
        foreach ($rows as $r) {
            $w = new self();
            $w->id = $r['id'];
            $w->name = $r['name'];
            $w->city = $r['city'];
            $w->province = $r['province'];
            $out[] = $w;
        }
        return $out;
    }
}

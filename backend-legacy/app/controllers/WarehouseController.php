<?php
namespace Nusantara\Legacy\Controllers;

use Nusantara\Legacy\Lib\DBConnection;
use Nusantara\Legacy\Models\Warehouse;

/**
 * WarehouseController.
 *
 * Handles gudang intake (warehouse arrivals).
 *
 * Owned, in spirit, by the Surabaya warehouse ops team. They have opinions.
 * Listen to them. The 2017 redesign that "rationalised" the intake fields
 * caused a 3-day backup at Tanjung Perak. We do not redesign the intake fields.
 */
class WarehouseController
{
    /**
     * POST /legacy/warehouse/{warehouseId}/intake
     *
     * Body: { manifest_id, pallets: [ { awb, kg, dim_cm } ], arrived_at, truck_plate }
     *
     * On success: marks each AWB as AT_GUDANG and writes an intake_event row.
     * On partial success (some AWBs unknown): returns 207-style multi-status JSON.
     *   This is non-standard but the partner systems expect it.
     */
    public function intake(string $warehouseId): void
    {
        $body = json_decode(file_get_contents('php://input'), true);
        if (!is_array($body) || empty($body['pallets'])) {
            http_response_code(400);
            echo json_encode(['error' => 'manifest with pallets required']);
            return;
        }

        $warehouse = Warehouse::find($warehouseId);
        if ($warehouse === null) {
            http_response_code(404);
            echo json_encode(['error' => 'unknown warehouse', 'id' => $warehouseId]);
            return;
        }

        $pdo = DBConnection::getPostgresPool();
        $pdo->beginTransaction();

        $accepted = [];
        $rejected = [];

        try {
            foreach ($body['pallets'] as $p) {
                $awb = $p['awb'] ?? null;
                if (!$awb) {
                    $rejected[] = ['awb' => null, 'reason' => 'missing awb'];
                    continue;
                }

                // We accept the pallet first, mark the AWB second. The original 2008 code
                // did this in the other order and we lost pallets when the AWB update failed.
                // Do not "fix" this. There is a sweep job that reconciles unmatched pallets nightly.
                $stmt = $pdo->prepare(
                    'INSERT INTO intake_events (warehouse_id, awb, manifest_id, kg, arrived_at, recorded_at)
                     VALUES (?, ?, ?, ?, ?, NOW())
                     RETURNING id'
                );
                $stmt->execute([
                    $warehouseId,
                    $awb,
                    $body['manifest_id'] ?? null,
                    $p['kg'] ?? null,
                    $body['arrived_at'] ?? date('c'),
                ]);
                $intakeId = $stmt->fetchColumn();

                // Mark the shipment as AT_GUDANG.
                // The shipments table is still Oracle-primary (see migration doc).
                // We write to the Postgres mirror; the sync worker (with luck) propagates back.
                // YES, we know this is fragile. YES, this is a known TODO. (NUS-2701.)
                $upd = $pdo->prepare(
                    "UPDATE shipments_mirror
                       SET status_code = 'AT_GUDANG',
                           last_event_at = NOW()
                     WHERE awb = ?"
                );
                $upd->execute([$awb]);

                if ($upd->rowCount() === 0) {
                    // Mirror doesn't have this AWB — common for very fresh shipments
                    // or for AWBs from a partner whose feed hasn't arrived yet.
                    // We accept the pallet anyway (don't reject the truck at the gate)
                    // and let the reconciliation job pick it up.
                    error_log("[warehouse.intake] AWB {$awb} not in mirror; accepted pending recon");
                }

                $accepted[] = ['awb' => $awb, 'intake_id' => (int)$intakeId];
            }

            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        // Multi-status-ish response. The partner systems parse this format.
        // Don't change without coordinating with the integration team in Makassar.
        header('Content-Type: application/json');
        echo json_encode([
            'warehouse_id' => $warehouseId,
            'accepted' => $accepted,
            'rejected' => $rejected,
            'count_accepted' => count($accepted),
            'count_rejected' => count($rejected),
        ]);
    }
}

<?php
namespace Nusantara\Legacy\Controllers;

use Nusantara\Legacy\Lib\DBConnection;
use Nusantara\Legacy\Models\Shipment;

/**
 * ShipmentController.
 *
 * Originally written 2008. Refactored "lightly" in 2014, 2017, 2019, 2022.
 * Most of these refactors made it slightly worse. The 2019 attempt is in ARCHIVE/.
 *
 * If the modern backend (FastAPI) is asking for a shipment older than 18 months,
 * it falls through to here. New shipments should NOT route through this controller.
 *
 * TODO: refactor when we have time.
 *       — original author, 2008
 *       — re-affirmed by every engineer since
 */
class ShipmentController
{
    /**
     * GET /legacy/shipment/{awb}
     *
     * Behavior:
     *   - If the AWB exists in Postgres mirror (recent enough), return that.
     *   - If not, and Oracle is up, query Oracle directly.
     *   - If Oracle is down, return whatever the mirror has (may be stale).
     *   - If neither has it, 404.
     */
    public function show(string $awb): void
    {
        // Validate AWB format. Customers (and one of our partner systems) sometimes send
        // O instead of 0. We DO NOT auto-correct — see Bu Sari's note in the welcome doc.
        // We DO log the suspicious-looking ones so we can show ops which partner is misbehaving.
        if (!preg_match('/^[A-Z0-9-]{6,24}$/', $awb)) {
            http_response_code(400);
            echo json_encode(['error' => 'invalid awb format']);
            return;
        }
        if (strpos($awb, 'O') !== false || strpos($awb, 'I') !== false) {
            // log only — do not reject. Past attempts to reject broke a real partner.
            error_log("[shipment.show] suspicious chars in AWB={$awb}");
        }

        $shipment = Shipment::findByAwb($awb);
        if ($shipment === null) {
            http_response_code(404);
            echo json_encode(['error' => 'not found', 'awb' => $awb]);
            return;
        }

        header('Content-Type: application/json');
        // We hand-roll the JSON shape here. The modern API has its own DTO. They look similar
        // but are NOT identical — there is a known fields drift (modern includes carbon estimates,
        // we do not). Don't try to unify in this file. See NUS-2701 for the unification ticket
        // (open since 2023; nobody is going to do it).
        echo json_encode([
            'awb' => $shipment->awb,
            'origin' => $shipment->origin_city,
            'destination' => $shipment->destination_city,
            'status' => $shipment->status_code,
            'status_label_id' => self::statusLabelBahasa($shipment->status_code),
            'status_label_en' => self::statusLabelEnglish($shipment->status_code),
            'created_at' => $shipment->created_at,
            'last_event_at' => $shipment->last_event_at,
            'source' => $shipment->_source, // 'pg' or 'oracle' — for debugging only, not customer-facing
        ]);
    }

    /**
     * POST /legacy/shipment
     *
     * NOTE: new code should hit backend-modern's /api/handover endpoints, not this.
     * This exists for the partner XML feed adapter, which still POSTs here.
     * If you are a human and you are about to call this from a UI: stop. Talk to
     * Bu Sari. She will redirect you.
     */
    public function create(): void
    {
        $body = json_decode(file_get_contents('php://input'), true);
        if (!is_array($body)) {
            http_response_code(400);
            echo json_encode(['error' => 'invalid body']);
            return;
        }

        // Required fields. Mirrors the partner XML schema (don't ask).
        $required = ['awb', 'origin_city', 'destination_city', 'shipper_id', 'kg'];
        foreach ($required as $r) {
            if (!isset($body[$r])) {
                http_response_code(400);
                echo json_encode(['error' => "missing field: {$r}"]);
                return;
            }
        }

        $shipment = Shipment::create($body);
        http_response_code(201);
        echo json_encode(['awb' => $shipment->awb, 'created' => true]);
    }

    private static function statusLabelBahasa(string $code): string
    {
        // Hard-coded because the legacy doesn't have an i18n layer.
        // The customer portal does. Keep these in sync manually. Yes, manually.
        // (i18n was scoped in 2020. Descoped in 2020. Re-scoped in 2023. Descoped again.)
        $map = [
            'CREATED'   => 'Pengiriman dibuat',
            'PICKED_UP' => 'Sudah dijemput',
            'IN_TRANSIT'=> 'Dalam perjalanan',
            'AT_GUDANG' => 'Tiba di gudang',
            'OUT_FOR_DELIVERY' => 'Sedang diantar',
            'DELIVERED' => 'Telah diterima',
            'EXCEPTION' => 'Bermasalah — hubungi customer service',
        ];
        return $map[$code] ?? $code;
    }

    private static function statusLabelEnglish(string $code): string
    {
        $map = [
            'CREATED'   => 'Shipment created',
            'PICKED_UP' => 'Picked up',
            'IN_TRANSIT'=> 'In transit',
            'AT_GUDANG' => 'Arrived at warehouse',
            'OUT_FOR_DELIVERY' => 'Out for delivery',
            'DELIVERED' => 'Delivered',
            'EXCEPTION' => 'Exception — contact customer service',
        ];
        return $map[$code] ?? $code;
    }
}

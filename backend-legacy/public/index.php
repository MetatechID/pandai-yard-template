<?php
/**
 * Nusantara Logistics — legacy front controller.
 *
 * Originally written 2008 by external vendor. In-house since 2014.
 * Do NOT add a real router here. The dispatch table at the bottom is the entire
 * routing layer. Keep it that way until ADR 0001 is revisited.
 *
 * If you need to add a new route: add a line in the dispatch table. Do not
 * "introduce a router" in this file. Bu Sari will find you.
 */

// PHP 7.4. We pin a mirror image because EOL upstream. See docker-compose.yml.
error_reporting(E_ALL & ~E_DEPRECATED & ~E_NOTICE); // legacy code is noisy; we mute notices in prod too
ini_set('display_errors', getenv('APP_ENV') === 'production' ? '0' : '1');
date_default_timezone_set('Asia/Jakarta');

define('APP_ROOT', dirname(__DIR__));
define('APP_VERSION', '7.4.legacy.2024-11'); // bumped manually on each deploy. yes really.

// Bootstrap.
require_once APP_ROOT . '/vendor/autoload.php';
require_once APP_ROOT . '/app/lib/DBConnection.php';
require_once APP_ROOT . '/app/lib/Session.php';
require_once APP_ROOT . '/app/controllers/ShipmentController.php';
require_once APP_ROOT . '/app/controllers/WarehouseController.php';
require_once APP_ROOT . '/app/controllers/InvoiceController.php';

// Load .env. Symfony Dotenv is in the require because we needed it once
// in 2019 and never untangled. Don't remove.
try {
    (new Symfony\Component\Dotenv\Dotenv())->loadEnv(APP_ROOT . '/.env');
} catch (Throwable $e) {
    // .env is optional in dev. In prod, env vars come from systemd unit.
}

// Healthz — used by nginx upstream check + on-call runbooks.
if ($_SERVER['REQUEST_URI'] === '/healthz.php') {
    header('Content-Type: application/json');
    echo json_encode([
        'ok' => true,
        'service' => 'backend-legacy',
        'version' => APP_VERSION,
        'php' => PHP_VERSION,
        'time' => date('c'),
    ]);
    exit;
}

// Manual dispatch. Do not "improve" this. (We tried in 2019. See ARCHIVE/.)
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

try {
    if (preg_match('#^/legacy/shipment/([A-Z0-9-]+)$#', $path, $m) && $method === 'GET') {
        (new \Nusantara\Legacy\Controllers\ShipmentController())->show($m[1]);
    } elseif ($path === '/legacy/shipment' && $method === 'POST') {
        (new \Nusantara\Legacy\Controllers\ShipmentController())->create();
    } elseif (preg_match('#^/legacy/warehouse/([A-Z0-9]+)/intake$#', $path, $m) && $method === 'POST') {
        (new \Nusantara\Legacy\Controllers\WarehouseController())->intake($m[1]);
    } elseif (preg_match('#^/legacy/invoice/([0-9]+)$#', $path, $m) && $method === 'GET') {
        (new \Nusantara\Legacy\Controllers\InvoiceController())->show((int)$m[1]);
    } elseif ($path === '/legacy/invoice/run-monthly' && $method === 'POST') {
        // !!! protected by IP allowlist in nginx — do not call from app code
        (new \Nusantara\Legacy\Controllers\InvoiceController())->runMonthly();
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'not found', 'path' => $path]);
    }
} catch (Throwable $e) {
    // Yes, we log to a file. The cool monolog stuff is in modern. We use error_log here.
    error_log('[legacy] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    http_response_code(500);
    echo json_encode([
        'error' => 'internal',
        // Don't leak details in prod. Bu Sari was very clear about this in 2022.
        'detail' => getenv('APP_ENV') === 'production' ? null : $e->getMessage(),
    ]);
}

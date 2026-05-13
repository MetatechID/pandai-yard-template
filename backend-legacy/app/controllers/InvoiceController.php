<?php
namespace Nusantara\Legacy\Controllers;

use Nusantara\Legacy\Lib\DBConnection;

/**
 * InvoiceController.
 *
 * !!! READ THIS BEFORE TOUCHING !!!
 *
 * Invoicing is THE most fragile, THE most regulated, and THE most "do not touch"
 * subsystem in the entire Nusantara codebase. There is exactly one path from
 * shipment-to-invoice and it lives here. There are zero unit tests on this
 * controller. There used to be three. They all became flaky and were deleted in 2021.
 *
 * Frozen feature-wise. Patched only for tax/security. See ADR 0001.
 *
 * Owners:
 *   - VP Eng (technical) — must approve every PR.
 *   - Finance IT (rules) — owns the SQL for tax updates.
 *   - Bu Sari (operational) — knows which customers are sensitive to billing changes.
 *
 * If finance is asking you to "make the PDF a little different": that is a multi-week
 * project. Tell them honestly. The PDF generation uses TCPDF and was tuned around
 * the print margins of three specific Epson printers in Surabaya. Yes really.
 */
class InvoiceController
{
    /**
     * GET /legacy/invoice/{id}
     *
     * Returns the invoice JSON. PDF generation is a separate endpoint (not implemented here;
     * see InvoicePdfController in vendor/internal — yes, we vendored it).
     */
    public function show(int $id): void
    {
        $pdo = DBConnection::getPostgresPool();
        // Note: invoices is one of the tables blocked on Finance IT sign-off
        // (see migration doc). It currently dual-lives in Oracle (primary) and
        // PG mirror. We read from mirror for show; we'd never write here.
        $stmt = $pdo->prepare(
            'SELECT id, customer_id, currency, total_idr, status, issued_at, due_at
               FROM invoices_mirror
              WHERE id = ?'
        );
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            http_response_code(404);
            echo json_encode(['error' => 'invoice not found', 'id' => $id]);
            return;
        }

        $lines = $pdo->prepare(
            'SELECT line_no, awb, description, kg, amount_idr
               FROM invoice_lines_mirror
              WHERE invoice_id = ?
              ORDER BY line_no'
        );
        $lines->execute([$id]);

        header('Content-Type: application/json');
        echo json_encode([
            'invoice' => $row,
            'lines' => $lines->fetchAll(),
            // _disclaimer is for ops only — never surfaced in customer UI.
            // It reminds whoever's debugging that this data lags Oracle by up to 30s.
            '_disclaimer' => 'mirror data; primary is Oracle until migration completes',
        ]);
    }

    /**
     * POST /legacy/invoice/run-monthly
     *
     * Triggers the end-of-month invoice run. Last business day, 22:00 WIB.
     *
     * !!! Do NOT call this manually unless you are Finance IT and you have escalated
     * !!! through VP Eng. The job is idempotent in theory and idempotent-with-asterisks
     * !!! in practice. Calling it twice has, historically, double-billed customers.
     * !!! See INC-1109 (2023-03) — we still talk about that one.
     */
    public function runMonthly(): void
    {
        // Auth: this is meant to be IP-allowlisted at nginx. We belt-and-suspender here.
        $allowedIps = explode(',', getenv('INVOICE_RUNNER_ALLOWLIST') ?: '127.0.0.1');
        $remote = $_SERVER['REMOTE_ADDR'] ?? '';
        if (!in_array($remote, $allowedIps, true)) {
            http_response_code(403);
            echo json_encode(['error' => 'forbidden']);
            return;
        }

        // Hard guard: only on the last business day of the month, after 22:00 Jakarta.
        // (We tried softer guards. They didn't survive contact with reality.)
        $now = new \DateTime('now', new \DateTimeZone('Asia/Jakarta'));
        $isLastBusinessDay = self::isLastBusinessDay($now);
        $isAfter2200 = (int)$now->format('H') >= 22;
        $force = ($_GET['force'] ?? '') === 'yes-i-am-sure';

        if (!$force && !($isLastBusinessDay && $isAfter2200)) {
            http_response_code(409);
            echo json_encode([
                'error' => 'invoice runner is only allowed on last business day after 22:00 WIB',
                'now' => $now->format('c'),
                'override_param' => '?force=yes-i-am-sure (do NOT use without finance IT)',
            ]);
            return;
        }

        // Hand off to the long-running runner. We don't run it inline — too long for HTTP.
        // We enqueue and return 202.
        // The runner is `bin/run-monthly-invoices.php`, called by systemd-timer in prod.
        // This HTTP endpoint just creates the trigger file.
        $triggerPath = '/var/run/nusantara/invoice-runner.trigger';
        @file_put_contents($triggerPath, json_encode([
            'requested_at' => $now->format('c'),
            'requested_by' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'force' => $force,
        ]));

        http_response_code(202);
        echo json_encode([
            'enqueued' => true,
            'trigger_file' => $triggerPath,
            'note' => 'monitor /var/log/nusantara/invoice-runner.log',
        ]);
    }

    private static function isLastBusinessDay(\DateTime $d): bool
    {
        // Crude: treat Mon-Fri as business; ignore Indonesian public holidays.
        // Finance IT keeps the real holiday calendar. We DO NOT replicate it here.
        // The runner script does its own real check; this is just a guard.
        $next = clone $d;
        $next->modify('+1 day');
        while ((int)$next->format('N') >= 6) {
            $next->modify('+1 day');
        }
        return (int)$next->format('m') !== (int)$d->format('m');
    }
}

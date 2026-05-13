<?php
namespace Nusantara\Legacy\Lib;

/**
 * Session shim — bridges the old PHP $_SESSION cookie with the modern JWT auth.
 *
 * When the modern backend (FastAPI) hands a customer to the legacy (e.g. for an old
 * invoice PDF), it sets a short-lived signed cookie. We verify it here and populate
 * a virtual "session" the controllers can read.
 *
 * Yes, this is a band-aid. Yes, it has been a band-aid since 2023. See the
 * "shared session bridge — don't ask" note in docs/01-tech-overview.md.
 */
class Session
{
    private static $current = null;

    public static function current(): array
    {
        if (self::$current !== null) {
            return self::$current;
        }

        // Check the modern bridge cookie first.
        $bridge = $_COOKIE['nus_bridge'] ?? null;
        if ($bridge) {
            $payload = self::verifyBridge($bridge);
            if ($payload) {
                self::$current = $payload;
                return self::$current;
            }
        }

        // Fall back to old PHP session (for /admin in particular).
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        self::$current = $_SESSION ?? [];
        return self::$current;
    }

    /**
     * HMAC-verify the bridge token. Shared secret is in env.
     * (This was supposed to be a real JWT verification with key rotation.
     * It is not. Filed as NUS-2890. Untouched since 2023-12.)
     */
    private static function verifyBridge(string $token): ?array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }
        [$payloadB64, $sig, $expStr] = $parts;
        $secret = getenv('BRIDGE_SECRET') ?: 'dev-secret-do-not-use-in-prod';
        $expected = hash_hmac('sha256', $payloadB64 . '.' . $expStr, $secret);
        if (!hash_equals($expected, $sig)) {
            return null;
        }
        if ((int)$expStr < time()) {
            return null;
        }
        $payload = json_decode(base64_decode(strtr($payloadB64, '-_', '+/')), true);
        return is_array($payload) ? $payload : null;
    }
}

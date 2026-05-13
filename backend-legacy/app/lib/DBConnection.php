<?php
namespace Nusantara\Legacy\Lib;

/**
 * The DB connection layer. This file is older than some of the engineers reading it.
 *
 * It exposes TWO pools:
 *   - Postgres (primary, for everything migrated)
 *   - Oracle (legacy, for everything not yet migrated; many methods stubbed in 2024)
 *
 * Which one a model uses is up to the model. There is no central registry of
 * "which tables live where". The migration doc is the closest thing — see
 * docs/04-the-oracle-migration.md.
 *
 * VP Eng owns this file. Do not modify without VP Eng review. Yes, that includes
 * "tiny" changes. Especially "tiny" changes.
 *
 * History:
 *   2008 — original vendor implementation, mysql_* functions (since removed)
 *   2014 — ported to PDO when in-house took over
 *   2018 — added Oracle pool for the warehouse acquisition migration
 *   2021 — added Postgres pool for Project Lanjut (see ADR 0003)
 *   2023 — Oracle pool stubbed by default in non-prod (oci8 is hard to install)
 *   2024 — added connection retry. did NOT solve INC-1247. don't ask.
 */
class DBConnection
{
    /** @var \PDO|null */
    private static $pgInstance = null;

    /** @var resource|null oci8 connection (or null if oci8 missing) */
    private static $oracleInstance = null;

    /**
     * Get the Postgres pool. Use this for anything migrated.
     * Throws if Postgres is unreachable — let it propagate; nginx will 502.
     */
    public static function getPostgresPool(): \PDO
    {
        if (self::$pgInstance !== null) {
            return self::$pgInstance;
        }

        $host = getenv('DB_HOST') ?: 'localhost';
        $name = getenv('DB_NAME') ?: 'nusantara';
        $user = getenv('DB_USER') ?: 'nusantara';
        $pass = getenv('DB_PASS') ?: '';
        $port = getenv('DB_PORT') ?: '5432';

        $dsn = "pgsql:host={$host};port={$port};dbname={$name};options='--client_encoding=UTF8'";

        // Retry up to 3 times — added after the 2024-08 incident (INC-1247) when
        // a network blip during deploy left the legacy with a dead pool for 40 minutes.
        $attempts = 0;
        $lastError = null;
        while ($attempts < 3) {
            try {
                self::$pgInstance = new \PDO($dsn, $user, $pass, [
                    \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                    \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
                    // We use server-side prepares because the original vendor code did.
                    // Don't flip this without a load test. (Tried in 2022. Bad.)
                    \PDO::ATTR_EMULATE_PREPARES => false,
                ]);
                return self::$pgInstance;
            } catch (\PDOException $e) {
                $lastError = $e;
                $attempts++;
                usleep(150 * 1000);
            }
        }

        throw $lastError;
    }

    /**
     * Get the Oracle pool. Use ONLY for tables not yet migrated (see migration doc).
     *
     * In dev / staging this returns null when oci8 isn't installed (almost never).
     * Callers MUST check for null and degrade gracefully.
     *
     * In prod, this returns a real oci8 resource on the one node that has the driver.
     * Other prod nodes will throw — and we route Oracle-bound traffic to that one node
     * via nginx. Yes it's a SPOF. See on-call runbook C.
     */
    public static function getOraclePool()
    {
        if (self::$oracleInstance !== null) {
            return self::$oracleInstance;
        }

        if (!function_exists('oci_connect')) {
            // ORACLE_FALLBACK lets us hard-fail in tests instead of silently stubbing.
            if (getenv('ORACLE_FALLBACK') === 'strict') {
                throw new \RuntimeException(
                    'oci8 not installed and ORACLE_FALLBACK=strict. ' .
                    'Either install oci8 (good luck) or set ORACLE_FALLBACK=stub.'
                );
            }
            // Stub mode: callers detect null and fall back to mirror reads.
            return null;
        }

        $user = getenv('ORACLE_USER') ?: 'nusantara_legacy';
        $pass = getenv('ORACLE_PASS') ?: '';
        $tns  = getenv('ORACLE_TNS') ?: 'titan-oracle-01:1521/NUSPRD';

        $conn = @oci_connect($user, $pass, $tns, 'AL32UTF8');
        if ($conn === false) {
            $err = oci_error();
            // Don't leak credentials in the error message. Bu Sari was very clear about this.
            throw new \RuntimeException('oracle connect failed: ' . ($err['message'] ?? 'unknown'));
        }

        self::$oracleInstance = $conn;
        return self::$oracleInstance;
    }

    /**
     * Convenience: ask whether the Oracle pool is "really there" right now.
     * Used by models to decide between direct Oracle reads and Postgres-mirror reads.
     */
    public static function isOracleAvailable(): bool
    {
        try {
            return self::getOraclePool() !== null;
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * For tests only. Don't call from app code.
     */
    public static function reset(): void
    {
        self::$pgInstance = null;
        if (self::$oracleInstance !== null && function_exists('oci_close')) {
            @oci_close(self::$oracleInstance);
        }
        self::$oracleInstance = null;
    }
}

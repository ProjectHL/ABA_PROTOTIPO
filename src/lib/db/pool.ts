import { Pool } from 'pg';

let pool: Pool | undefined;

/**
 * One process-wide pool. Next.js keeps a single server process per container,
 * so the default ceiling stays small and predictable.
 */
export function getPool(): Pool {
    if (pool) return pool;

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL no está configurada.');
    }

    pool = new Pool({
        connectionString,
        max: Number(process.env.DATABASE_POOL_MAX ?? 10),
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 10_000,
        statement_timeout: Number(process.env.DATABASE_STATEMENT_TIMEOUT_MS ?? 15_000),
        application_name: 'aba-web',
    });

    pool.on('error', error => {
        console.error('[db] idle client error', error.message);
    });

    return pool;
}

import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/** Real PostgreSQL engine (PGlite) with the same platform bootstrap as production. */
export async function createTestDatabase() {
    const db = new PGlite({ extensions: { pgcrypto } });
    await db.exec(await readFile(resolve('db/bootstrap.sql'), 'utf8'));
    const dir = resolve('db/migrations');
    for (const name of (await readdir(dir)).filter(name => /^\d+_.*\.sql$/.test(name)).sort()) {
        try { await db.exec(await readFile(resolve(dir, name), 'utf8')); }
        catch (error) { await db.close(); throw new Error(`Migration failed: ${name}`, { cause: error }); }
    }
    return db;
}

export async function asUser<T>(db: PGlite, id: string, run: () => Promise<T>): Promise<T> {
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
    await db.exec('set role authenticated');
    try { return await run(); }
    finally { await db.exec('reset role'); await db.exec("select set_config('request.jwt.claim.sub', '', false)"); }
}

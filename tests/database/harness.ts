import { PGlite } from '@electric-sql/pglite';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/** PostgreSQL engine with minimal Auth shim; does not replace Supabase REST/E2E. */
export async function createTestDatabase() {
    const db = new PGlite();
    await db.exec(`
        create role anon nologin; create role authenticated nologin;
        create role service_role nologin bypassrls;
        create schema auth;
        create table auth.users (id uuid primary key, email text);
        create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
        grant usage on schema auth to anon, authenticated, service_role;
        grant execute on function auth.uid() to anon, authenticated, service_role;
    `);
    const dir = resolve('supabase/migrations');
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

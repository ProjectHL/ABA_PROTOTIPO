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
        create schema storage;
        create publication supabase_realtime;
        create table auth.users (
            id uuid primary key,
            email text,
            created_at timestamptz not null default now(),
            email_confirmed_at timestamptz
        );
        create table storage.buckets (
            id text primary key, name text not null, public boolean not null default false,
            file_size_limit bigint, allowed_mime_types text[]
        );
        create table storage.objects (
            id uuid primary key, bucket_id text not null, name text not null
        );
        alter table storage.objects enable row level security;
        create function storage.foldername(p_name text) returns text[] language sql immutable as
        $$ select case when strpos(p_name, '/') = 0 then array[]::text[]
             else string_to_array(regexp_replace(p_name, '/[^/]*$', ''), '/') end $$;
        -- Fail closed: PGlite cannot emulate Storage's authenticated-download request context.
        create function storage.allow_only_operation(text) returns boolean language sql stable as
        $$ select false $$;
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

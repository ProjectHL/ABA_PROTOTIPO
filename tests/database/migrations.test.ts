import { describe, it, expect } from 'vitest';
import { createTestDatabase } from './harness';

describe('schema reconstruction', () => {
    it('replays recovered migrations with RLS on every public table', async () => {
        const db = await createTestDatabase();
        try {
            const { rows } = await db.query<{ name: string }>(`select relname as name from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity`);
            expect(rows).toEqual([]);
        } finally { await db.close(); }
    }, 60000);

    it('keeps future public tables closed to client roles by default', async () => {
        const db = await createTestDatabase();
        try {
            // PGlite does not materialize ALTER DEFAULT PRIVILEGES for the
            // built-in PUBLIC function grant. Function defaults are verified
            // against staging's pg_default_acl after promotion.
            await db.exec('create table public.b0_acl_canary(id integer)');
            const { rows } = await db.query<{
                anon_table: boolean;
                authenticated_table: boolean;
            }>(`
                select
                  has_table_privilege('anon','public.b0_acl_canary','select') anon_table,
                  has_table_privilege('authenticated','public.b0_acl_canary','select') authenticated_table
            `);
            expect(rows[0]).toEqual({
                anon_table: false,
                authenticated_table: false,
            });
        } finally { await db.close(); }
    }, 60000);
});

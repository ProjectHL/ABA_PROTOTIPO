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
});

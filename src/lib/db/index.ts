import type { Database } from '@/lib/db/database.types';
import { getPool } from './pool';
import { QueryBuilder, type DbError, type DbResult } from './query';

export type { DbError, DbResult } from './query';

export type DbRole = 'authenticated' | 'service_role';

interface Claims {
    sub?: string;
    role: DbRole;
}

async function run<T>(
    sql: string,
    params: readonly unknown[],
    claims: Claims,
): Promise<T[]> {
    const client = await getPool().connect();
    try {
        await client.query('begin');
        // The role names are a closed union, never user input.
        await client.query(`set local role ${claims.role}`);
        await client.query("select set_config('request.jwt.claims', $1, true)", [
            JSON.stringify(claims.role === 'authenticated' && claims.sub
                ? { sub: claims.sub, role: claims.role }
                : { role: claims.role }),
        ]);
        await client.query("select set_config('request.jwt.claim.sub', $1, true)", [
            claims.role === 'authenticated' ? claims.sub ?? '' : '',
        ]);
        const result = await client.query(sql, params as unknown[]);
        await client.query('commit');
        return result.rows as T[];
    } catch (error) {
        await client.query('rollback').catch(() => undefined);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Connection used for platform tables (auth.sessions, auth.users) before a
 * request has an authenticated role. It intentionally does not touch RLS
 * domain tables.
 */
export async function systemQuery<T>(sql: string, params: readonly unknown[] = []): Promise<T[]> {
    const client = await getPool().connect();
    try {
        const result = await client.query(sql, params as unknown[]);
        return result.rows as T[];
    } finally {
        client.release();
    }
}

const IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

function rpcSql(name: string, args: Record<string, unknown>): { sql: string; params: unknown[] } {
    if (!IDENTIFIER.test(name)) throw new Error(`Nombre de función inválido: ${name}`);
    const params: unknown[] = [];
    const call: string[] = [];
    for (const [key, value] of Object.entries(args)) {
        if (value === undefined) continue;
        if (!IDENTIFIER.test(key)) throw new Error(`Parámetro inválido: ${key}`);
        params.push(value);
        call.push(`${key} => $${params.length}`);
    }
    return { sql: `select public."${name}"(${call.join(', ')}) as result`, params };
}

function toDbError(error: unknown): DbError {
    const candidate = error as { message?: string; code?: string; detail?: string; hint?: string };
    return {
        message: candidate?.message ?? 'Error de base de datos.',
        code: candidate?.code,
        details: candidate?.detail ?? null,
        hint: candidate?.hint ?? null,
    };
}

type TableName = keyof Database['public']['Tables'];
type TableRow<K extends TableName> = Database['public']['Tables'][K]['Row'];

export interface DbClient {
    readonly userId?: string;
    from<K extends TableName>(table: K): { select(columns: string): QueryBuilder<TableRow<K>> };
    raw<T = unknown>(sql: string, params?: readonly unknown[]): Promise<T[]>;
    rpc<T = unknown>(name: string, args?: Record<string, unknown>): Promise<DbResult<T>>;
}

class Client implements DbClient {
    readonly userId?: string;
    private readonly role: DbRole;

    constructor(role: DbRole, userId?: string) {
        this.role = role;
        this.userId = userId;
    }

    private query<T>(sql: string, params: readonly unknown[] = []): Promise<T[]> {
        return run<T>(sql, params, { role: this.role, sub: this.userId });
    }

    raw<T = unknown>(sql: string, params: readonly unknown[] = []) {
        return this.query<T>(sql, params);
    }

    from<K extends TableName>(table: K) {
        if (!IDENTIFIER.test(table)) throw new Error(`Tabla inválida: ${table}`);
        const client = { query: <T>(sql: string, params?: readonly unknown[]) => this.query<T>(sql, params) };
        return {
            select: (columns: string) => new QueryBuilder<TableRow<K>>(client, table, columns),
        };
    }

    async rpc<T = unknown>(name: string, args: Record<string, unknown> = {}): Promise<DbResult<T>> {
        try {
            const { sql, params } = rpcSql(name, args);
            const rows = await this.query<{ result: T }>(sql, params);
            return { data: rows[0]?.result as T, error: null };
        } catch (error) {
            return { data: null as T, error: toDbError(error) };
        }
    }
}

export function dbAsUser(userId: string): DbClient {
    return new Client('authenticated', userId);
}

/** Privileged worker client for RPCs that require the service_role JWT claim. */
export function dbAsService(): DbClient {
    return new Client('service_role');
}

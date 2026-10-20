export interface DbError {
    message: string;
    code?: string;
    details?: string | null;
    hint?: string | null;
}

export interface DbResult<T> {
    data: T;
    error: DbError | null;
}

interface Queryable {
    query<T>(sql: string, params?: readonly unknown[]): Promise<T[]>;
}

const IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

function quoteIdentifier(value: string): string {
    if (!IDENTIFIER.test(value)) throw new Error(`Identificador inválido: ${value}`);
    return `"${value}"`;
}

function quoteColumns(list: string): string {
    const value = list.trim();
    if (value === '*') return '*';
    return value
        .split(',')
        .map(column => column.trim())
        .filter(Boolean)
        .map(quoteIdentifier)
        .join(', ');
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

/**
 * Minimal parameterized query builder for the exact chain shapes used by the
 * application: select, eq, neq, is, in, order, limit, maybeSingle and single.
 * It is not a PostgREST reimplementation: no HTTP, no dynamic SQL text from
 * request input, and identifiers are validated.
 */
export class QueryBuilder<T = unknown> implements PromiseLike<DbResult<T[]>> {
    private readonly filters: { clause: string; value?: unknown }[] = [];
    private readonly params: unknown[] = [];
    private orderClause = '';
    private limitClause = '';

    constructor(
        private readonly client: Queryable,
        private readonly table: string,
        private readonly columns: string,
    ) {}

    eq(column: string, value: unknown): this {
        this.params.push(value);
        this.filters.push({ clause: `${quoteIdentifier(column)} = $${this.params.length}`, value });
        return this;
    }

    neq(column: string, value: unknown): this {
        this.params.push(value);
        this.filters.push({ clause: `${quoteIdentifier(column)} <> $${this.params.length}`, value });
        return this;
    }

    is(column: string, value: null | boolean): this {
        if (value === null) this.filters.push({ clause: `${quoteIdentifier(column)} is null` });
        else this.filters.push({ clause: `${quoteIdentifier(column)} is ${value ? 'true' : 'false'}` });
        return this;
    }

    in(column: string, values: readonly unknown[]): this {
        this.params.push(values);
        this.filters.push({ clause: `${quoteIdentifier(column)} = any($${this.params.length})`, value: values });
        return this;
    }

    order(column: string, options: { ascending?: boolean } = {}): this {
        this.orderClause = ` order by ${quoteIdentifier(column)} ${options.ascending === false ? 'desc' : 'asc'}`;
        return this;
    }

    limit(count: number): this {
        this.limitClause = ` limit ${Math.max(0, Math.trunc(count))}`;
        return this;
    }

    private build(): { sql: string; params: unknown[] } {
        const where = this.filters.length
            ? ` where ${this.filters.map(filter => filter.clause).join(' and ')}`
            : '';
        return {
            sql: `select ${quoteColumns(this.columns)} from ${quoteIdentifier('public')}.${quoteIdentifier(this.table)}${where}${this.orderClause}${this.limitClause}`,
            params: this.params,
        };
    }

    private async execute(): Promise<DbResult<T[]>> {
        try {
            const { sql, params } = this.build();
            return { data: await this.client.query<T>(sql, params), error: null };
        } catch (error) {
            return { data: [], error: toDbError(error) };
        }
    }

    async maybeSingle(): Promise<DbResult<T | null>> {
        this.limit(1);
        const result = await this.execute();
        return { data: result.data[0] ?? null, error: result.error };
    }

    async single(): Promise<DbResult<T>> {
        this.limit(1);
        const result = await this.execute();
        if (result.error) return { data: null, error: result.error } as DbResult<T>;
        if (result.data.length !== 1) {
            return { data: null, error: { message: 'Se esperaba exactamente una fila.', code: 'PGRST116' } } as DbResult<T>;
        }
        return { data: result.data[0] as T, error: null };
    }

    then<TResult1 = DbResult<T[]>, TResult2 = never>(
        onfulfilled?: ((value: DbResult<T[]>) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): Promise<TResult1 | TResult2> {
        return this.execute().then(onfulfilled, onrejected);
    }
}

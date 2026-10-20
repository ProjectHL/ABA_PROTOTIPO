import { createHash, randomBytes } from 'node:crypto';
import { systemQuery } from '@/lib/db';

export type TokenPurpose = 'recovery' | 'invite' | 'email_change';

const TTL_MS: Record<TokenPurpose, number> = {
    recovery: 60 * 60 * 1000,
    invite: 7 * 24 * 60 * 60 * 1000,
    email_change: 24 * 60 * 60 * 1000,
};

function hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

export async function createOneTimeToken(
    userId: string,
    purpose: TokenPurpose,
    payload: Record<string, unknown> = {},
): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + TTL_MS[purpose]);
    await systemQuery(
        `insert into auth.one_time_tokens (user_id, purpose, token_hash, payload, expires_at)
         values ($1, $2, $3, $4::jsonb, $5)`,
        [userId, purpose, hashToken(token), JSON.stringify(payload), expiresAt],
    );
    return token;
}

export interface ConsumedToken {
    id: string;
    userId: string;
    email: string;
    payload: Record<string, unknown>;
}

/** Atomically consumes a token. Concurrent submissions only win once. */
export async function consumeOneTimeToken(
    token: string,
    purpose: TokenPurpose,
): Promise<ConsumedToken | null> {
    const rows = await systemQuery<{
        id: string;
        user_id: string;
        email: string;
        payload: Record<string, unknown>;
    }>(
        `with consumed as (
            update auth.one_time_tokens t
               set used_at = now()
              where t.token_hash = $1
                and t.purpose = $2
                and t.used_at is null
                and t.expires_at > now()
          returning t.id, t.user_id, t.payload
         )
         select c.id, c.user_id, u.email, c.payload
           from consumed c
           join auth.users u on u.id = c.user_id`,
        [hashToken(token), purpose],
    );

    const row = rows[0];
    if (!row) return null;
    return { id: row.id, userId: row.user_id, email: row.email, payload: row.payload };
}

export async function invalidateTokens(userId: string, purpose: TokenPurpose): Promise<void> {
    await systemQuery(
        'update auth.one_time_tokens set used_at = now() where user_id = $1 and purpose = $2 and used_at is null',
        [userId, purpose],
    );
}

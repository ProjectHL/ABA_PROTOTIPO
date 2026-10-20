import { cache } from 'react';
import { cookies } from 'next/headers';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { systemQuery } from '@/lib/db';
import { SESSION_COOKIE } from './constants';

export { SESSION_COOKIE } from './constants';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RENEW_AFTER_MS = 60 * 60 * 1000;

export interface SessionUser {
    sessionId: string;
    id: string;
    email: string;
    emailConfirmedAt: string | null;
}

function secret(): string {
    const value = process.env.AUTH_SECRET;
    if (!value || Buffer.byteLength(value, 'utf8') < 32) {
        throw new Error('AUTH_SECRET debe tener al menos 32 bytes.');
    }
    return value;
}

function signature(token: string): string {
    return createHmac('sha256', secret()).update(token).digest('base64url');
}

export function encodeSessionCookie(token: string): string {
    return `${token}.${signature(token)}`;
}

export function readSessionToken(cookieValue: string | undefined): string | null {
    if (!cookieValue) return null;
    const separator = cookieValue.lastIndexOf('.');
    if (separator <= 0) return null;
    const token = cookieValue.slice(0, separator);
    const provided = Buffer.from(cookieValue.slice(separator + 1));
    const expected = Buffer.from(signature(token));
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
    return token;
}

function tokenHash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

function cookieOptions(expiresAt: Date) {
    return {
        httpOnly: true,
        sameSite: 'lax' as const,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        expires: expiresAt,
    };
}

export async function createSession(userId: string, meta: { userAgent?: string; ip?: string } = {}): Promise<void> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await systemQuery(
        `insert into auth.sessions (user_id, token_hash, expires_at, user_agent, ip)
         values ($1, $2, $3, $4, $5)`,
        [userId, tokenHash(token), expiresAt, meta.userAgent ?? null, meta.ip ?? null],
    );

    (await cookies()).set(SESSION_COOKIE, encodeSessionCookie(token), cookieOptions(expiresAt));
}

export async function destroyCurrentSession(): Promise<void> {
    const store = await cookies();
    const token = readSessionToken(store.get(SESSION_COOKIE)?.value);
    if (token) {
        await systemQuery('delete from auth.sessions where token_hash = $1', [tokenHash(token)]);
    }
    store.delete(SESSION_COOKIE);
}

export async function destroyUserSessions(userId: string, keepSessionId?: string): Promise<void> {
    if (keepSessionId) {
        await systemQuery('delete from auth.sessions where user_id = $1 and id <> $2', [userId, keepSessionId]);
    } else {
        await systemQuery('delete from auth.sessions where user_id = $1', [userId]);
    }
}

interface SessionRow {
    session_id: string;
    user_id: string;
    expires_at: string;
    email: string;
    email_confirmed_at: string | null;
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
    const store = await cookies();
    const token = readSessionToken(store.get(SESSION_COOKIE)?.value);
    if (!token) return null;

    const rows = await systemQuery<SessionRow>(
        `select s.id as session_id, s.user_id, s.expires_at::text, u.email, u.email_confirmed_at::text
           from auth.sessions s
           join auth.users u on u.id = s.user_id
          where s.token_hash = $1
            and s.expires_at > now()
            and u.deleted_at is null
            and (u.banned_until is null or u.banned_until < now())
          limit 1`,
        [tokenHash(token)],
    );

    const row = rows[0];
    if (!row) return null;

    if (Date.parse(row.expires_at) - Date.now() < SESSION_TTL_MS - RENEW_AFTER_MS) {
        await systemQuery(
            'update auth.sessions set expires_at = now() + interval \'7 days\', updated_at = now() where id = $1',
            [row.session_id],
        );
    }

    return {
        sessionId: row.session_id,
        id: row.user_id,
        email: row.email,
        emailConfirmedAt: row.email_confirmed_at,
    };
});

export async function requireSessionUser(): Promise<SessionUser> {
    const user = await getSessionUser();
    if (!user) throw new Error('Tu sesión caducó. Inicia sesión nuevamente.');
    return user;
}

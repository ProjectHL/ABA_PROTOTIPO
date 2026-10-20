import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from './constants';

const PUBLIC_PATHS = new Set([
    '/',
    '/contact',
    '/login',
    '/forgot-password',
    '/reset-password',
    '/auth/callback',
    '/auth/confirm',
    '/api/health',
]);

function bytesToBase64url(bytes: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(bytes)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

async function hasValidSessionCookie(value: string | undefined): Promise<boolean> {
    if (!value) return false;
    const separator = value.lastIndexOf('.');
    if (separator <= 0) return false;

    const token = value.slice(0, separator);
    const provided = value.slice(separator + 1);
    const secret = process.env.AUTH_SECRET;
    if (!secret) return false;

    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
    );
    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(token));
    return bytesToBase64url(signature) === provided;
}

export async function updateSession(request: NextRequest): Promise<NextResponse> {
    const response = NextResponse.next({ request });
    const path = request.nextUrl.pathname;

    if (PUBLIC_PATHS.has(path) || path.startsWith('/_next') || path.startsWith('/api/auth')) {
        return response;
    }

    const valid = await hasValidSessionCookie(request.cookies.get(SESSION_COOKIE)?.value);
    if (valid) return response;

    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('redirectTo', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
}

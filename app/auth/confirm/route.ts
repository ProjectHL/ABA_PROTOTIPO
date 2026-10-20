import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { getSafeRedirect } from '@/lib/security/redirect';
import { createClient } from '@/lib/supabase/server';

const emailOtpTypes = new Set([
    'email',
    'signup',
    'invite',
    'magiclink',
    'recovery',
    'email_change',
]);

function getEmailOtpType(value: string | null): EmailOtpType | null {
    return value && emailOtpTypes.has(value) ? value as EmailOtpType : null;
}

export async function GET(request: NextRequest) {
    const tokenHash = request.nextUrl.searchParams.get('token_hash');
    const type = getEmailOtpType(request.nextUrl.searchParams.get('type'));
    const code = request.nextUrl.searchParams.get('code');
    const fallback = type === 'recovery' || type === 'invite' ? '/reset-password' : '/dashboard';
    const next = getSafeRedirect(request.nextUrl.searchParams.get('next'), fallback);
    // Resolve the public origin at request time; Docker binds 0.0.0.0 internally.
    const { NEXT_PUBLIC_APP_URL: appUrl } = process.env;
    const redirectBase = appUrl || request.url;
    const db = await createClient();

    let error: unknown = new Error('confirmation_parameters_missing');
    if (tokenHash && type) {
        ({ error } = await db.auth.verifyOtp({ token_hash: tokenHash, type }));
    } else if (code) {
        ({ error } = await db.auth.exchangeCodeForSession(code));
    }

    if (!error) return NextResponse.redirect(new URL(next, redirectBase));
    return NextResponse.redirect(new URL('/login?error=invalid_link', redirectBase));
}

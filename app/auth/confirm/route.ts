import { NextResponse, type NextRequest } from 'next/server';
import { getSafeRedirect } from '@/lib/security/redirect';
import { confirmEmailChange } from '@/lib/auth/service';

const EMAIL_TYPES = new Set(['email', 'signup', 'invite', 'magiclink', 'recovery', 'email_change']);

export async function GET(request: NextRequest) {
    const { NEXT_PUBLIC_APP_URL: appUrl } = process.env;
    const redirectBase = appUrl || request.url;
    const token = request.nextUrl.searchParams.get('token_hash');
    const type = request.nextUrl.searchParams.get('type');

    if (!token || !type || !EMAIL_TYPES.has(type)) {
        return NextResponse.redirect(new URL('/login?error=invalid_link', redirectBase));
    }

    if (type === 'email_change') {
        const confirmed = await confirmEmailChange(token);
        const destination = confirmed
            ? getSafeRedirect(request.nextUrl.searchParams.get('next'), '/team')
            : '/login?error=invalid_link';
        return NextResponse.redirect(new URL(destination, redirectBase));
    }

    if (type === 'recovery' || type === 'invite') {
        return NextResponse.redirect(
            new URL(`/reset-password?token=${encodeURIComponent(token)}`, redirectBase),
        );
    }

    return NextResponse.redirect(new URL('/login?error=invalid_link', redirectBase));
}

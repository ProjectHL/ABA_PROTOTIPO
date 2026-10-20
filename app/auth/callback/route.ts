import { NextResponse, type NextRequest } from 'next/server';

/**
 * Legacy callback kept for previously issued links. External OAuth providers
 * are not part of the plain-PostgreSQL deployment, so any code is rejected.
 */
export async function GET(request: NextRequest) {
    const { NEXT_PUBLIC_APP_URL: appUrl } = process.env;
    const redirectBase = appUrl || request.url;
    return NextResponse.redirect(new URL('/login?error=invalid_link', redirectBase));
}

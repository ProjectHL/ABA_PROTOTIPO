import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSafeRedirect } from '@/lib/security/redirect';

export async function GET(request:NextRequest) {
    // Resolve the public origin at request time; Docker binds 0.0.0.0 internally.
    const { NEXT_PUBLIC_APP_URL: appUrl } = process.env;
    const redirectBase=appUrl||request.url;
    const code=request.nextUrl.searchParams.get('code');
    if(code) {
        const db=await createClient();
        const {error}=await db.auth.exchangeCodeForSession(code);
        if(!error) return NextResponse.redirect(new URL(getSafeRedirect(request.nextUrl.searchParams.get('next')),redirectBase));
    }
    return NextResponse.redirect(new URL('/login?error=invalid_link',redirectBase));
}

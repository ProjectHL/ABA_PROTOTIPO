import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { type Database } from './database.types';

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({ request });
    const supabase = createServerClient<Database>(
        process.env.SUPABASE_INTERNAL_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            // The public host identifies the session; the internal host only routes requests.
            auth: {
                storageKey: `sb-${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0]}-auth-token`,
            },
            cookies: {
                getAll: () => request.cookies.getAll(),
                setAll: (cookiesToSet) => {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                    response = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
                },
            },
        },
    );

    const { data: claims } = await supabase.auth.getClaims();
    const protectedPath = !['/', '/contact', '/login', '/forgot-password', '/auth/callback', '/auth/confirm', '/api/health'].includes(request.nextUrl.pathname);

    if (protectedPath && !claims) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.search = '';
        url.searchParams.set('redirectTo', request.nextUrl.pathname + request.nextUrl.search);
        const redirected = NextResponse.redirect(url);
        response.cookies.getAll().forEach(cookie => redirected.cookies.set(cookie));
        return redirected;
    }

    return response;
}

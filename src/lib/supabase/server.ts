import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { type Database } from './database.types';

export async function createClient() {
    const cookieStore = await cookies();

    return createServerClient<Database>(
        process.env.SUPABASE_INTERNAL_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            // Match the browser's default namespace even when Docker uses a different API host.
            auth: {
                storageKey: `sb-${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0]}-auth-token`,
            },
            cookies: {
                getAll: () => cookieStore.getAll(),
                setAll: (cookiesToSet) => {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
                    } catch {
                        // Las Server Components no pueden escribir cookies; proxy.ts actualiza la sesión.
                    }
                },
            },
        },
    );
}

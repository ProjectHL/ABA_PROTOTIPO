'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function RecoveryHashBridge() {
    const router = useRouter();

    useEffect(() => {
        const fragment = new URLSearchParams(window.location.hash.slice(1));
        if (fragment.get('type') !== 'recovery') return;

        const accessToken = fragment.get('access_token');
        const refreshToken = fragment.get('refresh_token');
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);

        if (!accessToken || !refreshToken) {
            router.replace('/login?error=invalid_link');
            return;
        }

        let active = true;
        void createClient().auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
        }).then(({ error }) => {
            if (!active) return;
            if (error) {
                router.replace('/login?error=invalid_link');
                return;
            }
            router.replace('/reset-password');
            router.refresh();
        });

        return () => {
            active = false;
        };
    }, [router]);

    return null;
}

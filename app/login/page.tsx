import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import LoginPage from '@/views/LoginPage';
import { needsSetup } from '@/lib/auth/bootstrap';

// Reads auth.users, so it must never be prerendered at build time.
export const dynamic = 'force-dynamic';

export default async function Page() {
    // If the database is unreachable, render the login form instead of a 500:
    // the sign-in attempt will surface the real error.
    const pending = await needsSetup().catch(() => false);
    if (pending) redirect('/setup');

    return (
        <Suspense fallback={null}>
            <LoginPage />
        </Suspense>
    );
}

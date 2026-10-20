import { redirect } from 'next/navigation';
import { needsSetup } from '@/lib/auth/bootstrap';
import SetupPage from '@/views/SetupPage';

// Reads auth.users, so it must never be prerendered at build time.
export const dynamic = 'force-dynamic';

export default async function Page() {
    const pending = await needsSetup().catch(() => false);
    if (!pending) redirect('/login');
    return <SetupPage />;
}

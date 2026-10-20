import { Suspense } from 'react';
import { AuthPasswordForm } from '@/features/team/AuthForms';

export default function Page() {
    return <Suspense fallback={null}><AuthPasswordForm mode="reset" /></Suspense>;
}

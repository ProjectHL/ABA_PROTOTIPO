import { MainLayout } from '@/components/MainLayout';
import { AuthPasswordForm } from '@/features/team/AuthForms';

export default function Page() {
    return <MainLayout><AuthPasswordForm mode="change" /></MainLayout>;
}

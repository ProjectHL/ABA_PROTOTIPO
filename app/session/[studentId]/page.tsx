import { ClinicalPage } from '@/modules/clinical/page';

export default async function Page({
    params,
}: {
    params: Promise<{ studentId: string }>;
}) {
    const { studentId } = await params;

    return <ClinicalPage studentId={studentId} initialTab="sessions"/>;
}

import { ClinicalPage } from '@/modules/clinical/page';

export default async function Page({
    params,
}: {
    params: Promise<{ studentId: string; programId: string }>;
}) {
    const { studentId,programId } = await params;
    return <ClinicalPage studentId={studentId} programId={programId} initialTab="sessions"/>;
}

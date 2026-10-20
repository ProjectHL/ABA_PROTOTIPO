import { notFound } from 'next/navigation';
import SessionPage from '@/views/SessionPage';
import { loadIdentity } from '@/features/team/identity.server';
import { loadProgramSessionPageData } from '@/modules/program-session/program-session.server';

export default async function Page({
    params,
}: {
    params: Promise<{ studentId: string }>;
}) {
    const { studentId } = await params;
    const identity=await loadIdentity();
    if(!identity.active) throw new Error('Selecciona una clínica autorizada antes de abrir una sesión.');
    const data=await loadProgramSessionPageData(identity.active.id,studentId);
    if(!data.capabilities.includes('student.view'))notFound();
    return <SessionPage key={`${data.actorId}:${data.clinicId}:${data.studentId}`} data={data}/>;
}

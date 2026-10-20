import { notFound } from 'next/navigation';
import { z } from 'zod';
import { loadIdentity } from '@/features/team/identity.server';
import { revalidateProgramSessionPageData } from '@/modules/program-session/program-session.server';
import { ProgramResults } from '@/modules/results/program-results';
import { loadResultGoals } from '@/modules/results/results.server';

export default async function Page({
    params,
}: {
    params: Promise<{ studentId: string; programId: string }>;
}) {
    const { studentId,programId } = await params;
    if(!z.uuid().safeParse(studentId).success||!z.uuid().safeParse(programId).success)notFound();
    const identity=await loadIdentity();if(!identity.active)notFound();
    const scope=await revalidateProgramSessionPageData(identity.active.id,studentId,identity.userId);
    if(scope.status==='unavailable')notFound();
    const data=scope.data;
    if(!data.capabilities.includes('chart.view')||!data.programs.some(program=>program.id===programId))notFound();
    const goals=await loadResultGoals(identity.active.id,studentId,programId);
    return <ProgramResults data={data} programId={programId} goals={goals} generatedAt={new Date().toISOString()}/>;
}

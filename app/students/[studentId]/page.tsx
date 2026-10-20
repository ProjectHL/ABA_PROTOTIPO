import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import StudentsPage from '@/views/StudentsPage';
import { MainLayout } from '@/components/MainLayout';
import { loadIdentity } from '@/features/team/identity.server';
import { getAuthorizedProgramStudent } from '@/modules/students/student.server';
import { revalidateProgramSessionPageData } from '@/modules/program-session/program-session.server';
export default async function Page({params}:{params:Promise<{studentId:string}>}) {
  const {studentId}=await params;
  if(!z.uuid().safeParse(studentId).success)notFound();
  const identity=await loadIdentity();
  if(identity.active){
    const student=await getAuthorizedProgramStudent(studentId,identity.active.id);
    if(student&&!student.capabilities.includes('student.view')&&student.capabilities.includes('program.view')){
      const scope=await revalidateProgramSessionPageData(identity.active.id,studentId,identity.userId);
      if(scope.status==='unavailable')notFound();
      const data=scope.data;
      return <MainLayout><section style={{padding:'2rem',maxWidth:'70rem',margin:'auto'}}><h1>Programas y resultados · {data.student.initials}</h1><ul>{data.programs.map(program=>{
        const version=program.versions.find(v=>v.id===program.currentVersionId);
        if(!version)return null;
        return <li key={program.id}>{data.capabilities.includes('chart.view')?<Link href={`/students/${studentId}/programs/${program.id}/chart`}>{version.title}</Link>:version.title}</li>;
      })}</ul></section></MainLayout>;
    }
  }
  return <Suspense fallback={<p>Cargando ficha…</p>}><StudentsPage/></Suspense>;
}

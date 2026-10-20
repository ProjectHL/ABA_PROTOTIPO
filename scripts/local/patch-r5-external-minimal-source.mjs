import{readFileSync,writeFileSync}from'node:fs';const modify=(f,a,b)=>{const s=readFileSync(f,'utf8');if(s.split(a).length!==2)throw Error('Source anchor changed: '+f);writeFileSync(f,s.replace(a,b));};
const student='src/modules/students/student.server.ts';writeFileSync(student,readFileSync(student,'utf8')+`
const programStudentScope = z.object({id:z.uuid(),clinicId:z.uuid(),initials:z.string().min(1).max(12),status:z.enum(['active','archived']),capabilities:z.array(z.string())}).strict();
/** Program-only access reveals initials, never a clinical detail DTO. */
export async function getAuthorizedProgramStudent(studentId:string,clinicId:string) {
  const full=await getAuthorizedStudent(studentId,clinicId);
  if(full)return {id:full.id,clinicId:full.clinicId,displayName:full.displayName,initials:full.initials,photoAttachmentId:full.photoAttachmentId,status:full.status,capabilities:[...full.capabilities]};
  const {db}=await sessionForClinic(clinicId);
  const result=await (db.rpc.bind(db) as unknown as Rpc)('aba_program_student_scope_v2',{p_clinic_id:uuid.parse(clinicId),p_student_id:uuid.parse(studentId)});
  if(result.error)throw new Error('No fue posible cargar la identificación autorizada para programas.');
  if(result.data===null)return null;
  const minimal=programStudentScope.parse(result.data);
  if(minimal.id!==studentId||minimal.clinicId!==clinicId)throw new Error('Identificación fuera del recurso solicitado.');
  if(!minimal.capabilities.includes('program.view'))return null;
  return {...minimal,displayName:minimal.initials,photoAttachmentId:null};
}
`);
modify('src/modules/program-session/program-session.server.ts',"import { getAuthorizedStudent }", "import { getAuthorizedProgramStudent }");modify('src/modules/program-session/program-session.server.ts','await getAuthorizedStudent(studentId,clinicId)','await getAuthorizedProgramStudent(studentId,clinicId)');
const chart='app/students/[studentId]/programs/[programId]/chart/page.tsx';let c=readFileSync(chart,'utf8');c=c.replace("import { getAuthorizedStudent } from '@/modules/students/student.server';\n",'').replace("import { loadProgramSessionPageData } from '@/modules/program-session';","import { revalidateProgramSessionPageData } from '@/modules/program-session/program-session.server';");const before="    const student=await getAuthorizedStudent(studentId,identity.active.id);\n    if(!student?.capabilities.includes('chart.view'))notFound();\n    const data=await loadProgramSessionPageData(identity.active.id,studentId);";if(!c.includes(before))throw Error('Chart anchor changed');c=c.replace(before,"    const scope=await revalidateProgramSessionPageData(identity.active.id,studentId,identity.userId);\n    if(scope.status==='unavailable')notFound();\n    const data=scope.data;");writeFileSync(chart,c);
const results='src/modules/results/results.server.ts';modify(results,"import { getAuthorizedStudent }","import { getAuthorizedStudent, getAuthorizedProgramStudent }");modify(results,'async function scope(clinicIdRaw:string,studentIdRaw:string)','async function scope(clinicIdRaw:string,studentIdRaw:string,mode:\'clinical\'|\'programs\'=\'clinical\')');modify(results,'const student=await getAuthorizedStudent(studentId,clinicId);','const student=await (mode===\'programs\'?getAuthorizedProgramStudent(studentId,clinicId):getAuthorizedStudent(studentId,clinicId));');modify(results,'const {clinicId,studentId,student}=await scope(clinicIdRaw,studentIdRaw);','const {clinicId,studentId,student}=await scope(clinicIdRaw,studentIdRaw,\'programs\');');
modify('app/session/[studentId]/page.tsx',"import SessionPage", "import { notFound } from 'next/navigation';\nimport SessionPage");modify('app/session/[studentId]/page.tsx','    return <SessionPage','    if(!data.capabilities.includes(\'student.view\'))notFound();\n    return <SessionPage');
writeFileSync('app/students/[studentId]/page.tsx',`import { Suspense } from 'react';
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
        return <li key={program.id}>{data.capabilities.includes('chart.view')?<Link href={\`/students/\${studentId}/programs/\${program.id}/chart\`}>{version.title}</Link>:version.title}</li>;
      })}</ul></section></MainLayout>;
    }
  }
  return <Suspense fallback={<p>Cargando ficha…</p>}><StudentsPage/></Suspense>;
}
`);console.log('Six source files updated for minimal program scope; clinical mutations unchanged');

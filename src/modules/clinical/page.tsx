import { notFound } from 'next/navigation';
import { clinicalContext } from './context';
import { uuid } from './contracts';
import { ClinicalWorkspace } from './workspace';
import type { Database } from '@/lib/supabase/database.types';

type Row<T extends keyof Database['public']['Tables']>=Database['public']['Tables'][T]['Row'];
export type SessionRecord=Omit<Row<'session_program_records'>,'dimension'> & {dimension:'percentage'|'frequency'|'interval'};
export interface WorkspaceData {
    email:string; choices:{id:string;name:string;role:string}[]; active:{id:string;name:string;role:string}|null;
    students:Row<'clients'>[]; student:Row<'clients'>|null; capabilities:string[];
    guardians:(Row<'guardians'> & {relationship?:string|null;phone?:string|null})[]; siblings:Row<'siblings'>[];
    context:Row<'client_context_profiles'>|null; history:Row<'clinical_history_entries'>[]; consents:Row<'consent_records'>[];
    programs:Row<'programs'>[]; versions:Row<'program_versions'>[]; sessions:Row<'clinical_sessions'>[]; records:SessionRecord[];
    assignments:Row<'student_assignments'>[];
    team:{user_id:string;email:string;role:string;status:string}[];
}

export async function ClinicalPage({studentId,programId,initialTab}:{studentId?:string;programId?:string;initialTab?:string}) {
    const {db,user,choices,active}=await clinicalContext();
    const data:WorkspaceData={email:user.email??'',choices,active,students:[],student:null,capabilities:[],guardians:[],siblings:[],context:null,history:[],consents:[],programs:[],versions:[],sessions:[],records:[],assignments:[],team:[]};
    if(active) {
        const students=await db.from('clients').select('*').eq('organization_id',active.id).order('created_at',{ascending:false});
        if(students.error) throw new Error('No se pudieron cargar las carpetas.');
        data.students=students.data;
        if(active.role==='admin') {
            type TeamResult={data:unknown;error:{message:string}|null};
            const rpc=db.rpc as unknown as (name:string,args:Record<string,unknown>)=>PromiseLike<TeamResult>;
            const team=await rpc('mvp_team',{p_organization_id:active.id});
            if(team.error) throw new Error('No se pudo cargar el equipo. Verifica que las migraciones estén aplicadas.');
            data.team=team.data as unknown as WorkspaceData['team'];
        }
        if(studentId) {
            if(!uuid.safeParse(studentId).success) notFound();
            data.student=students.data.find(s=>s.id===studentId)??null;
            if(!data.student) notFound();
            const capabilities=await db.rpc('get_student_capabilities',{p_client_id:studentId});
            if(capabilities.error || !capabilities.data.includes('student.view')) notFound();
            data.capabilities=capabilities.data;
            const [guardians,siblings,context,history,consents,programs,versions,sessions,records,assignments]=await Promise.all([
                db.from('guardians').select('*').eq('client_id',studentId).order('position'),
                db.from('siblings').select('*').eq('client_id',studentId).order('position'),
                db.from('client_context_profiles').select('*').eq('client_id',studentId).maybeSingle(),
                db.from('clinical_history_entries').select('*').eq('client_id',studentId).order('created_at',{ascending:false}),
                db.from('consent_records').select('*').eq('client_id',studentId).order('created_at',{ascending:false}),
                db.from('programs').select('*').eq('client_id',studentId).order('created_at',{ascending:false}),
                db.from('program_versions').select('*').eq('client_id',studentId).order('version',{ascending:false}),
                db.from('clinical_sessions').select('*').eq('client_id',studentId).order('created_at',{ascending:false}),
                db.from('session_program_records').select('*').eq('client_id',studentId).order('created_at',{ascending:false}),
                db.from('student_assignments').select('*').eq('client_id',studentId),
            ]);
            if([guardians,siblings,context,history,consents,programs,versions,sessions,records,assignments].some(r=>r.error)) throw new Error('No se pudo cargar una sección clínica. Vuelve a intentar.');
            Object.assign(data,{guardians:guardians.data,siblings:siblings.data,context:context.data,history:history.data,consents:consents.data,programs:programs.data,versions:versions.data,sessions:sessions.data,records:records.data as unknown as SessionRecord[],assignments:assignments.data});
            if(programId && (!uuid.safeParse(programId).success || !data.programs.some(p=>p.id===programId))) notFound();
        }
    }
    return <ClinicalWorkspace data={data} initialTab={initialTab} />;
}

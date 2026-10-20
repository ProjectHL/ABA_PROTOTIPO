import { notFound } from 'next/navigation';
import { clinicalContext } from './context';
import { uuid } from './contracts';
import { ClinicalWorkspace } from './workspace';
import type { Database } from '@/lib/db/database.types';
import { loadProgramSessionPageData } from '@/modules/program-session/program-session.server';
import type { ProgramSessionPageData } from '@/modules/program-session/ports';

type Row<T extends keyof Database['public']['Tables']>=Database['public']['Tables'][T]['Row'];
export type SessionRecord=Omit<Row<'session_program_records'>,'dimension'> & {dimension:'percentage'|'frequency'|'interval'};

const clientColumns='id,organization_id,clinical_id,initials,birth_date,primary_language,living_arrangement,status,test_run_id,created_at,updated_at';
const guardianColumns='id,client_id,initials,birth_date,position,relationship,phone,test_run_id,created_at';
const siblingColumns='id,client_id,initials,birth_date,position,test_run_id,created_at';
const contextColumns='client_id,organization_id,schooling,school_adaptations,home_adaptations,version,updated_by,test_run_id,created_at,updated_at';
const historyColumns='id,organization_id,client_id,kind,descriptor,status,occurred_on,dose,prescriber_descriptor,started_on,ended_on,supersedes_id,created_by,test_run_id,created_at';
const consentColumns='id,organization_id,client_id,purpose_code,grantor_descriptor,status,effective_at,expires_at,channel,evidence_reference,notice_version,supersedes_id,created_by,test_run_id,created_at';
const programColumns='id,organization_id,client_id,program_type,status,current_version_id,created_by,test_run_id,created_at,updated_at';
const versionColumns='id,organization_id,client_id,program_id,program_type,title,version,version_state,design,supersedes_version_id,activated_at,created_by,test_run_id,created_at';
const sessionColumns='id,client_id,occurred_on,status,notes,test_run_id,created_at,updated_at';
const recordColumns='id,client_id,session_id,program_version_id,dimension,payload,submitted,version,actor_user_id,test_run_id,created_at,updated_at';
const assignmentColumns='id,organization_id,client_id,user_id,role,is_primary,status,effective_at,ended_at,created_by,test_run_id,created_at';

export interface WorkspaceData {
    userId:string; email:string; choices:{id:string;name:string;role:string}[]; active:{id:string;name:string;role:string}|null;
    students:Row<'clients'>[]; student:Row<'clients'>|null; capabilities:string[];
    guardians:(Row<'guardians'> & {relationship?:string|null;phone?:string|null})[]; siblings:Row<'siblings'>[];
    context:Row<'client_context_profiles'>|null; history:Row<'clinical_history_entries'>[]; consents:Row<'consent_records'>[];
    programs:Row<'programs'>[]; versions:Row<'program_versions'>[]; sessions:Row<'clinical_sessions'>[]; records:SessionRecord[];
    assignments:Row<'student_assignments'>[];
    team:{user_id:string;email:string;role:string;status:string}[];
}

export async function ClinicalPage({studentId,programId,initialTab}:{studentId?:string;programId?:string;initialTab?:string}) {
    const {db,user,choices,active}=await clinicalContext();
    let programSession:ProgramSessionPageData|null=null;
    const data:WorkspaceData={userId:user.id,email:user.email??'',choices,active,students:[],student:null,capabilities:[],guardians:[],siblings:[],context:null,history:[],consents:[],programs:[],versions:[],sessions:[],records:[],assignments:[],team:[]};
    if(active) {
        const students=await db.from('clients').select(clientColumns).eq('organization_id',active.id).order('created_at',{ascending:false});
        if(students.error) throw new Error('No se pudieron cargar las carpetas.');
        data.students=students.data;
        if(active.role==='admin') {
            type TeamResult={data:unknown;error:{message:string}|null};
            const rpc=db.rpc.bind(db) as unknown as (name:string,args:Record<string,unknown>)=>PromiseLike<TeamResult>;
            const team=await rpc('mvp_team',{p_organization_id:active.id});
            if(team.error) throw new Error('No se pudo cargar el equipo. Verifica que las migraciones estén aplicadas.');
            data.team=team.data as unknown as WorkspaceData['team'];
        }
        if(studentId) {
            if(!uuid.safeParse(studentId).success) notFound();
            data.student=students.data.find(s=>s.id===studentId)??null;
            if(!data.student) notFound();
            const capabilities=await db.rpc('get_student_capabilities',{p_client_id:studentId});
            const granted=(capabilities.data as string[]|null)??[];
            if(capabilities.error || !granted.includes('student.view')) notFound();
            data.capabilities=granted;
            const [guardians,siblings,context,history,consents,programs,versions,sessions,records,assignments]=await Promise.all([
                db.from('guardians').select(guardianColumns).eq('client_id',studentId).order('position'),
                db.from('siblings').select(siblingColumns).eq('client_id',studentId).order('position'),
                db.from('client_context_profiles').select(contextColumns).eq('client_id',studentId).maybeSingle(),
                db.from('clinical_history_entries').select(historyColumns).eq('client_id',studentId).order('created_at',{ascending:false}),
                db.from('consent_records').select(consentColumns).eq('client_id',studentId).order('created_at',{ascending:false}),
                db.from('programs').select(programColumns).eq('client_id',studentId).order('created_at',{ascending:false}),
                db.from('program_versions').select(versionColumns).eq('client_id',studentId).order('version',{ascending:false}),
                db.from('clinical_sessions').select(sessionColumns).eq('client_id',studentId).order('created_at',{ascending:false}),
                db.from('session_program_records').select(recordColumns).eq('client_id',studentId).order('created_at',{ascending:false}),
                db.from('student_assignments').select(assignmentColumns).eq('client_id',studentId),
            ]);
            if([guardians,siblings,context,history,consents,programs,versions,sessions,records,assignments].some(r=>r.error)) throw new Error('No se pudo cargar una sección clínica. Vuelve a intentar.');
            Object.assign(data,{guardians:guardians.data,siblings:siblings.data,context:context.data,history:history.data,consents:consents.data,programs:programs.data,versions:versions.data,sessions:sessions.data,records:records.data as unknown as SessionRecord[],assignments:assignments.data});
            programSession=await loadProgramSessionPageData(active.id,studentId);
            if(programId && (!uuid.safeParse(programId).success || !data.programs.some(p=>p.id===programId))) notFound();
        }
    }
    return <ClinicalWorkspace data={data} programSession={programSession} initialTab={initialTab} />;
}

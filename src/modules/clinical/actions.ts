'use server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { commandSchema,uuid } from './contracts';
import { clinicalContext } from './context';
import type { Json } from '@/lib/supabase/database.types';

export async function selectClinic(id:string) {
    const ctx=await clinicalContext();
    if(!uuid.safeParse(id).success || !ctx.choices.some(o=>o.id===id)) return {error:'Clínica no autorizada.'};
    (await cookies()).set('aba-clinic',id,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/'});
    revalidatePath('/','layout'); return {error:null};
}
export async function clinicalCommand(raw:unknown):Promise<{error:string|null;data?:Json}> {
    const parsed=commandSchema.safeParse(raw);
    if(!parsed.success) return {error:'Revisa los campos: '+parsed.error.issues.map(i=>i.path.join('.')+': '+i.message).join('; ')};
    const {db,active}=await clinicalContext();
    if(!active) return {error:'Selecciona una clínica activa.'};
    const c=parsed.data;
    const configuredTestRun=process.env.ABA_TEST_RUN_ID;
    const testRun=configuredTestRun && uuid.safeParse(configuredTestRun).success ? configuredTestRun : undefined;
    if('clientId' in c) {
        const check=await db.from('clients').select('id').eq('id',c.clientId).eq('organization_id',active.id).maybeSingle();
        if(check.error || !check.data) return {error:'Carpeta no disponible en esta clínica.'};
    }
    type RpcResult={data:unknown;error:{code?:string;message:string}|null};
    const rpc=db.rpc.bind(db) as unknown as (name:string,args?:Record<string,unknown>)=>PromiseLike<RpcResult>;
    let result:RpcResult;
    switch(c.op) {
        case 'student': result=await rpc('mvp_save_student',{p_organization_id:active.id,p_client_id:c.id,p_expected_updated_at:c.expected,p_payload:c.payload,p_test_run_id:c.id?undefined:testRun});break;
        case 'student-status': result=await rpc('mvp_set_student_status',{p_organization_id:active.id,p_client_id:c.clientId,p_expected_updated_at:c.expected,p_status:c.status});break;
        case 'context': result=await db.rpc('save_client_context',{p_client_id:c.clientId,p_expected_version:c.expected,p_home_adaptations:c.home||undefined,p_schooling:c.school||undefined,p_school_adaptations:c.adaptations||undefined});break;
        case 'history': result=await db.rpc('append_clinical_history_entry',{p_client_id:c.clientId,p_kind:c.kind,p_descriptor:c.descriptor,p_occurred_on:c.occurred||undefined,p_dose:c.dose||undefined,p_prescriber_descriptor:c.prescriber||undefined,p_started_on:c.started||undefined,p_ended_on:c.ended||undefined,p_supersedes_id:c.supersedes});break;
        case 'consent': result=await db.rpc('record_consent_reference',{p_client_id:c.clientId,p_purpose_code:c.purpose,p_notice_version:c.notice,p_grantor_descriptor:c.grantor,p_channel:c.channel,p_evidence_reference:c.reference||undefined,p_status:c.status,p_supersedes_id:c.supersedes});break;
        case 'program': {
            if(c.predecessor) {
                const old=await db.from('program_versions').select('id').eq('id',c.predecessor).eq('client_id',c.clientId).maybeSingle();
                if(!old.data) return {error:'Versión no disponible.'};
                result=await db.rpc('create_program_successor',{p_version_id:c.predecessor,p_title:c.title,p_design:c.design});
            } else result=await db.rpc('create_program_draft',{p_client_id:c.clientId,p_title:c.title,p_program_type:c.design.kind,p_design:c.design});break;
        }
        case 'transition': {
            const program=await db.from('programs').select('id').eq('id',c.programId).eq('client_id',c.clientId).maybeSingle();
            if(!program.data) return {error:'Programa no disponible.'};
            result=await db.rpc('transition_program',{p_program_id:c.programId,p_version_id:c.versionId,p_next_status:c.status});break;
        }
        case 'record': result=await rpc('mvp_save_record',{p_id:c.id,p_session_id:c.sessionId,p_client_id:c.clientId,p_program_version_id:c.versionId,p_dimension:c.measurement.dimension,p_payload:c.measurement.payload,p_expected_version:c.expected,p_submit:c.submit});break;
        case 'finish': {
            const session=await db.from('clinical_sessions').select('id').eq('id',c.sessionId).eq('client_id',c.clientId).maybeSingle();
            if(!session.data) return {error:'Sesión no disponible.'};
            result=await rpc('mvp_finish_session',{p_session_id:c.sessionId});break;
        }
        case 'invite': result=await db.functions.invoke('invite-clinic-member',{body:{organizationId:active.id,operationId:c.operationId,email:c.email,role:c.role}});break;
        case 'member': result=await rpc('mvp_set_member',{p_organization_id:active.id,p_user_id:c.userId,p_role:c.role,p_status:c.status});break;
        case 'assignment': result=await db.rpc('set_student_assignment',{p_client_id:c.clientId,p_user_id:c.userId,p_role:c.role,p_status:c.status});break;
    }
    if(result.error) {
        const code=result.error.code;
        return {error:code==='42501'?'No tienes permiso para esta acción.':code==='40001'||code==='P0002'?'El registro cambió. Recarga antes de volver a intentar.':code==='23505'?'Ya existe un registro con ese identificador.':'No se guardó el cambio. Revisa los campos y el estado del registro.'};
    }
    if(result.data===null || result.data===undefined) return {error:'El servidor no devolvió una confirmación persistida. Recarga antes de reintentar.'};
    revalidatePath('/','layout');
    return {error:null,data:result.data as Json};
}

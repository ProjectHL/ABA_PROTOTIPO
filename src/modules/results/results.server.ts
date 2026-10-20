'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { commandResultSchema, readCommandResult, type CommandResult } from '@/domain/commands/result';
import { loadIdentity } from '@/features/team/identity.server';
import { requireSessionUser } from '@/lib/auth/session';
import { dbAsUser } from '@/lib/db';
import { getAuthorizedStudent, getAuthorizedProgramStudent } from '@/modules/students/student.server';
import { resultGoalCommandSchema, resultGoalSchema, type ResultGoal } from './contracts';

type DbError={code?:string;message:string};type RpcResult={data:unknown;error:DbError|null};
type GoalRow={id:string;organization_id:string;client_id:string;program_id:string;dimension:string;comparator:string;target_value:number;label:string;version:number;archived_at:string|null;created_at:string;updated_at:string};
type GoalQuery={select(columns:string):GoalQuery;eq(column:string,value:string):GoalQuery;is(column:string,value:null):GoalQuery;order(column:string,options:{ascending:boolean}):PromiseLike<{data:GoalRow[]|null;error:DbError|null}>};

async function scope(clinicIdRaw:string,studentIdRaw:string,mode:'clinical'|'programs'='clinical'){const clinicId=z.uuid().parse(clinicIdRaw),studentId=z.uuid().parse(studentIdRaw);const identity=await loadIdentity();
  if(identity.active?.id!==clinicId)throw new Error('La clínica cambió; vuelve a abrir resultados.');const student=await (mode==='programs'?getAuthorizedProgramStudent(studentId,clinicId):getAuthorizedStudent(studentId,clinicId));if(!student)throw new Error('Ficha no disponible.');return {clinicId,studentId,identity,student};}
export async function loadResultGoals(clinicIdRaw:string,studentIdRaw:string,programIdRaw:string):Promise<ResultGoal[]>{
  const {clinicId,studentId,student}=await scope(clinicIdRaw,studentIdRaw,'programs');const programId=z.uuid().parse(programIdRaw);if(!student.capabilities.includes('chart.view'))throw new Error('Resultados no disponibles.');
  const db=dbAsUser((await requireSessionUser()).id);const from=db.from.bind(db) as unknown as (relation:string)=>GoalQuery;
  const result=await from('program_result_goals_v2').select('id,organization_id,client_id,program_id,dimension,comparator,target_value,label,version,archived_at,created_at,updated_at').eq('organization_id',clinicId).eq('client_id',studentId).eq('program_id',programId).is('archived_at',null).order('created_at',{ascending:true});
  if(result.error)throw new Error('No se pudieron recuperar las metas autorizadas.');return (result.data??[]).map(row=>resultGoalSchema.parse({id:row.id,clinicId:row.organization_id,studentId:row.client_id,programId:row.program_id,dimension:row.dimension,comparator:row.comparator,targetValue:row.target_value,label:row.label,version:row.version,archivedAt:row.archived_at,createdAt:row.created_at,updatedAt:row.updated_at}));
}
export async function mutateResultGoal(raw:unknown):Promise<CommandResult>{
  const envelope=z.object({clinicId:z.uuid(),command:resultGoalCommandSchema}).strict().parse(raw);const {student}=await scope(envelope.clinicId,envelope.command.studentId);if(!student.capabilities.includes('chart.configure'))throw new Error('No tienes permiso vigente para configurar metas.');
  const db=dbAsUser((await requireSessionUser()).id);const rpc=db.rpc.bind(db) as unknown as (name:string,args:Record<string,unknown>)=>PromiseLike<RpcResult>;const result=await rpc('command_result_goal_v2',{p_clinic_id:envelope.clinicId,p_command:envelope.command});
  if(result.error){if(result.error.code==='42501')throw new Error('El permiso fue revocado; la meta no se confirmó.');if(result.error.code==='40001')throw new Error('La identidad del reintento entró en conflicto; conserva y revisa la meta.');throw new Error('Resultado desconocido. Reintenta exactamente la misma operación.');}
  const parsed=commandResultSchema.parse(result.data);const receipt=readCommandResult(parsed,{operationId:envelope.command.operationId,idempotencyKey:envelope.command.idempotencyKey,resourceId:envelope.command.goalId});if(receipt.status==='acknowledged')revalidatePath(`/students/${envelope.command.studentId}/programs/${envelope.command.programId}/chart`);return receipt;
}

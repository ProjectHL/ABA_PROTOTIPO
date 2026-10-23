'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSessionUser } from '@/lib/auth/session';
import { dbAsUser } from '@/lib/db';
import { readCommandResult } from '@/domain/commands/result';
import { loadIdentity } from '@/features/team/identity.server';
import {
  authorizedStudentSummary, clinicalHistoryCommand, consentCommand, clinicStudentCommand,
  studentDetailDto, type AuthorizedStudentSummary, type StudentDetailDto,
} from './contracts';

const uuid = z.uuid();
const capabilityList = z.array(z.string());

async function sessionForClinic(clinicId: string) {
  const expectedClinicId = uuid.parse(clinicId);
  const identity = await loadIdentity();
  if (identity.active?.id !== expectedClinicId) {
    throw new Error('La clínica cambió. Conserva el borrador y vuelve a abrir la operación en su clínica original; no se envió el comando.');
  }
  const db = dbAsUser((await requireSessionUser()).id);
  const user = await requireSessionUser();
  if (user.id !== identity.userId) throw new Error('Tu sesión caducó. Inicia sesión nuevamente.');
  return { db, user, clinicId: expectedClinicId, role: identity.active.role };
}

async function capabilityForStudent(clinicId: string, studentId: string, required: string) {
  const { db } = await sessionForClinic(clinicId);
  const student = await db.from('clients').select('id').eq('id', uuid.parse(studentId)).eq('organization_id', clinicId).maybeSingle();
  if (student.error || !student.data) throw new Error('Ficha no disponible en esta clínica.');
  const result = await db.rpc('get_student_capabilities', { p_client_id: studentId });
  const capabilities = capabilityList.safeParse(result.data);
  if (result.error || !capabilities.success || !capabilities.data.includes(required)) {
    throw new Error('No tienes permiso vigente para esta ficha.');
  }
  return { db, capabilities: capabilities.data };
}

/** Returns only resources allowed by the current database policy plus the canonical capability engine. */
export async function listAuthorizedStudents(clinicId: string): Promise<AuthorizedStudentSummary[]> {
  const { db, clinicId: capturedClinicId } = await sessionForClinic(clinicId);
  const rpc = db.rpc.bind(db) as unknown as Rpc;
  const v2 = await rpc('aba_list_students_v2', { p_organization_id: capturedClinicId });
  if (v2.error) throw new Error('No fue posible consultar las fichas autorizadas.');
  return z.array(authorizedStudentSummary).parse(v2.data);
}

/** Canonical V2 detail reader. The V1 family/history fallback was removed with the V1 tables. */
export async function getAuthorizedStudent(studentId: string, clinicId: string): Promise<StudentDetailDto | null> {
  const session = await sessionForClinic(clinicId);
  const rpc = session.db.rpc.bind(session.db) as unknown as Rpc;
  const v2 = await rpc('aba_student_detail_v2', { p_organization_id: clinicId, p_client_id: uuid.parse(studentId) });
  if (v2.error) throw new Error('No fue posible cargar la ficha autorizada.');
  return v2.data === null ? null : studentDetailDto.parse(v2.data);
}

type RpcResult = { data: unknown; error: { code?: string; message: string } | null };
type Rpc = (name: string, args: Record<string, unknown>) => PromiseLike<RpcResult>;

async function invokeV2(
  name: string,
  clinicId: string,
  studentId: string,
  command: { operationId: string; idempotencyKey: string },
  create = false,
  resultResourceId = studentId,
) {
  // A create has no row to inspect. Its preflight is deliberately limited to the
  // active clinic/role; the RPC rechecks authorization after it reserves the id.
  let db;
  if (create) {
    const session = await sessionForClinic(clinicId);
    if (session.role !== 'admin' && session.role !== 'supervisor') throw new Error('No tienes permiso vigente para crear una ficha en esta clínica.');
    db = session.db;
  } else {
    db = (await capabilityForStudent(clinicId, studentId, 'student.edit')).db;
  }
  const rpc = db.rpc.bind(db) as unknown as Rpc;
  const result = await rpc(name, { p_organization_id: clinicId, p_command: command });
  if (result.error) throw new Error(result.error.code === '42501' ? 'No tienes permiso vigente para esta ficha.' : result.error.code === '40001' ? 'La ficha cambió o la operación fue reutilizada. Conserva tu borrador y revisa el servidor.' : 'El servidor no confirmó el cambio clínico.');
  return readCommandResult(result.data, {
    operationId: command.operationId,
    idempotencyKey: command.idempotencyKey,
    resourceId: resultResourceId,
  });
}

/** These names are the A2 boundary proposed to root; no browser code has elevated DB or Storage access. */
export async function saveStudentV2(raw: unknown) {
  const request = clinicStudentCommand.parse(raw);
  const result = await invokeV2('aba_student_command_v2', request.clinicId, request.command.studentId, request.command, request.command.action === 'create');
  if (result.status === 'acknowledged') revalidatePath('/students');
  return result;
}

export async function saveClinicalHistoryV2(raw: unknown) {
  const command = clinicalHistoryCommand.parse(raw);
  const result = await invokeV2(
    'aba_clinical_history_command_v2', command.clinicId, command.studentId, command, false, command.historyId,
  );
  if (result.status === 'acknowledged') revalidatePath(`/students/${command.studentId}`);
  return result;
}

export async function saveConsentV2(raw: unknown) {
  const command = consentCommand.parse(raw);
  const result = await invokeV2(
    'aba_consent_command_v2', command.clinicId, command.studentId, command, false, command.consentId,
  );
  if (result.status === 'acknowledged') revalidatePath(`/students/${command.studentId}`);
  return result;
}

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

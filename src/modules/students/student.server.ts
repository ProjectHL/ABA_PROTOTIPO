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

function summaryFromClient(row: {
  id: string; organization_id: string; clinical_id: string; initials: string; status: string; updated_at: string;
}, capabilities: string[]): AuthorizedStudentSummary {
  return authorizedStudentSummary.parse({
    id: row.id, clinicId: row.organization_id, displayName: row.initials, initials: row.initials,
    clinicalId: row.clinical_id,
    rut: null, photoAttachmentId: null, reportedDiagnosis: null, hasActiveSession: false,
    familyAccessEnabled: false, assignedProfessional: null,
    status: row.status === 'active' ? 'active' : 'archived', capabilities, version: null,
  });
}

/** Returns only resources allowed by the current database policy plus the canonical capability engine. */
export async function listAuthorizedStudents(clinicId: string): Promise<AuthorizedStudentSummary[]> {
  const { db, clinicId: capturedClinicId } = await sessionForClinic(clinicId);
  const rpc = db.rpc.bind(db) as unknown as Rpc;
  const v2 = await rpc('aba_list_students_v2', { p_organization_id: capturedClinicId });
  if (!v2.error) return z.array(authorizedStudentSummary).parse(v2.data);
  if (v2.error.code !== '42883') throw new Error('No fue posible consultar las fichas autorizadas.');
  const query = await db.from('clients')
    .select('id, organization_id, clinical_id, initials, status, updated_at')
    .eq('organization_id', capturedClinicId)
    .order('created_at', { ascending: false });
  if (query.error) throw new Error('No fue posible consultar las fichas autorizadas.');
  const rows = await Promise.all((query.data ?? []).map(async (row) => {
    const result = await db.rpc('get_student_capabilities', { p_client_id: row.id });
    const capabilities = capabilityList.safeParse(result.data);
    if (result.error || !capabilities.success || !capabilities.data.includes('student.view')) return null;
    return summaryFromClient(row, capabilities.data);
  }));
  return rows.filter((row): row is AuthorizedStudentSummary => row !== null);
}

/**
 * Compatibility reader for the applied V1 schema. Fields not stored yet stay null;
 * names, RUT and V2 attachment links are never manufactured from initials or paths.
 */
export async function getAuthorizedStudent(studentId: string, clinicId: string): Promise<StudentDetailDto | null> {
  const session = await sessionForClinic(clinicId);
  const rpc = session.db.rpc.bind(session.db) as unknown as Rpc;
  const v2 = await rpc('aba_student_detail_v2', { p_organization_id: clinicId, p_client_id: uuid.parse(studentId) });
  if (!v2.error) return v2.data === null ? null : studentDetailDto.parse(v2.data);
  if (v2.error.code !== '42883') throw new Error('No fue posible cargar la ficha autorizada.');
  const { db, capabilities } = await capabilityForStudent(clinicId, studentId, 'student.view');
  const clientResult = await db.from('clients')
    .select('id, organization_id, clinical_id, initials, birth_date, primary_language, living_arrangement, status, created_at, updated_at')
    .eq('id', studentId).eq('organization_id', clinicId).maybeSingle();
  if (clientResult.error) throw new Error('No fue posible cargar la ficha autorizada.');
  if (!clientResult.data) return null;
  const [context, guardians, siblings, history, consents] = await Promise.all([
    db.from('client_context_profiles').select('home_adaptations, schooling, school_adaptations').eq('client_id', studentId).maybeSingle(),
    db.from('guardians').select('id, initials, birth_date, relationship, phone').eq('client_id', studentId).order('position'),
    db.from('siblings').select('id, initials, birth_date').eq('client_id', studentId).order('position'),
    db.from('clinical_history_entries').select('id, kind, descriptor, dose, prescriber_descriptor, started_on, ended_on, status, supersedes_id, created_at').eq('client_id', studentId).order('created_at', { ascending: false }),
    db.from('consent_records').select('id, purpose_code, notice_version, grantor_descriptor, channel, status, evidence_attachment_id, supersedes_id, version, created_at').eq('client_id', studentId).order('created_at', { ascending: false }),
  ]);
  if ([context, guardians, siblings, history, consents].some((result) => result.error)) {
    throw new Error('No fue posible recuperar la información clínica autorizada.');
  }
  const client = clientResult.data;
  return studentDetailDto.parse({
    ...summaryFromClient(client, capabilities), clinicalId: client.clinical_id, fullName: null, rut: null,
    birthDate: client.birth_date, primaryLanguage: client.primary_language, livingArrangement: client.living_arrangement,
    reportedDiagnosis: null, consultationReason: null,
    context: { home: context.data?.home_adaptations ?? '', school: context.data?.schooling ?? '', adaptations: context.data?.school_adaptations ?? '' },
    people: (guardians.data ?? []).map((person) => ({ id: person.id, fullName: null, initials: person.initials, birthDate: person.birth_date, relationship: person.relationship ?? '', phone: person.phone, email: null, roles: ['family'] as const, isPrimaryContact: false })),
    siblings: (siblings.data ?? []).map((person) => ({ id: person.id, fullName: null, initials: person.initials, birthDate: person.birth_date, notes: null })),
    history: (history.data ?? []).map((entry) => ({ historyId: entry.id, versionId: entry.id, kind: entry.kind, descriptor: entry.descriptor, dose: entry.dose, frequency: null, prescriber: entry.prescriber_descriptor, startedOn: entry.started_on, endedOn: entry.ended_on, notes: null, status: entry.status === 'active' || entry.status === 'inactive' || entry.status === 'superseded' || entry.status === 'entered_in_error' ? entry.status : 'entered_in_error', supersedesVersionId: entry.supersedes_id, version: null, createdAt: entry.created_at })),
    consents: (consents.data ?? []).map((item) => ({ consentId: item.supersedes_id ?? item.id, versionId: item.id, version: item.version, id: item.id, purposeCode: item.purpose_code, noticeVersion: item.notice_version, grantor: item.grantor_descriptor, channel: item.channel, status: item.status, evidenceAttachmentId: item.evidence_attachment_id, supersedesVersionId: item.supersedes_id, createdAt: item.created_at })),
    createdAt: client.created_at, updatedAt: client.updated_at,
  });
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

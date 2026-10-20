'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { loadIdentity } from '@/features/team/identity.server';
import { requireSessionUser } from '@/lib/auth/session';
import { dbAsUser } from '@/lib/db';
import { commandResultSchema, readCommandResult, type CommandResult } from '@/domain/commands/result';
import { programDraftCommandV2Schema, type ProgramDraftCommandV2 } from '@/domain/programs/design-v2';
import { captureCommandV2Schema, type CaptureCommandV2 } from '@/domain/measurements/measurement-v2';
import { archiveSessionCommandV2Schema, sessionCommandV2Schema, type ArchiveSessionCommandV2, type SessionCommandV2 } from '@/domain/sessions/session-v2';
import { sessionV2Schema } from '@/domain/sessions/session-v2';
import { getAuthorizedProgramStudent } from '@/modules/students/student.server';
import { programLifecycleCommandV2Schema, type ProgramLifecycleCommandV2, type ProgramSessionPageData } from './ports';

type RpcResult = { data: unknown; error: { code?: string; message: string } | null };
type Rpc = (name: string, args: Record<string, unknown>) => PromiseLike<RpcResult>;
const scopeSchema = z.object({ clinicId: z.uuid(), command: z.unknown() }).strict();
const snapshotResultSchema = z.object({ actorId: z.uuid(), programs: z.array(z.object({
  id:z.uuid(),studentId:z.uuid(),clinicId:z.uuid(),kind:z.enum(['acquisition','behavior']),
  status:z.enum(['draft','active','paused','achieved','discontinued']),revision:z.number().int().nonnegative(),currentVersionId:z.uuid().nullable(),
  versions:z.array(z.object({id:z.uuid(),programId:z.uuid(),studentId:z.uuid(),clinicId:z.uuid(),number:z.number().int().positive(),revision:z.number().int().nonnegative(),state:z.enum(['draft','released','superseded']),title:z.string().min(1).max(160),originalDesign:z.unknown(),predecessorVersionId:z.uuid().nullable(),createdAt:z.iso.datetime({offset:true}),publishedAt:z.iso.datetime({offset:true}).nullable()}).strict())
}).strict()),sessions:z.array(sessionV2Schema),records:z.array(z.object({id:z.uuid(),sessionId:z.uuid(),studentId:z.uuid(),programId:z.uuid(),programVersionId:z.uuid(),version:z.number().int().positive(),submitted:z.boolean(),discarded:z.boolean(),originalMeasurement:z.unknown(),createdAt:z.iso.datetime({offset:true}),actorId:z.uuid(),revisions:z.array(z.object({id:z.uuid(),number:z.number().int().positive(),reason:z.string().max(2000),originalMeasurement:z.unknown(),createdAt:z.iso.datetime({offset:true}),actorId:z.uuid()}).strict())}).strict())}).strict();

async function verifiedScope(raw: unknown) {
  const scope = scopeSchema.parse(raw);
  const identity = await loadIdentity();
  if (!identity.active || identity.active.id !== scope.clinicId)
    throw new Error('La clínica cambió. Conserva el trabajo y vuelve a abrir la operación; no se envió el comando.');
  return scope;
}

function transportError(error: RpcResult['error']): never {
  if (error?.code === '42501') throw new Error('Tus permisos ya no permiten esta operación. El trabajo permanece sin confirmar.');
  if (error?.code === '40001') throw new Error('El comando entró en conflicto. Conserva este mismo comando y consulta el recurso antes de resolverlo.');
  if (error?.code === '22023') throw new Error('El servidor rechazó la estructura o transición del comando. El trabajo permanece sin confirmar.');
  throw new Error('Resultado del comando desconocido. Reintenta exactamente la misma operación y clave; no se afirma guardado.');
}

async function invoke(clinicId: string, rpcName: string, command: { operationId: string; idempotencyKey: string }, resourceId: string): Promise<CommandResult> {
  const db = dbAsUser((await requireSessionUser()).id);
  const rpc = db.rpc.bind(db) as unknown as Rpc;
  const result = await rpc(rpcName, { p_clinic_id: clinicId, p_command: command });
  if (result.error) transportError(result.error);
  const parsed = commandResultSchema.safeParse(result.data);
  if (!parsed.success) throw new Error('El servidor no entregó un recibo interpretable. Reintenta el mismo comando; el resultado sigue desconocido.');
  return readCommandResult(parsed.data, { operationId: command.operationId, idempotencyKey: command.idempotencyKey, resourceId });
}

async function complete(result: CommandResult) {
  if (result.status === 'acknowledged') revalidatePath('/', 'layout');
  return result;
}

export async function saveProgramDraftV2(raw: unknown) {
  const scope = await verifiedScope(raw); const command: ProgramDraftCommandV2 = programDraftCommandV2Schema.parse(scope.command);
  return complete(await invoke(scope.clinicId, 'command_program_draft_v2', command, command.programVersionId));
}
export async function transitionProgramV2(raw: unknown) {
  const scope = await verifiedScope(raw); const command: ProgramLifecycleCommandV2 = programLifecycleCommandV2Schema.parse(scope.command);
  return complete(await invoke(scope.clinicId, 'command_program_lifecycle_v2', command, command.programId));
}
export async function mutateSessionV2(raw: unknown) {
  const scope = await verifiedScope(raw); const command: SessionCommandV2 = sessionCommandV2Schema.parse(scope.command);
  return complete(await invoke(scope.clinicId, 'command_session_v2', command, command.sessionId));
}
export async function archiveSessionV2(raw: unknown) {
  const scope = await verifiedScope(raw); const command: ArchiveSessionCommandV2 = archiveSessionCommandV2Schema.parse(scope.command);
  return complete(await invoke(scope.clinicId, 'command_archive_session_v2', command, command.sessionId));
}
export async function persistCaptureV2(raw: unknown) {
  const scope = await verifiedScope(raw); const command: CaptureCommandV2 = captureCommandV2Schema.parse(scope.command);
  return complete(await invoke(scope.clinicId, 'command_capture_v2', command, command.recordId));
}

async function readProgramSessionPageData(clinicIdRaw: string, studentIdRaw: string, expectedActorId?: string): Promise<ProgramSessionPageData | null> {
  const clinicId=z.uuid().parse(clinicIdRaw);const studentId=z.uuid().parse(studentIdRaw);
  const identity=await loadIdentity();if(identity.active?.id!==clinicId)throw new Error('La clínica cambió; vuelve a abrir la ficha.');
  if(expectedActorId && identity.userId!==z.uuid().parse(expectedActorId))throw new Error('La identidad cambió; no se revalidó esta operación.');
  const student=await getAuthorizedProgramStudent(studentId,clinicId);if(!student)return null;
  const db=dbAsUser((await requireSessionUser()).id);const rpc=db.rpc.bind(db) as unknown as Rpc;
  const result=await rpc('read_program_session_v2',{p_clinic_id:clinicId,p_student_id:studentId});
  if(result.error)throw new Error('No se pudieron recuperar programas, sesiones y registros autorizados.');
  const snapshot=snapshotResultSchema.parse(result.data);if(snapshot.actorId!==identity.userId)throw new Error('La lectura no corresponde a la identidad autenticada.');
  return {...snapshot,clinicId,studentId,capabilities:[...student.capabilities],student:{displayName:student.displayName,initials:student.initials,photoAttachmentId:student.photoAttachmentId,status:student.status}};
}

export async function loadProgramSessionPageData(clinicIdRaw: string, studentIdRaw: string): Promise<ProgramSessionPageData> {
  const data=await readProgramSessionPageData(clinicIdRaw,studentIdRaw);
  if(!data)throw new Error('Ficha no disponible.');
  return data;
}

/** A successful authorized absence is distinct from transport/auth/context failure. */
export async function revalidateProgramSessionPageData(clinicId: string, studentId: string, actorId: string): Promise<
  {status:'authorized';data:ProgramSessionPageData} |
  {status:'unavailable';actorId:string;clinicId:string;studentId:string}
> {
  const data=await readProgramSessionPageData(clinicId,studentId,actorId);
  return data ? {status:'authorized',data} : {status:'unavailable',actorId,clinicId,studentId};
}

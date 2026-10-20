'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { commandResultSchema, readCommandResult, type CommandResult } from '@/domain/commands/result';
import { loadIdentity } from '@/features/team/identity.server';
import { requireSessionUser } from '@/lib/auth/session';
import { dbAsUser } from '@/lib/db';
import { listAuthorizedStudents } from '@/modules/students/student.server';
import { clinicAccessRequestCreateCommand, clinicAccessRequestDecisionCommand, clinicStudentShareCommand, collaborationPageData, type CollaborationPageData } from './contracts';

type RpcResult = { data: unknown; error: { code?: string; message: string } | null };
type Rpc = (name: string, args: Record<string, unknown>) => PromiseLike<RpcResult>;

async function authenticated() {
  const identity = await loadIdentity();
  const db = dbAsUser((await requireSessionUser()).id);
  const user = await requireSessionUser();
  if (user.id !== identity.userId) throw new Error('Tu sesión caducó. Inicia sesión nuevamente.');
  return { db, identity };
}

export async function loadCollaborationPageData(clinicIdRaw?: string | null): Promise<CollaborationPageData> {
  const clinicId = clinicIdRaw == null ? null : z.uuid().parse(clinicIdRaw);
  const { db, identity } = await authenticated();
  if (clinicId && identity.active?.id !== clinicId) throw new Error('La clínica activa cambió. Vuelve a abrir los accesos compartidos.');
  const rpc = db.rpc.bind(db) as unknown as Rpc;
  const readSchema = z.object({ clinicId: z.uuid().nullable(), actorId: z.uuid(), invitations: collaborationPageData.shape.invitations }).strict();
  const [scopedResult, receivedResult, accessResult] = await Promise.all([
    rpc('aba_student_share_read_v2', { p_organization_id: clinicId }),
    clinicId ? rpc('aba_student_share_read_v2', { p_organization_id: null }) : Promise.resolve(null),
    clinicId ? rpc('aba_student_access_request_read_v2', { p_organization_id: clinicId }) : Promise.resolve(null),
  ]);
  if (scopedResult.error || receivedResult?.error || accessResult?.error) throw new Error('No se pudo recuperar la bandeja de accesos autorizada.');
  const scoped = readSchema.parse(scopedResult.data);
  const received = receivedResult ? readSchema.parse(receivedResult.data) : null;
  if (scoped.actorId !== identity.userId || scoped.clinicId !== clinicId || (received && (received.actorId !== identity.userId || received.clinicId !== null))) {
    throw new Error('La bandeja no corresponde al contexto solicitado.');
  }
  const merged = new Map(scoped.invitations.map((invitation) => [invitation.id, invitation]));
  for (const invitation of received?.invitations ?? []) merged.set(invitation.id, invitation);
  const accessReadSchema = z.object({ clinicId: z.uuid(), actorId: z.uuid(), requests: collaborationPageData.shape.accessRequests }).strict();
  const access = accessResult ? accessReadSchema.parse(accessResult.data) : null;
  if (access && (access.actorId !== identity.userId || access.clinicId !== clinicId)) throw new Error('Las solicitudes no corresponden al contexto activo.');
  const students = clinicId ? await listAuthorizedStudents(clinicId) : [];
  return collaborationPageData.parse({
    clinicId, actorId: identity.userId, invitations: [...merged.values()],
    manageableStudents: students.filter((student) => student.capabilities.includes('authorization.decide')),
    requestableStudents: students.filter((student) => student.capabilities.includes('authorization.request')),
    accessRequests: access?.requests ?? [],
  });
}

function transportFailure(error: RpcResult['error']): never {
  if (error?.code === '42501') throw new Error('No tienes permiso vigente para esta invitación.');
  if (error?.code === '40001') throw new Error('La operación o su clave ya se usaron con otros datos. Conserva el borrador y vuelve a consultar.');
  if (error?.code === '22023') throw new Error('El servidor rechazó el contrato de la invitación.');
  throw new Error('El resultado de la invitación es desconocido. Reintenta exactamente la misma operación y clave.');
}

export async function saveStudentShare(raw: unknown): Promise<CommandResult> {
  const request = clinicStudentShareCommand.parse(raw);
  const { db, identity } = await authenticated();
  const recipientAction = request.command.action === 'accept' || request.command.action === 'reject';
  if (!recipientAction && identity.active?.id !== request.clinicId) throw new Error('La clínica activa cambió. No se envió el comando.');
  const rpc = db.rpc.bind(db) as unknown as Rpc;
  const result = await rpc('aba_student_share_command_v2', { p_organization_id: request.clinicId, p_command: request.command });
  if (result.error) transportFailure(result.error);
  const parsed = commandResultSchema.safeParse(result.data);
  if (!parsed.success) throw new Error('El servidor no entregó un recibo interpretable; el resultado permanece desconocido.');
  const receipt = readCommandResult(parsed.data, {
    operationId: request.command.operationId,
    idempotencyKey: request.command.idempotencyKey,
    resourceId: request.command.invitationId,
  });
  if (receipt.status === 'acknowledged') {
    revalidatePath('/shared-access'); revalidatePath('/invitations'); revalidatePath('/students');
  }
  return receipt;
}

async function saveAccessCommand(
  clinicId: string,
  command: { operationId: string; idempotencyKey: string; requestId: string },
  rpcName: 'aba_student_access_request_command_v2' | 'aba_student_access_decision_command_v2',
): Promise<CommandResult> {
  const { db, identity } = await authenticated();
  if (identity.active?.id !== clinicId) throw new Error('La clínica activa cambió. No se envió la solicitud.');
  const rpc = db.rpc.bind(db) as unknown as Rpc;
  const result = await rpc(rpcName, { p_organization_id: clinicId, p_command: command });
  if (result.error) transportFailure(result.error);
  const parsed = commandResultSchema.safeParse(result.data);
  if (!parsed.success) throw new Error('El servidor no entregó un recibo interpretable; el resultado permanece desconocido.');
  const receipt = readCommandResult(parsed.data, {
    operationId: command.operationId, idempotencyKey: command.idempotencyKey, resourceId: command.requestId,
  });
  if (receipt.status === 'acknowledged') {
    revalidatePath('/shared-access'); revalidatePath('/invitations'); revalidatePath('/students');
  }
  return receipt;
}

export async function saveStudentAccessRequest(raw: unknown): Promise<CommandResult> {
  const request = clinicAccessRequestCreateCommand.parse(raw);
  return saveAccessCommand(request.clinicId, request.command, 'aba_student_access_request_command_v2');
}

export async function saveStudentAccessDecision(raw: unknown): Promise<CommandResult> {
  const request = clinicAccessRequestDecisionCommand.parse(raw);
  return saveAccessCommand(request.clinicId, request.command, 'aba_student_access_decision_command_v2');
}

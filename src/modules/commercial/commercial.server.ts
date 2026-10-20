'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { loadIdentity } from '@/features/team/identity.server';
import { requireSessionUser } from '@/lib/auth/session';
import { dbAsUser } from '@/lib/db';
import { commandResultSchema, readCommandResult, type CommandResult } from '@/domain/commands/result';
import { commercialDocumentCommandSchema, commercialPageDataSchema, subscriptionCommandRequestSchema, type CommercialPageData } from './contracts';

type RpcResult = { data: unknown; error: { code?: string; message: string } | null };
type Rpc = (name: string, args: Record<string, unknown>) => PromiseLike<RpcResult>;

async function activeClinic(clinicIdRaw: string) {
  const clinicId = z.uuid().parse(clinicIdRaw);
  const identity = await loadIdentity();
  if (!identity.active || identity.active.id !== clinicId) throw new Error('La clínica cambió. Conserva el borrador comercial y vuelve a abrirlo; no se envió el comando.');
  return { clinicId, identity };
}

async function activeAdmin(clinicIdRaw: string) {
  const scope = await activeClinic(clinicIdRaw);
  if (scope.identity.active?.role !== 'admin') throw new Error('Solo administración de la clínica puede modificar el plan o documentos internos.');
  return scope;
}

function transportFailure(error: RpcResult['error']): never {
  if (error?.code === '42501') throw new Error('No tienes permiso vigente para esta gestión comercial.');
  if (error?.code === '40001') throw new Error('Conflicto de versión o identidad. Conserva la misma operación y reconsulta antes de resolver.');
  if (error?.code === '22023') throw new Error('El servidor rechazó el cambio comercial. No se procesó cobro ni documento tributario.');
  throw new Error('Resultado comercial desconocido. Reintenta exactamente la misma operación y clave; no se afirma cambio de plan.');
}

async function invoke(clinicId: string, rpcName: string, command: { operationId: string; idempotencyKey: string }, resourceId: string) {
  const db = dbAsUser((await requireSessionUser()).id); const rpc = db.rpc.bind(db) as unknown as Rpc;
  const result = await rpc(rpcName, { p_organization_id: clinicId, p_command: command });
  if (result.error) transportFailure(result.error);
  const parsed = commandResultSchema.safeParse(result.data);
  if (!parsed.success) throw new Error('El servidor no devolvió un recibo comercial interpretable. El resultado sigue desconocido.');
  return readCommandResult(parsed.data, { operationId: command.operationId, idempotencyKey: command.idempotencyKey, resourceId });
}

export async function saveSubscriptionV2(raw: unknown): Promise<CommandResult> {
  const request = subscriptionCommandRequestSchema.parse(raw);
  await activeAdmin(request.clinicId);
  const receipt = await invoke(request.clinicId, 'aba_subscription_command_v2', request.command, request.command.subscriptionId);
  if (receipt.status === 'acknowledged') revalidatePath('/', 'layout');
  return receipt;
}

export async function saveCommercialDocumentV2(raw: unknown): Promise<CommandResult> {
  const command = commercialDocumentCommandSchema.parse(raw);
  await activeAdmin(command.clinicId);
  const receipt = await invoke(command.clinicId, 'aba_commercial_document_command_v2', command, command.documentId);
  if (receipt.status === 'acknowledged') revalidatePath('/', 'layout');
  return receipt;
}

export async function loadCommercialPageData(clinicIdRaw: string): Promise<CommercialPageData> {
  const { clinicId, identity } = await activeClinic(clinicIdRaw);
  const db = dbAsUser((await requireSessionUser()).id); const rpc = db.rpc.bind(db) as unknown as Rpc;
  const result = await rpc('aba_commercial_read_v2', { p_organization_id: clinicId });
  if (result.error) throw new Error('No se pudo recuperar la gestión comercial autorizada.');
  const page = commercialPageDataSchema.parse(result.data);
  if (page.clinicId !== clinicId || page.actorId !== identity.userId || !page.isClinicAdmin) throw new Error('La respuesta comercial no corresponde a la administración activa.');
  return page;
}

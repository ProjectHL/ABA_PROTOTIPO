'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { loadIdentity } from '@/features/team/identity.server';
import { createClient } from '@/lib/supabase/server';
import { commandResultSchema, readCommandResult, type CommandResult } from '@/domain/commands/result';
import { commercialInquirySchema, supportPageDataSchema, ticketCommandRequestSchema, type SupportPageData } from './contracts';

type RpcResult = { data: unknown; error: { code?: string; message: string } | null };
type Rpc = (name: string, args: Record<string, unknown>) => PromiseLike<RpcResult>;

async function activeClinic(clinicIdRaw: string) {
  const clinicId = z.uuid().parse(clinicIdRaw);
  const identity = await loadIdentity();
  if (!identity.active || identity.active.id !== clinicId) throw new Error('La clínica cambió. Conserva el mensaje y vuelve a abrir el ticket original; no se envió el comando.');
  return { clinicId, identity };
}

function transportFailure(error: RpcResult['error']): never {
  if (error?.code === '42501') throw new Error('No tienes permiso vigente para este ticket. El mensaje no fue confirmado.');
  if (error?.code === '40001') throw new Error('Conflicto de versión o identidad. Conserva la misma operación y reconsulta el ticket antes de resolver.');
  if (error?.code === '22023') throw new Error('El servidor rechazó el ticket o su transición; no se confirmó ningún cambio.');
  throw new Error('Resultado de soporte desconocido. Reintenta exactamente la misma operación y clave; no se afirma envío.');
}

export async function saveTicketV2(raw: unknown): Promise<CommandResult> {
  const request = ticketCommandRequestSchema.parse(raw);
  await activeClinic(request.clinicId);
  const db = await createClient(); const rpc = db.rpc.bind(db) as unknown as Rpc;
  const result = await rpc('aba_support_ticket_command_v2', { p_organization_id: request.clinicId, p_command: request.command });
  if (result.error) transportFailure(result.error);
  const parsed = commandResultSchema.safeParse(result.data);
  if (!parsed.success) throw new Error('El servidor no entregó un recibo de ticket interpretable. El resultado permanece desconocido.');
  const receipt = readCommandResult(parsed.data, { operationId: request.command.operationId, idempotencyKey: request.command.idempotencyKey, resourceId: request.command.ticketId });
  if (receipt.status === 'acknowledged') revalidatePath('/', 'layout');
  return receipt;
}

export async function loadSupportPageData(clinicIdRaw: string): Promise<SupportPageData> {
  const { clinicId, identity } = await activeClinic(clinicIdRaw);
  const db = await createClient(); const rpc = db.rpc.bind(db) as unknown as Rpc;
  const result = await rpc('aba_support_ticket_read_v2', { p_organization_id: clinicId });
  if (result.error) throw new Error('No se pudo recuperar el soporte autorizado.');
  const page = supportPageDataSchema.parse(result.data);
  if (page.clinicId !== clinicId || page.actorId !== identity.userId) throw new Error('La respuesta de soporte no corresponde a la identidad activa.');
  return page;
}

/** Public path for the landing: the database boundary must rate-limit and accept only non-clinical contact information. */
export async function submitCommercialInquiryV2(raw: unknown): Promise<CommandResult> {
  const inquiry = commercialInquirySchema.parse(raw);
  const db = await createClient(); const rpc = db.rpc.bind(db) as unknown as Rpc;
  const result = await rpc('aba_commercial_inquiry_v2', { p_inquiry: inquiry });
  if (result.error) {
    if (result.error.code === '42901') throw new Error('Demasiadas solicitudes. Espera antes de repetir con la misma operación.');
    if (result.error.code === '22023') throw new Error('La solicitud comercial no es válida. No se registró información.');
    throw new Error('Resultado de solicitud comercial desconocido. Reintenta exactamente la misma operación y clave.');
  }
  const parsed = commandResultSchema.safeParse(result.data);
  if (!parsed.success) throw new Error('El servidor no entregó un comprobante interpretable. El resultado permanece desconocido.');
  return readCommandResult(parsed.data, { operationId: inquiry.operationId, idempotencyKey: inquiry.idempotencyKey, resourceId: inquiry.id });
}

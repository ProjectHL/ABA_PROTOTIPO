'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { loadIdentity } from '@/features/team/identity.server';
import { createClient } from '@/lib/supabase/server';
import { commandResultSchema, readCommandResult, type CommandResult } from '@/domain/commands/result';
import { calendarCommandRequestSchema, calendarPageDataSchema, type CalendarPageData } from './contracts';

type RpcResult = { data: unknown; error: { code?: string; message: string } | null };
type Rpc = (name: string, args: Record<string, unknown>) => PromiseLike<RpcResult>;

async function activeClinic(clinicId: string) {
  const expected = z.uuid().parse(clinicId);
  const identity = await loadIdentity();
  if (!identity.active || identity.active.id !== expected) {
    throw new Error('La clínica cambió. Conserva el formulario y vuelve a abrir la agenda de la clínica original; no se envió el comando.');
  }
  return identity;
}

function transportFailure(error: RpcResult['error']): never {
  if (error?.code === '42501') throw new Error('No tienes permiso vigente para esta agenda. El trabajo no fue confirmado.');
  if (error?.code === '40001') throw new Error('Conflicto de versión o identidad. Conserva exactamente la misma operación para reintentar o revisa la cita.');
  if (error?.code === '22023') throw new Error('El servidor rechazó los datos de la cita; no se confirmó ningún cambio.');
  throw new Error('Resultado de agenda desconocido. Reintenta exactamente la misma operación y clave; no se afirma guardado.');
}

export async function saveAppointmentV2(raw: unknown): Promise<CommandResult> {
  const request = calendarCommandRequestSchema.parse(raw);
  await activeClinic(request.clinicId);
  const db = await createClient();
  const rpc = db.rpc.bind(db) as unknown as Rpc;
  const result = await rpc('aba_calendar_command_v2', { p_organization_id: request.clinicId, p_command: request.command });
  if (result.error) transportFailure(result.error);
  const parsed = commandResultSchema.safeParse(result.data);
  if (!parsed.success) throw new Error('El servidor no entregó un recibo de agenda interpretable. El resultado permanece desconocido.');
  const receipt = readCommandResult(parsed.data, {
    operationId: request.command.operationId, idempotencyKey: request.command.idempotencyKey, resourceId: request.command.appointmentId,
  });
  if (receipt.status === 'acknowledged') revalidatePath('/', 'layout');
  return receipt;
}

export async function loadCalendarPageData(clinicIdRaw: string): Promise<CalendarPageData> {
  const clinicId = z.uuid().parse(clinicIdRaw);
  const identity = await activeClinic(clinicId);
  const db = await createClient();
  const rpc = db.rpc.bind(db) as unknown as Rpc;
  const result = await rpc('aba_calendar_read_v2', { p_organization_id: clinicId });
  if (result.error) throw new Error('No se pudo recuperar la agenda autorizada.');
  const page = calendarPageDataSchema.parse(result.data);
  if (page.clinicId !== clinicId || page.actorId !== identity.userId) throw new Error('La agenda recibida no corresponde a la clínica o identidad activa.');
  return page;
}
export async function loadCalendarSessions(clinicIdRaw: string, studentIdRaw: string) {
  const clinicId = z.uuid().parse(clinicIdRaw); const studentId = z.uuid().parse(studentIdRaw);
  await activeClinic(clinicId);
  const db = await createClient(); const rpc = db.rpc.bind(db) as unknown as Rpc;
  const result = await rpc('aba_calendar_linkable_sessions_v2', { p_organization_id: clinicId, p_student_id: studentId });
  if (result.error) throw new Error('No se pudieron leer las sesiones finalizadas autorizadas.');
  return z.array(z.object({ id: z.uuid(), capturedAt: z.iso.datetime({ offset: true }) }).strict()).parse(result.data);
}

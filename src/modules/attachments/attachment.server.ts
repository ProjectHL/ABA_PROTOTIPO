'use server';

import { z } from 'zod';
import { requireSessionUser } from '@/lib/auth/session';
import { dbAsUser } from '@/lib/db';
import { loadIdentity } from '@/features/team/identity.server';
import { readCommandResult } from '@/domain/commands/result';
import {
  attachmentCommandSchema, attachmentResourceSchema, attachmentVersionSchema,
  verifyAttachmentUpload, type AttachmentCommand, type AttachmentResource, type AttachmentVersion,
} from '@/domain/attachments/attachment';
import { attachmentCommandEnvelope, type AttachmentCommandEnvelope } from './contracts';
import { putObject } from '@/lib/storage';
import { verifyStoredAttachment } from './verify.server';

const uuid = z.uuid();
type RpcResult = { data: unknown; error: { code?: string; message: string } | null };
type Rpc = (name: string, args: Record<string, unknown>) => PromiseLike<RpcResult>;

function resourceClinicId(resource: AttachmentResource): string | null {
  return resource.kind === 'professional' ? null : resource.clinicId;
}

async function activeSession(clinicId: string | null) {
  const identity = await loadIdentity();
  if (!identity.active) throw new Error('Selecciona una clínica autorizada.');
  if (clinicId && identity.active.id !== uuid.parse(clinicId)) {
    throw new Error('La clínica cambió. Conserva el borrador y vuelve a abrir el recurso original; no se envió el comando.');
  }
  const db = dbAsUser((await requireSessionUser()).id);
  const user = await requireSessionUser();
  if (user.id !== identity.userId) throw new Error('Tu sesión caducó. Inicia sesión nuevamente.');
  return { db, userId: user.id, clinicId: identity.active.id, isAdmin: identity.active.role === 'admin' };
}

async function authorizeResource(resource: AttachmentResource, capability: 'student.view' | 'student.edit') {
  const { db, userId, clinicId, isAdmin } = await activeSession(resourceClinicId(resource));
  if (resource.kind === 'professional') {
    if (resource.userId !== userId && !isAdmin) throw new Error('No tienes permiso vigente para este avatar.');
    const membership = await db.from('memberships').select('user_id, status').eq('organization_id', clinicId).eq('user_id', resource.userId).maybeSingle();
    if (membership.error || membership.data?.status !== 'active') throw new Error('El profesional no pertenece activamente a esta clínica.');
    return { db, clinicId };
  }
  // A5 extends the shared SQL boundary with exact clinic/document ownership.
  if (resource.kind === 'commercial') {
    if (!isAdmin) throw new Error('No tienes permiso vigente para este documento comercial.');
    const rpc = db.rpc.bind(db) as unknown as Rpc;
    const exact = await rpc('aba_attachment_resource_authorized_v2', { p_organization_id: clinicId, p_resource: resource, p_capability: capability });
    if (exact.error || exact.data !== true) throw new Error('El documento comercial no está autorizado para esta clínica.');
    return { db, clinicId };
  }
  const client = await db.from('clients').select('id').eq('id', resource.studentId).eq('organization_id', clinicId).maybeSingle();
  if (client.error || !client.data) throw new Error('Recurso no disponible en esta clínica.');
  const capabilities = await db.rpc('get_student_capabilities', { p_client_id: resource.studentId });
  const granted = capabilities.data as string[] | null;
  if (capabilities.error || !granted?.includes(capability)) throw new Error('No tienes permiso vigente para este recurso.');
  return { db, clinicId };
}

async function invoke(name: string, resource: AttachmentResource, command: AttachmentCommand): Promise<AttachmentCommandEnvelope> {
  const required = command.action === 'archive' ? 'student.edit' : 'student.edit';
  const { db, clinicId } = await authorizeResource(resource, required);
  const rpc = db.rpc.bind(db) as unknown as Rpc;
  const result = await rpc(name, { p_organization_id: clinicId, p_command: command });
  if (result.error) throw new Error(result.error.code === '42501' ? 'No tienes permiso vigente para este recurso.' : 'Resultado de adjunto desconocido; conserva el borrador y reintenta con la misma operación.');
  return readAttachmentEnvelope(result.data, resource, command);
}

function readAttachmentEnvelope(raw: unknown, resource: AttachmentResource, command: AttachmentCommand): AttachmentCommandEnvelope {
  const envelope = attachmentCommandEnvelope.parse(raw);
  const commandResult = readCommandResult(envelope.result, { operationId: command.operationId, idempotencyKey: command.idempotencyKey, resourceId: command.attachmentId });
  if (envelope.version && (envelope.version.attachmentId !== command.attachmentId || JSON.stringify(envelope.version.resource) !== JSON.stringify(resource))) throw new Error('El servidor devolvió una versión de adjunto distinta.');
  if ((command.action === 'reserve-upload' || command.action === 'confirm-upload') && envelope.version && envelope.version.id !== command.versionId) throw new Error('El servidor devolvió una versión distinta a la solicitada.');
  return { result: commandResult, version: envelope.version };
}

const uploadRequest = z.object({
  reservation: attachmentCommandSchema,
  confirmation: attachmentCommandSchema,
}).strict().superRefine((request, ctx) => {
  if (request.reservation.action !== 'reserve-upload') ctx.addIssue({ code: 'custom', path: ['reservation'], message: 'Se requiere reserva de carga.' });
  if (request.confirmation.action !== 'confirm-upload') ctx.addIssue({ code: 'custom', path: ['confirmation'], message: 'Se requiere confirmación de carga.' });
  if (request.reservation.action === 'reserve-upload' && request.confirmation.action === 'confirm-upload') {
    if (request.reservation.attachmentId !== request.confirmation.attachmentId || request.reservation.versionId !== request.confirmation.versionId || JSON.stringify(request.reservation.resource) !== JSON.stringify(request.confirmation.resource)) {
      ctx.addIssue({ code: 'custom', path: ['confirmation'], message: 'La confirmación no corresponde a la reserva.' });
    }
  }
  if (request.reservation.operationId === request.confirmation.operationId || request.reservation.idempotencyKey === request.confirmation.idempotencyKey) {
    ctx.addIssue({ code: 'custom', path: ['confirmation'], message: 'Reserva y confirmación requieren identidades de operación distintas.' });
  }
});

/**
 * Reserve and upload privately. The authorized Edge verifier reads the actual
 * stored bytes and checks size/header/hash before confirming. Ordinary sessions
 * cannot download pending objects. Only a durable receipt confirms the upload.
 */
export async function reserveAndUploadAttachment(raw: unknown, form: FormData): Promise<AttachmentCommandEnvelope> {
  const request = uploadRequest.parse(raw);
  if (request.reservation.action !== 'reserve-upload' || request.confirmation.action !== 'confirm-upload') throw new Error('Comando de adjunto inválido.');
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) throw new Error('Selecciona un archivo no vacío.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  await verifyAttachmentUpload(request.reservation.upload, bytes);
  const reservation = await invoke('aba_attachment_reserve_v2', request.reservation.resource, request.reservation);
  if (reservation.result.status !== 'acknowledged' || !reservation.version) return reservation;
  const reserved = reservation.version;
  if (!['pending-upload', 'available'].includes(reserved.state) || reserved.id !== request.reservation.versionId) throw new Error('La reserva no corresponde a la versión solicitada.');
  const { db, clinicId } = await authorizeResource(request.reservation.resource, 'student.edit');
  if (reserved.state === 'pending-upload') {
    // A duplicate-object or transport error can follow a successful upload.
    // Never overwrite it or widen SELECT policies: the verifier resolves whether
    // the exact reserved object exists with the expected bytes. Without a valid
    // confirmation receipt the caller must retain the same operation for retry.
    try {
      await putObject(reserved.bucket, reserved.objectKey, bytes, db.userId);
    } catch (error) {
      // A duplicate object means a previous attempt already stored these bytes.
      // The verifier decides whether they match; never overwrite.
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
  }
  // Only the constrained verifier can transition pending-upload to available. It
  // validates the caller JWT and real object bytes with its restricted credential;
  // browser and ordinary user RPC calls cannot bypass that boundary.
  const verification = await verifyStoredAttachment({
    userId: db.userId!,
    organizationId: clinicId,
    reservation: request.reservation,
    confirmation: request.confirmation,
  });
  return readAttachmentEnvelope(verification, request.confirmation.resource, request.confirmation);
}

export async function archiveAttachment(raw: unknown): Promise<AttachmentCommandEnvelope> {
  const command = attachmentCommandSchema.parse(raw);
  if (command.action !== 'archive') throw new Error('La operación solicitada no archiva un adjunto.');
  return invoke('aba_attachment_archive_v2', command.resource, command);
}

/** Lists only available/authorized versions; archived history is opt-in and never a public bucket listing. */
export async function listAttachmentVersions(raw: unknown): Promise<AttachmentVersion[]> {
  const request = z.object({ resource: attachmentResourceSchema, includeArchived: z.boolean().default(false) }).strict().parse(raw);
  const { db, clinicId } = await authorizeResource(request.resource, 'student.view');
  const rpc = db.rpc.bind(db) as unknown as Rpc;
  const result = await rpc('aba_attachment_list_v2', { p_organization_id: clinicId, p_resource: request.resource, p_include_archived: request.includeArchived });
  if (result.error) throw new Error('No se pudieron listar los adjuntos autorizados.');
  return z.array(attachmentVersionSchema).parse(result.data);
}

/** Session-bound URL; the route revalidates the exact resource/version on every request. */
export async function temporaryAttachmentReadUrl(raw: unknown): Promise<{ url: string; expiresAt: string }> {
  const request = z.object({ resource: attachmentResourceSchema, versionId: z.uuid() }).strict().parse(raw);
  const { db, clinicId } = await authorizeResource(request.resource, 'student.view');
  const rpc = db.rpc.bind(db) as unknown as Rpc;
  const access = await rpc('aba_attachment_read_v2', { p_organization_id: clinicId, p_resource: request.resource, p_version_id: request.versionId });
  if (access.error) throw new Error('El adjunto no está disponible o ya no tienes acceso.');
  const version = attachmentVersionSchema.parse(access.data);
  if (version.id !== request.versionId || JSON.stringify(version.resource) !== JSON.stringify(request.resource) || version.state !== 'available') throw new Error('El servidor devolvió un adjunto distinto o no disponible.');
  const expiresAt = Date.now() + 300_000;
  const query = new URLSearchParams({ resource: JSON.stringify(request.resource), versionId: request.versionId, expiresAt: String(expiresAt) });
  return { url: `/attachments/read?${query}`, expiresAt: new Date(expiresAt).toISOString() };
}

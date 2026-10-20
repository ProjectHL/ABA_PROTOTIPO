import { z } from 'zod';
import type { CommandResult } from '../commands/result';

export const MIB = 1024 * 1024;
export const attachmentPurpose = z.enum(['professional-avatar', 'student-photo', 'student-document', 'chat-attachment', 'commercial-document']);
export type AttachmentPurpose = z.infer<typeof attachmentPurpose>;
export const attachmentMime = z.enum(['application/pdf', 'image/jpeg', 'image/png']);
export type AttachmentMime = z.infer<typeof attachmentMime>;

export function attachmentLimits(purpose: AttachmentPurpose) {
  attachmentPurpose.parse(purpose);
  return { maxBytes: (purpose === 'professional-avatar' ? 5 : 20) * MIB,
    allowedMimeTypes: purpose === 'professional-avatar' || purpose === 'student-photo'
      ? ['image/jpeg', 'image/png'] as const
      : ['application/pdf', 'image/jpeg', 'image/png'] as const };
}

export const attachmentUploadSchema = z.object({
  purpose: attachmentPurpose, mimeType: attachmentMime,
  fileName: z.string().trim().min(1).max(240).refine((value) => !Array.from(value).some(character => character.charCodeAt(0) < 32 || character === '/' || character === '\\'), 'Nombre de archivo inválido'),
  byteLength: z.number().int().positive(), sha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict().superRefine((upload, ctx) => {
  const limits = attachmentLimits(upload.purpose);
  if (upload.byteLength > limits.maxBytes) ctx.addIssue({ code: 'custom', path: ['byteLength'], message: 'Archivo supera el límite permitido' });
  if (!(limits.allowedMimeTypes as readonly string[]).includes(upload.mimeType)) ctx.addIssue({ code: 'custom', path: ['mimeType'], message: 'Formato no permitido para este recurso' });
});
export type AttachmentUpload = z.infer<typeof attachmentUploadSchema>;

/** Header validation supplements MIME checks; not antivirus or a complete parser. Run on the server with actual bytes. */
export function inspectAttachmentBytes(raw: AttachmentUpload, bytes: Uint8Array): void {
  const upload = attachmentUploadSchema.parse(raw);
  if (bytes.byteLength !== upload.byteLength) throw new Error('Tamaño recibido no coincide');
  const signatures: Record<AttachmentMime, number[]> = {
    'application/pdf': [0x25, 0x50, 0x44, 0x46, 0x2d],
    'image/jpeg': [0xff, 0xd8, 0xff],
    'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  };
  const signature = signatures[upload.mimeType];
  if (!signature.every((value, index) => bytes[index] === value)) throw new Error('Contenido no coincide con el formato declarado');
}

/** Confirm actual bytes before committing an available version; declaration alone is not evidence of upload. */
export async function verifyAttachmentUpload(raw: AttachmentUpload, bytes: Uint8Array): Promise<void> {
  inspectAttachmentBytes(raw, bytes);
  const digest = await crypto.subtle.digest('SHA-256', Uint8Array.from(bytes).buffer);
  const actual = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
  if (actual !== raw.sha256) throw new Error('Huella del archivo recibido no coincide');
}

export const attachmentResourceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('professional'), userId: z.uuid() }).strict(),
  z.object({ kind: z.literal('student'), clinicId: z.uuid(), studentId: z.uuid() }).strict(),
  z.object({ kind: z.literal('chat'), clinicId: z.uuid(), studentId: z.uuid(), conversationId: z.uuid() }).strict(),
  z.object({ kind: z.literal('commercial'), clinicId: z.uuid(), documentId: z.uuid() }).strict(),
]);
export type AttachmentResource = z.infer<typeof attachmentResourceSchema>;

const common = { operationId: z.uuid(), idempotencyKey: z.uuid(), attachmentId: z.uuid(), resource: attachmentResourceSchema };
export const attachmentCommandSchema = z.discriminatedUnion('action', [
  z.object({ ...common, action: z.literal('reserve-upload'), versionId: z.uuid(), expectedVersion: z.number().int().nonnegative(),
    supersedesVersionId: z.uuid().nullable(), upload: attachmentUploadSchema }).strict(),
  z.object({ ...common, action: z.literal('confirm-upload'), versionId: z.uuid(), expectedVersion: z.number().int().positive() }).strict(),
  z.object({ ...common, action: z.literal('archive'), expectedVersion: z.number().int().positive(), reason: z.string().trim().min(1).max(2000) }).strict(),
]).superRefine((command, ctx) => {
  if (command.action !== 'reserve-upload') return;
  const purpose = command.upload.purpose;
  const kind = command.resource.kind;
  const expectedKind = purpose === 'professional-avatar' ? 'professional' : purpose === 'chat-attachment' ? 'chat' : purpose === 'commercial-document' ? 'commercial' : 'student';
  if (kind !== expectedKind) ctx.addIssue({ code: 'custom', path: ['resource'], message: 'Adjunto y recurso incompatibles' });
  if ((command.expectedVersion === 0) !== (command.supersedesVersionId === null)) ctx.addIssue({ code: 'custom', path: ['supersedesVersionId'], message: 'Sustitución requiere versión anterior; alta no la admite' });
});
export type AttachmentCommand = z.infer<typeof attachmentCommandSchema>;

export const attachmentVersionSchema = z.object({
  id: z.uuid(), attachmentId: z.uuid(), resource: attachmentResourceSchema,
  version: z.number().int().positive(), supersedesVersionId: z.uuid().nullable(), upload: attachmentUploadSchema,
  state: z.enum(['pending-upload', 'available', 'archived', 'failed']),
  bucket: z.string().min(1).max(100), objectKey: z.string().min(1).max(1000),
  createdBy: z.uuid(), createdAt: z.iso.datetime({ offset: true }), testBatchId: z.uuid().nullable(),
}).strict();
export type AttachmentVersion = z.infer<typeof attachmentVersionSchema>;

/** Ports require resource checks in adapters; these DTOs never grant permissions. No public URL or destructive delete. */
export interface AttachmentRepository {
  list(resource: AttachmentResource): Promise<AttachmentVersion[]>;
  command(command: AttachmentCommand): Promise<CommandResult>;
  temporaryRead(resource: AttachmentResource, versionId: string): Promise<{ url: string; expiresAt: string }>;
}

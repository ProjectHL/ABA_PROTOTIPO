'use client';

import {
  attachmentCommandSchema, attachmentLimits, attachmentUploadSchema, inspectAttachmentBytes, verifyAttachmentUpload,
  type AttachmentCommand, type AttachmentPurpose, type AttachmentResource, type AttachmentVersion,
} from '@/domain/attachments/attachment';

export type AttachmentUploadRequest = { reservation: AttachmentCommand; confirmation: AttachmentCommand };

/** Validate before retaining a command. Persistence/authorization remain server-owned. */
export async function prepareAttachmentUpload(file: File, resource: AttachmentResource, purpose: AttachmentPurpose,
  previous?: AttachmentVersion): Promise<AttachmentUploadRequest> {
  const limits = attachmentLimits(purpose);
  if (file.size < 1 || file.size > limits.maxBytes) throw new Error(`Selecciona un archivo no vacío de hasta ${limits.maxBytes / 1024 / 1024} MiB.`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const sha256 = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
  const upload = attachmentUploadSchema.parse({ purpose, mimeType: file.type, fileName: file.name, byteLength: file.size, sha256 });
  inspectAttachmentBytes(upload, bytes);
  if (previous && (JSON.stringify(previous.resource) !== JSON.stringify(resource) || previous.upload.purpose !== purpose)) throw new Error('La versión anterior no corresponde al recurso.');
  const attachmentId = previous?.attachmentId ?? crypto.randomUUID();
  const versionId = crypto.randomUUID(); const expectedVersion = previous?.version ?? 0;
  return {
    reservation: attachmentCommandSchema.parse({ action: 'reserve-upload', operationId: crypto.randomUUID(), idempotencyKey: crypto.randomUUID(), attachmentId, versionId, expectedVersion, supersedesVersionId: previous?.id ?? null, resource, upload }),
    confirmation: attachmentCommandSchema.parse({ action: 'confirm-upload', operationId: crypto.randomUUID(), idempotencyKey: crypto.randomUUID(), attachmentId, versionId, expectedVersion: expectedVersion + 1, resource }),
  };
}

/** Fetch only through a freshly authorized signed URL and bypass every HTTP cache. */
export async function fetchAuthorizedAttachmentBlob(url: string, version: AttachmentVersion) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error('No se pudo descargar el archivo autorizado.');
  const blob = await response.blob();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  await verifyAttachmentUpload(version.upload, bytes);
  return new Blob([bytes], { type: version.upload.mimeType });
}

/** Browser download is ephemeral; durable offline retention is a separate explicit action. */
export async function downloadAuthorizedAttachment(url: string, fileName: string) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error('No se pudo descargar el archivo autorizado.');
  const blobUrl = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a'); anchor.href = blobUrl; anchor.download = fileName;
  document.body.appendChild(anchor);
  try { anchor.click(); } finally { anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000); }
}

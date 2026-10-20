'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Badge, Button, Card, FileInput, Group, Loader, Stack, Text } from '@mantine/core';
import {
  attachmentCommandSchema, attachmentUploadSchema, inspectAttachmentBytes, MIB,
  type AttachmentCommand, type AttachmentVersion,
} from '@/domain/attachments/attachment';
import { archiveAttachment, listAttachmentVersions, reserveAndUploadAttachment, temporaryAttachmentReadUrl } from '@/modules/attachments/attachment.server';
import { commercialDocumentCommandSchema, type CommercialDocumentCommand, type CommercialDocumentDto } from './contracts';
import { loadCommercialPageData, saveCommercialDocumentV2 } from './commercial.server';

type UploadRequest = { reservation: AttachmentCommand; confirmation: AttachmentCommand };
type Operation = { kind: 'upload'; request: UploadRequest; file: File }
  | { kind: 'link'; command: CommercialDocumentCommand }
  | { kind: 'archive'; command: AttachmentCommand };
const describe = (cause: unknown) => cause instanceof Error ? cause.message : 'No se pudo confirmar la operación.';
const newId = () => crypto.randomUUID();

export function CommercialAttachmentsPanel({ initialDocument, verified, onClose, onRefresh }: {
  initialDocument: CommercialDocumentDto; verified: boolean; onClose: () => void; onRefresh: () => Promise<void>;
}) {
  const [document, setDocument] = useState(initialDocument);
  const [versions, setVersions] = useState<AttachmentVersion[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState<Operation | null>(null);
  const pendingRef = useRef<Operation | null>(null);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [conflict, setConflict] = useState(false);
  const [access, setAccess] = useState<{ url: string; expiresAt: string; versionId: string } | null>(null);
  const readSequence = useRef(0);
  const resource = useMemo(() => ({ kind: 'commercial' as const, clinicId: initialDocument.clinicId, documentId: initialDocument.id }), [initialDocument.clinicId, initialDocument.id]);
  const remember = (operation: Operation | null) => { pendingRef.current = operation; setPending(operation); };
  const refresh = useCallback(async () => {
    const sequence = ++readSequence.current;
    setLoading(true); setReady(false); setAccess(null);
    try {
      const [page, attachments] = await Promise.all([
        loadCommercialPageData(resource.clinicId), listAttachmentVersions({ resource, includeArchived: true }),
      ]);
      const current = page.documents.find(item => item.id === resource.documentId);
      if (!current) throw new Error('El documento ya no está disponible.');
      if (sequence === readSequence.current) { setDocument(current); setVersions(attachments); setReady(true); }
    } catch (cause) { if (sequence === readSequence.current) { setError(describe(cause)); setVersions([]); } }
    finally { if (sequence === readSequence.current) setLoading(false); }
  }, [resource]);
  useEffect(() => { const cleanupSequence=readSequence;void refresh(); return () => { cleanupSequence.current++; }; }, [refresh]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (pendingRef.current || busyRef.current || file) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [file]);

  const execute = async (operation: Operation) => {
    remember(operation);
    const envelope = operation.kind === 'upload'
      ? await (async () => { const form = new FormData(); form.set('file', operation.file); return reserveAndUploadAttachment(operation.request, form); })()
      : operation.kind === 'archive' ? await archiveAttachment(operation.command) : null;
    const result = operation.kind === 'link' ? await saveCommercialDocumentV2(operation.command) : envelope!.result;
    if (result.status === 'acknowledged' && operation.kind === 'upload'
      && (!envelope?.version || envelope.version.state !== 'available')) {
      throw new Error('No se recibió una versión disponible; conserva la misma carga para reintentar.');
    }
    remember(null);
    if (result.status === 'acknowledged') {
      if (operation.kind === 'upload') setFile(null);
      setNotice(operation.kind === 'upload' ? 'Archivo verificado. Falta vincularlo: selecciona «Vincular al documento».'
        : operation.kind === 'archive' ? 'Referencia archivada. Los bytes se conservan.'
        : operation.command.document?.attachmentVersionId ? 'Vínculo del archivo confirmado.' : 'Archivo desvinculado. Se conserva en el historial.');
    } else { setError(result.message); setConflict(result.status === 'conflict'); }
    await refresh();
    await onRefresh();
  };
  const run = async (prepare: () => Operation | Promise<Operation>) => {
    if (busyRef.current || !verified) return;
    busyRef.current = true; setBusy(true); setError(''); setNotice(''); setAccess(null);
    try { await execute(pendingRef.current ?? await prepare()); }
    catch (cause) { setError(describe(cause)); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const upload = () => run(async () => {
    if (!file || !ready || document.archived || conflict) throw new Error('Selecciona un archivo y revisa el documento vigente.');
    if (file.size < 1 || file.size > 20 * MIB) throw new Error('Selecciona un archivo no vacío de hasta 20 MiB.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const sha256 = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
    const upload = attachmentUploadSchema.parse({ purpose: 'commercial-document', mimeType: file.type, fileName: file.name, byteLength: file.size, sha256 });
    inspectAttachmentBytes(upload, bytes);
    // A new record keeps the previously linked bytes available until association
    // is explicitly confirmed. Uploading never silently replaces the document.
    const attachmentId = newId(); const versionId = newId();
    return { kind: 'upload', file, request: {
      reservation: attachmentCommandSchema.parse({ action: 'reserve-upload', operationId: newId(), idempotencyKey: newId(), attachmentId, versionId, resource, expectedVersion: 0, supersedesVersionId: null, upload }),
      confirmation: attachmentCommandSchema.parse({ action: 'confirm-upload', operationId: newId(), idempotencyKey: newId(), attachmentId, versionId, resource, expectedVersion: 1 }),
    } };
  });
  const link = (versionId: string | null) => {
    if (!ready || document.archived || conflict || pendingRef.current || busyRef.current) return;
    if (!window.confirm(versionId ? '¿Vincular este archivo? El vínculo anterior permanecerá en el historial de versiones del documento.' : '¿Desvincular el archivo? No se eliminarán sus bytes.')) return;
    void run(() => ({ kind: 'link', command: commercialDocumentCommandSchema.parse({
      schemaVersion: 2, operationId: newId(), idempotencyKey: newId(), clinicId: resource.clinicId,
      documentId: document.id, expectedVersion: document.version, confirmation: true, action: 'replace',
      document: {
        id: document.id, clinicId: document.clinicId, subscriptionId: document.subscriptionId,
        version: document.version + 1, kind: document.kind, title: document.title, issuedAt: document.issuedAt,
        lines: document.lines, currency: document.currency, minorUnitDigits: document.minorUnitDigits,
        attachmentVersionId: versionId, predecessorId: document.predecessorId,
        archived: false, demonstration: true, taxDocument: false, paymentRequested: false,
      },
    }) }));
  };
  const archive = (version: AttachmentVersion) => {
    if (!ready || document.archived || conflict || pendingRef.current || busyRef.current) return;
    if (!window.confirm('¿Archivar esta referencia? Primero debe estar desvinculada del documento vigente. Los bytes no se eliminan.')) return;
    void run(() => ({ kind: 'archive', command: attachmentCommandSchema.parse({ action: 'archive', operationId: newId(), idempotencyKey: newId(), attachmentId: version.attachmentId, resource, expectedVersion: version.version, reason: 'Archivado desde la gestión comercial interna' }) }));
  };
  const read = async (version: AttachmentVersion, download: boolean) => {
    if (busyRef.current || !verified || pendingRef.current) return;
    busyRef.current = true; setBusy(true); setError(''); setAccess(null);
    try {
      const signed = await temporaryAttachmentReadUrl({ resource, versionId: version.id });
      if (!download) setAccess({ ...signed, versionId: version.id });
      else {
        const response = await fetch(signed.url, { cache: 'no-store' });
        if (!response.ok) throw new Error('No se pudo descargar el archivo autorizado.');
        const blob = await response.blob(); const url = URL.createObjectURL(blob);
        const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = version.upload.fileName;
        window.document.body.appendChild(anchor); anchor.click(); anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      }
    } catch (cause) { setError(describe(cause)); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const locked = busy || !!pending || !verified || !ready || loading || conflict;
  return <Stack>
    <Text fw={600}>{document.title} · versión {document.version}</Text>
    <Text size="sm">PDF, JPEG o PNG hasta 20 MiB. Carga y vínculo se confirman por separado; al sustituir se conserva el archivo anterior.</Text>
    {error && <Alert color="red">{error}</Alert>}{notice && <Alert color="green">{notice}</Alert>}
    {pending && <Alert color="yellow">Resultado incierto. Conservamos el archivo y las mismas claves de operación en esta ventana.
      <Button mt="sm" loading={busy} disabled={!verified} onClick={() => void run(() => pending)}>Reintentar misma operación</Button></Alert>}
    {conflict && <Alert color="yellow">El recurso cambió. Revisa el documento y su vínculo actual; el archivo cargado no se descarta.
      <Button mt="sm" disabled={!ready || busy} onClick={() => { setConflict(false); setError(''); }}>He revisado la versión actual</Button></Alert>}
    {document.archived && <Alert color="gray">Documento archivado: sólo consulta de archivos disponibles.</Alert>}
    <Group justify="space-between"><Text size="sm">Archivo vinculado: {document.attachmentVersionId ? versions.find(v => v.id === document.attachmentVersionId)?.upload.fileName ?? 'Referencia no disponible' : 'Ninguno'}</Text>
      <Button variant="subtle" loading={loading} disabled={busy || !!pending} onClick={() => void refresh()}>Actualizar</Button></Group>
    {loading && <Loader size="sm"/>}
    {document.attachmentVersionId && !document.archived && <Button variant="light" disabled={locked} onClick={() => link(null)}>Desvincular archivo actual</Button>}
    {!document.archived && <Card withBorder><Stack>
      <FileInput label="Cargar archivo nuevo o sustituto" accept="application/pdf,image/jpeg,image/png" value={file} onChange={setFile} disabled={locked} clearable/>
      <Button disabled={locked || !file} onClick={() => void upload()}>Cargar y verificar archivo</Button>
    </Stack></Card>}
    {ready && versions.length === 0 && <Text c="dimmed">No hay archivos confirmados.</Text>}
    {versions.map(version => <Card key={version.id} withBorder><Stack gap="xs">
      <Group justify="space-between"><Text>{version.upload.fileName}</Text><Badge color={version.state === 'available' ? 'blue' : 'gray'}>{version.state === 'available' ? 'Disponible' : 'Archivado'}</Badge></Group>
      <Text size="xs">{(version.upload.byteLength / MIB).toFixed(2)} MiB · {new Date(version.createdAt).toLocaleString('es-CL')}</Text>
      {version.id === document.attachmentVersionId && <Badge color="green">Vinculado al documento</Badge>}
      {version.state === 'available' && <Group>
        <Button size="xs" variant="light" disabled={busy || !!pending || !verified || !ready} onClick={() => void read(version, false)}>Preparar vista</Button>
        <Button size="xs" variant="light" disabled={busy || !!pending || !verified || !ready} onClick={() => void read(version, true)}>Descargar</Button>
        {!document.archived && version.id !== document.attachmentVersionId && <>
          <Button size="xs" disabled={locked} onClick={() => link(version.id)}>Vincular al documento</Button>
          <Button size="xs" variant="subtle" color="red" disabled={locked} onClick={() => archive(version)}>Archivar referencia</Button>
        </>}
      </Group>}
      {access?.versionId === version.id && <Button component="a" href={access.url} target="_blank" rel="noopener noreferrer" variant="light">Abrir archivo · acceso hasta {new Date(access.expiresAt).toLocaleTimeString('es-CL')}</Button>}
      {version.state === 'archived' && <Text size="xs" c="dimmed">Referencia histórica conservada; sin acceso de descarga.</Text>}
    </Stack></Card>)}
    <Button variant="default" disabled={busy || !!pending} onClick={() => { if (!busyRef.current && !pendingRef.current && (!file || window.confirm('¿Descartar el archivo seleccionado sin cargar?'))) onClose(); }}>Cerrar adjuntos</Button>
  </Stack>;
}

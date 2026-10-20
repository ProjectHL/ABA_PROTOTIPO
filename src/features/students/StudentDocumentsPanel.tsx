'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Badge, Button, FileButton, Group, Modal, Paper, Select, Stack, Switch,
  Text, TextInput, Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { Archive, Eye, FileText, History, Plus, RefreshCw, Upload } from 'lucide-react';
import type { AttachmentCommand, AttachmentResource, AttachmentVersion } from '@/domain/attachments/attachment';
import { prepareAttachmentUpload, downloadAuthorizedAttachment, fetchAuthorizedAttachmentBlob } from '@/modules/attachments/attachment.client';
import { consentCommand, type ConsentCommand, type ConsentDto } from '@/modules/students/contracts';
import {
  archiveAttachment, listAttachmentVersions, reserveAndUploadAttachment,
  temporaryAttachmentReadUrl,
} from '@/modules/attachments/attachment.server';
import { saveConsentV2 } from '@/modules/students/student.server';
import { useOffline } from '@/modules/offline';

type ConsentAction = ConsentCommand['action'];
type Props = {
  clinicId: string;
  studentId: string;
  consents: ConsentDto[];
  canEdit: boolean;
  onRefresh: () => Promise<void>;
  leaveGuard?: { current: (() => boolean) | null };
};

const newId = () => crypto.randomUUID();
const terminalMessage = (result: { status: string; message?: string; replayed?: boolean }) => result.status === 'acknowledged'
  ? result.replayed ? 'Se recuperó el recibo de la operación anterior.' : 'El servidor confirmó el cambio.'
  : result.message ?? 'El servidor no confirmó el cambio.';
const formatBytes = (bytes: number) => bytes >= 1024 * 1024
  ? `${(bytes / (1024 * 1024)).toFixed(1)} MiB`
  : `${Math.max(1, Math.round(bytes / 1024))} KiB`;

export function StudentDocumentsPanel({ clinicId, studentId, consents, canEdit, onRefresh, leaveGuard }: Props) {
  const offline = useOffline();
  const resource = useMemo<AttachmentResource>(() => ({ kind: 'student', clinicId, studentId }), [clinicId, studentId]);
  const [documents, setDocuments] = useState<AttachmentVersion[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [access, setAccess] = useState<{versionId: string; url: string; expiresAt: string} | null>(null);
  const [conflict, setConflict] = useState<{kind: 'attachment' | 'consent'; message: string; ready: boolean} | null>(null);
  const [conflictUpload, setConflictUpload] = useState<{file: File; previous?: AttachmentVersion} | null>(null);
  const [unknownUpload, setUnknownUpload] = useState(false);
  const pendingUpload = useRef<{ signature: string; request: unknown; file: File; previous?: AttachmentVersion } | null>(null);
  const busyRef = useRef(false);
  const readSequence = useRef(0);
  const pendingArchive = useRef(new Map<string, AttachmentCommand>());
  const pendingConsent = useRef<ConsentCommand | null>(null);
  const newFileReset = useRef<() => void>(null);
  const [consentOpened, consentModal] = useDisclosure(false);
  const [consentAction, setConsentAction] = useState<ConsentAction>('create');
  const [selectedConsent, setSelectedConsent] = useState<ConsentDto | null>(null);
  const consentForm = useForm({
    initialValues: { purposeCode: '', noticeVersion: '', grantor: '', channel: '', status: 'pending_review', evidenceAttachmentId: '' },
  });
  const hasPending = () => !!pendingUpload.current || pendingArchive.current.size > 0 || !!pendingConsent.current;
  useEffect(() => {
    const leave = () => {
      if (busyRef.current || hasPending()) { setError('Resuelve las operaciones documentales pendientes antes de salir.'); return false; }
      return !(consentOpened || conflictUpload || conflict) || window.confirm('¿Salir sin resolver el borrador documental conservado?');
    };
    if (leaveGuard) leaveGuard.current = leave;
    const warn = (event: BeforeUnloadEvent) => {
      if (busyRef.current || hasPending() || consentOpened || conflictUpload || conflict) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', warn);
    return () => { if (leaveGuard) leaveGuard.current = null; window.removeEventListener('beforeunload', warn); };
  });

  const load = async () => {
    const sequence = ++readSequence.current;
    setLoading(true); setAccess(null);
    try {
      const rows = await listAttachmentVersions({ resource, includeArchived });
      if (sequence !== readSequence.current) return false;
      setDocuments(rows);
      return true;
    } catch (cause) {
      if (sequence === readSequence.current) { setDocuments([]); setError(cause instanceof Error ? cause.message : 'No fue posible consultar los documentos.'); }
      return false;
    } finally { if (sequence === readSequence.current) setLoading(false); }
  };
  useEffect(() => { void load(); return () => { readSequence.current++; }; }, [clinicId, studentId, includeArchived]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentConsents = useMemo(() => {
    const byRoot = new Map<string, ConsentDto>();
    for (const consent of consents) {
      const current = byRoot.get(consent.consentId);
      if (!current || consent.version > current.version) byRoot.set(consent.consentId, consent);
    }
    return [...byRoot.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [consents]);
  const availableDocuments = documents.filter((item) => item.state === 'available' && item.upload.purpose === 'student-document');
  const evidenceOptions = [...new Map([...availableDocuments].sort((a,b) => a.version-b.version).map(item => [item.attachmentId, item])).values()]
    .map(item => ({value:item.attachmentId,label:`${item.upload.fileName} · v${item.version}`}));
  const refreshConflict = async () => {
    setConflict(value => value ? {...value, ready: false} : null);
    try {
      const loaded = await load(); await onRefresh();
      if (loaded) setConflict(value => value ? {...value, ready: true} : null);
    } catch { setError('No se pudo consultar la versión actual. El borrador sigue conservado y el nuevo envío está bloqueado.'); }
  };
  const acceptConflict = () => {
    if (!conflict?.ready || busy || loading) return;
    if (conflict.kind === 'consent' && selectedConsent) {
      const latest = currentConsents.find(item => item.consentId === selectedConsent.consentId);
      if (!latest) { setError('El consentimiento ya no está disponible; no se recreará automáticamente.'); return; }
      setSelectedConsent(latest);
    }
    if (conflictUpload?.previous) {
      const latest = documents.filter(item => item.attachmentId === conflictUpload.previous!.attachmentId).sort((a,b) => b.version-a.version)[0];
      if (!latest || latest.state !== 'available') { setError('El archivo anterior no está disponible para sustituirlo. Se conserva el archivo seleccionado.'); return; }
      setConflictUpload(value => value ? {...value, previous: latest} : null);
    }
    setConflict(null); setError('');
  };
  const conflictNotice = conflict ? <Alert color="yellow" title="Revisión requerida">{conflict.message}
    <Text size="sm">El borrador se conserva. Revisa la lista actual y, para consentimientos, su versión vigente antes de confirmar otra operación.</Text>
    {selectedConsent && <Text size="sm">Vigente: {currentConsents.find(item => item.consentId === selectedConsent.consentId)?.noticeVersion ?? 'No disponible'} · versión {currentConsents.find(item => item.consentId === selectedConsent.consentId)?.version ?? '—'}</Text>}
    <Group mt="sm"><Button variant="light" loading={loading} disabled={busy} onClick={() => void refreshConflict()}>Consultar versión actual</Button><Button disabled={!conflict.ready || busy || loading} onClick={acceptConflict}>He revisado; conservar borrador</Button></Group>
  </Alert> : null;

  const upload = async (file: File | null, previous?: AttachmentVersion) => {
    if (!file) return;
    if (busyRef.current || pendingArchive.current.size || pendingConsent.current || conflict) return;
    if (!canEdit) return notifications.show({ title: 'Sin permiso', color: 'yellow', message: 'No tienes capacidad vigente para adjuntar documentos.' });
    const signature = `${previous?.attachmentId ?? 'new'}:${file.name}:${file.size}:${file.lastModified}`;
    if (pendingUpload.current && pendingUpload.current.signature !== signature) {
      return notifications.show({ title: 'Carga anterior sin resultado', color: 'yellow', message: 'Reintenta primero el mismo archivo; no se iniciará otra operación mientras su resultado sea desconocido.' });
    }
    busyRef.current = true; setBusy(true); setError('');
    try {
      let request = pendingUpload.current?.request;
      if (!request) {
        request = await prepareAttachmentUpload(file, resource, 'student-document', previous);
        pendingUpload.current = { signature, request, file, previous };
      }
      const form = new FormData(); form.set('file', file);
      const envelope = await reserveAndUploadAttachment(request, form);
      if (envelope.result.status === 'acknowledged' && envelope.version?.state !== 'available') throw new Error('No se recibió una versión disponible. Reintenta la misma carga.');
      pendingUpload.current = null; setUnknownUpload(false);
      if (envelope.result.status === 'conflict') {
        setConflictUpload({file, previous}); setConflict({kind:'attachment',message:envelope.result.message,ready:false});
      } else setConflictUpload(null);
      notifications.show({
        title: envelope.result.status === 'acknowledged' ? 'Documento confirmado' : 'Documento sin confirmar',
        color: envelope.result.status === 'acknowledged' ? 'green' : 'yellow', message: terminalMessage(envelope.result),
      });
      if (envelope.result.status === 'acknowledged') await load();
    } catch (cause) {
      setUnknownUpload(!!pendingUpload.current);
      setError(cause instanceof Error ? cause.message : 'Resultado desconocido; reintenta el mismo archivo.');
    } finally { newFileReset.current?.(); busyRef.current = false; setBusy(false); }
  };

  const preview = async (version: AttachmentVersion, download = false) => {
    if (busyRef.current || hasPending()) return;
    busyRef.current = true; setBusy(true); setError(''); setAccess(null);
    try {
      const result = await temporaryAttachmentReadUrl({ resource, versionId: version.id });
      if (download) await downloadAuthorizedAttachment(result.url, version.upload.fileName);
      else setAccess({ ...result, versionId: version.id });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible abrir el documento.'); }
    finally { busyRef.current = false; setBusy(false); }
  };

  const toggleOffline = async (version: AttachmentVersion) => {
    if (busyRef.current || hasPending()) return;
    const retained = offline.documents.some((item) => item.studentId === studentId && item.version.id === version.id);
    if (retained && !window.confirm(`¿Quitar “${version.upload.fileName}” del acceso offline de este usuario y clínica?`)) return;
    busyRef.current = true; setBusy(true); setError(''); setAccess(null);
    try {
      if (retained) await offline.removeDocument(studentId, version.id);
      else {
        if (!offline.downloads.some((item) => item.studentId === studentId)) throw new Error('Descarga primero la ficha desde la sesión antes de seleccionar documentos offline.');
        if (!offline.online) throw new Error('Conéctate para autorizar y descargar esta versión del documento.');
        const signed = await temporaryAttachmentReadUrl({ resource, versionId: version.id });
        const blob = await fetchAuthorizedAttachmentBlob(signed.url, version);
        await offline.saveDocument(studentId, version, blob);
      }
      notifications.show({ title: retained ? 'Documento retirado' : 'Documento disponible offline', color: retained ? 'gray' : 'green', message: retained ? 'Los bytes locales se eliminaron de este alcance.' : 'La versión autorizada quedó aislada por usuario, clínica y ficha en este perfil del navegador.' });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo actualizar la selección offline.'); }
    finally { busyRef.current = false; setBusy(false); }
  };

  const archive = async (version: AttachmentVersion | null, retained?: AttachmentCommand) => {
    const attachmentId = retained?.attachmentId ?? version?.attachmentId;
    if (!attachmentId || conflict) return;
    if (!canEdit || busyRef.current || pendingUpload.current || pendingConsent.current
      || (pendingArchive.current.size > 0 && !pendingArchive.current.has(attachmentId))) return;
    if (!retained && !window.confirm(`¿Archivar “${version?.upload.fileName}”? Los bytes no se eliminarán.`)) return;
    busyRef.current = true; setBusy(true); setError('');
    const existing = retained ?? pendingArchive.current.get(attachmentId);
    const command: AttachmentCommand = existing ?? {
      action: 'archive', operationId: newId(), idempotencyKey: newId(), attachmentId,
      resource, expectedVersion: version!.version, reason: 'Archivado desde la ficha clínica',
    };
    pendingArchive.current.set(attachmentId, command);
    try {
      const envelope = await archiveAttachment(command);
      pendingArchive.current.delete(attachmentId);
      if (envelope.result.status === 'conflict') setConflict({kind:'attachment',message:envelope.result.message,ready:false});
      notifications.show({ title: envelope.result.status === 'acknowledged' ? 'Documento archivado' : 'Archivo no confirmado', color: envelope.result.status === 'acknowledged' ? 'green' : 'yellow', message: terminalMessage(envelope.result) });
      if (envelope.result.status === 'acknowledged') await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Resultado desconocido; reintenta la misma operación.'); }
    finally { busyRef.current = false; setBusy(false); }
  };

  const openConsent = (action: ConsentAction, consent?: ConsentDto) => {
    if (!canEdit || busyRef.current || hasPending() || conflict) return;
    setConsentAction(action); setSelectedConsent(consent ?? null);
    consentForm.setValues({
      purposeCode: consent?.purposeCode ?? '', noticeVersion: consent?.noticeVersion ?? '', grantor: consent?.grantor ?? '',
      channel: consent?.channel ?? '', status: action === 'revoke' ? 'revoked' : consent?.status === 'superseded' || consent?.status === 'revoked' ? 'pending_review' : consent?.status ?? 'pending_review',
      evidenceAttachmentId: consent?.evidenceAttachmentId ?? '',
    });
    consentModal.open();
  };

  const saveConsent = async () => {
    if (!canEdit || busyRef.current || pendingUpload.current || pendingArchive.current.size || conflict) return;
    busyRef.current = true; setBusy(true); setError('');
    try {
      let command = pendingConsent.current;
      if (!command) {
        const values = consentForm.values;
        const rootId = selectedConsent?.consentId ?? newId();
        const versionId = selectedConsent ? newId() : rootId;
        command = {
          clinicId, operationId: newId(), idempotencyKey: newId(), studentId, consentId: rootId,
          expectedVersion: selectedConsent?.version ?? 0, action: consentAction,
          confirmation: consentAction === 'replace' || consentAction === 'revoke', versionId,
          supersedesVersionId: selectedConsent?.versionId ?? null,
          payload: {
            purposeCode: values.purposeCode, noticeVersion: values.noticeVersion, grantor: values.grantor,
            channel: values.channel, evidenceAttachmentId: values.evidenceAttachmentId || null,
            status: consentAction === 'revoke' ? 'revoked' : values.status as 'pending_review' | 'valid' | 'expired',
          },
        };
        command = consentCommand.parse(command); pendingConsent.current = command;
      }
      const result = await saveConsentV2(command);
      pendingConsent.current = null;
      if (result.status === 'conflict') setConflict({kind:'consent',message:result.message,ready:false});
      notifications.show({ title: result.status === 'acknowledged' ? 'Consentimiento confirmado' : 'Consentimiento sin confirmar', color: result.status === 'acknowledged' ? 'green' : 'yellow', message: terminalMessage(result) });
      if (result.status === 'acknowledged') {
        consentModal.close();
        try { await onRefresh(); } catch { setError('Consentimiento confirmado; no se pudo actualizar la vista. No repitas el alta.'); }
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Resultado desconocido; reintenta sin cambiar el formulario.'); }
    finally { busyRef.current = false; setBusy(false); }
  };

  return <Stack gap="lg">
    {conflictNotice}
    {conflictUpload && !conflict && <Alert color="blue">El archivo seleccionado se conserva.<Button mt="sm" disabled={busy || !canEdit || hasPending()} onClick={() => void upload(conflictUpload.file, conflictUpload.previous)}>Cargar con versión revisada</Button></Alert>}
    {[...pendingArchive.current.values()].map(command => <Alert color="yellow" key={command.operationId}>Archivo lógico pendiente de confirmación.<Button mt="sm" loading={busy} disabled={!canEdit} onClick={() => void archive(null, command)}>Reintentar mismo archivo lógico</Button></Alert>)}
    {error && <Alert color="red" title="Operación documental no completada">{error}</Alert>}
    {unknownUpload && <Alert color="yellow" title="Resultado de carga desconocido">El archivo y las operaciones se conservan en esta ventana. No es necesario seleccionarlo nuevamente.
      <Button mt="sm" loading={busy} disabled={!canEdit} onClick={() => { const retained = pendingUpload.current; if (retained) void upload(retained.file, retained.previous); }}>Reintentar misma carga</Button></Alert>}
    <Paper shadow="xs" p="lg" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <div><Title order={4}>Documentos Legales</Title><Text size="sm" c="dimmed">PDF, JPEG o PNG hasta 20 MiB. Una versión sólo aparece disponible después de verificar sus bytes.</Text></div>
        <Group>
          <Switch label="Ver archivados" checked={includeArchived} onChange={(event) => setIncludeArchived(event.currentTarget.checked)} />
          <Button variant="subtle" leftSection={<RefreshCw size={16} />} onClick={() => void load()} loading={loading}>Actualizar</Button>
        </Group>
      </Group>
      <Stack gap="md">
        {documents.filter(item => item.upload.purpose === 'student-document').map((document) => { const retainedOffline = offline.documents.some((item) => item.studentId === studentId && item.version.id === document.id); return <Paper key={document.id} p="md" withBorder opacity={document.state === 'archived' ? 0.65 : 1}>
          <Group justify="space-between" align="flex-start">
            <Group align="flex-start"><FileText size={24} color="var(--mantine-color-blue-6)" /><div><Text fw={500}>{document.upload.fileName}</Text><Group gap="xs"><Badge size="xs">v{document.version}</Badge><Badge size="xs" color={document.state === 'available' ? 'green' : 'gray'}>{document.state === 'available' ? 'Disponible' : 'Archivado'}</Badge><Text size="xs" c="dimmed">{formatBytes(document.upload.byteLength)} · {new Date(document.createdAt).toLocaleDateString('es-CL')}</Text></Group></div></Group>
            <Group gap="xs">
              <Button size="xs" variant="light" leftSection={<Eye size={14} />} disabled={busy || document.state !== 'available'} onClick={() => void preview(document)}>Ver</Button>
              <Button size="xs" variant="light" disabled={busy || hasPending() || document.state !== 'available'} onClick={() => void preview(document, true)}>Descargar</Button>
              {retainedOffline && <Button size="xs" variant="light" color="teal" disabled={busy} onClick={() => void offline.openDocument(studentId, document.id).catch((cause) => setError(cause instanceof Error ? cause.message : 'No se pudo abrir el documento offline.'))}>Abrir offline</Button>}
              <Button size="xs" variant="light" color={retainedOffline ? 'red' : 'teal'} disabled={busy || hasPending() || document.state !== 'available' || (!retainedOffline && (!offline.online || !offline.downloads.some((item) => item.studentId === studentId)))} onClick={() => void toggleOffline(document)}>{retainedOffline ? 'Quitar offline' : 'Guardar offline'}</Button>
              {document.state === 'available' && <FileButton onChange={(file) => void upload(file, document)} accept="application/pdf,image/jpeg,image/png">{(props) => <Button {...props} size="xs" variant="light" leftSection={<Upload size={14} />} disabled={!canEdit || busy}>Reemplazar</Button>}</FileButton>}
              {document.state === 'available' && <Button size="xs" variant="subtle" color="red" leftSection={<Archive size={14} />} disabled={!canEdit || busy} onClick={() => void archive(document)}>Archivar</Button>}
            </Group>
          </Group>
          {access?.versionId === document.id && <Button component="a" href={access.url} target="_blank" rel="noopener noreferrer" variant="light" mt="sm">Abrir archivo · acceso hasta {new Date(access.expiresAt).toLocaleTimeString('es-CL')}</Button>}
        </Paper>;})}
        {!loading && !documents.some(item => item.upload.purpose === 'student-document') && <Text c="dimmed" fs="italic">No hay documentos confirmados para esta ficha.</Text>}
        <Paper p="xl" withBorder style={{ borderStyle: 'dashed', textAlign: 'center' }}>
          <Upload size={36} color="var(--mantine-color-gray-6)" /><Text fw={500} mt="sm">Cargar documento privado</Text><Text size="xs" c="dimmed">No se genera URL pública ni se sobrescribe un objeto existente.</Text>
          <FileButton resetRef={newFileReset} onChange={(file) => void upload(file)} accept="application/pdf,image/jpeg,image/png">{(props) => <Button {...props} mt="md" disabled={!canEdit || busy}>Seleccionar archivo</Button>}</FileButton>
        </Paper>
      </Stack>
    </Paper>

    <Paper shadow="xs" p="lg" radius="md" withBorder>
      <Group justify="space-between" mb="md"><Title order={4}>Consentimientos</Title><Button leftSection={<Plus size={16} />} onClick={() => openConsent('create')} disabled={!canEdit || busy}>Registrar consentimiento</Button></Group>
      <Stack gap="sm">
        {currentConsents.map((consent) => <Paper key={consent.versionId} p="md" withBorder>
          <Group justify="space-between" align="flex-start"><Group align="flex-start" style={{flex:'1 1 280px',minWidth:0}}><History size={18} /><div style={{flex:1,minWidth:0,overflowWrap:'anywhere'}}><Text fw={600}>{consent.purposeCode}</Text><Text size="sm">Aviso {consent.noticeVersion} · {consent.grantor} · {consent.channel}</Text><Group gap="xs" mt={4}><Badge size="xs" color={consent.status === 'valid' ? 'green' : consent.status === 'revoked' ? 'red' : 'yellow'}>{consent.status}</Badge><Badge size="xs" variant="light">v{consent.version}</Badge><Text size="xs" c="dimmed">{consent.evidenceAttachmentId ? 'Con evidencia vinculada' : 'Sin evidencia vinculada'}</Text></Group></div></Group>
          <Group gap="xs"><Button size="xs" variant="light" onClick={() => openConsent('correct', consent)} disabled={!canEdit || busy}>Corregir</Button><Button size="xs" variant="light" onClick={() => openConsent('replace', consent)} disabled={!canEdit || busy}>Reemplazar</Button>{!['revoked', 'expired'].includes(consent.status) && <Button size="xs" variant="subtle" color="red" onClick={() => openConsent('revoke', consent)} disabled={!canEdit || busy}>Revocar</Button>}</Group></Group>
        </Paper>)}
        {currentConsents.length === 0 && <Text c="dimmed" fs="italic">No hay consentimientos registrados.</Text>}
      </Stack>
    </Paper>

    <Modal opened={consentOpened} onClose={() => { if (!busyRef.current && !hasPending()) consentModal.close(); }} title={consentAction === 'create' ? 'Registrar consentimiento' : consentAction === 'correct' ? 'Corregir consentimiento' : consentAction === 'replace' ? 'Reemplazar consentimiento' : 'Revocar consentimiento'}>
      <Stack>
        {error && <Alert color="red">{error}</Alert>}{conflictNotice}
        {pendingConsent.current && <Alert color="yellow">Existe un resultado desconocido. Este botón reintentará exactamente el mismo comando; el formulario queda bloqueado.</Alert>}
        <TextInput label="Finalidad" required disabled={!!selectedConsent || !!pendingConsent.current} {...consentForm.getInputProps('purposeCode')} />
        <TextInput label="Versión del aviso" required disabled={consentAction === 'revoke' || !!pendingConsent.current} {...consentForm.getInputProps('noticeVersion')} />
        <TextInput label="Otorgante" required disabled={consentAction === 'revoke' || !!pendingConsent.current} {...consentForm.getInputProps('grantor')} />
        <TextInput label="Canal" required disabled={consentAction === 'revoke' || !!pendingConsent.current} {...consentForm.getInputProps('channel')} />
        <Select label="Estado" data={[{ value: 'pending_review', label: 'Pendiente de revisión' }, { value: 'valid', label: 'Válido' }, { value: 'expired', label: 'Expirado' }, { value: 'revoked', label: 'Revocado' }]} disabled={consentAction === 'revoke' || consentAction === 'correct' || !!pendingConsent.current} {...consentForm.getInputProps('status')} />
        <Select label="Evidencia documental" clearable searchable data={evidenceOptions} disabled={consentAction === 'revoke' || !!pendingConsent.current} {...consentForm.getInputProps('evidenceAttachmentId')} />
        <Group justify="space-between"><Button variant="default" onClick={consentModal.close} disabled={busy || hasPending()}>Cancelar</Button><Button color={consentAction === 'revoke' ? 'red' : 'blue'} onClick={() => void saveConsent()} loading={busy}>{pendingConsent.current ? 'Reintentar mismo comando' : consentAction === 'revoke' ? 'Confirmar revocación' : 'Guardar'}</Button></Group>
      </Stack>
    </Modal>
  </Stack>;
}

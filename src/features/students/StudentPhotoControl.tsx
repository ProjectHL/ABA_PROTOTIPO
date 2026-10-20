'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Avatar, Button, FileButton, Stack, Text } from '@mantine/core';
import { Camera } from 'lucide-react';
import { prepareAttachmentUpload, type AttachmentUploadRequest } from '@/modules/attachments/attachment.client';
import { listAttachmentVersions, reserveAndUploadAttachment, temporaryAttachmentReadUrl } from '@/modules/attachments/attachment.server';

type Props = {
  clinicId: string; studentId: string; initials: string; attachmentId: string | null; canEdit: boolean;
  onLink: (attachmentId: string) => Promise<boolean>;
  leaveGuard?: { current: (() => boolean) | null };
};
type Upload = { file: File; request: AttachmentUploadRequest };
const describe = (cause: unknown) => cause instanceof Error ? cause.message : 'No se pudo confirmar la operación de fotografía.';

export function StudentPhotoControl({ clinicId, studentId, initials, attachmentId, canEdit, onLink, leaveGuard }: Props) {
  const resource = useMemo(() => ({ kind: 'student' as const, clinicId, studentId }), [clinicId, studentId]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [pending, setPending] = useState<Upload | null>(null);
  const pendingRef = useRef<Upload | null>(null);
  const [unlinked, setUnlinked] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const resetFile = useRef<() => void>(null);
  useEffect(() => {
    let live = true; setPhotoUrl(null);
    void (async () => {
      if (!attachmentId) return;
      const rows = await listAttachmentVersions({ resource, includeArchived: false });
      const version = rows.filter(item => item.attachmentId === attachmentId && item.upload.purpose === 'student-photo' && item.state === 'available')
        .sort((a, b) => b.version - a.version)[0];
      if (!version) return;
      const access = await temporaryAttachmentReadUrl({ resource, versionId: version.id });
      if (live) setPhotoUrl(access.url);
    })().catch(cause => { if (live) setError(describe(cause)); });
    return () => { live = false; };
  }, [attachmentId, resource]);
  useEffect(() => { if (unlinked && attachmentId === unlinked) { setUnlinked(null); setNotice('Vínculo de fotografía confirmado.'); } }, [attachmentId, unlinked]);
  useEffect(() => {
    const leave = () => {
      if (busyRef.current || pendingRef.current) { setError('Resuelve la carga de fotografía pendiente antes de salir.'); return false; }
      return !unlinked || window.confirm('La fotografía está cargada pero no vinculada. ¿Salir conservando el archivo en el servidor?');
    };
    if (leaveGuard) leaveGuard.current = leave;
    const warn = (event: BeforeUnloadEvent) => { if (busyRef.current || pendingRef.current || unlinked) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => { if (leaveGuard) leaveGuard.current = null; window.removeEventListener('beforeunload', warn); };
  });
  const upload = async (file: File | null) => {
    if (!file || !canEdit || busyRef.current || unlinked) return;
    if (pendingRef.current && file !== pendingRef.current.file) return;
    busyRef.current = true; setBusy(true); setError(''); setNotice('');
    try {
      // Keep the currently linked image available until an explicit association
      // succeeds. Never reserve a replacement on the linked record itself.
      const work = pendingRef.current ?? { file, request: await prepareAttachmentUpload(file, resource, 'student-photo') };
      pendingRef.current = work; setPending(work);
      const form = new FormData(); form.set('file', work.file);
      const response = await reserveAndUploadAttachment(work.request, form);
      if (response.result.status === 'acknowledged' && response.version?.state !== 'available') throw new Error('No se recibió una fotografía disponible. Reintenta la misma operación.');
      pendingRef.current = null; setPending(null);
      if (response.result.status !== 'acknowledged') { setError(response.result.message); return; }
      setUnlinked(work.request.reservation.attachmentId);
      setNotice('Fotografía verificada. Confirma el vínculo para actualizar la ficha.');
    } catch (cause) { setError(describe(cause)); }
    finally { resetFile.current?.(); busyRef.current = false; setBusy(false); }
  };
  const link = async () => {
    if (!unlinked || !canEdit || busyRef.current) return;
    busyRef.current = true; setBusy(true); setError('');
    try {
      if (await onLink(unlinked)) { setUnlinked(null); setNotice('Vínculo de fotografía confirmado.'); }
      else setError('El vínculo no está confirmado. Revisa el aviso de la ficha; la fotografía cargada se conserva.');
    } catch (cause) { setError(describe(cause)); }
    finally { busyRef.current = false; setBusy(false); }
  };
  return <Stack gap="xs" align="center" maw={300}>
    <Avatar src={photoUrl} size={100} radius="md">{initials}</Avatar>
    {error && <Alert color="red">{error}</Alert>}{notice && <Text size="xs">{notice}</Text>}
    {pending && <Button size="xs" loading={busy} disabled={!canEdit} onClick={() => void upload(pending.file)}>Reintentar misma carga</Button>}
    {unlinked && <Button size="xs" loading={busy} disabled={!canEdit} onClick={() => void link()}>Confirmar vínculo de fotografía</Button>}
    {canEdit && <FileButton resetRef={resetFile} onChange={file => void upload(file)} accept="image/jpeg,image/png">{props => <Button {...props} size="xs" variant="light" leftSection={<Camera size={14}/>} disabled={busy || !!pending || !!unlinked}>{attachmentId ? 'Reemplazar foto' : 'Agregar foto'}</Button>}</FileButton>}
    <Text size="xs" c="dimmed" ta="center">JPEG o PNG · hasta 20 MiB · privado</Text>
  </Stack>;
}

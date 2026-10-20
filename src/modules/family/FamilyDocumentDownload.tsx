'use client';
import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Stack } from '@mantine/core';
import { useIdentity } from '@/context/IdentityContext';

export function FamilyDocumentDownload({ clinicId, publicationId, versionId, name }: { clinicId: string; publicationId: string; versionId: string; name: string }) {
  const { identity } = useIdentity();
  const actor = identity?.userId;
  const scope = useRef({ actor, clinicId: identity?.active?.id });
  scope.current = { actor, clinicId: identity?.active?.id };
  const controller = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => () => { controller.current?.abort(); }, [actor, clinicId]);
  async function download() {
    if (controller.current || scope.current.clinicId !== clinicId) return;
    const startedActor = actor;
    const task = new AbortController(); controller.current = task;
    setBusy(true); setError(null);
    try {
      const query = new URLSearchParams({ clinicId, publicationId, versionId });
      const response = await fetch(`/family/documents?${query}`, { credentials: 'same-origin', cache: 'no-store', signal: task.signal });
      if (!response.ok) throw new Error('Documento no disponible o acceso revocado. Actualiza el portal.');
      const blob = await response.blob();
      if (task.signal.aborted || scope.current.actor !== startedActor || scope.current.clinicId !== clinicId) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = name; link.referrerPolicy = 'no-referrer';
      document.body.append(link); link.click(); link.remove();
      // Local, non-persisted handle; not a reusable Storage signed URL.
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      if (!task.signal.aborted) setError(cause instanceof Error ? cause.message : 'No se pudo descargar el documento.');
    } finally { if (controller.current === task) { controller.current = null; setBusy(false); } }
  }
  return <Stack gap="xs"><Button size="xs" loading={busy} onClick={() => void download()}>Descargar documento</Button>{error && <Alert color="red">{error}</Alert>}</Stack>;
}

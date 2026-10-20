'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Badge, Button, Card, Group, Loader, MultiSelect, Paper, Stack, Table, Text, Textarea, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { familyPublicationCommandSchema, type FamilyPublicationCommand } from '@/domain/collaboration/student-share';
import { familyAccessCommand, type FamilyAccessCommand, type FamilyManagementPage } from './contracts';
import { loadFamilyManagement, saveFamilyAccess, saveFamilyPublication } from './family.server';

type Props = { clinicId: string; studentId: string; canManage: boolean; leaveGuard?: { current: (() => boolean) | null } };
type Draft = { introduction: string; familyPersonIds: string[]; programVersionIds: string[]; recordRevisionIds: string[]; attachmentVersionIds: string[] };
const emptyDraft: Draft = { introduction: '', familyPersonIds: [], programVersionIds: [], recordRevisionIds: [], attachmentVersionIds: [] };
const withUnavailable = (options: { value: string; label: string }[], selected: string[]) => [
  ...options, ...selected.filter((id) => !options.some((option) => option.value === id))
    .map((id) => ({ value: id, label: `Selección previa no disponible · ${id.slice(0, 8)}` })),
];

export function FamilyManagementPanel({ clinicId, studentId, canManage, leaveGuard }: Props) {
  const [page, setPage] = useState<FamilyManagementPage | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [baseline, setBaseline] = useState<Draft>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const [hasPending,setHasPending] = useState(false);
  const [reviewRequired,setReviewRequired] = useState(false);
  const pendingAccess = useRef<FamilyAccessCommand | null>(null);
  const pendingPublication = useRef<FamilyPublicationCommand | null>(null);
  const publicationContext = useRef<{ id: string; version: number } | null>(null);
  const publicationReview = useRef(false);

  const receive = useCallback((next: FamilyManagementPage) => {
    const current = next.currentPublication;
    publicationContext.current = current ? { id: current.id, version: current.version } : null;
    const nextDraft = current ? { introduction: current.introduction, familyPersonIds: current.familyPersonIds, programVersionIds: current.programVersionIds, recordRevisionIds: current.recordRevisionIds, attachmentVersionIds: current.attachmentVersionIds } : emptyDraft;
    setPage(next); setDraft(nextDraft); setBaseline(nextDraft); setError(null);
  }, []);
  const refresh = useCallback(async () => { const latest=await loadFamilyManagement(clinicId,studentId);setPage(latest);return latest; }, [clinicId, studentId]);

  useEffect(() => {
    let live = true;
    void loadFamilyManagement(clinicId, studentId)
      .then((next) => { if (live) receive(next); })
      .catch((cause) => { if (live) setError(cause instanceof Error ? cause.message : 'No se cargó la gestión familiar.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [clinicId, studentId, receive]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  useEffect(() => {
    const leave = () => {
      if (busyRef.current || pendingAccess.current || pendingPublication.current) { setError('Resuelve primero la operación familiar pendiente.'); return false; }
      return !dirty || window.confirm('¿Descartar los cambios de publicación familiar sin guardar?');
    };
    if (leaveGuard) leaveGuard.current = leave;
    const warn = (event: BeforeUnloadEvent) => { if (dirty || busy || pendingAccess.current || pendingPublication.current) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => { if (leaveGuard) leaveGuard.current = null; window.removeEventListener('beforeunload', warn); };
  }, [busy, dirty, leaveGuard]);

  const sendAccess=async(command:FamilyAccessCommand)=>{
    if(busyRef.current||pendingPublication.current)return;
    if(pendingAccess.current&&JSON.stringify(pendingAccess.current)!==JSON.stringify(command))return;
    pendingAccess.current=command;setHasPending(true);busyRef.current=true;setBusy(true);setError(null);
    try{
      const result=await saveFamilyAccess({clinicId,command});
      if(result.status!=='acknowledged'){pendingAccess.current=null;setHasPending(false);setReviewRequired(result.status==='conflict');setError(result.message);return;}
      pendingAccess.current=null;setHasPending(false);
      notifications.show({title:'Acceso familiar actualizado',color:'green',message:result.replayed?'Se recuperó el recibo anterior.':'El servidor confirmó el cambio.'});
      try{await refresh();}catch{setReviewRequired(true);setError('Acceso confirmado por recibo. No se pudo refrescar; tu borrador se conserva. Consulta de nuevo, no repitas la escritura.');}
    }catch(cause){setError(cause instanceof Error?cause.message:'Resultado desconocido; reintenta exactamente la misma operación.');}
    finally{busyRef.current=false;setBusy(false);}
  };
  const access = async (person: FamilyManagementPage['familyPeople'][number], action: FamilyAccessCommand['action']) => {
    if (busyRef.current || hasPending || reviewRequired || !canManage) return;
    if (action === 'invite' && !person.email) { setError('Registra primero un correo válido para esta persona familiar.'); return; }
    if (action !== 'invite' && (!person.accessLinkId || !person.accessVersion)) { setError('El vínculo familiar actual ya no está disponible.'); return; }
    const parsed = familyAccessCommand.safeParse(action === 'invite' ? {
      operationId: crypto.randomUUID(), idempotencyKey: crypto.randomUUID(), linkId: crypto.randomUUID(),
      studentId, familyPersonId: person.id, expectedVersion: 0, action, recipientEmail: person.email, message: 'Te invitaron al portal familiar de esta ficha.',
    } : action === 'revoke' ? {
      operationId: crypto.randomUUID(), idempotencyKey: crypto.randomUUID(), linkId: person.accessLinkId,
      studentId, familyPersonId: person.id, expectedVersion: person.accessVersion, action, confirmation: true, reason: 'Revocación confirmada por responsable clínico',
    } : {
      operationId: crypto.randomUUID(), idempotencyKey: crypto.randomUUID(), linkId: person.accessLinkId,
      studentId, familyPersonId: person.id, expectedVersion: person.accessVersion, action,
    });
    if(!parsed.success){setError(parsed.error.issues[0]?.message??'Revisa el vínculo familiar.');return;}
    await sendAccess(parsed.data);
  };

  const sendPublication=async(command:FamilyPublicationCommand)=>{
    if(busyRef.current||pendingAccess.current)return;
    if(pendingPublication.current&&JSON.stringify(pendingPublication.current)!==JSON.stringify(command))return;
    pendingPublication.current=command;setHasPending(true);busyRef.current=true;setBusy(true);setError(null);
    try{
      const result=await saveFamilyPublication({clinicId,command});
      if(result.status!=='acknowledged'){pendingPublication.current=null;setHasPending(false);const needsReview=result.status==='conflict'||(result.status==='rejected'&&(result.code==='invalid-transition'||result.code==='resource-unavailable'));publicationReview.current=needsReview;setReviewRequired(needsReview);setError(result.message);return;}
      pendingPublication.current=null;setHasPending(false);
      publicationContext.current={id:command.publicationId,version:result.serverVersion};
      setBaseline({introduction:command.introduction,familyPersonIds:command.familyPersonIds,programVersionIds:command.programVersionIds,recordRevisionIds:command.recordRevisionIds,attachmentVersionIds:command.attachmentVersionIds});
      notifications.show({title:'Publicación familiar confirmada',color:'green',message:result.replayed?'Se recuperó el recibo anterior.':'La nueva versión quedó publicada.'});
      try{await refresh();}catch{setReviewRequired(true);setError('Publicación confirmada por recibo. No se pudo refrescar; consulta de nuevo sin repetir la escritura.');}
    }catch(cause){setError(cause instanceof Error?cause.message:'Resultado desconocido; reintenta exactamente la misma publicación.');}
    finally{busyRef.current=false;setBusy(false);}
  };
  const publish=async()=>{
    if(busyRef.current||hasPending||reviewRequired||!canManage||!page)return;
    if(!draft.familyPersonIds.length){setError('Selecciona al menos una identidad familiar con acceso activo.');return;}
    const parsed=familyPublicationCommandSchema.safeParse({operationId:crypto.randomUUID(),idempotencyKey:crypto.randomUUID(),publicationId:crypto.randomUUID(),studentId,expectedVersion:publicationContext.current?.version??0,predecessorId:publicationContext.current?.id??null,...draft});
    if(!parsed.success){setError(parsed.error.issues[0]?.message??'Revisa la publicación.');return;}
    await sendPublication(parsed.data);
  };
  const consult=async()=>{
    if(busyRef.current||pendingAccess.current||pendingPublication.current)return;busyRef.current=true;setBusy(true);
    try{const latest=await refresh();if(!page)receive(latest);else if(publicationReview.current)publicationContext.current=latest.currentPublication?{id:latest.currentPublication.id,version:latest.currentPublication.version}:null;publicationReview.current=false;setReviewRequired(false);setError(null);}
    catch(cause){setError(cause instanceof Error?cause.message:'No se pudo consultar la versión vigente.');}
    finally{busyRef.current=false;setBusy(false);}
  };
  const recovery=<>{hasPending&&<Alert color="yellow" title="Confirmación pendiente">Se conservan comando, datos y borrador exactos.<Button loading={busy} onClick={()=>{if(pendingAccess.current)void sendAccess(pendingAccess.current);else if(pendingPublication.current)void sendPublication(pendingPublication.current);}}>Reintentar operación exacta</Button></Alert>}{reviewRequired&&<Alert color="yellow" title="Revisión requerida">Consulta la versión vigente sin sustituir tus selecciones. Revisa el borrador antes de confirmar otra operación.<Button loading={busy} onClick={()=>void consult()}>Consultar versión vigente</Button></Alert>}</>;
  const activePeople = useMemo(() => page?.familyPeople.filter((person) => person.accessStatus === 'active') ?? [], [page]);
  if (loading) return <Paper withBorder p="lg"><Loader size="sm"/></Paper>;
  if (!page) return <Alert color="red">{error ?? 'Gestión familiar no disponible.'}<Button variant="subtle" onClick={() => void consult()}>Reintentar</Button></Alert>;
  return <Stack mt="lg">{recovery}<Group justify="flex-end"><Button variant="light" loading={busy} disabled={hasPending} onClick={()=>void consult()}>Consultar estado vigente</Button></Group>
    <Card withBorder><Stack><div><Title order={4}>Acceso al portal familiar</Title><Text size="sm" c="dimmed">Cada vínculo corresponde a una persona familiar persistida en esta ficha.</Text></div>{error && <Alert color="red">{error}</Alert>}
      <Table><Table.Thead><Table.Tr><Table.Th>Persona</Table.Th><Table.Th>Correo</Table.Th><Table.Th>Estado</Table.Th><Table.Th>Acción</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{page.familyPeople.map((person) => <Table.Tr key={person.id}><Table.Td>{person.label}</Table.Td><Table.Td>{person.email ?? 'Sin correo'}</Table.Td><Table.Td><Badge color={person.accessStatus === 'active' ? 'green' : person.accessStatus === 'pending' ? 'orange' : 'gray'}>{person.accessStatus ?? 'sin acceso'}</Badge></Table.Td><Table.Td>{person.accessStatus === 'pending' ? <Button size="xs" color="red" variant="light" disabled={busy || hasPending || reviewRequired || !canManage} onClick={() => void access(person, 'cancel')}>Cancelar</Button> : person.accessStatus === 'active' ? <Button size="xs" color="red" variant="light" disabled={busy || hasPending || reviewRequired || !canManage} onClick={() => { if (window.confirm('¿Revocar este acceso familiar?')) void access(person, 'revoke'); }}>Revocar</Button> : <Button size="xs" disabled={busy || hasPending || reviewRequired || !canManage || !person.email} onClick={() => void access(person, 'invite')}>Invitar</Button>}</Table.Td></Table.Tr>)}</Table.Tbody></Table>
    </Stack></Card>
    <Card withBorder><Stack><div><Title order={4}>Publicación familiar</Title><Text size="sm" c="dimmed">Cada guardado crea una versión inmutable y sustituye la publicación vigente.</Text></div>
      {page.currentPublication?.id!==publicationContext.current?.id&&<Alert color="yellow">La publicación vigente cambió. Tu borrador conserva su versión de origen; consulta y revisa antes de sustituirla.</Alert>}{page.currentPublication && <Alert color="blue">Versión vigente {page.currentPublication.version}, publicada {new Date(page.currentPublication.publishedAt).toLocaleString('es-CL')}.</Alert>}
      <MultiSelect label="Destinatarios con acceso activo" data={withUnavailable(activePeople.map((person) => ({ value: person.id, label: person.label })),draft.familyPersonIds)} value={draft.familyPersonIds} onChange={(familyPersonIds) => setDraft((value) => ({ ...value, familyPersonIds }))} disabled={busy || hasPending || reviewRequired || !canManage}/>
      <Textarea label="Introducción" maxLength={10000} minRows={3} value={draft.introduction} onChange={(event) => { const introduction = event.currentTarget.value; setDraft((value) => ({ ...value, introduction })); }} disabled={busy || hasPending || reviewRequired || !canManage}/>
      <MultiSelect searchable label="Versiones de programas" data={withUnavailable(page.programVersions.map((item) => ({ value: item.id, label: `${item.title} · v${item.version}` })),draft.programVersionIds)} value={draft.programVersionIds} onChange={(programVersionIds) => setDraft((value) => ({ ...value, programVersionIds }))} disabled={busy || hasPending || reviewRequired || !canManage}/>
      <MultiSelect searchable label="Revisiones de resultados" data={withUnavailable(page.recordRevisions.map((item) => ({ value: item.id, label: `Registro ${item.recordId.slice(0, 8)} · revisión ${item.revision}` })),draft.recordRevisionIds)} value={draft.recordRevisionIds} onChange={(recordRevisionIds) => setDraft((value) => ({ ...value, recordRevisionIds }))} disabled={busy || hasPending || reviewRequired || !canManage}/>
      <MultiSelect searchable label="Versiones de documentos" data={withUnavailable(page.attachmentVersions.map((item) => ({ value: item.id, label: item.name })),draft.attachmentVersionIds)} value={draft.attachmentVersionIds} onChange={(attachmentVersionIds) => setDraft((value) => ({ ...value, attachmentVersionIds }))} disabled={busy || hasPending || reviewRequired || !canManage}/>
      <Group justify="flex-end"><Button variant="subtle" disabled={!dirty || busy || hasPending} onClick={() => {if(window.confirm('¿Descartar los cambios de publicación familiar?'))setDraft(baseline);}}>Descartar cambios</Button><Button loading={busy} disabled={hasPending || reviewRequired || !canManage || !draft.familyPersonIds.length || (!dirty && !!page.currentPublication)} onClick={() => void publish()}>{page.currentPublication ? 'Publicar nueva versión' : 'Publicar para familia'}</Button></Group>
    </Stack></Card>
  </Stack>;
}

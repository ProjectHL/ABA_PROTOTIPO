'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Badge, Button, Card, Container, Fieldset, Group, Loader, Modal, Select,
  SimpleGrid, Stack, Text, Textarea, TextInput, Title } from '@mantine/core';
import { MainLayout } from '@/components/MainLayout';
import { useIdentity } from '@/context/IdentityContext';
import { loadSupportPageData, saveTicketV2 } from '@/modules/support/support.server';
import type { SupportPageData } from '@/modules/support/contracts';
import { ticketCommandSchema, ticketTransitionAllowed, type TicketCommand, type TicketSnapshot } from '@/domain/support/ticket';

const statusLabels: Record<TicketSnapshot['status'],string> = {
  open:'Abierto', 'in-progress':'En curso', 'waiting-requester':'Espera tu respuesta', resolved:'Resuelto', closed:'Cerrado',
};
const categoryLabels: Record<TicketSnapshot['category'],string> = {
  technical:'Técnico', account:'Cuenta', commercial:'Comercial', other:'Otro',
};
const choices = (values: Record<string,string>) => Object.entries(values).map(([value,label]) => ({value,label}));
const message = (cause: unknown) => cause instanceof Error ? cause.message : 'No se confirmó la operación.';

export default function SupportPage() {
  const { identity, verified } = useIdentity();
  return <SupportWorkspace key={(identity?.userId ?? '')+':'+(identity?.active?.id ?? '')}
    clinicId={identity?.active?.id ?? ''} actorId={identity?.userId ?? ''} verified={verified}/>;
}
function SupportWorkspace({clinicId,actorId,verified}:{clinicId:string;actorId:string;verified:boolean}) {
  const [page,setPage] = useState<SupportPageData|null>(null);
  const [loading,setLoading] = useState(false); const [readError,setReadError] = useState('');
  const [error,setError] = useState(''); const [success,setSuccess] = useState('');
  const [filter,setFilter] = useState<string|null>(null); const [query,setQuery] = useState('');
  const [selected,setSelected] = useState<string|null>(null);
  const [mode,setMode] = useState<TicketCommand['action']|null>(null);
  const [target,setTarget] = useState<TicketSnapshot|null>(null);
  const [title,setTitle] = useState(''); const [category,setCategory] = useState('technical');
  const [body,setBody] = useState(''); const [status,setStatus] = useState<string|null>(null);
  const [pending,setPending] = useState<TicketCommand|null>(null);
  const [busy,setBusy] = useState(false); const [conflict,setConflict] = useState(false);
  const busyRef = useRef(false); const sequence = useRef(0);
  const refresh = useCallback(async () => {
    if (!clinicId) return;
    const request = ++sequence.current; setLoading(true); setReadError('');
    try { const result = await loadSupportPageData(clinicId); if (request === sequence.current) setPage(result); }
    catch(cause) { if(request === sequence.current) { setReadError(message(cause)); setPage(null); } }
    finally { if(request === sequence.current) setLoading(false); }
  },[clinicId]);
  useEffect(() => { const cleanupSequence=sequence;const timer=setTimeout(() => void refresh(),0);
    return () => { clearTimeout(timer); cleanupSequence.current++; }; },[refresh]);
  useEffect(() => {
    if(!mode)return;
    const warn=(event:BeforeUnloadEvent) => { event.preventDefault();event.returnValue=''; };
    window.addEventListener('beforeunload',warn);return () => window.removeEventListener('beforeunload',warn);
  },[mode]);
  const leave=async () => {
    if(pending || busyRef.current) {setError('Resuelve la operación pendiente antes de salir.');return false;}
    return !mode || window.confirm('¿Descartar el mensaje sin guardar?');
  };
  const open=(action:TicketCommand['action'],ticket:TicketSnapshot|null=null) => {
    if(pending || busyRef.current)return;
    setMode(action);setTarget(ticket);setTitle('');setCategory('technical');setBody('');
    setStatus(null);setError('');setSuccess('');setConflict(false);
  };
  const close=() => {
    if(pending || busyRef.current)return;
    if(window.confirm('¿Cerrar y descartar el formulario?')) {setMode(null);setError('');}
  };
  const send=async () => {
    if(!verified || busyRef.current || conflict || !mode)return;
    busyRef.current=true;setBusy(true);setError('');
    try {
      let command=pending;
      if(!command) {
        const base={schemaVersion:2,operationId:crypto.randomUUID(),idempotencyKey:crypto.randomUUID(),
          ticketId:target?.id ?? crypto.randomUUID(),clinicId,expectedVersion:target?.version ?? 0,action:mode};
        command=ticketCommandSchema.parse(mode==='create'?{...base,title,category,body,messageId:crypto.randomUUID()}
          :mode==='reply'?{...base,body,messageId:crypto.randomUUID()}:{...base,status,reason:body});
        setPending(command);
      }
      const result=await saveTicketV2({clinicId,command});
      if(result.status==='acknowledged') {
        setPending(null);setMode(null);setSelected(command.ticketId);setSuccess('Solicitud confirmada en soporte.');await refresh();
      } else {
        setPending(null);setError(result.message);setConflict(result.status==='conflict');
        if(result.status==='conflict')await refresh();
      }
    } catch(cause) {setError(message(cause));}
    finally {busyRef.current=false;setBusy(false);}
  };
  const ticket=page?.tickets.find(t=>t.id===selected);
  const current=page?.tickets.find(t=>t.id===target?.id);
  const tickets=page?.tickets.filter(t=>(!filter||t.status===filter)
    && (t.title+' '+categoryLabels[t.category]).toLocaleLowerCase().includes(query.toLocaleLowerCase())) ?? [];
  return <MainLayout slots={{beforeNavigate:leave,beforeSignOut:leave,beforeClinicChange:leave}}>
    <Container size="xl"><Stack>
      <Group justify="space-between"><div><Title order={2}>Soporte</Title><Text c="dimmed">Solicitudes y seguimiento de tu clínica</Text></div>
        <Group><Button variant="subtle" loading={loading} onClick={()=>void refresh()}>Actualizar</Button>
          <Button disabled={!page||!verified||!!mode} onClick={()=>open('create')}>Nuevo ticket</Button></Group></Group>
      <Alert color="blue">Los tickets se registran en este entorno local. No incluyen atención humana inmediata, servicio 24/7 ni asistencia de IA. Evita incluir datos clínicos identificables.</Alert>
      {!clinicId&&<Alert color="yellow">Selecciona una clínica para consultar soporte.</Alert>}
      {readError&&<Alert color="red">{readError}</Alert>}{success&&<Alert color="green">{success}</Alert>}
      {loading&&<Loader size="sm"/>}
      <Group><TextInput label="Buscar solicitud" value={query} onChange={e=>setQuery(e.currentTarget.value)}/>
        <Select label="Estado" clearable placeholder="Todos" data={choices(statusLabels)} value={filter} onChange={setFilter}/></Group>
      <SimpleGrid cols={{base:1,md:2}}>
        <Stack>{page&&tickets.length===0&&<Text c="dimmed">No hay solicitudes para estos filtros.</Text>}
          {tickets.map(t=><Card withBorder key={t.id}>
            <Group justify="space-between"><Text fw={600}>{t.title}</Text><Badge>{statusLabels[t.status]}</Badge></Group>
            <Text size="sm" c="dimmed">{categoryLabels[t.category]} · {new Date(t.updatedAt).toLocaleString('es-CL')}</Text>
            <Text size="xs">{t.messages.length} mensajes</Text>
            <Button mt="sm" variant={selected===t.id?'filled':'light'} onClick={()=>setSelected(t.id)}>Ver conversación</Button>
          </Card>)}
        </Stack>
        {ticket?<Card withBorder><Stack>
          <Title order={3}>{ticket.title}</Title><Badge>{statusLabels[ticket.status]}</Badge>
          {ticket.messages.map(m=><Card key={m.id} withBorder bg={m.authorUserId===actorId?'blue.0':undefined}>
            <Text size="xs" fw={600}>{m.authorUserId===actorId?'Tú':m.authorUserId===ticket.requesterUserId?'Solicitante':'Administración'}
              {' · '}{new Date(m.createdAt).toLocaleString('es-CL')}</Text>
            <Text size="sm" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{m.body}</Text>
          </Card>)}
          <Group><Button disabled={ticket.status==='closed'||!!mode||!verified} onClick={()=>open('reply',ticket)}>Responder</Button>
            {page?.canManageTickets&&<Button variant="light" disabled={!!mode||!verified} onClick={()=>open('change-status',ticket)}>Cambiar estado</Button>}</Group>
          {ticket.status==='closed'&&<Text size="sm" c="dimmed">La administración puede reabrir el ticket para continuar la conversación.</Text>}
        </Stack></Card>:<Text c="dimmed">Selecciona una solicitud para ver sus mensajes.</Text>}
      </SimpleGrid>
    </Stack></Container>
    <Modal opened={mode!==null} onClose={close} closeOnClickOutside={false} closeOnEscape={!pending&&!busy}
      withCloseButton={!pending&&!busy} title={mode==='create'?'Nuevo ticket':mode==='reply'?'Responder ticket':'Cambiar estado'} size="lg">
      <Stack>{error&&<Alert color="red">{error}</Alert>}
        {pending&&<Alert color="yellow">La operación mantiene la misma identidad. Reintenta para recuperar su confirmación antes de editar o salir.</Alert>}
        {conflict&&<Alert color="yellow">El ticket cambió. Tu texto permanece en el formulario.
          <Button mt="sm" loading={loading} disabled={busy||!verified} onClick={()=>void refresh()}>Consultar estado actual</Button>
          {readError&&<Text c="red" size="sm">{readError}</Text>}
          {!loading&&!readError&&!current&&<Text size="sm">El ticket ya no está disponible. No se recreará automáticamente.</Text>}
          {current&&!loading&&!readError&&<Stack mt="sm"><Text size="sm">Estado actual: {statusLabels[current.status]}. Mensajes: {current.messages.length}.</Text>
            <Text size="sm" style={{whiteSpace:'pre-wrap'}}>Último mensaje: {current.messages.at(-1)?.body}</Text>
            <Button variant="light" disabled={busy||!verified||(mode==='reply'&&current.status==='closed')} onClick={()=>{if(loading||readError||!verified||(mode==='reply'&&current.status==='closed'))return;setTarget(current);setConflict(false);setStatus(null);setError('');}}>He revisado el ticket; usar esta versión</Button></Stack>}
        </Alert>}
        <Fieldset disabled={!!pending||busy||conflict||!verified}><Stack>
          {mode==='create'&&<><TextInput label="Título" required maxLength={300} value={title} onChange={e=>setTitle(e.currentTarget.value)}/>
            <Select label="Categoría" required data={choices(categoryLabels)} value={category} onChange={v=>setCategory(v??'technical')}/></>}
          {mode==='change-status'&&target&&<Select required label="Nuevo estado" value={status} onChange={setStatus}
            data={choices(statusLabels).filter(s=>ticketTransitionAllowed(target.status,s.value as TicketSnapshot['status']))}/>}
          <Textarea label={mode==='change-status'?'Motivo del cambio':'Mensaje'} required minRows={5} maxLength={10000}
            value={body} onChange={e=>setBody(e.currentTarget.value)}/>
        </Stack></Fieldset>
        <Group justify="end"><Button variant="default" disabled={!!pending||busy} onClick={close}>Cerrar sin enviar</Button>
          <Button loading={busy} disabled={!verified||conflict} onClick={()=>void send()}>{pending?'Reintentar misma operación':'Confirmar'}</Button></Group>
      </Stack>
    </Modal>
  </MainLayout>;
}

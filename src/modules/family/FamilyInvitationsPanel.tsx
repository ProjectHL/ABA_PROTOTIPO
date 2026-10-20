'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Badge, Button, Group, Loader, Stack, Table, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Check, X } from 'lucide-react';
import { useIdentity } from '@/context/IdentityContext';
import { familyAccessCommand, type FamilyAccessCommand, type FamilyAccessLink } from './contracts';
import { loadReceivedFamilyAccess, saveFamilyAccess } from './family.server';

type Props={leaveGuard?:{current:(()=>boolean)|null};beforeCommand?:()=>boolean;onPendingChange?:(pending:boolean)=>void};
type Pending={clinicId:string;command:FamilyAccessCommand};
export function FamilyInvitationsPanel(props:Props) {
  const {identity}=useIdentity();
  return <FamilyInvitationsContent key={identity?.userId??'signed-out'} {...props}/>;
}
function FamilyInvitationsContent({leaveGuard,beforeCommand,onPendingChange}:Props){
  const {refresh:refreshIdentity}=useIdentity();
  const [links,setLinks]=useState<FamilyAccessLink[]>([]);
  const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);const [unknown,setUnknown]=useState(false);const [review,setReview]=useState(false);
  const pending=useRef<Pending|null>(null);const busyRef=useRef(false);
  const refresh=useCallback(async()=>{const next=await loadReceivedFamilyAccess();setLinks(next);setError(null);},[]);
  useEffect(()=>{let live=true;void loadReceivedFamilyAccess().then(next=>{if(live)setLinks(next);}).catch(cause=>{if(live)setError(cause instanceof Error?cause.message:'No se cargaron las invitaciones familiares.');}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[]);
  useEffect(()=>{
    const leave=()=>{if(busyRef.current||pending.current){setError('Recupera primero el resultado de la invitación familiar.');return false;}return true;};
    if(leaveGuard)leaveGuard.current=leave;
    const warn=(event:BeforeUnloadEvent)=>{if(busyRef.current||pending.current){event.preventDefault();event.returnValue='';}};
    const link=(event:MouseEvent)=>{if(event.target instanceof Element&&event.target.closest('a[href]')&&!leave()){event.preventDefault();event.stopPropagation();}};
    window.addEventListener('beforeunload',warn);document.addEventListener('click',link,true);
    return()=>{if(leaveGuard)leaveGuard.current=null;window.removeEventListener('beforeunload',warn);document.removeEventListener('click',link,true);};
  },[leaveGuard]);
  const send=async(packet:Pending)=>{
    if(busyRef.current)return;
    if(pending.current&&JSON.stringify(pending.current)!==JSON.stringify(packet))return;
    pending.current=packet;busyRef.current=true;setBusy(true);setUnknown(false);onPendingChange?.(true);
    try{
      const result=await saveFamilyAccess(packet);
      if(result.status!=='acknowledged'){pending.current=null;onPendingChange?.(false);setError(result.message);setReview(result.status==='conflict');return;}
      pending.current=null;onPendingChange?.(false);
      notifications.show({title:packet.command.action==='accept'?'Acceso familiar aceptado':'Invitación familiar rechazada',color:'green',message:result.replayed?'Se recuperó el recibo anterior.':'El servidor confirmó el cambio.'});
      try{await refreshIdentity();await refresh();}catch{setReview(true);setError('Cambio confirmado por recibo. Falló la lectura; consulta la bandeja sin repetir la escritura.');}
    }catch(cause){setUnknown(true);setError(cause instanceof Error?cause.message:'Resultado desconocido; reintenta la misma operación.');}
    finally{busyRef.current=false;setBusy(false);}
  };
  const execute=(row:FamilyAccessLink,action:'accept'|'reject')=>{
    if(busyRef.current||pending.current||review||beforeCommand&&!beforeCommand())return;
    const parsed=familyAccessCommand.safeParse({operationId:crypto.randomUUID(),idempotencyKey:crypto.randomUUID(),linkId:row.id,studentId:row.studentId,familyPersonId:row.familyPersonId,expectedVersion:row.version,action});
    if(!parsed.success){setError(parsed.error.issues[0]?.message??'Revisa la invitación.');return;}
    void send({clinicId:row.clinicId,command:parsed.data});
  };
  const consult=async()=>{
    if(busyRef.current||pending.current)return;busyRef.current=true;setBusy(true);
    try{await refreshIdentity();await refresh();setReview(false);}catch(cause){setError(cause instanceof Error?cause.message:'No se pudo consultar la identidad y bandeja vigentes.');}
    finally{busyRef.current=false;setBusy(false);}
  };
  const pendingLinks=links.filter(link=>link.status==='pending');
  return <Stack mt="xl"><div><Title order={4}>Invitaciones familiares</Title><Text size="sm" c="dimmed">Aceptar crea acceso sólo a publicaciones familiares de la ficha; no crea membresía clínica.</Text></div>
    {error&&<Alert color="red">{error}{!unknown&&<Button loading={busy} variant="subtle" onClick={()=>void consult()}>Consultar bandeja</Button>}</Alert>}
    {unknown&&<Alert color="yellow" title="Resultado desconocido">La clínica y el comando originales se conservan.<Button loading={busy} onClick={()=>{if(pending.current)void send(pending.current);}}>Reintentar operación exacta</Button></Alert>}
    {review&&<Alert color="yellow">Consulta la bandeja vigente antes de emitir otra decisión.<Button loading={busy} onClick={()=>void consult()}>Consultar versión vigente</Button></Alert>}
    {loading?<Loader size="sm"/>:pendingLinks.length?<Table.ScrollContainer minWidth={720}><Table striped>
      <Table.Thead><Table.Tr><Table.Th>Familiar</Table.Th><Table.Th>Correo</Table.Th><Table.Th>Mensaje</Table.Th><Table.Th>Estado</Table.Th><Table.Th>Acciones</Table.Th></Table.Tr></Table.Thead>
      <Table.Tbody>{pendingLinks.map(row=><Table.Tr key={row.id}><Table.Td><Text fw={600}>{row.familyLabel}</Text></Table.Td><Table.Td>{row.recipientEmail}</Table.Td><Table.Td>{row.message||'Sin mensaje'}</Table.Td><Table.Td><Badge color="orange">Pendiente</Badge></Table.Td><Table.Td><Group gap="xs"><Button size="xs" color="green" leftSection={<Check size={14}/>} loading={busy} disabled={unknown||review} onClick={()=>execute(row,'accept')}>Aceptar</Button><Button size="xs" color="red" variant="light" leftSection={<X size={14}/>} disabled={busy||unknown||review} onClick={()=>execute(row,'reject')}>Rechazar</Button></Group></Table.Td></Table.Tr>)}</Table.Tbody>
    </Table></Table.ScrollContainer>:<Text c="dimmed">No hay invitaciones familiares pendientes.</Text>}
  </Stack>;
}

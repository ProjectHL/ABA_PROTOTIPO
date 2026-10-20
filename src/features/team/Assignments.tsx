'use client';
import { useEffect,useState } from 'react';
import { Stack,Text,Select,Button,Alert,Group } from '@mantine/core';
import { loadTeamAssignments,setTeamAssignment } from './identity.server';
export function TeamAssignments({userId,clinicId}:{userId:string;clinicId:string}) {
  const [data,setData]=useState<Awaited<ReturnType<typeof loadTeamAssignments>>|null>(null);
  const [clientId,setClientId]=useState<string|null>(null);const [role,setRole]=useState<string|null>('therapist');
  const [status,setStatus]=useState<string|null>('active');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  useEffect(()=>{let live=true;void loadTeamAssignments(userId,clinicId).then(next=>{if(live)setData(next);}).catch(cause=>{if(live)setMessage(cause instanceof Error?cause.message:'Asignaciones no disponibles.');});return()=>{live=false;};},[userId,clinicId]);
  return <Stack><Text fw={600}>Asignaciones por ficha</Text>{message&&<Alert withCloseButton onClose={()=>setMessage('')}>{message}</Alert>}
    <Select label="Ficha autorizada" placeholder="Selecciona una ficha" data={(data?.clients??[]).map(c=>({value:c.id,label:`${c.clinical_id} · ${c.initials}`}))} value={clientId} onChange={id=>{setClientId(id);const existing=data?.assignments.find(a=>a.client_id===id&&a.status==='active');if(existing){setRole(existing.role);setStatus(existing.status);}}}/>
    <Group grow><Select label="Función en ficha" data={[{value:'supervisor',label:'Supervisor'},{value:'therapist',label:'Técnico / Aplicador'}]} value={role} onChange={setRole}/><Select label="Estado" data={[{value:'active',label:'Activo'},{value:'inactive',label:'Suspendido'}]} value={status} onChange={setStatus}/></Group>
    <Button disabled={!clientId||!role||!status} loading={busy} onClick={async()=>{setBusy(true);setMessage('');try{await setTeamAssignment({clinicId,clientId,userId,role,status});}catch(cause){setMessage(cause instanceof Error?cause.message:'Asignación no confirmada.');setBusy(false);return;}setMessage('Asignación confirmada por el servidor.');try{setData(await loadTeamAssignments(userId,clinicId));}catch{setMessage('Asignación confirmada; la lectura posterior falló. Conserva la selección y reintenta la lectura sin repetir el comando.');}finally{setBusy(false);}}}>Guardar asignación</Button>
    <Text size="xs" c="dimmed">El motor existente comprueba clínica, membresía y permiso de asignación. No permite modificar la asignación propia. Una ficha sin datos aún no aparecerá.</Text>
  </Stack>;
}

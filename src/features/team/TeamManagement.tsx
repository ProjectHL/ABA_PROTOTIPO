'use client';
import { useState } from 'react';
import { SimpleGrid,Card,Avatar,Text,Badge,Button,Group,Stack,TextInput,Select,ActionIcon,Modal,Alert } from '@mantine/core';
import { Search,Edit,Mail,Phone } from 'lucide-react';
import { ProfileSettings } from './ProfileSettings';
import { TeamAssignments } from './Assignments';
import { InvitationDeliveries } from './InvitationDeliveries';
import { saveProfessionalProfile,setTeamMembership,inviteTeamMember,removeTeamMember } from './identity.server';
import { loadTeamInvitations,resendTeamInvitation } from './invitation.server';
import type { TeamMember } from './identity.types';
import { useProfileAvatar } from './useProfileAvatar';
const roles=[{value:'admin',label:'Administrador'},{value:'supervisor',label:'Supervisor'},{value:'therapist',label:'Técnico / Aplicador'}];
function MemberAvatar({member}:{member:TeamMember}){const url=useProfileAvatar(member.avatarObjectPath);return <Avatar src={url} color={member.avatarPreset} size={80} radius="md">{member.name.slice(0,2)||'?'}</Avatar>;}
export function TeamManagement({members,clinicId,onRefresh,onIdentityRefresh}:{members:TeamMember[];clinicId:string;onRefresh:()=>Promise<void>;onIdentityRefresh:()=>Promise<void>}) {
  const [query,setQuery]=useState('');const [roleFilter,setRoleFilter]=useState<string|null>(null);
  const [member,setMember]=useState<TeamMember|null>(null);const [editRole,setEditRole]=useState<string|null>(null);
  const [inviteOpened,setInviteOpened]=useState(false);const [email,setEmail]=useState('');const [inviteRole,setInviteRole]=useState<string|null>('therapist');
  const [operation,setOperation]=useState<string|null>(null);const [error,setError]=useState<string|null>(null);const [busy,setBusy]=useState(false);const [notice,setNotice]=useState<string|null>(null);
  const perform=async(action:()=>Promise<void>)=>{setBusy(true);setError(null);setNotice(null);try{await action();}catch(cause){setError(cause instanceof Error?cause.message:'El servidor no confirmó el cambio.');setBusy(false);return;}try{await onIdentityRefresh();await onRefresh();}catch{setError('El cambio fue confirmado, pero no se pudo actualizar la lectura. Reintenta sin repetir la mutación.');}finally{setBusy(false);}};
  const invite=async()=>{
    const id=operation??crypto.randomUUID();setOperation(id);
    await perform(async()=>{
      let result: Awaited<ReturnType<typeof inviteTeamMember>>;
      try { result=await inviteTeamMember({clinicId,email,role:inviteRole,operationId:id}); }
      catch(cause){
        if(!(cause instanceof Error)||!cause.message.includes('existing_membership_use_resend'))throw cause;
        const target=(await loadTeamInvitations(clinicId)).find(row=>row.email.toLowerCase()===email.trim().toLowerCase());
        if(!target)throw new Error('Ese correo ya tiene una membresía en esta clínica, pero no hay una invitación reenviable. Revisá Correos de invitación.');
        if(target.accepted)throw new Error('Ese correo ya tiene una cuenta confirmada: la persona debe iniciar sesión y no se envía otra invitación.');
        if(!target.eligible)throw new Error('La membresía no está habilitada para reenvío. Revisá su estado en Correos de invitación.');
        if(target.lastDelivery&&['pending','claimed','unknown'].includes(target.lastDelivery.state))throw new Error('Hay una entrega sin resolver para esa invitación. Consultala en Correos de invitación antes de pedir otra.');
        if(!window.confirm(`Ya existe una invitación pendiente para ${target.email}. ¿Enviar un correo nuevo con otro token? El enlace anterior dejará de servir.`))return;
        const receipt=await resendTeamInvitation({clinicId,invitationId:target.invitationId,operationId:crypto.randomUUID(),idempotencyKey:crypto.randomUUID()});
        setInviteOpened(false);setOperation(null);
        setNotice(receipt.state==='sent'?'Se envió una invitación nueva con un token nuevo; el enlace anterior ya no sirve.':receipt.state==='failed'?'El servidor rechazó el envío; no se afirma entrega. Revisá Correos de invitación.':'El resultado del correo es incierto; consultalo en Correos de invitación antes de reintentar.');
        return;
      }
      setInviteOpened(false);setOperation(null);
      setNotice(result.alreadyAccepted?'Membresía confirmada; la cuenta ya tiene correo confirmado. Debe iniciar sesión; no se envió otra invitación.':result.deliveryError?'Membresía pendiente. El resultado del correo es incierto: actualiza Correos de invitación y consulta antes de otra petición.':result.delivery?.state==='sent'?'Membresía pendiente; el servidor SMTP aceptó el envío. Esto no confirma recepción ni aceptación: la persona no tendrá acceso hasta que defina su contraseña.':'Membresía pendiente. Consulta el comprobante y su estado en Correos de invitación; no se afirma entrega.');
    });
  };
  const filtered=members.filter(m=>(!roleFilter||m.role===roleFilter)&&`${m.name} ${m.profession} ${m.email}`.toLowerCase().includes(query.toLowerCase()));
  return <Stack gap="lg">{error&&<Alert color="red" withCloseButton onClose={()=>setError(null)}>{error}</Alert>}{notice&&<Alert color="green">{notice}</Alert>}
    <SimpleGrid cols={{base:1,sm:3}}> <TextInput aria-label="Buscar equipo" placeholder="Buscar por nombre o profesión..." leftSection={<Search size={16}/>} value={query} onChange={e=>setQuery(e.currentTarget.value)}/><Select placeholder="Filtrar por rol" clearable data={roles} value={roleFilter} onChange={setRoleFilter}/><Button onClick={()=>setInviteOpened(true)}>Invitar miembro</Button></SimpleGrid>
    {!filtered.length&&<Text c="dimmed">No hay miembros que coincidan con estos filtros.</Text>}
    <SimpleGrid cols={{base:1,sm:2,lg:3}} spacing="lg">{filtered.map(m=><Card key={m.id} shadow="sm" padding="lg" radius="md" withBorder><Card.Section withBorder inheritPadding py="xs"><Group justify="space-between"><Group gap="xs"><Badge variant="light">{roles.find(r=>r.value===m.role)?.label}</Badge><Badge color={m.status==='active'?'green':m.status==='pending'?'yellow':'gray'}>{m.status==='active'?'Activo':m.status==='pending'?'Invitación pendiente':'Suspendido'}</Badge></Group><ActionIcon aria-label={`Editar perfil ${m.name||m.email}`} variant="subtle" onClick={()=>{setMember(m);setEditRole(m.role);}}><Edit size={16}/></ActionIcon></Group></Card.Section>
      <Stack gap="md" mt="md"><Group><MemberAvatar member={m}/><div style={{flex:1}}><Text fw={600} size="lg">{m.name||m.email}</Text><Badge size="sm" variant="outline">{m.profession||'Sin profesión informada'}</Badge><Text size="sm" c="dimmed" mt={4}>{m.title}</Text></div></Group><Text size="sm" c="dimmed" lineClamp={3}>{m.description}</Text><Stack gap="xs"><Group gap="xs"><Mail size={14}/><Text size="xs" c="dimmed">{m.email}</Text></Group>{m.phone&&<Group gap="xs"><Phone size={14}/><Text size="xs" c="dimmed">{m.phone}</Text></Group>}</Stack><Button variant="light" fullWidth onClick={()=>{setMember(m);setEditRole(m.role);}}>Editar Perfil</Button></Stack>
    </Card>)}</SimpleGrid>
    <Modal opened={!!member} onClose={()=>setMember(null)} title="Editar Perfil del Miembro" size="lg">{member&&<Stack><ProfileSettings profile={member} clinicId={clinicId} onSave={async(payload,ids,expectedVersion,expectedClinicId)=>{await saveProfessionalProfile({clinicId:expectedClinicId,targetUserId:member.id,expectedVersion,payload,...ids});setNotice('Perfil profesional confirmado por el servidor.');setMember(null);await onIdentityRefresh();await onRefresh();}}/><Group grow><Select label="Perfil de membresía" data={roles} value={editRole} onChange={setEditRole}/><Button loading={busy} disabled={!editRole} onClick={()=>void perform(async()=>{await setTeamMembership({clinicId,userId:member.id,role:editRole,status:member.status});setMember(null);setNotice('Perfil de membresía confirmado por el servidor.');})}>Cambiar perfil</Button></Group><Button color={member.status==='active'?'red':'green'} variant="light" loading={busy} onClick={()=>{const label=member.status==='active'?'Suspender':member.status==='pending'?'Cancelar':('Reactivar');if(window.confirm(`${label} membresía de ${member.name||member.email}?`))void perform(async()=>{await setTeamMembership({clinicId,userId:member.id,role:member.role,status:member.status==='active'?'inactive':'active'});setMember(null);setNotice('Estado de membresía confirmado por el servidor.');});}}>{member.status==='active'?'Suspender membresía':member.status==='pending'?'Cancelar invitación':'Reactivar membresía'}</Button>{member.status==='active'&&<TeamAssignments userId={member.id} clinicId={clinicId}/>}<Button color="red" variant="subtle" loading={busy} onClick={()=>{if(window.confirm(`¿Eliminar a ${member.name||member.email} del equipo de esta clínica? Perderá el acceso y sus asignaciones activas se cerrarán. El historial clínico y su cuenta se conservan.`))void perform(async()=>{await removeTeamMember({clinicId,userId:member.id});setMember(null);setNotice('Miembro eliminado del equipo. Su identidad e historial clínico se conservan.');});}}>Eliminar del equipo</Button></Stack>}</Modal>
    <Modal opened={inviteOpened} onClose={()=>setInviteOpened(false)} title="Invitar miembro"><form onSubmit={e=>{e.preventDefault();void invite();}}><Stack><TextInput label="Email" type="email" required value={email} onChange={e=>{setEmail(e.currentTarget.value);setOperation(null);}}/><Select label="Perfil" required data={roles} value={inviteRole} onChange={value=>{setInviteRole(value);setOperation(null);}}/><Button type="submit" loading={busy}>Enviar invitación</Button><Text size="xs" c="dimmed">Reintentos conservan la operación. Esta invitación agrega membresía de clínica, no comparte una ficha externamente.</Text></Stack></form></Modal>
    <InvitationDeliveries key={clinicId} clinicId={clinicId}/>
  </Stack>;
}

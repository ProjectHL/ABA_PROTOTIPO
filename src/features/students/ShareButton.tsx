'use client';
import { useRef,useState } from 'react';
import { ActionIcon, Menu, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { Share2 } from 'lucide-react';
import { studentShareCommandSchema,type StudentShareCommand } from '@/domain/collaboration/student-share';
import { useIdentity } from '@/context/IdentityContext';
import { saveStudentShare } from '@/modules/collaboration/collaboration.server';
import ShareStudentModal from './ShareStudentModal';

export default function ShareButton({studentId,studentName,trigger='menu',disabled=false}:{studentId:string;studentName:string;trigger?:'menu'|'button';disabled?:boolean}) {
  const [opened,{open,close}]=useDisclosure(false);const [busy,setBusy]=useState(false);const pending=useRef<StudentShareCommand|null>(null);const {identity}=useIdentity();
  return <div style={{display:'contents'}} onClick={event=>event.stopPropagation()}>{trigger==='button'?<Tooltip label="Compartir carpeta"><ActionIcon aria-label="Compartir ficha" variant="light" color="blue" size="lg" disabled={disabled||busy} onClick={open}><Share2 size={20}/></ActionIcon></Tooltip>:<Menu.Item disabled={disabled||busy} leftSection={<Share2 size={16}/>} onClick={open}>Compartir</Menu.Item>}<ShareStudentModal opened={opened} onClose={close} studentName={studentName} busy={busy} onShare={async value=>{
    const clinicId=identity?.active?.id;if(!clinicId){notifications.show({title:'Clínica requerida',color:'red',message:'Selecciona la clínica de la ficha.'});return false;}
    const prior=pending.current;const same=prior?.action==='invite'&&prior.studentId===studentId&&prior.recipientEmail===value.email&&prior.level===value.level&&prior.message===value.message;if(prior&&!same){notifications.show({title:'Operación pendiente',color:'yellow',message:'Reintenta primero la invitación cuyo resultado sigue desconocido.'});return false;}const command=studentShareCommandSchema.parse(same?prior:{operationId:crypto.randomUUID(),idempotencyKey:crypto.randomUUID(),invitationId:crypto.randomUUID(),studentId,expectedVersion:0,action:'invite',recipientEmail:value.email,level:value.level,message:value.message});pending.current=command;setBusy(true);
    try{const result=await saveStudentShare({clinicId,command});if(result.status!=='acknowledged'){pending.current=null;notifications.show({title:'Invitación no confirmada',color:'yellow',message:result.message});return false;}pending.current=null;notifications.show({title:'Invitación confirmada',color:'green',message:result.replayed?'Se recuperó el recibo anterior.':'El servidor confirmó la invitación.'});return true;}
    catch(cause){notifications.show({title:'Resultado desconocido',color:'red',message:cause instanceof Error?cause.message:'Reintenta exactamente la misma invitación.'});return false;}finally{setBusy(false);}
  }}/></div>;
}

'use client';
import { useState, type ReactNode } from 'react';
import { Button, Group, Modal, Select, Stack, Text, TextInput, Textarea } from '@mantine/core';
import { Mail, Lock, MessageSquare } from 'lucide-react';
import type { StudentShareLevel } from '@/domain/collaboration/student-share';

interface Props {
  opened:boolean; onClose:()=>void; studentName:string; busy?:boolean; pending?:boolean; recovery?:ReactNode;
  onShare:(value:{email:string;level:StudentShareLevel;message:string})=>Promise<boolean>;
}
const templates=['Solicito tu colaboración para la evaluación inicial del estudiante.','Necesito tu apoyo profesional en el seguimiento del caso.','Te comparto acceso para coordinación interdisciplinaria.','Comparto acceso para revisión de programas y resultados.'];
export default function ShareStudentModal({opened,onClose,studentName,busy=false,pending=false,recovery,onShare}:Props) {
  const [email,setEmail]=useState('');const [level,setLevel]=useState<StudentShareLevel|null>(null);const [message,setMessage]=useState('');const [error,setError]=useState<string|null>(null);
  const close=()=>{if(busy||pending)return;setEmail('');setLevel(null);setMessage('');setError(null);onClose();};
  const submit=async()=>{if(busy||pending)return;const normalized=email.trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)){setError('Ingresa un correo válido.');return;}if(!level){setError('Selecciona un nivel de acceso.');return;}setError(null);try{if(await onShare({email:normalized,level,message})){setEmail('');setLevel(null);setMessage('');setError(null);onClose();}}catch(cause){setError(cause instanceof Error?cause.message:'No se pudo enviar la invitación.');}};
  return <Modal opened={opened} onClose={close} title={`Compartir carpeta de ${studentName}`} size="lg" closeOnClickOutside={!busy&&!pending} closeOnEscape={!busy&&!pending} withCloseButton={!busy&&!pending}><Stack gap="md">{recovery}
    <TextInput disabled={busy||pending} maxLength={254} label="Correo del profesional" leftSection={<Mail size={16}/>} value={email} onChange={event=>setEmail(event.currentTarget.value)} error={error?.includes('correo')?error:undefined} required/>
    <Select disabled={busy||pending} label="Nivel de acceso" leftSection={<Lock size={16}/>} value={level} onChange={value=>setLevel(value as StudentShareLevel|null)} required data={[{value:'full-read',label:'Lectura clínica completa'},{value:'program-results',label:'Programas y resultados'},{value:'clinical-edit',label:'Edición clínica de esta ficha'}]} error={error?.includes('nivel')?error:undefined}/>
    <Textarea disabled={busy||pending} label="Mensaje" leftSection={<MessageSquare size={16}/>} value={message} onChange={event=>setMessage(event.currentTarget.value)} minRows={3} maxLength={5000}/><Text size="xs" c="dimmed">{message.length}/5000</Text>
    <Group gap="xs">{templates.map(template=><Button key={template} size="xs" variant="light" onClick={()=>setMessage(template)} disabled={busy||pending}>{template}</Button>)}</Group>
    {error&&!error.includes('correo')&&!error.includes('nivel')&&<Text c="red" size="sm">{error}</Text>}
    <Group justify="flex-end"><Button variant="subtle" onClick={close} disabled={busy||pending}>Cancelar</Button><Button onClick={()=>void submit()} loading={busy} disabled={pending}>Enviar invitación</Button></Group>
  </Stack></Modal>;
}

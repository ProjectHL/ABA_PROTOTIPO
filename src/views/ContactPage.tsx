'use client';
import { useEffect,useRef,useState } from 'react';
import Link from 'next/link';
import { Alert,Anchor,Button,Checkbox,Container,Fieldset,Group,Paper,Stack,Text,Textarea,TextInput,Title } from '@mantine/core';
import { commercialInquirySchema } from '@/domain/support/ticket';
import { submitCommercialInquiryV2 } from '@/modules/support/support.server';
type Inquiry=ReturnType<typeof commercialInquirySchema.parse>;
export default function ContactPage(){
  const [name,setName]=useState('');const [email,setEmail]=useState('');const [organization,setOrganization]=useState('');
  const [body,setBody]=useState('');const [permission,setPermission]=useState(false);
  const [pending,setPending]=useState<Inquiry|null>(null);const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');const [receipt,setReceipt]=useState<string|null>(null);const busyRef=useRef(false);
  useEffect(()=>{if(!pending)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};
    window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[pending]);
  const send=async()=>{
    if(busyRef.current||receipt)return;
    busyRef.current=true;setBusy(true);setError('');
    try{
      const inquiry=pending??commercialInquirySchema.parse({schemaVersion:2,id:crypto.randomUUID(),
        operationId:crypto.randomUUID(),idempotencyKey:crypto.randomUUID(),name,email,organization,message:body,contactPermission:permission});
      setPending(inquiry);
      const result=await submitCommercialInquiryV2(inquiry);
      if(result.status==='acknowledged'){setReceipt(result.receiptId);setPending(null);}
      else{setError(result.message);setPending(null);}
    }catch(cause){setError(cause instanceof Error?cause.message:'No se confirmó la solicitud.');}
    finally{busyRef.current=false;setBusy(false);}
  };
  const preventExit=(event:React.MouseEvent<HTMLAnchorElement>)=>{
    if(pending||busyRef.current){event.preventDefault();setError('Resuelve la solicitud pendiente antes de salir.');}
  };
  return <Container size="sm" py="xl"><Stack>
    <Group justify="space-between"><Anchor component={Link} href="/" onClick={preventExit}>ABA · Inicio</Anchor>
      <Anchor component={Link} href="/login" onClick={preventExit}>Ingresar</Anchor></Group>
    <Title order={1}>Contacto comercial</Title><Text c="dimmed">Cuéntanos qué necesitas para tu equipo.</Text>
    <Alert color="blue">La solicitud se registra en este entorno local. No implica contratación, cobro ni envío de correo. No incluyas nombres de estudiantes, RUT, diagnósticos ni documentos clínicos.</Alert>
    {error&&<Alert color="red">{error}</Alert>}
    {receipt?<Paper withBorder p="lg"><Stack><Title order={2}>Solicitud registrada</Title>
      <Text>El servidor confirmó la recepción de tu solicitud comercial.</Text>
      <Text size="xs" c="dimmed">Comprobante: {receipt}</Text>
      <Anchor component={Link} href="/">Volver al inicio</Anchor></Stack></Paper>
    :<Paper withBorder p="lg"><form onSubmit={event=>{event.preventDefault();void send();}}><Stack>
      {pending&&<Alert color="yellow">Si no llegó confirmación, reintenta la misma solicitud. Si alcanzaste el límite temporal, espera antes de volver a intentarlo.</Alert>}
      <Fieldset disabled={busy||!!pending}><Stack>
        <TextInput label="Nombre" required autoComplete="name" maxLength={200} value={name} onChange={e=>setName(e.currentTarget.value)}/>
        <TextInput label="Correo de contacto" required type="email" autoComplete="email" maxLength={254} value={email} onChange={e=>setEmail(e.currentTarget.value)}/>
        <TextInput label="Organización (opcional)" autoComplete="organization" maxLength={300} value={organization} onChange={e=>setOrganization(e.currentTarget.value)}/>
        <Textarea label="Consulta comercial" required minRows={5} maxLength={10000} value={body} onChange={e=>setBody(e.currentTarget.value)}/>
        <Checkbox label="Autorizo el uso de estos datos para responder a mi consulta" required checked={permission} onChange={e=>setPermission(e.currentTarget.checked)}/>
      </Stack></Fieldset>
      <Button type="submit" loading={busy}>{pending?'Reintentar misma solicitud':'Enviar solicitud'}</Button>
    </Stack></form></Paper>}
    <Text size="sm" c="dimmed">Si ya tienes acceso a una clínica, usa los tickets para solicitar soporte.</Text>
    <Anchor component={Link} href="/support" onClick={preventExit}>Abrir soporte de mi clínica</Anchor>
  </Stack></Container>;
}

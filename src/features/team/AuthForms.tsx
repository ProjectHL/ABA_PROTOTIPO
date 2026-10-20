'use client';
import { useState } from 'react';
import { Alert,Button,Container,Paper,PasswordInput,Stack,TextInput,Title } from '@mantine/core';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  changePasswordAction,
  requestEmailChangeAction,
  requestPasswordResetAction,
  resetPasswordAction,
} from '@/modules/auth/actions';

const PASSWORD_DESCRIPTION='12 caracteres, minúscula, mayúscula, número y símbolo.';
const meetsPasswordPolicy=(password:string)=>password.length>=12&&/[a-z]/.test(password)&&/[A-Z]/.test(password)&&/\d/.test(password)&&/[^A-Za-z0-9]/.test(password);

export function AuthPasswordForm({mode='recover'}:{mode?:'recover'|'reset'|'change'}) {
  const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [confirm,setConfirm]=useState('');const [current,setCurrent]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  const router=useRouter();const searchParams=useSearchParams();
  const change=mode==='change';const recovery=mode==='recover';const token=searchParams.get('token')??'';
  return <Container size="xs" py="xl"><Paper p="xl" withBorder><form onSubmit={async e=>{e.preventDefault();setBusy(true);setMessage('');try{
    if(recovery) {
      const result=await requestPasswordResetAction(email.trim());
      setMessage(result.message);
      return;
    }
    if(password!==confirm||!meetsPasswordPolicy(password))throw new Error('La contraseña debe coincidir y tener 12 caracteres, minúscula, mayúscula, número y símbolo.');
    if(change) {
      const result=await changePasswordAction({currentPassword:current,nextPassword:password});
      if(!result.ok)throw new Error(result.message);
    } else {
      if(!token)throw new Error('El enlace no incluye un token válido. Solicita uno nuevo.');
      const result=await resetPasswordAction({token,password});
      if(!result.ok)throw new Error(result.message);
    }
    setPassword('');setConfirm('');setCurrent('');router.replace('/dashboard');router.refresh();
  }catch(cause){setMessage(cause instanceof Error?cause.message:'No se confirmó la operación de acceso.');}finally{setBusy(false);}}}><Stack><Title order={2}>{recovery?'Recuperar acceso':change?'Cambiar contraseña':'Nueva contraseña'}</Title>
    {recovery?<TextInput label="Correo" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.currentTarget.value)}/>:<>{change&&<PasswordInput label="Contraseña actual" autoComplete="current-password" required value={current} onChange={e=>setCurrent(e.currentTarget.value)}/>}<PasswordInput label="Nueva contraseña" autoComplete="new-password" required value={password} onChange={e=>setPassword(e.currentTarget.value)} description={PASSWORD_DESCRIPTION}/><PasswordInput label="Confirmar contraseña" autoComplete="new-password" required value={confirm} onChange={e=>setConfirm(e.currentTarget.value)}/></>}
    {message&&<Alert withCloseButton onClose={()=>setMessage('')}>{message}</Alert>}<Button type="submit" loading={busy}>{recovery?'Solicitar enlace':'Cambiar contraseña'}</Button><Button component="a" href="/login" variant="subtle">Volver al acceso</Button>
  </Stack></form></Paper></Container>;
}

export function AuthEmailChange({email}:{email:string}) {
  const [next,setNext]=useState(email);const [password,setPassword]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  return <form onSubmit={async e=>{e.preventDefault();setBusy(true);setMessage('');try{
    const result=await requestEmailChangeAction({nextEmail:next,currentPassword:password});
    if(!result.ok)throw new Error(result.message);
    setPassword('');setMessage('Solicitud enviada. Abre el enlace de confirmación enviado al correo nuevo; el cambio no aplica hasta confirmarlo.');
  }catch(cause){setMessage(cause instanceof Error?cause.message:'No se confirmó el cambio.');}finally{setBusy(false);}}}><Stack><TextInput label="Nuevo correo" type="email" required value={next} onChange={e=>setNext(e.currentTarget.value)}/><PasswordInput label="Contraseña actual" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.currentTarget.value)}/>{message&&<Alert>{message}</Alert>}<Button type="submit" loading={busy} disabled={next===email}>Solicitar cambio y verificación</Button></Stack></form>;
}

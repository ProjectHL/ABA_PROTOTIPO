'use client';
import { useState } from 'react';
import { Alert,Button,Container,Paper,PasswordInput,Stack,TextInput,Title,Text } from '@mantine/core';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
export function AuthPasswordForm({mode='recover'}:{mode?:'recover'|'reset'|'change'}) {
  const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [confirm,setConfirm]=useState('');const [current,setCurrent]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  const router=useRouter();const change=mode==='change';const recovery=mode==='recover';
  return <Container size="xs" py="xl"><Paper p="xl" withBorder><form onSubmit={async e=>{e.preventDefault();setBusy(true);setMessage('');try{
    const db=createClient();
    if(recovery) {const result=await db.auth.resetPasswordForEmail(email.trim(),{redirectTo:`${window.location.origin}/auth/confirm?next=/reset-password`});if(result.error)throw new Error('No se pudo solicitar el correo local. Revisa Mailpit/servicios o espera antes de reintentar.');setMessage('Si la cuenta está habilitada, recibirá un enlace. En local revisa Mailpit; ábrelo en el mismo navegador.');}
    else {
      if(password!==confirm||password.length<12||!/[a-z]/.test(password)||!/[A-Z]/.test(password)||!/[0-9]/.test(password)||!/[\W_]/.test(password))throw new Error('La contraseña debe coincidir y tener 12 caracteres, minúscula, mayúscula, número y símbolo.');
      const identity=await db.auth.getUser();if(identity.error||!identity.data.user?.email)throw new Error('Sesión no válida. Solicita un enlace nuevo o vuelve a iniciar sesión.');
      const expected=identity.data.user;
      if(change) {const auth=await db.auth.signInWithPassword({email:expected.email!,password:current});if(auth.error||!auth.data.session||auth.data.user?.id!==expected.id||auth.data.user.email!==expected.email)throw new Error('La contraseña actual no pudo verificarse para esta identidad.');}
      const currentIdentity=await db.auth.getUser();if(currentIdentity.error||currentIdentity.data.user?.id!==expected.id||currentIdentity.data.user.email!==expected.email)throw new Error('La sesión cambió durante la operación. No se envió el cambio; vuelve a verificar tu identidad.');
      const result=await db.auth.updateUser({password});if(result.error||result.data.user?.id!==expected.id)throw new Error('No se confirmó el cambio de contraseña para esta identidad; revisa la vigencia de la sesión.');
      setPassword('');setConfirm('');setCurrent('');router.replace('/dashboard');router.refresh();
    }
  }catch(cause){setMessage(cause instanceof Error?cause.message:'No se confirmó la operación de acceso.');}finally{setBusy(false);}}}><Stack><Title order={2}>{recovery?'Recuperar acceso':change?'Cambiar contraseña':'Nueva contraseña'}</Title>
    {recovery?<TextInput label="Correo" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.currentTarget.value)}/>:<>{change&&<PasswordInput label="Contraseña actual" autoComplete="current-password" required value={current} onChange={e=>setCurrent(e.currentTarget.value)}/>}<PasswordInput label="Nueva contraseña" autoComplete="new-password" required value={password} onChange={e=>setPassword(e.currentTarget.value)} description="12 caracteres, minúscula, mayúscula, número y símbolo."/><PasswordInput label="Confirmar contraseña" autoComplete="new-password" required value={confirm} onChange={e=>setConfirm(e.currentTarget.value)}/></>}
    {message&&<Alert withCloseButton onClose={()=>setMessage('')}>{message}</Alert>}<Button type="submit" loading={busy}>{recovery?'Solicitar enlace':'Cambiar contraseña'}</Button><Button component="a" href="/login" variant="subtle">Volver al acceso</Button>
  </Stack></form></Paper></Container>;
}
export function AuthEmailChange({email}:{email:string}) {
  const [next,setNext]=useState(email);const [password,setPassword]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  return <form onSubmit={async e=>{e.preventDefault();setBusy(true);setMessage('');try{
    const db=createClient();const identity=await db.auth.getUser();if(identity.error||!identity.data.user||identity.data.user.email!==email)throw new Error('La identidad actual no pudo verificarse.');
    const expected=identity.data.user;
    const auth=await db.auth.signInWithPassword({email,password});if(auth.error||!auth.data.session||auth.data.user?.id!==expected.id||auth.data.user.email!==email)throw new Error('La contraseña actual no pudo verificarse para esta identidad.');
    const current=await db.auth.getUser();if(current.error||current.data.user?.id!==expected.id||current.data.user.email!==email)throw new Error('La sesión cambió durante la operación. No se envió la solicitud; verifica tu identidad nuevamente.');
    const result=await db.auth.updateUser({email:next.trim()},{emailRedirectTo:`${window.location.origin}/auth/confirm?next=/team`});if(result.error||result.data.user?.id!==expected.id)throw new Error('No se confirmó la solicitud de cambio de correo para esta identidad.');
    setPassword('');setMessage('Solicitud enviada. Confirma los enlaces del correo anterior y nuevo en Mailpit. El correo actual no cambia hasta la verificación Auth.');
  }catch(cause){setMessage(cause instanceof Error?cause.message:'No se confirmó el cambio.');}finally{setBusy(false);}}}><Stack><Text fw={600}>Cambiar mi correo de acceso</Text><TextInput label="Nuevo correo" type="email" required value={next} onChange={e=>setNext(e.currentTarget.value)}/><PasswordInput label="Contraseña actual" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.currentTarget.value)}/>{message&&<Alert>{message}</Alert>}<Button type="submit" loading={busy} disabled={next===email}>Solicitar cambio y verificación</Button></Stack></form>;
}

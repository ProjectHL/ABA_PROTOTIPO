'use client';
import { useState } from 'react';
import { Alert,Button,Container,Paper,PasswordInput,Stack,TextInput,Title } from '@mantine/core';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function PasswordForm({reset=false}:{reset?:boolean}) {
    const [value,setValue]=useState(''); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false);
    const router=useRouter();
    return <Container size="xs" py="xl"><Paper p="xl" withBorder><form onSubmit={async e=>{
        e.preventDefault(); setBusy(true); setMessage('');
        try {
            const db=createClient();
            if(reset) {
                const {error}=await db.auth.updateUser({password:value});
                if(error) setMessage('No se pudo cambiar la contraseña. Solicita un enlace nuevo o revisa sus requisitos.');
                else {router.replace('/dashboard');router.refresh();}
            } else {
                await db.auth.resetPasswordForEmail(value,{redirectTo:`${window.location.origin}/auth/callback?next=/reset-password`});
                setMessage('Si la cuenta está habilitada, recibirás un enlace. Revisa también correo no deseado.');
            }
        } catch {setMessage('No se pudo contactar al servicio. Vuelve a intentar.');}
        finally {setBusy(false);}
    }}><Stack><Title order={2}>{reset?'Nueva contraseña':'Recuperar acceso'}</Title>
        {reset?<PasswordInput label="Contraseña" required minLength={12} value={value} onChange={e=>setValue(e.currentTarget.value)}/>:<TextInput label="Correo" type="email" required value={value} onChange={e=>setValue(e.currentTarget.value)}/>}
        {message&&<Alert>{message}</Alert>}<Button type="submit" loading={busy}>{reset?'Cambiar contraseña':'Solicitar enlace'}</Button><Button component="a" href="/login" variant="subtle">Volver al acceso</Button>
    </Stack></form></Paper></Container>;
}

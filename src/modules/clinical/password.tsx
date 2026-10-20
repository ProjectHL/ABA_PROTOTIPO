'use client';
import { useState } from 'react';
import { Alert,Button,Container,Paper,PasswordInput,Stack,TextInput,Title } from '@mantine/core';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const meetsPasswordPolicy=(password:string)=>password.length>=12&&/[a-z]/.test(password)&&/[A-Z]/.test(password)&&/\d/.test(password)&&/[^A-Za-z0-9]/.test(password);

export function PasswordForm({reset=false}:{reset?:boolean}) {
    const [value,setValue]=useState(''); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false);
    const router=useRouter();
    return <Container size="xs" py="xl"><Paper p="xl" withBorder><form onSubmit={async e=>{
        e.preventDefault(); setMessage('');
        if(reset&&!meetsPasswordPolicy(value)) {
            setMessage('La contraseña debe tener al menos 12 caracteres e incluir minúscula, mayúscula, número y símbolo.');
            return;
        }
        setBusy(true);
        try {
            const db=createClient();
            if(reset) {
                const {error}=await db.auth.updateUser({password:value});
                if(error?.code==='weak_password') setMessage('La contraseña no cumple los requisitos: usa al menos 12 caracteres, minúscula, mayúscula, número y símbolo.');
                else if(error) setMessage('No se pudo cambiar la contraseña. Solicita un enlace nuevo si la sesión de recuperación expiró.');
                else {router.replace('/dashboard');router.refresh();}
            } else {
                const {error}=await db.auth.resetPasswordForEmail(value,{redirectTo:`${window.location.origin}/auth/confirm?next=/reset-password`});
                if(error) {
                    if(error.code==='over_email_send_rate_limit') {
                        setMessage('Supabase alcanzó el límite de su proveedor de correo para este proyecto de prueba. Intenta nuevamente más tarde.');
                    } else if(error.code==='over_request_rate_limit' || error.status===429) {
                        setMessage('Supabase recibió demasiadas solicitudes seguidas. Espera un momento e intenta nuevamente.');
                    } else if(error.code==='email_address_not_authorized') {
                        setMessage('El correo no está autorizado por el servicio de envío predeterminado de Supabase.');
                    } else {
                        setMessage('No se pudo solicitar el enlace en este momento. Vuelve a intentar.');
                    }
                    return;
                }
                setMessage('Si la cuenta está habilitada, recibirás un enlace. Revisa también correo no deseado.');
            }
        } catch {setMessage('No se pudo contactar al servicio. Vuelve a intentar.');}
        finally {setBusy(false);}
    }}><Stack><Title order={2}>{reset?'Nueva contraseña':'Recuperar acceso'}</Title>
        {reset?<PasswordInput label="Contraseña" description="Mínimo 12 caracteres, con minúscula, mayúscula, número y símbolo." required minLength={12} value={value} onChange={e=>setValue(e.currentTarget.value)} error={value.length>0&&!meetsPasswordPolicy(value)?'Falta cumplir uno o más requisitos.':undefined}/>:<TextInput label="Correo" type="email" required value={value} onChange={e=>setValue(e.currentTarget.value)}/>}
        {message&&<Alert>{message}</Alert>}<Button type="submit" loading={busy}>{reset?'Cambiar contraseña':'Solicitar enlace'}</Button><Button component="a" href="/login" variant="subtle">Volver al acceso</Button>
    </Stack></form></Paper></Container>;
}

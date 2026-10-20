'use client';
import { Alert,Button,Container,Stack } from '@mantine/core';
import { useState } from 'react';
export default function ErrorPage({reset}:{reset:()=>void}) {
    const [visible,setVisible]=useState(true);
    return <Container py="xl"><Stack>{visible&&<Alert color="red" title="No se pudo cargar esta página" withCloseButton onClose={()=>setVisible(false)}>No se confirmó ningún cambio. Reintenta la consulta; si el problema continúa, contacta al administrador.</Alert>}<Button onClick={reset}>Reintentar</Button></Stack></Container>;
}

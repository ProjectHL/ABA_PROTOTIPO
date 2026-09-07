'use client';
import { Alert,Button,Container,Stack } from '@mantine/core';
export default function ErrorPage({reset}:{reset:()=>void}) {
    return <Container py="xl"><Stack><Alert color="red" title="No se pudo cargar esta página">No se confirmó ningún cambio. Reintenta la consulta; si el problema continúa, contacta al administrador.</Alert><Button onClick={reset}>Reintentar</Button></Stack></Container>;
}

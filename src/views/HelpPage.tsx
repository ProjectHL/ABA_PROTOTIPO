'use client';
import Link from 'next/link';
import { Alert,Anchor,Card,Container,Stack,Text,Title } from '@mantine/core';
import { MainLayout } from '@/components/MainLayout';
export default function HelpPage(){
  return <MainLayout><Container size="md"><Stack>
    <Title order={2}>Ayuda</Title><Text c="dimmed">Guía breve para trabajar en tu clínica.</Text>
    <Card withBorder><Stack gap="xs"><Title order={3}>Clínica y permisos</Title>
      <Text>Comprueba la clínica activa en la barra lateral. Las fichas y acciones disponibles dependen de tus permisos vigentes.</Text>
      <Text>Si una acción deja de estar disponible, conserva tu trabajo y solicita a la administración que revise tu acceso.</Text></Stack></Card>
    <Card withBorder><Stack gap="xs"><Title order={3}>Guardar y reintentar</Title>
      <Text>Un cambio queda confirmado cuando el servidor devuelve su comprobante. Si falla la conexión, usa “Reintentar misma operación” sin cambiar los datos.</Text>
      <Text>Si aparece un conflicto, revisa la versión actual antes de volver a enviar. No cierres un formulario con una operación pendiente.</Text></Stack></Card>
    <Card withBorder><Stack gap="xs"><Title order={3}>Agenda</Title>
      <Text>Cada cita conserva su zona horaria. Al editar una cita recurrente, elige entre esa ocurrencia y toda la serie. Las horas inexistentes por cambio horario se rechazan.</Text>
      <Anchor component={Link} href="/calendar">Abrir agenda</Anchor></Stack></Card>
    <Card withBorder><Stack gap="xs"><Title order={3}>Planes internos</Title>
      <Text>La administración puede seleccionar el plan, ajustar plazas y gestionar documentos internos. Los importes son de demostración; no se realizan cobros ni se emiten documentos tributarios.</Text>
      <Anchor component={Link} href="/plans">Abrir planes y documentos</Anchor></Stack></Card>
    <Alert color="blue">Los tickets se registran en este entorno local. No se ofrece atención humana inmediata, 24/7 ni asistencia de IA. Evita enviar datos clínicos identificables en soporte.</Alert>
    <Anchor component={Link} href="/support">Crear o consultar un ticket</Anchor>
  </Stack></Container></MainLayout>;
}

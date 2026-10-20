'use client';

import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Container, Divider, Group, Loader, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { useIdentity } from '@/context/IdentityContext';
import { MainLayout } from '@/components/MainLayout';
import { loadFamilyHome } from '@/modules/family/family.server';
import { FamilyPublishedProgram, FamilyPublishedResult } from '@/modules/family/FamilyPublishedContent';
import { FamilyDocumentDownload } from '@/modules/family/FamilyDocumentDownload';
import type { FamilyCalendarPage, FamilyPortalPage as FamilyPortalData } from '@/modules/family/contracts';

type LoadState = { clinicId: string; data: FamilyPortalData | null; calendar: FamilyCalendarPage | null; error: string | null };

export default function FamilyPortalPage() {
  const { identity } = useIdentity();
  return <MainLayout><FamilyPortalContent key={`${identity?.userId ?? 'signed-out'}:${identity?.active?.id ?? 'no-clinic'}`}/></MainLayout>;
}

function FamilyPortalContent() {
  const { identity, verified } = useIdentity();
  const clinicId = identity?.active?.id;
  const [state, setState] = useState<LoadState>({ clinicId: '', data: null, calendar: null, error: null });
  const [refreshIndex, setRefreshIndex] = useState(0);
  const refresh = () => {
    setState({ clinicId: '', data: null, calendar: null, error: null });
    setRefreshIndex(value => value + 1);
  };

  useEffect(() => {
    let live = true;
    if (!clinicId || !verified || identity?.active?.role !== 'family') return () => { live = false; };
    void loadFamilyHome(clinicId)
      .then(({ portal, calendar }) => { if (live) setState({ clinicId, data: portal, calendar, error: null }); })
      .catch((cause) => { if (live) setState({ clinicId, data: null, calendar: null, error: cause instanceof Error ? cause.message : 'No se pudo cargar el portal familiar.' }); });
    return () => { live = false; };
  }, [clinicId, identity?.userId, identity?.active?.role, verified, refreshIndex]);

  if (identity?.active?.role !== 'family') return <Container><Alert color="yellow" title="Contexto familiar requerido">Selecciona una identidad familiar autorizada para abrir este portal.</Alert></Container>;
  if (!verified) return <Container><Alert color="yellow">Permisos pendientes de revalidación. Revalida tu identidad antes de consultar publicaciones familiares.</Alert></Container>;
  if (clinicId && state.clinicId === clinicId && state.error) return <Container><Stack><Alert color="red">{state.error}</Alert><Button onClick={refresh}>Reintentar consulta</Button></Stack></Container>;
  if (!clinicId || state.clinicId !== clinicId || !state.data || state.data.actorId !== identity?.userId) return <Stack align="center"><Loader/><Text>Cargando publicaciones autorizadas…</Text></Stack>;

  return <Container size="lg"><Stack>
    <Group justify="space-between"><div><Title order={1}>Portal Familiar</Title><Text c="dimmed">Sólo se muestran recursos que el equipo publicó expresamente para tu identidad familiar.</Text></div><Button variant="light" onClick={refresh}>Actualizar portal</Button></Group>
    <Card withBorder><Stack><Title order={3}>Agenda familiar</Title>{state.calendar?.appointments.length ? state.calendar.appointments.map((appointment) => <Card key={appointment.id} withBorder><Group justify="space-between"><div><Text fw={600}>{appointment.title}</Text><Text size="sm">{appointment.studentLabel} · {appointment.familyPersonLabel}</Text><Text size="sm" c="dimmed">{new Date(appointment.startsAt).toLocaleString('es-CL', { timeZone: appointment.timeZone })} – {new Date(appointment.endsAt).toLocaleString('es-CL', { timeZone: appointment.timeZone })} · {appointment.timeZone}</Text></div><Badge color={appointment.status==='scheduled'?'blue':'gray'}>{appointment.status==='scheduled'?'Programada':'Cancelada'}</Badge></Group>{appointment.cancellationReason&&<Text size="sm" c="red">{appointment.cancellationReason}</Text>}</Card>) : <Text c="dimmed">No tienes citas familiares asignadas.</Text>}</Stack></Card>
    {state.data.publications.length === 0 ? <Alert color="blue">Todavía no hay una publicación familiar vigente para ti.</Alert> : state.data.publications.map((publication) =>
      <Card key={publication.id} withBorder radius="md" p="lg"><Stack>
        <Group justify="space-between"><div><Title order={2}>{publication.studentLabel}</Title><Text size="sm" c="dimmed">Publicado {new Date(publication.publishedAt).toLocaleString('es-CL')}</Text></div><Badge>Versión {publication.version}</Badge></Group>
        {publication.introduction && <Text>{publication.introduction}</Text>}<Divider/>
        <SimpleGrid cols={{ base: 1, md: 3 }}>
          <section><Text fw={700}>Programas</Text>{publication.programs.length ? publication.programs.map((program) => <Card key={program.id} withBorder mt="xs"><Text fw={600}>{program.title}</Text><Text size="xs" c="dimmed">{program.type === 'acquisition' ? 'Adquisición' : 'Conducta'} · v{program.version}</Text><FamilyPublishedProgram design={program.design}/></Card>) : <Text size="sm" c="dimmed">Sin programas publicados.</Text>}</section>
          <section><Text fw={700}>Resultados</Text>{publication.results.length ? publication.results.map((result) => <Card key={result.id} withBorder mt="xs"><Text size="sm">Registro publicado · revisión {result.revision}</Text><Text size="xs" c="dimmed">{new Date(result.createdAt).toLocaleString('es-CL')}</Text><FamilyPublishedResult measurement={result.measurement}/></Card>) : <Text size="sm" c="dimmed">Sin resultados publicados.</Text>}</section>
          <section><Text fw={700}>Documentos</Text>{publication.documents.length ? publication.documents.map((document) => <Card key={document.id} withBorder mt="xs"><Text fw={600}>{document.name}</Text><Text size="xs" c="dimmed">{document.mimeType} · {Math.ceil(document.byteLength / 1024)} KiB</Text><FamilyDocumentDownload key={`${identity.userId}:${publication.id}:${document.id}`} clinicId={clinicId} publicationId={publication.id} versionId={document.id} name={document.name}/></Card>) : <Text size="sm" c="dimmed">Sin documentos publicados.</Text>}</section>
        </SimpleGrid>
      </Stack></Card>)}
  </Stack></Container>;
}

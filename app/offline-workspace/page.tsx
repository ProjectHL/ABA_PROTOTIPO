'use client';

import { Alert, Badge, Button, Card, Container, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { FileText, HardDrive, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { useOffline } from '@/modules/offline';
import SessionPage from '@/views/SessionPage';

export default function OfflineWorkspacePage() {
    const offline = useOffline();
    const [selected, setSelected] = useState<string | null>(null);
    const [message, setMessage] = useState('');
    const snapshot = offline.downloads.find((item) => item.studentId === selected) ?? null;
    if (snapshot) return <SessionPage data={snapshot.data} onExit={() => setSelected(null)}/>;

    const remove = async (studentId: string) => {
        if (!window.confirm('¿Quitar esta ficha descargada? Las operaciones pendientes deben sincronizarse o descartarse primero.')) return;
        try { await offline.removeStudent(studentId); setMessage('Descarga retirada.'); }
        catch (cause) { setMessage(cause instanceof Error ? cause.message : 'No se pudo retirar la descarga.'); }
    };

    const removeDocument = async (studentId: string, versionId: string, fileName: string) => {
        if (!window.confirm(`¿Quitar “${fileName}” del acceso offline de este usuario y clínica?`)) return;
        try { await offline.removeDocument(studentId, versionId); setMessage('Documento offline retirado.'); }
        catch (cause) { setMessage(cause instanceof Error ? cause.message : 'No se pudo retirar el documento.'); }
    };

    return <MainLayout><Container size="lg" py="xl"><Stack>
        <Group justify="space-between"><div><Title order={1}>Trabajo offline</Title><Text c="dimmed">Sólo fichas descargadas explícitamente para el usuario y clínica activos.</Text></div><Badge color={offline.online ? 'green' : 'orange'}>{offline.online ? 'En línea' : 'Sin conexión'}</Badge></Group>
        {!offline.scope && <Alert color="orange">No hay un alcance local desbloqueado. Inicia la aplicación con la misma sesión que descargó las fichas.</Alert>}
        {message && <Alert color="blue" withCloseButton onClose={() => setMessage('')}>{message}</Alert>}
        {!offline.downloads.length && <Alert>No hay fichas descargadas en este alcance.</Alert>}
        <SimpleGrid cols={{ base: 1, sm: 2 }}>{offline.downloads.map((item) => { const documents = offline.documents.filter((document) => document.studentId === item.studentId); return <Card key={item.studentId} withBorder>
            <Group justify="space-between"><HardDrive/><Badge variant="light">IndexedDB</Badge></Group>
            <Text fw={700} mt="sm">{item.data.student.displayName}</Text>
            <Text size="sm" c="dimmed">Descargada {new Date(item.cachedAt).toLocaleString('es-CL')}</Text>
            <Text size="xs" c="dimmed">{item.selectedAttachmentVersionIds.length} documentos seleccionados · {item.data.programs.length} programas</Text>
            {documents.length > 0 && <Stack gap="xs" mt="md">{documents.map((document) => <Card key={document.version.id} withBorder p="sm">
                <Group justify="space-between" align="flex-start"><Group gap="xs"><FileText size={16}/><div><Text size="sm" fw={600}>{document.version.upload.fileName}</Text><Text size="xs" c="dimmed">v{document.version.version} · {Math.max(1, Math.round(document.version.upload.byteLength / 1024))} KiB</Text></div></Group></Group>
                <Group mt="xs"><Button size="xs" variant="light" onClick={() => void offline.openDocument(item.studentId, document.version.id).catch((cause) => setMessage(cause instanceof Error ? cause.message : 'No se pudo abrir el documento.'))}>Abrir</Button><Button size="xs" color="red" variant="subtle" onClick={() => void removeDocument(item.studentId, document.version.id, document.version.upload.fileName)}>Quitar</Button></Group>
            </Card>)}</Stack>}
            <Group mt="md"><Button onClick={() => setSelected(item.studentId)}>Abrir ficha offline</Button><Button color="red" variant="subtle" leftSection={<Trash2 size={14}/>} onClick={() => void remove(item.studentId)}>Quitar</Button></Group>
        </Card>;})}</SimpleGrid>
    </Stack></Container></MainLayout>;
}

'use client';

import { ActionIcon, Alert, Badge, Button, Divider, Group, Popover, Stack, Text, Tooltip } from '@mantine/core';
import { Cloud, CloudOff, Download, HardDrive, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useOffline } from './OfflineProvider';

export function OfflineStatus() {
    const offline = useOffline();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const pending = offline.queue.filter((entry) => entry.status !== 'acknowledged' && entry.status !== 'superseded');
    const blocked = pending.filter((entry) => entry.status.startsWith('blocked-'));
    const Icon = offline.online ? Cloud : CloudOff;

    const discard = async () => {
        if (!pending.length || !window.confirm(`¿Descartar explícitamente ${pending.length} operación${pending.length === 1 ? '' : 'es'} local${pending.length === 1 ? '' : 'es'}? Esta acción no se puede deshacer.`)) return;
        setBusy(true);
        setError(null);
        try { await offline.discardPending(); }
        catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo descartar la cola.'); }
        finally { setBusy(false); }
    };

    return <Popover width={360} position="bottom-end" withArrow shadow="md">
        <Popover.Target>
            <Tooltip label={offline.online ? `${pending.length} pendientes offline` : 'Sin conexión'}>
                <ActionIcon aria-label="Estado offline y sincronización" variant="subtle" color={!offline.online ? 'orange' : blocked.length ? 'red' : pending.length ? 'yellow' : 'gray'}>
                    <Icon size={18}/>
                </ActionIcon>
            </Tooltip>
        </Popover.Target>
        <Popover.Dropdown>
            <Stack gap="sm">
                <Group justify="space-between"><Text fw={700}>Trabajo offline</Text><Badge color={offline.online ? 'green' : 'orange'}>{offline.online ? 'En línea' : 'Sin conexión'}</Badge></Group>
                {!offline.supported && <Alert color="red">Este navegador no ofrece IndexedDB; no se afirmará durabilidad local.</Alert>}
                {offline.error && <Alert color="orange">{offline.error}</Alert>}
                {error && <Alert color="red">{error}</Alert>}
                <Group grow><Badge variant="light" size="lg">{pending.length} pendientes</Badge><Badge variant="light" color={blocked.length ? 'red' : 'gray'} size="lg">{blocked.length} bloqueados</Badge></Group>
                <Text size="sm" c="dimmed">{offline.downloads.length} ficha{offline.downloads.length === 1 ? '' : 's'} y {offline.documents.length} documento{offline.documents.length === 1 ? '' : 's'} seleccionados para esta identidad y clínica.</Text>
                {pending.length ? <Alert color="yellow">El trabajo local permanece separado del servidor hasta recibir y guardar un recibo correlacionado.</Alert> : <Text size="sm">No hay operaciones locales pendientes en este alcance.</Text>}
                {blocked.map((entry) => <Alert key={entry.id} color="red"><Text size="sm" fw={600}>{entry.payload.kind} · {entry.payload.command.action}</Text><Text size="xs">{entry.error}</Text>{entry.status === 'blocked-conflict' && <Text size="xs" mt="xs">Abre la ficha para comparar la versión vigente y crear una operación nueva enlazada.</Text>}</Alert>)}
                <Divider/>
                <Group grow>
                    <Button variant="light" leftSection={<RefreshCw size={14}/>} loading={offline.loading || offline.syncing || busy} disabled={!offline.online} onClick={() => void offline.syncNow()}>Sincronizar</Button>
                    <Button color="red" variant="light" leftSection={<Trash2 size={14}/>} disabled={!pending.length || busy || offline.syncing} onClick={() => void discard()}>Descartar</Button>
                </Group>
                {offline.installAvailable && <Button leftSection={<Download size={15}/>} onClick={() => void offline.requestInstall()}>Instalar aplicación</Button>}
                {!offline.installAvailable && <Group gap="xs"><HardDrive size={14}/><Text size="xs" c="dimmed">La instalación aparecerá cuando el navegador la ofrezca. El caché clínico no se comparte entre usuarios o clínicas.</Text></Group>}
            </Stack>
        </Popover.Dropdown>
    </Popover>;
}

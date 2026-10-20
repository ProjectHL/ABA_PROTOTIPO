'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActionIcon, Alert, Badge, Button, Group, Indicator, Popover, Stack, Text, Tooltip } from '@mantine/core';
import { Bell, CheckCheck, RotateCcw } from 'lucide-react';
import { notifications as toast } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useIdentity } from '@/context/IdentityContext';
import { loadNotifications, setNotificationRead } from './notifications.server';
import { notificationStateCommand, type NotificationDto, type NotificationStateCommand } from './contracts';

export function NotificationsBell({ beforeNavigate, leaveGuard }: { beforeNavigate?: (path: string) => Promise<boolean>; leaveGuard?: { current: (() => boolean) | null } } = {}) {
  const { identity } = useIdentity();
  const userId = identity?.userId ?? null;
  const router = useRouter();
  const [rows, setRows] = useState<NotificationDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [consulting, setConsulting] = useState(false);
  const [pendingRows, setPendingRows] = useState<string[]>([]);
  const [busyRows, setBusyRows] = useState<string[]>([]);
  const [reviewRows, setReviewRows] = useState<string[]>([]);
  const pending = useRef(new Map<string, NotificationStateCommand>());
  const pendingSnapshot = useRef(new Map<string, NotificationDto>());
  const busy = useRef(new Set<string>());
  const consultLock = useRef(false);
  const review = useRef(new Set<string>());
  const sequence = useRef(0);
  const actor = useRef(userId);
  actor.current = userId;
  useEffect(() => {
    const canLeave = () => {
      if (!pending.current.size && !busy.current.size) return true;
      setError('Recupera primero los cambios de lectura pendientes en la campana.');
      return false;
    };
    if (leaveGuard) leaveGuard.current = canLeave;
    const warn = (event: BeforeUnloadEvent) => { if (!canLeave()) { event.preventDefault(); event.returnValue = ''; } };
    const link = (event: MouseEvent) => { if (event.target instanceof Element && event.target.closest('a[href]') && !canLeave()) { event.preventDefault(); event.stopPropagation(); } };
    window.addEventListener('beforeunload', warn); document.addEventListener('click', link, true);
    return () => { if (leaveGuard) leaveGuard.current = null; window.removeEventListener('beforeunload', warn); document.removeEventListener('click', link, true); };
  }, [leaveGuard]);
  const refresh = useCallback(async () => {
    if (!userId) return false;
    const request = ++sequence.current;
    setLoading(true);
    try {
      const latest = await loadNotifications();
      if (actor.current !== userId || request !== sequence.current) return false;
      setRows(latest); setError(null);
      return true;
    } catch (cause) {
      if (actor.current === userId && request === sequence.current) setError(cause instanceof Error ? cause.message : 'No se recuperaron las notificaciones.');
      return false;
    } finally {
      if (actor.current === userId && request === sequence.current) setLoading(false);
    }
  }, [userId]);
  useEffect(() => {
    if (!userId) return;
    const refreshSequence = sequence;
    const recover = () => { if (navigator.onLine && document.visibilityState === 'visible') void refresh(); };
    recover();
    const db = createClient();
    const channel = db.channel(`notifications:${userId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'user_notifications_v2', filter: `user_id=eq.${userId}` }, recover).subscribe(status => {
      if (status === 'SUBSCRIBED') recover();
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setError('Realtime interrumpido; abre la campana para recuperar el estado persistido.');
    });
    window.addEventListener('online', recover);
    window.addEventListener('focus', recover);
    document.addEventListener('visibilitychange', recover);
    // Los recordatorios se materializan mediante lectura autenticada, no por Realtime.
    const timer = window.setInterval(recover, 60_000);
    return () => {
      ++refreshSequence.current;
      window.clearInterval(timer);
      window.removeEventListener('online', recover);
      window.removeEventListener('focus', recover);
      document.removeEventListener('visibilitychange', recover);
      void db.removeChannel(channel);
    };
  }, [userId, refresh]);
  const mutate = async (row: NotificationDto, read: boolean, retained?: NotificationStateCommand) => {
    if (consultLock.current || busy.current.has(row.id) || review.current.has(row.id)) return false;
    const prior = pending.current.get(row.id);
    if (prior && retained !== prior) return false;
    const parsed = notificationStateCommand.safeParse(retained ?? { notificationId: row.id, read, expectedVersion: row.version, operationId: crypto.randomUUID(), idempotencyKey: crypto.randomUUID() });
    if (!parsed.success) { setError('No se envió un cambio de lectura inválido.'); return false; }
    const command = parsed.data;
    pending.current.set(row.id, command); pendingSnapshot.current.set(row.id, row); busy.current.add(row.id);
    setPendingRows([...pending.current.keys()]); setBusyRows([...busy.current]);
    try {
      const result = await setNotificationRead(command);
      pending.current.delete(row.id); pendingSnapshot.current.delete(row.id); setPendingRows([...pending.current.keys()]);
      if (result.status !== 'acknowledged') {
        review.current.add(row.id); setReviewRows([...review.current]);
        toast.show({ title: 'Lectura no actualizada', color: 'yellow', message: result.message });
        return false;
      }
      ++sequence.current;
      setRows(current => current.map(item => item.id === row.id ? { ...item, readAt: command.read ? result.committedAt : null, version: result.serverVersion } : item));
      if (!await refresh()) setError('Lectura confirmada por recibo; falló el refresco. Consulta de nuevo, no repitas la escritura.');
      return true;
    } catch (cause) {
      toast.show({ title: 'Resultado desconocido', color: 'red', message: cause instanceof Error ? cause.message : 'Reintenta el mismo cambio.' });
      return false;
    } finally {
      busy.current.delete(row.id); setBusyRows([...busy.current]);
    }
  };
  const consult = async () => {
    if (consultLock.current || busy.current.size || pending.current.size) return;
    consultLock.current = true; setConsulting(true);
    try { if (await refresh()) { review.current.clear(); setReviewRows([]); } }
    finally { consultLock.current = false; setConsulting(false); }
  };
  const unread = rows.filter(row => !row.readAt).length;
  return <Popover width={360} position="bottom-end" withArrow shadow="md" onChange={opened => { if (opened) void refresh(); }}>
    <Popover.Target><Tooltip label="Notificaciones"><Indicator disabled={!unread} label={unread > 99 ? '99+' : unread} size={16}><ActionIcon aria-label="Notificaciones" variant="subtle" color="gray"><Bell size={18} /></ActionIcon></Indicator></Tooltip></Popover.Target>
    <Popover.Dropdown><Stack gap="sm">
      <Group justify="space-between"><Text fw={700}>Notificaciones</Text>{unread > 0 && <Badge>{unread} sin leer</Badge>}<Button variant="subtle" size="compact-xs" loading={loading || consulting} disabled={pendingRows.length > 0 || busyRows.length > 0} onClick={() => void consult()}>Consultar</Button></Group>
      {error && <Text c="orange" size="xs">{error}</Text>}
      {pendingRows.map(id => { const command = pending.current.get(id); return command && <Alert key={id} color="yellow" title="Confirmación pendiente"><Text size="xs">Se conserva el cambio exacto a {command.read ? 'leída' : 'no leída'}.</Text><Button size="compact-xs" loading={busyRows.includes(id)} onClick={() => { const row = rows.find(item => item.id === id) ?? pendingSnapshot.current.get(id); if (row) void mutate(row, command.read, command); }}>Recuperar recibo</Button></Alert>; })}
      {!!reviewRows.length && <Alert color="yellow">Consulta el estado vigente antes de emitir otro cambio.</Alert>}
      {!rows.length ? <Text c="dimmed" size="sm">{loading ? 'Recuperando…' : 'No hay notificaciones.'}</Text> : rows.map(row => <Stack key={row.id} gap={4} p="xs" style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: 8, opacity: row.readAt?.length ? 0.7 : 1 }}>
        <Group justify="space-between"><Text fw={row.readAt ? 500 : 700} size="sm">{row.title}</Text><Text size="xs" c="dimmed">{new Date(row.createdAt).toLocaleString('es-CL')}</Text></Group><Text size="sm">{row.body}</Text>
        <Group justify="space-between"><Button variant="subtle" size="compact-xs" disabled={consulting || pendingRows.length > 0 || reviewRows.includes(row.id)} onClick={() => void (async () => { if (beforeNavigate && !await beforeNavigate(row.resourcePath)) return; if (!row.readAt && !await mutate(row, true)) return; router.push(row.resourcePath); })()}>Abrir</Button><Button variant="subtle" size="compact-xs" disabled={consulting || pendingRows.includes(row.id) || reviewRows.includes(row.id)} loading={busyRows.includes(row.id)} leftSection={row.readAt ? <RotateCcw size={12} /> : <CheckCheck size={12} />} onClick={() => void mutate(row, !row.readAt)}>{row.readAt ? 'Marcar no leída' : 'Marcar leída'}</Button></Group>
      </Stack>)}
    </Stack></Popover.Dropdown>
  </Popover>;
}

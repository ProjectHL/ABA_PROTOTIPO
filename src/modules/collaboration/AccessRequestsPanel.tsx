'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Badge, Button, Group, Modal, NumberInput, Select, Stack, Table, Text, Textarea, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Check, Plus, X } from 'lucide-react';
import {
  accessRequestCreateCommandSchema, accessRequestDecisionCommandSchema,
  type AccessRequestCreateCommand, type AccessRequestDecisionCommand, type AccessRequestDto,
  type AccessRequestResource,
} from '@/domain/collaboration/access-request';
import type { AuthorizedStudentSummary } from '@/modules/students/contracts';
import { saveStudentAccessDecision, saveStudentAccessRequest } from './collaboration.server';

type Pending =
  | { kind: 'create'; command: AccessRequestCreateCommand }
  | { kind: 'decision'; command: AccessRequestDecisionCommand };

const resourceOptions = [
  { value: 'student', label: 'Editar ficha' },
  { value: 'program', label: 'Editar programas' },
  { value: 'record_config', label: 'Configurar registros' },
  { value: 'chart', label: 'Configurar gráficos' },
];
const actions: Record<AccessRequestResource, AccessRequestCreateCommand['requestedActions']> = {
  student: ['student.edit'], program: ['program.edit'],
  record_config: ['record_config.create', 'record_config.edit'], chart: ['chart.configure'],
};
const actionLabels: Record<string, string> = {
  'student.edit': 'Editar ficha', 'program.edit': 'Editar programas',
  'record_config.create': 'Crear configuración', 'record_config.edit': 'Editar configuración',
  'chart.configure': 'Configurar gráficos',
};

export function AccessRequestsPanel({
  clinicId, requests, requestableStudents, onChanged, leaveGuard, blocked = false,
}: {
  clinicId: string | null; requests: AccessRequestDto[]; requestableStudents: AuthorizedStudentSummary[];
  onChanged: () => Promise<void>;
  leaveGuard: { current: (() => boolean) | null };
  blocked?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [resource, setResource] = useState<AccessRequestResource>('student');
  const [reason, setReason] = useState('');
  const [decisionTarget, setDecisionTarget] = useState<AccessRequestDto | null>(null);
  const [decisionAction, setDecisionAction] = useState<'approve' | 'deny'>('approve');
  const [decisionReason, setDecisionReason] = useState('');
  const [days, setDays] = useState<number | string>(30);
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = requests.find((item) => item.id === detailId);
  const pending = useRef<Pending | null>(null);
  const busyRef = useRef(false);
  const [unknown, setUnknown] = useState(false);
  const [reviewRequired, setReviewRequired] = useState(false);
  const incoming = useMemo(() => requests.filter((item) => item.direction === 'incoming'), [requests]);
  const mine = useMemo(() => requests.filter((item) => item.direction === 'requested'), [requests]);

  useEffect(() => {
    const canLeave = () => {
      if (busyRef.current || pending.current) {
        notifications.show({ title: 'Operación pendiente', color: 'yellow', message: 'Recupera primero el resultado de la solicitud.' });
        return false;
      }
      return !(createOpen || decisionTarget) || window.confirm('¿Descartar el borrador de autorización?');
    };
    leaveGuard.current = canLeave;
    const warn = (event: BeforeUnloadEvent) => {
      if (busyRef.current || pending.current || createOpen || decisionTarget) { event.preventDefault(); event.returnValue = ''; }
    };
    const link = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest('a[href]') && !canLeave()) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener('beforeunload', warn);
    document.addEventListener('click', link, true);
    return () => { leaveGuard.current = null; window.removeEventListener('beforeunload', warn); document.removeEventListener('click', link, true); };
  }, [createOpen, decisionTarget, leaveGuard]);

  const execute = async (next: Pending, success: string) => {
    if (blocked) {
      notifications.show({ title: 'Invitación pendiente', color: 'yellow', message: 'Recupera primero el recibo de la invitación antes de emitir otra solicitud.' });
      return false;
    }
    if (busyRef.current) return false;
    if (pending.current && JSON.stringify(pending.current) !== JSON.stringify(next)) {
      notifications.show({ title: 'Operación pendiente', color: 'yellow', message: 'Reintenta primero la solicitud cuyo resultado sigue desconocido.' });
      return false;
    }
    pending.current = next; busyRef.current = true; setBusy(true); setUnknown(false);
    try {
      const result = next.kind === 'create'
        ? await saveStudentAccessRequest({ clinicId, command: next.command })
        : await saveStudentAccessDecision({ clinicId, command: next.command });
      if (result.status !== 'acknowledged') {
        pending.current = null;
        setReviewRequired(true);
        notifications.show({ title: 'Cambio no confirmado', color: 'yellow', message: result.message });
        return false;
      }
      pending.current = null;
      notifications.show({ title: success, color: 'green', message: result.replayed ? 'Se recuperó el recibo previo.' : 'El servidor confirmó el cambio.' });
      try { await onChanged(); } catch {
        setReviewRequired(true);
        notifications.show({ title: 'Cambio confirmado', color: 'yellow', message: 'El recibo es válido; no se pudo refrescar la bandeja. Vuelve a consultar, no repitas la escritura.' });
      }
      return true;
    } catch (cause) {
      setUnknown(true);
      notifications.show({ title: 'Resultado desconocido', color: 'red', message: cause instanceof Error ? cause.message : 'Reintenta exactamente la misma operación.' });
      return false;
    } finally { busyRef.current = false; setBusy(false); }
  };

  const submitRequest = async () => {
    if (blocked || !clinicId || !studentId || reviewRequired || unknown || busyRef.current) return;
    const prior = pending.current?.kind === 'create' ? pending.current.command : null;
    const candidate = { studentId, resourceType: resource, requestedActions: actions[resource], reason: reason.trim() };
    const same = prior && prior.studentId === candidate.studentId && prior.resourceType === candidate.resourceType
      && prior.reason === candidate.reason && JSON.stringify(prior.requestedActions) === JSON.stringify(candidate.requestedActions);
    const command = accessRequestCreateCommandSchema.parse(same ? prior : {
      operationId: crypto.randomUUID(), idempotencyKey: crypto.randomUUID(), requestId: crypto.randomUUID(),
      expectedVersion: 0, action: 'request', ...candidate,
    });
    if (await execute({ kind: 'create', command }, 'Solicitud registrada')) {
      setCreateOpen(false); setStudentId(null); setReason(''); setResource('student');
    }
  };

  const decide = async () => {
    if (blocked || !clinicId || !decisionTarget || reviewRequired || unknown || busyRef.current) return;
    const currentTarget = requests.find((item) => item.id === decisionTarget.id);
    if (!currentTarget || currentTarget.status !== 'pending') {
      notifications.show({ title: 'Solicitud no disponible', color: 'yellow', message: 'La solicitud ya no está pendiente. Conserva el fundamento y revisa la bandeja.' });
      return;
    }
    const numericDays = Math.max(1, Math.min(90, Number(days) || 30));
    const expiresAt = decisionAction === 'approve'
      ? new Date(Date.now() + numericDays * 24 * 60 * 60 * 1000).toISOString() : null;
    const prior = pending.current?.kind === 'decision' ? pending.current.command : null;
    const candidate = { requestId: currentTarget.id, studentId: currentTarget.studentId, expectedVersion: currentTarget.version,
      action: decisionAction, expiresAt, reason: decisionReason.trim(), confirmation: true as const };
    const same = prior && prior.requestId === candidate.requestId && prior.expectedVersion === candidate.expectedVersion
      && prior.action === candidate.action && prior.reason === candidate.reason;
    const command = accessRequestDecisionCommandSchema.parse(same ? prior : {
      operationId: crypto.randomUUID(), idempotencyKey: crypto.randomUUID(), ...candidate,
    });
    if (await execute({ kind: 'decision', command }, decisionAction === 'approve' ? 'Solicitud aprobada' : 'Solicitud denegada')) {
      setDecisionTarget(null); setDecisionReason(''); setDays(30);
    }
  };

  const consult = async () => {
    if (blocked || busyRef.current || pending.current) return;
    busyRef.current = true; setBusy(true);
    try { await onChanged(); setReviewRequired(false); }
    catch { notifications.show({ title: 'Lectura pendiente', color: 'red', message: 'No se pudo refrescar la bandeja. Se conserva el borrador y la revisión requerida.' }); }
    finally { busyRef.current = false; setBusy(false); }
  };

  const recovery = <>
    {unknown && <Alert color="yellow" title="Resultado desconocido">Se conserva el comando exacto.<Button loading={busy} onClick={() => { const retained = pending.current; if (retained) void execute(retained, 'Operación recuperada').then((ok) => { if (ok) { setCreateOpen(false); setDecisionTarget(null); setReason(''); setDecisionReason(''); } }); }}>Reintentar operación exacta</Button></Alert>}
    {reviewRequired && <Alert color="yellow" title="Revisión requerida">Conserva tu borrador y consulta la versión vigente antes de confirmar de nuevo.<Button loading={busy} disabled={blocked} onClick={() => void consult()}>Consultar bandeja</Button></Alert>}
  </>;
  const statusLabels = { pending: 'Pendiente', approved: 'Aprobada', denied: 'Denegada' };
  const statusBadge = (status: AccessRequestDto['status']) => <Badge color={status === 'approved' ? 'green' : status === 'denied' ? 'red' : 'orange'}>{statusLabels[status]}</Badge>;
  const table = (items: AccessRequestDto[], allowDecision: boolean) => items.length ? <Table.ScrollContainer minWidth={900}><Table striped highlightOnHover>
    <Table.Thead><Table.Tr><Table.Th>Profesional</Table.Th><Table.Th>Ficha</Table.Th><Table.Th>Alcance</Table.Th><Table.Th>Motivo</Table.Th><Table.Th>Estado</Table.Th><Table.Th>Fecha</Table.Th><Table.Th>Detalle</Table.Th>{allowDecision && <Table.Th>Decisión</Table.Th>}</Table.Tr></Table.Thead>
    <Table.Tbody>{items.map((item) => <Table.Tr key={`${item.direction}:${item.id}`}><Table.Td><Text fw={600}>{item.requesterName}</Text><Text size="xs" c="dimmed">{item.requesterTitle || item.requesterEmail}</Text></Table.Td><Table.Td>{item.studentName}</Table.Td><Table.Td>{item.requestedActions.map((action) => <Badge key={action} variant="light" mr={4}>{actionLabels[action]}</Badge>)}</Table.Td><Table.Td><Text size="sm" lineClamp={2}>{item.reason}</Text></Table.Td><Table.Td>{statusBadge(item.status)}</Table.Td><Table.Td>{new Date(item.createdAt).toLocaleString('es-CL')}</Table.Td><Table.Td><Button size="xs" variant="subtle" onClick={() => setDetailId(item.id)}>Ver detalle</Button></Table.Td>{allowDecision && <Table.Td>{item.status === 'pending' ? <Group gap="xs"><Button size="xs" disabled={blocked || busy || unknown || reviewRequired} color="green" leftSection={<Check size={14}/>} onClick={() => { setDecisionTarget(item); setDecisionAction('approve'); setDecisionReason('Acceso temporal aprobado por responsable clínico'); }}>Permitir</Button><Button size="xs" disabled={busy || unknown || reviewRequired} color="red" variant="light" leftSection={<X size={14}/>} onClick={() => { setDecisionTarget(item); setDecisionAction('deny'); setDecisionReason('Solicitud denegada por responsable clínico'); }}>Denegar</Button></Group> : <Text size="xs" c="dimmed">Resuelta</Text>}</Table.Td>}</Table.Tr>)}</Table.Tbody>
  </Table></Table.ScrollContainer> : <Alert color="gray">No hay solicitudes en esta sección.</Alert>;

  if (!clinicId) return <Alert color="blue">Selecciona una clínica para consultar solicitudes internas.</Alert>;
  return <Stack gap="xl">
    {unknown && <Alert color="yellow" title="Resultado desconocido">El comando y sus datos se conservan. No cambies el contexto hasta recuperar el recibo.<Button loading={busy} onClick={() => { const retained = pending.current; if (retained) void execute(retained, 'Operación recuperada').then((ok) => { if (ok) { setCreateOpen(false); setDecisionTarget(null); setReason(''); setDecisionReason(''); } }); }}>Reintentar operación exacta</Button></Alert>}
    {reviewRequired && <Alert color="yellow" title="Revisión requerida">Se conserva tu borrador. Consulta la versión vigente antes de emitir otra decisión.<Button loading={busy} disabled={blocked} onClick={() => void consult()}>Consultar bandeja</Button></Alert>}
    <Group justify="space-between"><div><Title order={4}>Solicitudes internas de autorización</Title><Text size="sm" c="dimmed">Son distintas de las invitaciones a profesionales externos.</Text></div><Button leftSection={<Plus size={16}/>} onClick={() => setCreateOpen(true)} disabled={busy || unknown || reviewRequired || !requestableStudents.length}>Nueva solicitud</Button></Group>
    <Stack><Title order={5}>Solicitudes recibidas e historial</Title>{table(incoming, true)}</Stack>
    <Stack><Title order={5}>Solicitudes enviadas por ti</Title>{table(mine, false)}</Stack>
    <Modal opened={createOpen} onClose={() => { if (!busyRef.current && !pending.current) setCreateOpen(false); }} title="Solicitar autorización"><Stack>{recovery}<Select disabled={busy || unknown} searchable required label="Ficha" value={studentId} onChange={setStudentId} data={requestableStudents.map((student) => ({ value: student.id, label: `${student.displayName} · ${student.clinicalId}` }))}/><Select disabled={busy || unknown} required label="Alcance" value={resource} onChange={(value) => setResource((value ?? 'student') as AccessRequestResource)} data={resourceOptions}/><Textarea disabled={busy || unknown} required label="Motivo clínico" value={reason} onChange={(event) => setReason(event.currentTarget.value)} maxLength={500}/><Alert>La solicitud no concede acceso. Debe ser aprobada por un responsable vigente.</Alert><Group justify="flex-end"><Button variant="subtle" onClick={() => setCreateOpen(false)} disabled={busy || unknown}>Cancelar</Button><Button onClick={() => void submitRequest()} loading={busy} disabled={unknown || reviewRequired || !studentId || !reason.trim()}>Enviar solicitud</Button></Group></Stack></Modal>
    <Modal opened={!!decisionTarget} onClose={() => { if (!busyRef.current && !pending.current) setDecisionTarget(null); }} title={decisionAction === 'approve' ? 'Aprobar solicitud' : 'Denegar solicitud'}><Stack>{recovery}{decisionTarget && <Alert>{decisionTarget.requesterName} solicita {decisionTarget.requestedActions.map((action) => actionLabels[action]).join(', ')} para {decisionTarget.studentName}.</Alert>}{decisionAction === 'approve' && <NumberInput disabled={busy || unknown} label="Vigencia en días" min={1} max={90} value={days} onChange={setDays}/>}<Textarea disabled={busy || unknown} required label="Fundamento de la decisión" value={decisionReason} onChange={(event) => setDecisionReason(event.currentTarget.value)} maxLength={2000}/><Alert color={decisionAction === 'approve' ? 'green' : 'red'}>La decisión se registrará con auditoría, versión y recibo persistente.</Alert><Group justify="flex-end"><Button variant="subtle" onClick={() => setDecisionTarget(null)} disabled={busy || unknown}>Volver</Button><Button color={decisionAction === 'approve' ? 'green' : 'red'} onClick={() => void decide()} loading={busy} disabled={unknown || reviewRequired || decisionTarget?.status !== 'pending' || !decisionReason.trim()}>Confirmar</Button></Group></Stack></Modal>
    <Modal opened={!!detail} onClose={() => setDetailId(null)} title="Detalle de autorización"><Stack>{detail && <>
      <Text fw={600}>{detail.requesterName} · {detail.studentName}</Text>
      <Text size="sm">{detail.requesterTitle} {detail.requesterEmail}</Text>
      <Text size="sm">Versión {detail.version} · {new Date(detail.createdAt).toLocaleString('es-CL')}</Text>
      {statusBadge(detail.status)}
      <Text>{detail.requestedActions.map((action) => actionLabels[action]).join(', ')}</Text>
      <Title order={6}>Motivo de la solicitud</Title><Text style={{ whiteSpace: 'pre-wrap' }}>{detail.reason}</Text>
      {detail.decision && <><Title order={6}>Última decisión</Title><Text>{detail.decision.status === 'revoked' ? 'Revocada' : statusLabels[detail.decision.status]}</Text><Text style={{ whiteSpace: 'pre-wrap' }}>{detail.decision.reason || 'Sin fundamento registrado en el flujo histórico.'}</Text><Text size="sm">Desde {new Date(detail.decision.effectiveAt).toLocaleString('es-CL')}{detail.decision.expiresAt && ` · Hasta ${new Date(detail.decision.expiresAt).toLocaleString('es-CL')}`}</Text></>}
    </>}</Stack></Modal>
  </Stack>;
}

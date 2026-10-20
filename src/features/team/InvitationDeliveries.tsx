'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Badge, Button, Card, Group, Stack, Text, Title } from '@mantine/core';
import { loadTeamInvitations, queryTeamInvitationDelivery, resendTeamInvitation, resolveTeamInvitationDelivery } from './invitation.server';
import type { DeliveryReceipt, ResendInvitationCommand, TeamInvitation } from './invitation.types';

const stateText: Record<DeliveryReceipt['state'], string> = {
  pending: 'Petición registrada; aún no reclamada', claimed: 'Procesando; no repetir el envío',
  sent: 'Solicitud aceptada por Auth; no acredita recepción', failed: 'Petición finalizada sin envío confirmado',
  unknown: 'Resultado incierto; requiere revisión explícita',
};
const blocked = (d: DeliveryReceipt | null) => !!d && ['pending', 'claimed', 'unknown'].includes(d.state);

export function InvitationDeliveries({ clinicId }: { clinicId: string }) {
  const [rows, setRows] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState<Record<string, ResendInvitationCommand>>({});
  const live = useRef(false);
  const sequence = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    setLoading(true);
    try {
      const data = await loadTeamInvitations(clinicId);
      if (live.current && request === sequence.current) { setRows(data); setError(null); }
    } catch (cause) {
      if (live.current && request === sequence.current) setError(cause instanceof Error ? cause.message : 'No se pudo actualizar la lectura de invitaciones.');
    } finally { if (live.current && request === sequence.current) setLoading(false); }
  }, [clinicId]);

  useEffect(() => {
    const cleanupSequence = sequence;
    live.current = true;
    setRows([]); setUnconfirmed({}); setNotice(null); setError(null);
    void refresh();
    return () => { live.current = false; ++cleanupSequence.current; };
  }, [refresh]);
  useEffect(() => {
    if (!rows.some(row => ['pending', 'claimed'].includes(row.lastDelivery?.state ?? ''))) return;
    const timer = setTimeout(() => void refresh(), 15000);
    return () => clearTimeout(timer);
  }, [rows, refresh]);

  const acknowledge = (invitationId: string, receipt: DeliveryReceipt) => {
    setRows(current => current.map(row => row.invitationId === invitationId ? { ...row, lastDelivery: receipt } : row));
    setUnconfirmed(current => { const next = { ...current }; delete next[invitationId]; return next; });
    setNotice(receipt.state === 'sent' ? 'Auth aceptó la solicitud. Comprueba el correo en Mailpit; esto no significa que la invitación haya sido aceptada.' : stateText[receipt.state]);
  };
  const execute = async (row: TeamInvitation, command: ResendInvitationCommand) => {
    setBusy(row.invitationId); setError(null); setNotice(null);
    try {
      const receipt = await resendTeamInvitation(command);
      if (!live.current) return;
      acknowledge(row.invitationId, receipt);
      await refresh();
    } catch (cause) {
      if (live.current) setError(cause instanceof Error ? cause.message : 'No hay comprobante confirmado. Conserva la operación y consulta su estado antes de otra petición.');
    } finally { if (live.current) setBusy(null); }
  };
  const start = (row: TeamInvitation) => {
    if (blocked(row.lastDelivery) || unconfirmed[row.invitationId] || row.accepted || !row.eligible) return;
    if (!window.confirm(`¿Solicitar explícitamente otro correo de invitación para ${row.email}? Auth aceptado no significa recepción ni aceptación de la invitación.`)) return;
    const command = { clinicId, invitationId: row.invitationId, operationId: crypto.randomUUID(), idempotencyKey: crypto.randomUUID() };
    setUnconfirmed(current => ({ ...current, [row.invitationId]: command }));
    void execute(row, command);
  };
  const recover = async (row: TeamInvitation) => {
    const command = unconfirmed[row.invitationId];
    if (!command) return;
    setBusy(row.invitationId); setError(null);
    try {
      const receipt = await queryTeamInvitationDelivery(command);
      if (!live.current) return;
      if (receipt) acknowledge(row.invitationId, receipt);
      else setNotice('Esta operación aún no tiene registro visible. Puedes repetir únicamente la misma operación; no se genera otra clave.');
      await refresh();
    } catch (cause) { if (live.current) setError(cause instanceof Error ? cause.message : 'No se pudo consultar el comprobante. No repitas el envío a ciegas.'); }
    finally { if (live.current) setBusy(null); }
  };
  const resolve = async (row: TeamInvitation, decision: 'observed-sent' | 'allow-new-request') => {
    const delivery = row.lastDelivery;
    if (!delivery || delivery.state !== 'unknown') return;
    const warning = decision === 'observed-sent'
      ? '¿Comprobaste este correo concreto en Mailpit? Se registrará tu constatación, no una garantía SMTP.'
      : 'El correo anterior podría haber sido enviado. ¿Autorizar una futura petición explícita aun con riesgo de duplicado? Esta acción no envía correo.';
    if (!window.confirm(warning)) return;
    setBusy(row.invitationId); setError(null); setNotice(null);
    try {
      const receipt = await resolveTeamInvitationDelivery({ clinicId, invitationId: row.invitationId, deliveryId: delivery.deliveryId, expectedVersion: delivery.version, decision, evidenceAck: true });
      if (!live.current) return;
      acknowledge(row.invitationId, receipt);
      setNotice(decision === 'observed-sent' ? 'Constatación en Mailpit registrada por el servidor.' : 'Riesgo de duplicado autorizado. Para enviar, debes iniciar otra petición explícita.');
      await refresh();
    } catch (cause) { if (live.current) setError(cause instanceof Error ? cause.message : 'La resolución no fue confirmada. Consulta el estado actual.'); }
    finally { if (live.current) setBusy(null); }
  };

  return <Stack gap="sm">
    <Group justify="space-between"><Title order={3}>Correos de invitación</Title><Button size="xs" variant="subtle" loading={loading} onClick={() => void refresh()}>Actualizar estado</Button></Group>
    <Text size="sm" c="dimmed">El estado de membresía, la solicitud de correo y la aceptación del usuario son hechos distintos. No se cambia la contraseña de terceros.</Text>
    {error && <Alert color="red" withCloseButton onClose={() => setError(null)}>{error}</Alert>}{notice && <Alert color="blue">{notice}</Alert>}
    {!loading && !rows.length && <Text c="dimmed">No hay invitaciones canónicas completadas en esta clínica.</Text>}
    {rows.map(row => {
      const delivery = row.lastDelivery; const pending = unconfirmed[row.invitationId]; const rowBusy = busy === row.invitationId;
      return <Card key={row.invitationId} withBorder radius="md"><Stack gap="xs">
        <Group justify="space-between"><Text fw={600}>{row.email}</Text><Badge color={row.accepted ? 'green' : 'gray'}>{row.accepted ? 'Ya aceptada; iniciar sesión' : 'Aún no aceptada'}</Badge></Group>
        {!row.eligible && <Text size="sm" c="red">La membresía o identidad cambió. No se puede reenviar esta invitación histórica.</Text>}
        {delivery && <><Text size="sm">{stateText[delivery.state]}</Text><Text size="xs" c="dimmed">Comprobante {delivery.deliveryId} · versión {delivery.version}{delivery.confirmationSource === 'operator-mailpit' ? ' · observado en Mailpit' : ''}</Text></>}
        {delivery?.errorCode === 'operator-authorized-possible-duplicate' && <Alert color="yellow">Una nueva petición podría duplicar el correo anterior.</Alert>}
        {delivery?.errorCode === 'reservation-expired' && <Text size="sm">La reserva caducó sin reclamar: no hubo intento de correo autorizado. Puedes iniciar otra petición explícita.</Text>}
        {pending && <Alert color="yellow">Petición sin comprobante reconciliado. Se conservan sus identificadores; consulta antes de iniciar otra.</Alert>}
        <Group>
          <Button size="xs" disabled={!!busy || !!pending || blocked(delivery) || row.accepted || !row.eligible} onClick={() => start(row)}>Solicitar reenvío explícito</Button>
          {pending && <><Button size="xs" variant="light" loading={rowBusy} disabled={!!busy && !rowBusy} onClick={() => void recover(row)}>Consultar mi operación</Button><Button size="xs" variant="subtle" disabled={!!busy || row.accepted || !row.eligible} onClick={() => void execute(row, pending)}>Reintentar misma operación</Button></>}
          {delivery?.state === 'unknown' && row.eligible && <><Button size="xs" variant="light" loading={rowBusy} disabled={!!busy && !rowBusy} onClick={() => void resolve(row, 'observed-sent')}>Comprobé el correo en Mailpit</Button><Button size="xs" color="orange" variant="light" disabled={!!busy} onClick={() => void resolve(row, 'allow-new-request')}>Autorizar otra petición: posible duplicado</Button></>}
        </Group>
      </Stack></Card>;
    })}
  </Stack>;
}

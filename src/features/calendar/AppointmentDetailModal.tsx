'use client';

import { Badge, Box, Button, Group, Modal, Stack, Text, Title } from '@mantine/core';
import { wallTime } from '@/modules/calendar/local-time';
import type { CalendarAppointmentDto, CalendarPageData } from '@/modules/calendar/contracts';
import { WEEKDAYS, colorForStudent, longDate, parseDate } from './grid';

export type DetailAction = 'edit' | 'reschedule' | 'cancel' | 'link-session';

export interface AppointmentDetailModalProps {
  appointment: CalendarAppointmentDto | null;
  data: CalendarPageData | null;
  timeZone: string;
  onClose: () => void;
  onAction: (action: DetailAction) => void;
}

const reminderLabel = (minutes: number) => {
  if (minutes === 0) return 'al inicio';
  if (minutes % 1440 === 0) return `${minutes / 1440} día${minutes === 1440 ? '' : 's'} antes`;
  if (minutes % 60 === 0) return `${minutes / 60} h antes`;
  return `${minutes} min antes`;
};

export function AppointmentDetailModal({ appointment, data, timeZone, onClose, onAction }: AppointmentDetailModalProps) {
  if (!appointment) return null;
  const student = data?.students.find((item) => item.id === appointment.studentId)?.displayName ?? 'Ficha autorizada';
  const color = colorForStudent(appointment.studentId);
  const cancelled = appointment.status === 'cancelled';
  const localStart = wallTime(appointment.startsAt, timeZone);
  const localEnd = wallTime(appointment.endsAt, timeZone);
  const appointmentStart = wallTime(appointment.startsAt, appointment.timeZone);
  const appointmentEnd = wallTime(appointment.endsAt, appointment.timeZone);
  const recurrence = appointment.recurrence;
  const otherZone = appointment.timeZone !== timeZone;

  return <Modal opened onClose={onClose} title="Detalle de la cita" size="md">
    <Stack gap="sm">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Title order={3} size="h4" style={{ flex: 1 }}>{appointment.title}</Title>
        <Badge variant="light" color={cancelled ? 'gray' : color}>{cancelled ? 'Cancelada' : 'Programada'}</Badge>
      </Group>
      <Text size="sm">{student}</Text>
      <Box>
        <Text size="sm" fw={600}>{longDate(localStart.slice(0, 10))}</Text>
        <Text size="sm">{localStart.slice(11, 16)} – {localEnd.slice(11, 16)} · {timeZone}</Text>
        {otherZone && <Text size="xs" c="dimmed">
          Hora original de la cita: {appointmentStart.slice(11, 16)} – {appointmentEnd.slice(11, 16)} · {appointment.timeZone}
        </Text>}
      </Box>
      {appointment.participants.length > 0 && <Box>
        <Text size="xs" c="dimmed" fw={600}>Participantes</Text>
        <Text size="sm">{appointment.participants.map((participant) => participant.label).join(', ')}</Text>
      </Box>}
      {appointment.notes && <Box>
        <Text size="xs" c="dimmed" fw={600}>Notas</Text>
        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{appointment.notes}</Text>
      </Box>}
      {recurrence && <Box>
        <Text size="xs" c="dimmed" fw={600}>Repetición</Text>
        <Text size="sm">
          Semanal · cada {recurrence.intervalWeeks === 1 ? 'semana' : `${recurrence.intervalWeeks} semanas`} ·{' '}
          {recurrence.weekdays.map((day) => WEEKDAYS[day - 1]).join(', ')} · hasta {parseDate(recurrence.until).day}/{parseDate(recurrence.until).month}/{parseDate(recurrence.until).year}
        </Text>
        {appointment.seriesId && <Text size="xs" c="dimmed">
          Ocurrencia de una serie{appointment.originalLocalDate ? ` · fecha original ${appointment.originalLocalDate}` : ''}
        </Text>}
      </Box>}
      {appointment.reminders.length > 0 && <Box>
        <Text size="xs" c="dimmed" fw={600}>Recordatorios</Text>
        <Text size="sm">{appointment.reminders.map((reminder) => `${reminderLabel(reminder.minutesBefore)} (${reminder.state})`).join(', ')}</Text>
      </Box>}
      {appointment.linkedSessionId && <Text size="sm" c="dimmed">Sesión realizada vinculada.</Text>}
      {appointment.cancellationReason && <Box>
        <Text size="xs" c="dimmed" fw={600}>Motivo de cancelación</Text>
        <Text size="sm">{appointment.cancellationReason}</Text>
      </Box>}
      <Group justify="flex-end" gap="xs" mt="sm" wrap="wrap">
        <Button variant="default" onClick={onClose}>Cerrar</Button>
        {!cancelled && <>
          <Button variant="light" onClick={() => onAction('link-session')}>Vincular sesión</Button>
          <Button variant="light" onClick={() => onAction('reschedule')}>Reprogramar</Button>
          <Button onClick={() => onAction('edit')}>Editar</Button>
          <Button color="red" variant="subtle" onClick={() => onAction('cancel')}>Cancelar cita</Button>
        </>}
      </Group>
    </Stack>
  </Modal>;
}

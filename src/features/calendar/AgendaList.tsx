'use client';

import { Alert, Badge, Box, Group, Stack, Text, UnstyledButton } from '@mantine/core';
import { CalendarDays } from 'lucide-react';
import { wallTime } from '@/modules/calendar/local-time';
import type { CalendarAppointmentDto, CalendarPageData } from '@/modules/calendar/contracts';
import { colorForStudent, longDate } from './grid';

export interface AgendaListProps {
  timeZone: string;
  data: CalendarPageData;
  appointments: readonly CalendarAppointmentDto[];
  onSelect: (appointment: CalendarAppointmentDto) => void;
}

export function AgendaList({ timeZone, data, appointments, onSelect }: AgendaListProps) {
  if (!appointments.length) return <Alert icon={<CalendarDays size={18}/>}>No hay citas para estos filtros.</Alert>;

  const sorted = [...appointments].sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
  const groups = new Map<string, CalendarAppointmentDto[]>();
  for (const appointment of sorted) {
    const day = wallTime(appointment.startsAt, timeZone).slice(0, 10);
    const bucket = groups.get(day);
    if (bucket) bucket.push(appointment);
    else groups.set(day, [appointment]);
  }
  const studentLabel = (appointment: CalendarAppointmentDto) =>
    data.students.find((student) => student.id === appointment.studentId)?.displayName ?? 'Ficha autorizada';

  return <Stack gap="lg">
    {[...groups.entries()].map(([day, items]) => <Box key={day}>
      <Text size="sm" fw={700} mb={6}>{longDate(day)}</Text>
      <Stack gap={6}>
        {items.map((appointment) => {
          const color = colorForStudent(appointment.studentId);
          const cancelled = appointment.status === 'cancelled';
          return <UnstyledButton
            key={appointment.id}
            onClick={() => onSelect(appointment)}
            style={{
              width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8,
              border: '1px solid var(--mantine-color-gray-2)', background: 'var(--mantine-color-body)',
              opacity: cancelled ? 0.65 : 1,
            }}>
            <Group wrap="nowrap" align="stretch" gap="sm">
              <Box style={{ width: 4, flex: '0 0 auto', borderRadius: 2, background: cancelled ? 'var(--mantine-color-gray-5)' : `var(--mantine-color-${color}-6)` }}/>
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Group justify="space-between" gap="xs" wrap="nowrap">
                  <Text fw={600} size="sm" lineClamp={1}>{appointment.title}</Text>
                  <Badge size="xs" variant="light" color={cancelled ? 'gray' : color}>{cancelled ? 'Cancelada' : 'Programada'}</Badge>
                </Group>
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {wallTime(appointment.startsAt, timeZone).slice(11, 16)} – {wallTime(appointment.endsAt, timeZone).slice(11, 16)} · {studentLabel(appointment)}
                </Text>
                {appointment.participants.length > 0 && <Text size="xs" c="dimmed" lineClamp={1}>
                  {appointment.participants.map((participant) => participant.label).join(', ')}
                </Text>}
              </Box>
            </Group>
          </UnstyledButton>;
        })}
      </Stack>
    </Box>)}
  </Stack>;
}

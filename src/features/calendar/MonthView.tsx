'use client';

import { Box, Group, Stack, Text, UnstyledButton } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { wallTime } from '@/modules/calendar/local-time';
import type { CalendarAppointmentDto, CalendarPageData } from '@/modules/calendar/contracts';
import { WEEKDAYS, colorForStudent, isSameMonth, monthGrid, parseDate } from './grid';

export interface MonthViewProps {
  cursor: string;
  today: string;
  timeZone: string;
  data: CalendarPageData;
  appointments: readonly CalendarAppointmentDto[];
  onSelect: (appointment: CalendarAppointmentDto) => void;
  onCreateAt: (localStart: string) => void;
  onOpenDay: (date: string) => void;
}

const MAX_VISIBLE = 3;

export function MonthView({ cursor, today, timeZone, data, appointments, onSelect, onCreateAt, onOpenDay }: MonthViewProps) {
  const mobile = useMediaQuery('(max-width: 47.99em)');
  const days = monthGrid(cursor);
  const byDay = new Map<string, CalendarAppointmentDto[]>();
  for (const appointment of appointments) {
    const day = wallTime(appointment.startsAt, timeZone).slice(0, 10);
    const bucket = byDay.get(day);
    if (bucket) bucket.push(appointment);
    else byDay.set(day, [appointment]);
  }
  for (const bucket of byDay.values()) bucket.sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));

  const studentLabel = (appointment: CalendarAppointmentDto) =>
    data.students.find((student) => student.id === appointment.studentId)?.displayName ?? 'Ficha autorizada';

  return <Box style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: 10, overflow: 'hidden', background: 'var(--mantine-color-body)' }}>
    <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
      {WEEKDAYS.map((label) => <Text key={label} size="xs" fw={600} c="dimmed" ta="center" py={6}>{label}</Text>)}
    </Box>
    <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
      {days.map((day, index) => {
        const inMonth = isSameMonth(day, cursor);
        const events = byDay.get(day) ?? [];
        const isToday = day === today;
        return <Box
          key={day}
          onClick={() => mobile ? onOpenDay(day) : onCreateAt(`${day}T09:00`)}
          role="gridcell"
          aria-label={`${day}: ${events.length} citas`}
          style={{
            minHeight: mobile ? 62 : 118,
            padding: 4,
            cursor: 'copy',
            background: inMonth ? undefined : 'var(--mantine-color-gray-0)',
            borderRight: index % 7 === 6 ? undefined : '1px solid var(--mantine-color-gray-2)',
            borderBottom: index < 35 ? '1px solid var(--mantine-color-gray-2)' : undefined,
          }}>
          <Group justify="space-between" gap={4} mb={mobile ? 2 : 4} wrap="nowrap">
            <Box
              w={22} h={22}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%',
                background: isToday ? 'var(--mantine-color-blue-6)' : undefined,
                color: isToday ? 'white' : undefined,
              }}>
              <Text size="xs" fw={isToday ? 700 : 500} c={isToday ? 'white' : inMonth ? undefined : 'dimmed'}>
                {parseDate(day).day}
              </Text>
            </Box>
            {mobile && events.length > 0 && <Text size="10px" c="dimmed">{events.length}</Text>}
          </Group>
          {mobile
            ? <Group gap={3} px={2} wrap="nowrap" style={{ overflow: 'hidden' }}>
                {events.slice(0, 4).map((appointment) => <Box
                  key={appointment.id}
                  w={6} h={6}
                  style={{ borderRadius: '50%', flex: '0 0 auto', background: `var(--mantine-color-${colorForStudent(appointment.studentId)}-6)` }}
                />)}
              </Group>
            : <Stack gap={2}>
                {events.slice(0, MAX_VISIBLE).map((appointment) => {
                  const color = colorForStudent(appointment.studentId);
                  const time = wallTime(appointment.startsAt, timeZone).slice(11, 16);
                  return <UnstyledButton
                    key={appointment.id}
                    onClick={(event) => { event.stopPropagation(); onSelect(appointment); }}
                    title={`${time} · ${appointment.title} · ${studentLabel(appointment)}`}
                    style={{
                      display: 'block', width: '100%', padding: '1px 4px', borderRadius: 4, textAlign: 'left',
                      background: `var(--mantine-color-${color}-1)`,
                      color: `var(--mantine-color-${color}-9)`,
                      borderLeft: `3px solid var(--mantine-color-${color}-6)`,
                      overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                      fontSize: 11, lineHeight: '16px',
                    }}>
                    <Text span size="11px" fw={600}>{time}</Text> <Text span size="11px">{appointment.title}</Text>
                  </UnstyledButton>;
                })}
                {events.length > MAX_VISIBLE && <UnstyledButton
                  onClick={(event) => { event.stopPropagation(); onOpenDay(day); }}
                  style={{ fontSize: 11, fontWeight: 600, color: 'var(--mantine-color-blue-7)', textAlign: 'left', padding: '0 4px' }}>
                  +{events.length - MAX_VISIBLE} más
                </UnstyledButton>}
              </Stack>}
        </Box>;
      })}
    </Box>
  </Box>;
}

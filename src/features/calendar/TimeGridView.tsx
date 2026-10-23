'use client';

import type { MouseEvent } from 'react';
import { Box, Text, UnstyledButton } from '@mantine/core';
import { wallTime } from '@/modules/calendar/local-time';
import type { CalendarAppointmentDto, CalendarPageData } from '@/modules/calendar/contracts';
import {
  WEEKDAYS, colorForStudent, formatMinutes, layoutEvents, parseDate, spanFromWall, timeBounds, wallMinutes, weekdayIndex,
} from './grid';

export interface TimeGridViewProps {
  days: string[];
  today: string;
  timeZone: string;
  data: CalendarPageData;
  appointments: readonly CalendarAppointmentDto[];
  onSelect: (appointment: CalendarAppointmentDto) => void;
  onCreateAt: (localStart: string) => void;
}

const ROW_HEIGHT = 48;

export function TimeGridView({ days, today, timeZone, data, appointments, onSelect, onCreateAt }: TimeGridViewProps) {
  const wallEvents = appointments.map((appointment) => ({
    appointment,
    start: wallTime(appointment.startsAt, timeZone),
    end: wallTime(appointment.endsAt, timeZone),
  }));
  const perDay = days.map((day) => ({
    day,
    events: wallEvents.flatMap(({ appointment, start, end }) => {
      const span = spanFromWall(start, end, day);
      return span ? [{ appointment, span }] : [];
    }),
  }));
  const bounds = timeBounds(perDay.flatMap(({ events }) => events.map(({ span }) => span)));
  const totalHeight = (bounds.endHour - bounds.startHour) * ROW_HEIGHT;
  const hours = Array.from({ length: bounds.endHour - bounds.startHour + 1 }, (_, index) => bounds.startHour + index);
  const nowWall = wallTime(new Date().toISOString(), timeZone);
  const nowMinutes = wallMinutes(nowWall);
  const columns = `56px repeat(${days.length}, minmax(0, 1fr))`;

  const createAt = (event: MouseEvent<HTMLDivElement>, day: string) => {
    if ((event.target as HTMLElement).closest('[data-appointment]')) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const raw = bounds.startHour * 60 + ((event.clientY - rect.top) / ROW_HEIGHT) * 60;
    const snapped = Math.max(bounds.startHour * 60, Math.min(bounds.endHour * 60 - 15, Math.round(raw / 15) * 15));
    onCreateAt(`${day}T${formatMinutes(snapped)}`);
  };

  const studentLabel = (appointment: CalendarAppointmentDto) =>
    data.students.find((student) => student.id === appointment.studentId)?.displayName ?? 'Ficha autorizada';

  return <Box style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: 10, overflow: 'hidden', background: 'var(--mantine-color-body)' }}>
    <Box style={{ overflow: 'auto', maxHeight: '72vh' }}>
      <Box style={{ minWidth: days.length > 1 ? 760 : undefined }}>
        <Box style={{ display: 'grid', gridTemplateColumns: columns, position: 'sticky', top: 0, zIndex: 2, background: 'var(--mantine-color-body)', borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
          <Box />
          {days.map((day) => <Box key={day} py={6} ta="center" style={{ borderLeft: '1px solid var(--mantine-color-gray-2)' }}>
            <Text size="xs" c="dimmed">{WEEKDAYS[weekdayIndex(day)]}</Text>
            <Box
              mx="auto" w={26} h={26}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%',
                background: day === today ? 'var(--mantine-color-blue-6)' : undefined,
              }}>
              <Text size="sm" fw={day === today ? 700 : 500} c={day === today ? 'white' : undefined}>{parseDate(day).day}</Text>
            </Box>
          </Box>)}
        </Box>
        <Box style={{ display: 'grid', gridTemplateColumns: columns }}>
          <Box style={{ position: 'relative', height: totalHeight }}>
            {hours.map((hour) => <Text
              key={hour}
              size="10px" c="dimmed"
              style={{ position: 'absolute', top: Math.max(0, (hour - bounds.startHour) * ROW_HEIGHT - 7), right: 6 }}>
              {formatMinutes(hour * 60)}
            </Text>)}
          </Box>
          {perDay.map(({ day, events }) => {
            const slots = layoutEvents(
              events.map(({ appointment, span }) => ({ id: appointment.id, startMin: span.startMin, endMin: span.endMin })),
              bounds.startHour,
              ROW_HEIGHT,
            );
            return <Box
              key={day}
              onClick={(event) => createAt(event, day)}
              style={{
                position: 'relative', height: totalHeight, cursor: 'copy',
                borderLeft: '1px solid var(--mantine-color-gray-2)',
                background: day === today ? 'var(--mantine-color-blue-0)' : undefined,
              }}>
              {hours.slice(0, -1).map((hour) => <Box key={hour} style={{
                position: 'absolute', top: (hour - bounds.startHour) * ROW_HEIGHT, left: 0, right: 0,
                borderTop: '1px solid var(--mantine-color-gray-2)',
              }}/>)}
              {ROW_HEIGHT >= 40 && hours.slice(0, -1).map((hour) => <Box key={`half-${hour}`} style={{
                position: 'absolute', top: (hour - bounds.startHour) * ROW_HEIGHT + ROW_HEIGHT / 2, left: 0, right: 0,
                borderTop: '1px dashed var(--mantine-color-gray-1)',
              }}/>)}
              {day === today && nowMinutes >= bounds.startHour * 60 && nowMinutes <= bounds.endHour * 60 && <Box style={{
                position: 'absolute', top: ((nowMinutes - bounds.startHour * 60) / 60) * ROW_HEIGHT,
                left: 0, right: 0, height: 2, background: 'var(--mantine-color-red-6)', zIndex: 1,
              }}><Box w={8} h={8} style={{ borderRadius: '50%', background: 'var(--mantine-color-red-6)', marginTop: -3, marginLeft: -4 }}/></Box>}
              {events.map(({ appointment }) => {
                const slot = slots.find((candidate) => candidate.id === appointment.id);
                if (!slot) return null;
                const color = colorForStudent(appointment.studentId);
                return <UnstyledButton
                  key={appointment.id}
                  data-appointment
                  onClick={(event) => { event.stopPropagation(); onSelect(appointment); }}
                  title={`${wallTime(appointment.startsAt, timeZone).slice(11, 16)} · ${appointment.title} · ${studentLabel(appointment)}`}
                  style={{
                    position: 'absolute', top: slot.top, left: `calc(${slot.left}% + 2px)`, width: `calc(${slot.width}% - 4px)`,
                    height: slot.height, textAlign: 'left', padding: '2px 4px', borderRadius: 4, zIndex: 1,
                    background: `var(--mantine-color-${color}-1)`,
                    color: `var(--mantine-color-${color}-9)`,
                    borderLeft: `3px solid var(--mantine-color-${color}-6)`,
                    overflow: 'hidden',
                  }}>
                  <Text size="11px" fw={600} lineClamp={1} style={{ lineHeight: '14px' }}>{appointment.title}</Text>
                  {slot.height >= 34 && <Text size="10px" lineClamp={1} style={{ lineHeight: '13px' }}>
                    {wallTime(appointment.startsAt, timeZone).slice(11, 16)} · {studentLabel(appointment)}
                  </Text>}
                </UnstyledButton>;
              })}
            </Box>;
          })}
        </Box>
      </Box>
    </Box>
  </Box>;
}

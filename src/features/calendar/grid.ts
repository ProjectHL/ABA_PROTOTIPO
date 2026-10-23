import { wallTime } from '@/modules/calendar/local-time';

export type CalendarView = 'day' | 'week' | 'month' | 'list';

export const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const PALETTE = ['blue', 'green', 'orange', 'violet', 'teal', 'pink', 'indigo', 'red', 'cyan', 'grape', 'lime', 'yellow'];

const pad = (value: number) => String(value).padStart(2, '0');

export interface DaySpan {
  startMin: number;
  endMin: number;
}

export function parseDate(value: string): { year: number; month: number; day: number } {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return { year, month, day };
}

export function dateKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function addDays(date: string, days: number): string {
  const { year, month, day } = parseDate(date);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function addMonths(date: string, months: number): string {
  const { year, month, day } = parseDate(date);
  const first = new Date(Date.UTC(year, month - 1 + months, 1));
  const daysInMonth = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return dateKey(first.getUTCFullYear(), first.getUTCMonth() + 1, Math.min(day, daysInMonth));
}

export function startOfWeek(date: string): string {
  const { year, month, day } = parseDate(date);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return addDays(date, -((weekday + 6) % 7));
}

export function monthGrid(date: string): string[] {
  const { year, month } = parseDate(date);
  const start = startOfWeek(dateKey(year, month, 1));
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

export function weekGrid(date: string): string[] {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function weekdayIndex(date: string): number {
  const { year, month, day } = parseDate(date);
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
}

export function isSameMonth(left: string, right: string): boolean {
  return left.slice(0, 7) === right.slice(0, 7);
}

export function todayInZone(timeZone: string): string {
  return wallTime(new Date().toISOString(), timeZone).slice(0, 10);
}

export function shiftCursor(view: CalendarView, cursor: string, direction: number): string {
  if (view === 'day') return addDays(cursor, direction);
  if (view === 'week') return addDays(cursor, direction * 7);
  return addMonths(cursor, direction);
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

function dateLabel(date: string, options: Intl.DateTimeFormatOptions): string {
  const { year, month, day } = parseDate(date);
  return new Intl.DateTimeFormat('es-CL', { ...options, timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export function longDate(date: string): string {
  return capitalize(dateLabel(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(/,/g, ''));
}

export function monthTitle(date: string): string {
  return capitalize(dateLabel(date, { month: 'long', year: 'numeric' }));
}

export function weekTitle(date: string): string {
  const start = startOfWeek(date);
  const end = addDays(start, 6);
  if (isSameMonth(start, end)) {
    return capitalize(`${parseDate(start).day} – ${parseDate(end).day} de ${dateLabel(start, { month: 'long' })} de ${parseDate(start).year}`);
  }
  return capitalize(`${parseDate(start).day} de ${dateLabel(start, { month: 'long' })} – ${parseDate(end).day} de ${dateLabel(end, { month: 'long' })} de ${parseDate(end).year}`);
}

export function periodTitle(view: CalendarView, cursor: string): string {
  if (view === 'day') return longDate(cursor);
  if (view === 'week') return weekTitle(cursor);
  if (view === 'month') return monthTitle(cursor);
  return 'Todas las citas';
}

export function addMinutesToWall(local: string, minutes: number): string {
  const [date, time] = local.split('T');
  const [hour, minute] = time.split(':').map(Number);
  const total = hour * 60 + minute + minutes;
  const dayOffset = Math.floor(total / 1440);
  const rest = ((total % 1440) + 1440) % 1440;
  return `${addDays(date, dayOffset)}T${pad(Math.floor(rest / 60))}:${pad(rest % 60)}`;
}

export function wallMinutes(local: string): number {
  const [hour, minute] = local.slice(11, 16).split(':').map(Number);
  return hour * 60 + minute;
}

export function formatMinutes(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/** Events are placed in the clinic calendar zone so their vertical position matches the hour axis. */
export function spanFromWall(start: string, end: string, date: string): DaySpan | null {
  const dayStart = `${date}T00:00`;
  if (end <= dayStart || start.slice(0, 10) > date) return null;
  const startMin = start.slice(0, 10) < date ? 0 : wallMinutes(start);
  const endMin = end.slice(0, 10) > date ? 1440 : wallMinutes(end);
  if (endMin <= startMin) return null;
  return { startMin, endMin };
}

export function eventSpan(startsAt: string, endsAt: string, date: string, timeZone: string): DaySpan | null {
  return spanFromWall(wallTime(startsAt, timeZone), wallTime(endsAt, timeZone), date);
}

export function colorForStudent(studentId: string): string {
  let hash = 0;
  for (let index = 0; index < studentId.length; index++) hash = (hash * 31 + studentId.charCodeAt(index)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export interface LayoutInput {
  id: string;
  startMin: number;
  endMin: number;
}

export interface LayoutSlot {
  id: string;
  top: number;
  height: number;
  left: number;
  width: number;
}

/** Greedy column layout for overlapping events, grouped by connected overlap. */
export function layoutEvents(
  items: readonly LayoutInput[],
  startHour: number,
  rowHeight: number,
  minimumHeight = 22,
): LayoutSlot[] {
  const sorted = [...items].sort((left, right) => left.startMin - right.startMin || left.endMin - right.endMin);
  const slots: LayoutSlot[] = [];
  let cluster: LayoutInput[] = [];
  let clusterEnd = -1;

  const flush = () => {
    if (!cluster.length) return;
    const columns: number[] = [];
    const assigned = new Map<string, number>();
    for (const item of cluster) {
      let column = columns.findIndex((end) => end <= item.startMin);
      if (column === -1) {
        column = columns.length;
        columns.push(item.endMin);
      } else {
        columns[column] = item.endMin;
      }
      assigned.set(item.id, column);
    }
    const width = 100 / columns.length;
    for (const item of cluster) {
      const column = assigned.get(item.id) ?? 0;
      slots.push({
        id: item.id,
        top: ((item.startMin - startHour * 60) / 60) * rowHeight,
        height: Math.max(minimumHeight, ((item.endMin - item.startMin) / 60) * rowHeight - 2),
        left: column * width,
        width,
      });
    }
    cluster = [];
    clusterEnd = -1;
  };

  for (const item of sorted) {
    if (cluster.length && item.startMin >= clusterEnd) flush();
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.endMin);
  }
  flush();
  return slots;
}

export function timeBounds(spans: readonly DaySpan[], defaultStart = 7, defaultEnd = 21): { startHour: number; endHour: number } {
  if (!spans.length) return { startHour: defaultStart, endHour: defaultEnd };
  const earliest = Math.min(...spans.map((span) => span.startMin));
  const latest = Math.max(...spans.map((span) => span.endMin));
  return {
    startHour: Math.max(0, Math.min(defaultStart, Math.floor(earliest / 60))),
    endHour: Math.min(24, Math.max(defaultEnd, Math.ceil(latest / 60))),
  };
}

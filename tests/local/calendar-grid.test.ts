import { describe, expect, it } from 'vitest';
import {
  addDays, addMinutesToWall, addMonths, colorForStudent, eventSpan, formatMinutes, layoutEvents,
  longDate, monthGrid, monthTitle, shiftCursor, startOfWeek, timeBounds, weekGrid, weekTitle,
} from '../../src/features/calendar/grid';

describe('Agenda: grilla de calendario', () => {
  it('alinea la semana en lunes y arma 42 celdas mensuales', () => {
    expect(startOfWeek('2026-10-22')).toBe('2026-10-19');
    const grid = monthGrid('2026-10-15');
    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe('2026-09-28');
    expect(grid[41]).toBe('2026-11-08');
    expect(weekGrid('2026-10-22')).toEqual([
      '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25',
    ]);
  });

  it('avanza días y meses sin depender de la zona del navegador', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-10-22', -1)).toBe('2026-09-22');
    expect(shiftCursor('week', '2026-10-22', 1)).toBe('2026-10-29');
    expect(shiftCursor('day', '2026-10-22', -1)).toBe('2026-10-21');
  });

  it('suma minutos sobre hora local y cruza medianoche', () => {
    expect(addMinutesToWall('2026-10-22T09:00', 60)).toBe('2026-10-22T10:00');
    expect(addMinutesToWall('2026-10-22T23:45', 60)).toBe('2026-10-23T00:45');
    expect(formatMinutes(1380)).toBe('23:00');
  });

  it('recorta una cita al día visible y respeta la zona de la clínica', () => {
    // 13:00Z y 14:00Z son 10:00 y 11:00 en America/Santiago (UTC-3).
    expect(eventSpan('2026-10-12T13:00:00.000Z', '2026-10-12T14:00:00.000Z', '2026-10-12', 'America/Santiago'))
      .toEqual({ startMin: 600, endMin: 660 });
    expect(eventSpan('2026-10-12T13:00:00.000Z', '2026-10-12T14:00:00.000Z', '2026-10-13', 'America/Santiago'))
      .toBeNull();
    // 23:00 local del 12 al 00:00 del 13.
    expect(eventSpan('2026-10-13T02:00:00.000Z', '2026-10-13T03:00:00.000Z', '2026-10-12', 'America/Santiago'))
      .toEqual({ startMin: 1380, endMin: 1440 });
    expect(eventSpan('2026-10-13T02:00:00.000Z', '2026-10-13T03:00:00.000Z', '2026-10-13', 'America/Santiago'))
      .toBeNull();
  });

  it('reparte solapamientos en columnas y conecta sólo el grupo que se toca', () => {
    const slots = layoutEvents([
      { id: 'a', startMin: 540, endMin: 600 },
      { id: 'b', startMin: 570, endMin: 630 },
      { id: 'c', startMin: 660, endMin: 720 },
    ], 7, 48);
    const a = slots.find((slot) => slot.id === 'a')!;
    const b = slots.find((slot) => slot.id === 'b')!;
    const c = slots.find((slot) => slot.id === 'c')!;
    expect(a.width).toBe(50);
    expect(a.left).toBe(0);
    expect(b.width).toBe(50);
    expect(b.left).toBe(50);
    expect(c.left).toBe(0);
    expect(c.width).toBe(100);
    expect(a.top).toBe(2 * 48);
    expect(a.height).toBe(46);
  });

  it('amplía el eje horario cuando hay citas fuera del rango por defecto', () => {
    expect(timeBounds([])).toEqual({ startHour: 7, endHour: 21 });
    expect(timeBounds([{ startMin: 420, endMin: 1380 }])).toEqual({ startHour: 7, endHour: 23 });
    expect(timeBounds([{ startMin: 300, endMin: 600 }])).toEqual({ startHour: 5, endHour: 21 });
  });

  it('asigna un color estable por estudiante', () => {
    expect(colorForStudent('00000000-0000-4000-8000-000000000001')).toBe(colorForStudent('00000000-0000-4000-8000-000000000001'));
    expect(colorForStudent('00000000-0000-4000-8000-000000000001')).toMatch(/^[a-z]+$/);
  });

  it('rotula el período en español', () => {
    expect(monthTitle('2026-10-15')).toBe('Octubre de 2026');
    expect(weekTitle('2026-10-22')).toBe('19 – 25 de octubre de 2026');
    expect(weekTitle('2026-11-01')).toBe('26 de octubre – 1 de noviembre de 2026');
    expect(longDate('2026-10-22')).toBe('Jueves 22 de octubre de 2026');
  });
});

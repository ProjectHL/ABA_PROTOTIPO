import { describe, expect, it } from 'vitest';
import { resolveWallTime, wallTime } from '../../src/modules/calendar/local-time.ts';

describe('Agenda: horas locales America/Santiago', () => {
  it('conserva la hora local habitual y su instante UTC', () => {
    const instant = resolveWallTime('2026-10-12T10:00', 'America/Santiago', 'reject');
    expect(instant).toBe('2026-10-12T13:00:00.000Z');
    expect(wallTime(instant, 'America/Santiago')).toBe('2026-10-12T10:00');
  });

  it('rechaza la hora inexistente al adelantar el reloj', () => {
    expect(() => resolveWallTime('2026-09-06T00:30', 'America/Santiago', 'reject'))
      .toThrow('Esta hora no existe por el cambio horario. Elige otra hora.');
  });

  it('exige resolver la hora repetida y diferencia ambas ocurrencias', () => {
    expect(() => resolveWallTime('2026-04-04T23:30', 'America/Santiago', 'reject'))
      .toThrow('Esta hora ocurre dos veces. Selecciona la primera o la última.');
    expect(resolveWallTime('2026-04-04T23:30', 'America/Santiago', 'earlier'))
      .toBe('2026-04-05T02:30:00.000Z');
    expect(resolveWallTime('2026-04-04T23:30', 'America/Santiago', 'later'))
      .toBe('2026-04-05T03:30:00.000Z');
  });
});

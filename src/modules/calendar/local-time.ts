/** Wall time is interpreted in the selected zone, never in the browser's zone. */
export function wallTime(instant: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit',
    day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(instant));
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}
export function resolveWallTime(local: string, timeZone: string, ambiguity: 'earlier' | 'later' | 'reject'): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) throw new Error('Completa fecha y hora.');
  const anchor = Date.parse(local + ':00Z');
  if (!Number.isFinite(anchor) || new Date(anchor).toISOString().slice(0,16) !== local) throw new Error('Fecha no válida.');
  const offsets = new Set<number>();
  for (let hour = -72; hour <= 72; hour++) {
    const probe = anchor + hour * 3600000;
    offsets.add(Date.parse(wallTime(new Date(probe).toISOString(), timeZone) + ':00Z') - probe);
  }
  const candidates = [...offsets].map(offset => anchor - offset)
    .filter(value => wallTime(new Date(value).toISOString(), timeZone) === local).sort((a,b) => a-b);
  if (!candidates.length) throw new Error('Esta hora no existe por el cambio horario. Elige otra hora.');
  if (candidates.length > 1 && ambiguity === 'reject') throw new Error('Esta hora ocurre dos veces. Selecciona la primera o la última.');
  return new Date(ambiguity === 'later' ? candidates[candidates.length-1] : candidates[0]).toISOString();
}

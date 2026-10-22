const wallFormatter = new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' });

/** Renders a wall time (`YYYY-MM-DDTHH:mm`) without shifting it to another zone. */
export function formatWallTime(wall: string): string {
  const parsed = Date.parse(`${wall.slice(0, 16)}:00Z`);
  return Number.isFinite(parsed) ? wallFormatter.format(parsed) : wall;
}

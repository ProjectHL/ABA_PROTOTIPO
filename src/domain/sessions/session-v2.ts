import { z } from 'zod';

const timestamp = z.iso.datetime({ offset: true });
export const sessionEventV2Schema = z.object({
  id: z.uuid(), sequence: z.number().int().positive(), occurredAt: timestamp,
  type: z.enum(['started', 'paused', 'resumed', 'finished', 'cancelled']),
  actorId: z.uuid(), notes: z.string().max(10000),
}).strict();
export type SessionEventV2 = z.infer<typeof sessionEventV2Schema>;
export type SessionStatusV2 = 'draft' | 'active' | 'paused' | 'finished' | 'cancelled';

const sessionSnapshot = z.object({
  schemaVersion: z.literal(2), id: z.uuid(), studentId: z.uuid(), clinicId: z.uuid(),
  version: z.number().int().nonnegative(), capturedAt: timestamp, notes: z.string().max(10000),
  programs: z.array(z.object({ programId: z.uuid(), programVersionId: z.uuid() }).strict()).max(1000),
  events: z.array(sessionEventV2Schema).max(10000),
}).strict();

function timeline(events: SessionEventV2[], capturedAt: string) {
  let status: SessionStatusV2 = 'draft';
  let activeStart: string | null = null;
  let activeSeconds = 0;
  let previousTime = -Infinity;
  const ids = new Set<string>();
  const activeWindows: { startedAt: string; endedAt: string | null }[] = [];
  const captured = Date.parse(capturedAt);
  for (let index = 0; index < events.length; index++) {
    const event = events[index];
    const time = Date.parse(event.occurredAt);
    if (ids.has(event.id)) throw new Error('Evento de sesión repetido');
    ids.add(event.id);
    if (event.sequence !== index + 1) throw new Error('Secuencia de sesión no contigua');
    if (time < previousTime || time > captured) throw new Error('Tiempo de evento fuera de secuencia/captura');
    previousTime = time;
    if (event.type === 'started') {
      if (status !== 'draft') throw new Error('La sesión ya fue iniciada');
      status = 'active'; activeStart = event.occurredAt;
    } else if (event.type === 'resumed') {
      if (status !== 'paused') throw new Error('Solo se reanuda una sesión pausada');
      status = 'active'; activeStart = event.occurredAt;
    } else {
      if (status !== 'active' && status !== 'paused') throw new Error('La sesión no admite esta transición');
      if (event.type === 'paused' && status !== 'active') throw new Error('La sesión ya está pausada');
      if (activeStart !== null) {
        activeSeconds += (time - Date.parse(activeStart)) / 1000;
        activeWindows.push({ startedAt: activeStart, endedAt: event.occurredAt });
        activeStart = null;
      }
      status = event.type === 'paused' ? 'paused' : event.type === 'finished' ? 'finished' : 'cancelled';
    }
  }
  if (activeStart !== null) {
    activeSeconds += (captured - Date.parse(activeStart)) / 1000;
    activeWindows.push({ startedAt: activeStart, endedAt: null });
  }
  return { status, activeSeconds, activeWindows };
}

export const sessionV2Schema = sessionSnapshot.superRefine((session, ctx) => {
  try { timeline(session.events, session.capturedAt); }
  catch (error) { ctx.addIssue({ code: 'custom', path: ['events'], message: error instanceof Error ? error.message : 'Timeline inválido' }); }
  const programIds = session.programs.map((program) => program.programId);
  if (new Set(programIds).size !== programIds.length) ctx.addIssue({ code: 'custom', path: ['programs'], message: 'Programa duplicado en sesión' });
});
export type SessionV2 = z.infer<typeof sessionV2Schema>;

/** Deterministic: the caller supplies capturedAt; pauses never add active time. */
export function sessionV2Timeline(raw: SessionV2) {
  const session = sessionV2Schema.parse(raw);
  return timeline(session.events, session.capturedAt);
}

export const sessionCommandV2Schema = z.object({
  schemaVersion: z.literal(2), operationId: z.uuid(), idempotencyKey: z.uuid(),
  studentId: z.uuid(), sessionId: z.uuid(), expectedVersion: z.number().int().nonnegative(),
  action: z.enum(['start', 'pause', 'resume', 'finish', 'cancel', 'update-notes', 'select-programs']),
  occurredAt: timestamp, notes: z.string().max(10000),
  programs: z.array(z.object({ programId: z.uuid(), programVersionId: z.uuid() }).strict()).max(1000),
  terminalConfirmation: z.boolean(),
}).strict().superRefine((command, ctx) => {
  if ((command.action === 'finish' || command.action === 'cancel') && !command.terminalConfirmation) {
    ctx.addIssue({ code: 'custom', path: ['terminalConfirmation'], message: 'El cierre/cancelación requiere confirmación explícita' });
  }
});
export type SessionCommandV2 = z.infer<typeof sessionCommandV2Schema>;

export const archiveSessionCommandV2Schema = z.object({
  schemaVersion: z.literal(2), operationId: z.uuid(), idempotencyKey: z.uuid(),
  studentId: z.uuid(), sessionId: z.uuid(), expectedVersion: z.number().int().positive(),
  reason: z.string().trim().min(1).max(2000),
}).strict();
export type ArchiveSessionCommandV2 = z.infer<typeof archiveSessionCommandV2Schema>;

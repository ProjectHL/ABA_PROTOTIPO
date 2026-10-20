import { z } from 'zod';

const instant = z.iso.datetime({ offset: true });
const date = z.iso.date();
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora local HH:mm');
const timezone = z.string().min(1).max(100).refine((value) => {
  try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; }
  catch { return false; }
}, 'Zona horaria no reconocida');
const participant = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('professional'), userId: z.uuid() }).strict(),
  z.object({ kind: z.literal('family'), personId: z.uuid() }).strict(),
]);

// Weekly recurrence uses wall-clock dates/time, not UTC + 7*24 hours across DST.
// The authorized adapter must resolve ambiguous/nonexistent times explicitly.
export const weeklyRecurrenceSchema = z.object({
  frequency: z.literal('weekly'), intervalWeeks: z.number().int().min(1).max(52),
  weekdays: z.array(z.number().int().min(1).max(7)).min(1).max(7), // ISO Monday=1
  startsOn: date, until: date, localTime: time, timeZone: timezone,
  ambiguousTimePolicy: z.enum(['earlier', 'later', 'reject']),
  nonexistentTimePolicy: z.literal('reject'),
}).strict().superRefine((rule, ctx) => {
  if (rule.until < rule.startsOn) ctx.addIssue({ code: 'custom', path: ['until'], message: 'Fin anterior al inicio' });
  if (new Set(rule.weekdays).size !== rule.weekdays.length) ctx.addIssue({ code: 'custom', path: ['weekdays'], message: 'Días repetidos' });
});

export const appointmentInputSchema = z.object({
  studentId: z.uuid(), title: z.string().trim().min(1).max(300), notes: z.string().max(10000),
  startsAt: instant, endsAt: instant, timeZone: timezone,
  participants: z.array(participant).min(1).max(100),
  reminderMinutesBefore: z.array(z.number().int().min(0).max(43200)).max(10),
  recurrence: weeklyRecurrenceSchema.nullable(),
}).strict().superRefine((input, ctx) => {
  if (Date.parse(input.endsAt) <= Date.parse(input.startsAt)) ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'Fin debe ser posterior al inicio' });
  const ids = input.participants.map((p) => p.kind === 'professional' ? `professional:${p.userId}` : `family:${p.personId}`);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', path: ['participants'], message: 'Participante repetido' });
  if (new Set(input.reminderMinutesBefore).size !== input.reminderMinutesBefore.length) ctx.addIssue({ code: 'custom', path: ['reminderMinutesBefore'], message: 'Recordatorio repetido' });
  if (input.recurrence && input.recurrence.timeZone !== input.timeZone) ctx.addIssue({ code: 'custom', path: ['recurrence', 'timeZone'], message: 'Serie y cita deben usar la misma zona' });
});
export type AppointmentInput = z.infer<typeof appointmentInputSchema>;

const commandBase = {
  schemaVersion: z.literal(2), operationId: z.uuid(), idempotencyKey: z.uuid(),
  appointmentId: z.uuid(), studentId: z.uuid(), expectedVersion: z.number().int().nonnegative(),
};
const editScope = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('single') }).strict(),
  z.object({ kind: z.literal('occurrence'), seriesId: z.uuid(), originalLocalDate: date }).strict(),
  z.object({ kind: z.literal('series'), seriesId: z.uuid(), expectedSeriesVersion: z.number().int().positive() }).strict(),
]);
export const appointmentCommandSchema = z.discriminatedUnion('action', [
  z.object({ ...commandBase, action: z.literal('create'), input: appointmentInputSchema }).strict(),
  z.object({ ...commandBase, action: z.enum(['edit', 'reschedule']), scope: editScope, input: appointmentInputSchema }).strict(),
  z.object({ ...commandBase, action: z.literal('cancel'), scope: editScope, reason: z.string().trim().min(1).max(10000), confirmation: z.literal(true) }).strict(),
  z.object({ ...commandBase, action: z.literal('link-session'), sessionId: z.uuid() }).strict(),
]).superRefine((command, ctx) => {
  if (command.action === 'create' ? command.expectedVersion !== 0 : command.expectedVersion === 0) ctx.addIssue({ code: 'custom', path: ['expectedVersion'], message: 'Alta requiere versión0; cambios requieren versión persistida' });
  if ('input' in command && command.input.studentId !== command.studentId) ctx.addIssue({ code: 'custom', path: ['input', 'studentId'], message: 'La cita no puede cambiar de estudiante' });
});
export type AppointmentCommand = z.infer<typeof appointmentCommandSchema>;

// No client permission check here grants access. Repository implementations must
// reuse student capabilities and verify participants/session against the same resource.
// Reminder delivery needs durable receipts; a recurrence schema is not a scheduler.

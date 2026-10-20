import { z } from 'zod';
import { appointmentCommandSchema, appointmentInputSchema, weeklyRecurrenceSchema } from '@/domain/agenda/appointment';

const iso = z.iso.datetime({ offset: true });

export const calendarProfessionalDtoSchema = z.object({ kind: z.literal('professional'), userId: z.uuid(), label: z.string().min(1).max(200) }).strict();
export const calendarFamilyDtoSchema = z.object({ kind: z.literal('family'), personId: z.uuid(), label: z.string().min(1).max(200) }).strict();
export const calendarParticipantDtoSchema = z.discriminatedUnion('kind', [calendarProfessionalDtoSchema, calendarFamilyDtoSchema]);

export const calendarReminderDtoSchema = z.object({
  id: z.uuid(), minutesBefore: z.number().int().min(0).max(43200),
  state: z.enum(['scheduled', 'sent', 'cancelled', 'failed']), dueAt: iso.nullable(),
}).strict();

export const calendarAppointmentDtoSchema = z.object({
  id: z.uuid(), clinicId: z.uuid(), studentId: z.uuid(), version: z.number().int().positive(),
  title: z.string().min(1).max(300), notes: z.string().max(10000), startsAt: iso, endsAt: iso,
  timeZone: z.string().min(1).max(100), recurrence: weeklyRecurrenceSchema.nullable(),
  seriesId: z.uuid().nullable(), seriesVersion: z.number().int().positive().nullable(),
  originalLocalDate: z.iso.date().nullable(), participants: z.array(calendarParticipantDtoSchema).max(100),
  reminders: z.array(calendarReminderDtoSchema).max(10), linkedSessionId: z.uuid().nullable(),
  status: z.enum(['scheduled', 'cancelled']), cancelledAt: iso.nullable(), cancellationReason: z.string().max(10000).nullable(),
}).strict();
export type CalendarAppointmentDto = z.infer<typeof calendarAppointmentDtoSchema>;

export const calendarStudentDtoSchema = z.object({
  id: z.uuid(), displayName: z.string().min(1).max(200), initials: z.string().min(1).max(20),
  familyParticipants: z.array(calendarFamilyDtoSchema).max(100),
}).strict();

export const calendarPageDataSchema = z.object({
  clinicId: z.uuid(), actorId: z.uuid(), timeZone: z.string().min(1).max(100),
  students: z.array(calendarStudentDtoSchema).max(10000),
  professionals: z.array(calendarProfessionalDtoSchema).max(10000),
  appointments: z.array(calendarAppointmentDtoSchema).max(100000),
}).strict();
export type CalendarPageData = z.infer<typeof calendarPageDataSchema>;

export const calendarCommandRequestSchema = z.object({ clinicId: z.uuid(), command: appointmentCommandSchema }).strict();
export type CalendarCommandRequest = z.infer<typeof calendarCommandRequestSchema>;

/** Inputs are validated at the command boundary; the authorized RPC resolves IANA wall time and rechecks every participant. */
export { appointmentInputSchema };

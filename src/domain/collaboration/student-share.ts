import { z } from 'zod';

/** Access scopes for the existing student capability engine, not a second authorization engine. */
export const studentShareLevel = z.enum(['full-read', 'program-results', 'clinical-edit']);
export type StudentShareLevel = z.infer<typeof studentShareLevel>;
export const studentShareStatus = z.enum(['pending', 'accepted', 'rejected', 'cancelled', 'revoked', 'expired']);
const email = z.string().trim().max(254).pipe(z.email()).transform((value) => value.toLowerCase());
const common = { operationId: z.uuid(), idempotencyKey: z.uuid(), invitationId: z.uuid(), studentId: z.uuid(), expectedVersion: z.number().int().nonnegative() };

export const studentShareCommandSchema = z.discriminatedUnion('action', [
  z.object({ ...common, action: z.literal('invite'), recipientEmail: email, level: studentShareLevel, message: z.string().max(5000) }).strict(),
  z.object({ ...common, action: z.literal('resend') }).strict(),
  z.object({ ...common, action: z.literal('accept') }).strict(),
  z.object({ ...common, action: z.literal('reject') }).strict(),
  z.object({ ...common, action: z.literal('cancel') }).strict(),
  z.object({ ...common, action: z.literal('change-level'), level: studentShareLevel, reason: z.string().trim().min(1).max(2000) }).strict(),
  z.object({ ...common, action: z.literal('revoke'), reason: z.string().trim().min(1).max(2000), confirmation: z.literal(true) }).strict(),
]).superRefine((command, ctx) => {
  if ((command.action === 'invite') !== (command.expectedVersion === 0)) ctx.addIssue({ code: 'custom', path: ['expectedVersion'], message: 'Alta usa versión cero; acciones existentes requieren versión actual' });
});
export type StudentShareCommand = z.infer<typeof studentShareCommandSchema>;

export const studentShareSchema = z.object({
  id: z.uuid(), clinicId: z.uuid(), studentId: z.uuid(), invitedBy: z.uuid(),
  recipientEmail: email, acceptedBy: z.uuid().nullable(), level: studentShareLevel,
  message: z.string().max(5000), status: studentShareStatus, version: z.number().int().positive(),
  createdAt: z.iso.datetime({ offset: true }), updatedAt: z.iso.datetime({ offset: true }),
}).strict().superRefine((invitation, ctx) => {
  if (invitation.status === 'accepted' && invitation.acceptedBy === null) ctx.addIssue({ code: 'custom', path: ['acceptedBy'], message: 'Acceso aceptado requiere identidad vinculada' });
});
export type StudentShare = z.infer<typeof studentShareSchema>;

export interface StudentShareRepository {
  sent(studentId?: string): Promise<StudentShare[]>;
  received(): Promise<StudentShare[]>;
  command(command: StudentShareCommand): Promise<StudentShare>;
}

/** Only selected immutable resource versions may enter a family publication. */
const ids = z.array(z.uuid()).max(1000).refine((values) => new Set(values).size === values.length, 'Referencia repetida');
export const familyPublicationCommandSchema = z.object({
  operationId: z.uuid(), idempotencyKey: z.uuid(), publicationId: z.uuid(), studentId: z.uuid(),
  expectedVersion: z.number().int().nonnegative(), predecessorId: z.uuid().nullable(),
  programVersionIds: ids, recordRevisionIds: ids, attachmentVersionIds: ids,
  familyPersonIds: ids, introduction: z.string().max(10000),
}).strict().superRefine((publication, ctx) => {
  if ((publication.expectedVersion === 0) !== (publication.predecessorId === null)) ctx.addIssue({ code: 'custom', path: ['predecessorId'], message: 'Publicación sucesora requiere versión previa' });
});
export type FamilyPublicationCommand = z.infer<typeof familyPublicationCommandSchema>;

// Security invariants for adapters/DB:
// Pending invitations grant nothing. Recipient identity is auth.getUser(), never command metadata.
// Acceptance grants this student only, never a clinic membership. Resend/accept share idempotent ledgers.
// Clinical-edit excludes user administration, billing and delegating access.
// Program-results uses minimal student identity, not student.view over complete clinical rows.
// Family reads its versioned publication, not general clinical table policies.
// All resource references must belong to this student and be authorized at publish/read time.

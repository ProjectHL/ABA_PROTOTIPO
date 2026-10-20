import { z } from 'zod';
import { studentCommandV2Schema, studentDisplayName } from '@/domain/students/student-v2';

/**
 * Minimal authorized projection shared with program/session, calendar, sharing,
 * reporting and offline. It includes only the authorized search projection;
 * contacts and clinical history remain detail-only.
 */
export const authorizedStudentSummary = z.object({
  id: z.uuid(),
  clinicId: z.uuid(),
  displayName: z.string().min(1).max(200),
  initials: z.string().min(1).max(12),
  clinicalId: z.string().min(1).max(64),
  rut: z.string().max(12).nullable(),
  photoAttachmentId: z.uuid().nullable(),
  reportedDiagnosis: z.string().max(2000).nullable(),
  hasActiveSession: z.boolean(),
  familyAccessEnabled: z.boolean(),
  assignedProfessional: z.string().max(160).nullable(),
  status: z.enum(['active', 'archived']),
  capabilities: z.array(z.string()).readonly(),
  /** Null identifies a V1 row which has only updated_at, not a command version. */
  version: z.number().int().nonnegative().nullable(),
}).strict();
export type AuthorizedStudentSummary = z.infer<typeof authorizedStudentSummary>;

export const studentPersonDto = z.object({
  id: z.uuid(),
  fullName: z.string().min(1).max(200).nullable(),
  initials: z.string().min(1).max(12).nullable(),
  birthDate: z.string().date().nullable(),
  relationship: z.string().max(80),
  phone: z.string().max(40).nullable(),
  email: z.string().email().max(254).nullable(),
  roles: z.array(z.enum(['family', 'contact'])).min(1).max(2),
  isPrimaryContact: z.boolean(),
}).strict();
export type StudentPersonDto = z.infer<typeof studentPersonDto>;

/** Siblings are a separate identity collection, never a second role for a contact. */
export const studentSiblingDto = z.object({
  id: z.uuid(), fullName: z.string().min(1).max(200).nullable(), initials: z.string().min(1).max(12).nullable(),
  birthDate: z.string().date().nullable(), notes: z.string().max(2000).nullable(),
}).strict();
export type StudentSiblingDto = z.infer<typeof studentSiblingDto>;

export const clinicalHistoryDto = z.object({
  /** Logical chain differs from the immutable version row. */
  historyId: z.uuid(), versionId: z.uuid(),
  kind: z.enum(['reported_diagnosis', 'assessment', 'procedure', 'medication']),
  descriptor: z.string().max(200),
  dose: z.string().max(120).nullable(),
  frequency: z.string().max(120).nullable(),
  prescriber: z.string().max(120).nullable(),
  startedOn: z.string().date().nullable(),
  endedOn: z.string().date().nullable(),
  notes: z.string().max(2000).nullable(),
  /** V1 `entered_in_error` is retained; it is not silently rewritten as superseded. */
  status: z.enum(['active', 'inactive', 'superseded', 'entered_in_error']),
  supersedesVersionId: z.uuid().nullable(), version: z.number().int().positive().nullable(),
  createdAt: z.string().datetime({ offset: true }),
}).strict();
export type ClinicalHistoryDto = z.infer<typeof clinicalHistoryDto>;

export const consentDto = z.object({
  /** Existing consent row is an immutable version; its root is consentId. */
  consentId: z.uuid(), versionId: z.uuid(), version: z.number().int().positive(),
  /** Compatibility alias for UI keys only; use versionId for mutation identity. */
  id: z.uuid(),
  purposeCode: z.string().max(80),
  noticeVersion: z.string().max(80),
  grantor: z.string().max(120),
  channel: z.string().max(80),
  status: z.enum(['pending_review', 'valid', 'revoked', 'expired', 'superseded']),
  evidenceAttachmentId: z.uuid().nullable(),
  supersedesVersionId: z.uuid().nullable(),
  createdAt: z.string().datetime({ offset: true }),
}).strict();
export type ConsentDto = z.infer<typeof consentDto>;

export const studentDetailDto = authorizedStudentSummary.extend({
  clinicalId: z.string().min(1).max(64),
  fullName: z.string().max(200).nullable(),
  rut: z.string().max(12).nullable(),
  birthDate: z.string().date(),
  primaryLanguage: z.string().max(32),
  livingArrangement: z.string().max(500).nullable(),
  reportedDiagnosis: z.string().max(2000).nullable(),
  consultationReason: z.string().max(2000).nullable(),
  context: z.object({ home: z.string().max(2000), school: z.string().max(500), adaptations: z.string().max(2000) }).strict(),
  people: z.array(studentPersonDto),
  siblings: z.array(studentSiblingDto),
  history: z.array(clinicalHistoryDto),
  consents: z.array(consentDto),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
}).strict();
export type StudentDetailDto = z.infer<typeof studentDetailDto>;

/** Existing clinical rows have initials only.  This preserves that history rather than inventing a name. */
export function displayStudentName(student: Pick<StudentDetailDto, 'fullName' | 'initials'>): string {
  return studentDisplayName({ fullName: student.fullName, initials: student.initials });
}

export const clinicStudentCommand = z.object({
  clinicId: z.uuid(),
  command: studentCommandV2Schema,
}).strict();
export type ClinicStudentCommand = z.infer<typeof clinicStudentCommand>;

export const clinicalHistoryCommand = z.object({
  clinicId: z.uuid(), operationId: z.uuid(), idempotencyKey: z.uuid(), studentId: z.uuid(),
  expectedVersion: z.number().int().nonnegative(), action: z.enum(['create', 'initialize-v2', 'correct', 'update-treatment', 'finish-treatment', 'reactivate-treatment', 'retire-reference']),
  historyId: z.uuid(), versionId: z.uuid(), supersedesVersionId: z.uuid().nullable(), confirmation: z.boolean(),
  payload: z.object({ kind: z.enum(['reported_diagnosis', 'assessment', 'procedure', 'medication']), descriptor: z.string().trim().min(1).max(200),
    dose: z.string().trim().max(120).nullable(), frequency: z.string().trim().max(120).nullable(), prescriber: z.string().trim().max(120).nullable(),
    startedOn: z.string().date().nullable(), endedOn: z.string().date().nullable(), notes: z.string().trim().max(2000).nullable() }).strict(),
}).strict().superRefine((command, ctx) => {
  const initial = command.action === 'create' || command.action === 'initialize-v2';
  if (initial !== (command.expectedVersion === 0) || initial !== (command.supersedesVersionId === null)) {
    ctx.addIssue({ code: 'custom', path: ['expectedVersion'], message: 'Alta/inicialización parte en cero; una revisión requiere versión y predecesor actuales' });
  }
  if (['update-treatment', 'finish-treatment', 'reactivate-treatment', 'retire-reference'].includes(command.action) && !command.confirmation) {
    ctx.addIssue({ code: 'custom', path: ['confirmation'], message: 'La transición del tratamiento requiere confirmación' });
  }
  if (command.action === 'retire-reference' && command.payload.kind === 'medication') {
    ctx.addIssue({ code: 'custom', path: ['payload', 'kind'], message: 'Usa la finalización de tratamiento para medicación' });
  }
  if (['finish-treatment', 'reactivate-treatment'].includes(command.action) && command.payload.kind !== 'medication') {
    ctx.addIssue({ code: 'custom', path: ['payload', 'kind'], message: 'Sólo un tratamiento farmacológico admite esta transición' });
  }
  if (command.payload.kind !== 'medication' && [command.payload.dose, command.payload.frequency, command.payload.prescriber, command.payload.startedOn, command.payload.endedOn].some((value) => value !== null)) {
    ctx.addIssue({ code: 'custom', path: ['payload'], message: 'Los campos de tratamiento sólo corresponden a medicación' });
  }
  if (command.payload.startedOn && command.payload.endedOn && command.payload.endedOn < command.payload.startedOn) {
    ctx.addIssue({ code: 'custom', path: ['payload', 'endedOn'], message: 'El término no puede ser anterior al inicio' });
  }
});
export type ClinicalHistoryCommand = z.infer<typeof clinicalHistoryCommand>;

export const consentCommand = z.object({
  clinicId: z.uuid(), operationId: z.uuid(), idempotencyKey: z.uuid(), studentId: z.uuid(), consentId: z.uuid(), expectedVersion: z.number().int().nonnegative(),
  action: z.enum(['create', 'correct', 'replace', 'revoke']), confirmation: z.boolean(), versionId: z.uuid(), supersedesVersionId: z.uuid().nullable(),
  payload: z.object({ purposeCode: z.string().trim().min(1).max(80), noticeVersion: z.string().trim().min(1).max(80), grantor: z.string().trim().min(1).max(120), channel: z.string().trim().min(1).max(80), evidenceAttachmentId: z.uuid().nullable(), status: z.enum(['pending_review', 'valid', 'revoked', 'expired']) }).strict(),
}).strict().superRefine((command, ctx) => {
  const initial = command.action === 'create';
  if (initial !== (command.expectedVersion === 0) || initial !== (command.supersedesVersionId === null)) {
    ctx.addIssue({ code: 'custom', path: ['expectedVersion'], message: 'Un consentimiento nuevo parte en cero; una revisión requiere versión y predecesor actuales' });
  }
  if (initial && command.consentId !== command.versionId) {
    ctx.addIssue({ code: 'custom', path: ['consentId'], message: 'La primera versión debe ser también la raíz del consentimiento' });
  }
  if (!initial && command.versionId === command.supersedesVersionId) {
    ctx.addIssue({ code: 'custom', path: ['versionId'], message: 'Una revisión necesita un identificador de versión nuevo' });
  }
  const confirmsTransition = command.action === 'replace' || command.action === 'revoke';
  if (command.confirmation !== confirmsTransition) {
    ctx.addIssue({ code: 'custom', path: ['confirmation'], message: confirmsTransition ? 'La transición requiere confirmación' : 'La creación o corrección no usa confirmación de transición' });
  }
  if ((command.action === 'revoke') !== (command.payload.status === 'revoked')) {
    ctx.addIssue({ code: 'custom', path: ['payload', 'status'], message: 'Sólo la acción de revocación puede producir estado revocado' });
  }
});
export type ConsentCommand = z.infer<typeof consentCommand>;

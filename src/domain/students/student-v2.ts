import { z } from 'zod';

/** Format/checksum only; never claims identity verification or an existing person. */
export function normalizeRut(input: string): string {
  const trimmed = input.trim().toUpperCase();
  if (!/^[0-9.K\s-]+$/.test(trimmed)) throw new Error('El RUT contiene caracteres inválidos');
  const compact = trimmed.replace(/[.\s-]/g, '');
  if (!/^[0-9]{1,8}[0-9K]$/.test(compact)) throw new Error('Formato de RUT inválido');
  const body = compact.slice(0, -1).replace(/^0+/, '');
  if (!body) throw new Error('El cuerpo del RUT no puede ser cero');
  let sum = 0; let factor = 2;
  for (let index = body.length - 1; index >= 0; index--) {
    sum += Number(body[index]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const result = 11 - sum % 11;
  const verifier = result === 11 ? '0' : result === 10 ? 'K' : String(result);
  if (compact.at(-1) !== verifier) throw new Error('Dígito verificador de RUT inválido');
  return `${body}-${verifier}`;
}

export const nullableRutSchema = z.string().max(32).nullable().transform((value, ctx) => {
  if (value === null || !value.trim()) return null;
  try { return normalizeRut(value); }
  catch (error) {
    ctx.addIssue({ code: 'custom', message: error instanceof Error ? error.message : 'RUT inválido' });
    return z.NEVER;
  }
});
const nullableName = z.string().trim().min(1).max(200).nullable();
const nullableInitials = z.string().trim().min(1).max(12).nullable();
const person = z.object({
  id: z.uuid(), fullName: nullableName, initials: nullableInitials,
  birthDate: z.iso.date().nullable(), relationship: z.string().trim().max(80),
  phone: z.string().trim().max(40), email: z.email().max(254).nullable(),
  roles: z.array(z.enum(['family', 'contact'])).min(1).max(2), isPrimaryContact: z.boolean(),
}).strict().superRefine((value, ctx) => {
  if (!value.fullName && !value.initials) ctx.addIssue({ code: 'custom', path: ['fullName'], message: 'Informa nombre o iniciales, sin inventar datos históricos' });
  if (new Set(value.roles).size !== value.roles.length) ctx.addIssue({ code: 'custom', path: ['roles'], message: 'Rol de persona repetido' });
  if (value.isPrimaryContact && !value.roles.includes('contact')) ctx.addIssue({ code: 'custom', path: ['isPrimaryContact'], message: 'El contacto principal debe tener rol de contacto' });
});
const sibling = z.object({
  id: z.uuid(), fullName: nullableName, initials: nullableInitials, birthDate: z.iso.date().nullable(), notes: z.string().max(2000),
}).strict().superRefine((value, ctx) => {
  if (!value.fullName && !value.initials) ctx.addIssue({ code: 'custom', path: ['fullName'], message: 'Informa nombre o iniciales' });
});

/** Single person identity supports both family and contact views and stable invitations. */
export const studentInputV2Schema = z.object({
  schemaVersion: z.literal(2), clinicalId: z.string().trim().min(1).max(64),
  fullName: nullableName, initials: z.string().trim().min(1).max(12), rut: nullableRutSchema,
  photoAttachmentId: z.uuid().nullable(), birthDate: z.iso.date(),
  primaryLanguage: z.string().trim().min(1).max(32), livingArrangement: z.string().trim().max(500),
  reportedDiagnosis: z.string().trim().max(2000), consultationReason: z.string().trim().max(2000),
  context: z.object({ home: z.string().max(2000), school: z.string().max(500), adaptations: z.string().max(2000) }).strict(),
  people: z.array(person).max(100), siblings: z.array(sibling).max(30),
}).strict().superRefine((value, ctx) => {
  const identities = [...value.people.map((item) => item.id), ...value.siblings.map((item) => item.id)];
  if (new Set(identities).size !== identities.length) ctx.addIssue({ code: 'custom', path: ['people'], message: 'Identidad de persona repetida' });
  if (value.people.filter((item) => item.isPrimaryContact).length > 1) ctx.addIssue({ code: 'custom', path: ['people'], message: 'Sólo puede existir un contacto principal activo' });
});
export type StudentInputV2 = z.infer<typeof studentInputV2Schema>;

/** Caller supplies the clinical local date; avoids UTC midnight changing birth-date validity. */
export function parseStudentInputV2(raw: unknown, today: string): StudentInputV2 {
  z.iso.date().parse(today);
  return studentInputV2Schema.superRefine((student, ctx) => {
    if (student.birthDate > today) ctx.addIssue({ code: 'custom', path: ['birthDate'], message: 'La fecha de nacimiento no puede ser futura' });
    student.people.forEach((item, index) => {
      if (item.birthDate && item.birthDate > today) ctx.addIssue({ code: 'custom', path: ['people', index, 'birthDate'], message: 'Fecha futura' });
    });
    student.siblings.forEach((item, index) => {
      if (item.birthDate && item.birthDate > today) ctx.addIssue({ code: 'custom', path: ['siblings', index, 'birthDate'], message: 'Fecha futura' });
    });
  }).parse(raw);
}

export function studentDisplayName(student: Pick<StudentInputV2, 'fullName' | 'initials'>): string {
  return student.fullName?.trim() || student.initials;
}

export const studentCommandV2Schema = z.object({
  schemaVersion: z.literal(2), operationId: z.uuid(), idempotencyKey: z.uuid(), studentId: z.uuid(),
  expectedVersion: z.number().int().nonnegative(),
  action: z.enum(['create', 'initialize-v2', 'update', 'archive', 'reactivate']), payload: studentInputV2Schema.nullable(),
  statusConfirmation: z.boolean(),
}).strict().superRefine((command, ctx) => {
  if (!['create', 'initialize-v2'].includes(command.action) && command.expectedVersion === 0) {
    ctx.addIssue({ code: 'custom', path: ['expectedVersion'], message: 'Una ficha existente requiere su versión actual' });
  }
  if (command.action === 'create' || command.action === 'initialize-v2' || command.action === 'update') {
    if (!command.payload) ctx.addIssue({ code: 'custom', path: ['payload'], message: 'Falta la ficha' });
    if (command.action === 'create' && (!command.payload?.fullName || command.expectedVersion !== 0)) ctx.addIssue({ code: 'custom', path: ['payload', 'fullName'], message: 'Alta requiere nombre y versión inicial cero' });
    if (command.action === 'initialize-v2' && command.expectedVersion !== 0) ctx.addIssue({ code: 'custom', path: ['expectedVersion'], message: 'La inicialización V2 sólo parte de una ficha sin versión' });
    if (command.statusConfirmation) ctx.addIssue({ code: 'custom', path: ['statusConfirmation'], message: 'Guardar datos no es un cambio de estado' });
  } else if (!command.statusConfirmation || command.payload !== null) {
    ctx.addIssue({ code: 'custom', path: ['statusConfirmation'], message: 'Confirma el cambio de estado sin reemplazar la ficha' });
  }
});
export type StudentCommandV2 = z.infer<typeof studentCommandV2Schema>;

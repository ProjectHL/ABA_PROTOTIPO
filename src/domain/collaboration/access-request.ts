import { z } from 'zod';

export const accessRequestResource = z.enum(['student', 'program', 'record_config', 'chart']);
export type AccessRequestResource = z.infer<typeof accessRequestResource>;

export const accessRequestAction = z.enum([
  'student.edit', 'program.edit', 'record_config.create', 'record_config.edit', 'chart.configure',
]);
export type AccessRequestAction = z.infer<typeof accessRequestAction>;

const common = {
  operationId: z.uuid(), idempotencyKey: z.uuid(), requestId: z.uuid(), studentId: z.uuid(),
};

export const accessRequestCreateCommandSchema = z.object({
  ...common,
  expectedVersion: z.literal(0), action: z.literal('request'), resourceType: accessRequestResource,
  requestedActions: z.array(accessRequestAction).min(1).max(5),
  reason: z.string().trim().min(1).max(500),
}).strict().superRefine((command, ctx) => {
  const allowed: Record<AccessRequestResource, AccessRequestAction[]> = {
    student: ['student.edit'], program: ['program.edit'],
    record_config: ['record_config.create', 'record_config.edit'], chart: ['chart.configure'],
  };
  if (new Set(command.requestedActions).size !== command.requestedActions.length) {
    ctx.addIssue({ code: 'custom', path: ['requestedActions'], message: 'No repitas una acción' });
  }
  if (command.requestedActions.some((action) => !allowed[command.resourceType].includes(action))) {
    ctx.addIssue({ code: 'custom', path: ['requestedActions'], message: 'La acción no corresponde al recurso' });
  }
});
export type AccessRequestCreateCommand = z.infer<typeof accessRequestCreateCommandSchema>;

export const accessRequestDecisionCommandSchema = z.object({
  ...common,
  expectedVersion: z.number().int().min(1).max(2147483646), action: z.enum(['approve', 'deny']),
  expiresAt: z.iso.datetime({ offset: true }).nullable(), reason: z.string().trim().min(1).max(2000),
  confirmation: z.literal(true),
}).strict().superRefine((command, ctx) => {
  if ((command.action === 'approve') !== (command.expiresAt !== null)) {
    ctx.addIssue({ code: 'custom', path: ['expiresAt'], message: 'Aprobar requiere expiración; denegar no la usa' });
  }
});
export type AccessRequestDecisionCommand = z.infer<typeof accessRequestDecisionCommandSchema>;

export const accessRequestDtoSchema = z.object({
  id: z.uuid(), clinicId: z.uuid(), studentId: z.uuid(), studentName: z.string().min(1).max(200),
  requesterUserId: z.uuid(), requesterName: z.string().min(1).max(254),
  requesterEmail: z.email().max(254).nullable(), requesterTitle: z.string().max(160),
  resourceType: accessRequestResource, requestedActions: z.array(accessRequestAction).min(1).max(5),
  reason: z.string().min(1).max(500), status: z.enum(['pending', 'approved', 'denied']),
  version: z.number().int().positive(), createdAt: z.iso.datetime({ offset: true }),
  resolvedAt: z.iso.datetime({ offset: true }).nullable(), direction: z.enum(['incoming', 'requested']),
  decision: z.object({
    id: z.uuid(), status: z.enum(['approved', 'denied', 'revoked']), reason: z.string().max(2000),
    effectiveAt: z.iso.datetime({ offset: true }), expiresAt: z.iso.datetime({ offset: true }).nullable(),
  }).strict().nullable(),
}).strict();
export type AccessRequestDto = z.infer<typeof accessRequestDtoSchema>;

import { z } from 'zod';

const identity = { operationId: z.uuid(), idempotencyKey: z.uuid(), resourceId: z.uuid() };
const message = z.string().min(1).max(10000);
const acknowledgedResultSchema = z.object({ ...identity, status: z.literal('acknowledged'), receiptId: z.uuid(),
  serverVersion: z.number().int().nonnegative(), committedAt: z.iso.datetime({ offset: true }), replayed: z.boolean(),
}).strict();
const conflictResultSchema = z.discriminatedUnion('code', [
  z.object({ ...identity, status: z.literal('conflict'), code: z.literal('version-conflict'),
    expectedVersion: z.number().int().nonnegative(), currentVersion: z.number().int().nonnegative(), message,
  }).strict(),
  z.object({ ...identity, status: z.literal('conflict'),
    code: z.enum(['idempotency-key-reused', 'operation-id-reused', 'idempotency-payload-conflict']), message,
  }).strict(),
]);
const rejectedResultSchema = z.object({ ...identity, status: z.literal('rejected'),
  code: z.enum(['permission-denied', 'validation-failed', 'resource-unavailable', 'invalid-transition']), message,
  issues: z.array(z.object({ path: z.array(z.union([z.string(), z.number().int().nonnegative()])).max(100), message }).strict()).max(1000),
}).strict();
export const commandResultSchema = z.union([acknowledgedResultSchema, conflictResultSchema, rejectedResultSchema]);
export type CommandResult = z.infer<typeof commandResultSchema>;

/** Match a response to the exact queued operation before accepting server success. */
export function readCommandResult(raw: unknown, expected: z.infer<typeof commandIdentitySchema>): CommandResult {
  const identityValue = commandIdentitySchema.parse(expected);
  const result = commandResultSchema.parse(raw);
  if (result.operationId !== identityValue.operationId || result.idempotencyKey !== identityValue.idempotencyKey || result.resourceId !== identityValue.resourceId) {
    throw new Error('El resultado no corresponde a la operación enviada');
  }
  return result;
}
export const commandIdentitySchema = z.object(identity).strict();

// Transport timeout/offline is an unknown outcome, not a rejection or receipt.
// Only a server transaction can issue acknowledged; replay returns its original
// durable receipt/version. Never fabricate a receipt from a successful HTTP code.
// Rejections do not expose a protected snapshot; conflicts preserve local work.

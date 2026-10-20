import { z } from 'zod';

// Demonstration money is integer minor units, never a payment instruction.
export const demonstrationPriceSchema = z.object({
  amountMinor: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  currency: z.string().regex(/^[A-Z]{3}$/), minorUnitDigits: z.number().int().min(0).max(3),
  period: z.enum(['monthly', 'yearly']), demonstration: z.literal(true),
}).strict();
export const planVersionSchema = z.object({
  planId: z.uuid(), planVersionId: z.uuid(), name: z.string().trim().min(1).max(200),
  description: z.string().max(10000), price: demonstrationPriceSchema,
  includedSeats: z.number().int().positive(), maximumSeats: z.number().int().positive().nullable(),
  features: z.array(z.string().trim().min(1).max(1000)).max(100), active: z.boolean(),
}).strict().superRefine((plan, ctx) => {
  if (plan.maximumSeats !== null && plan.maximumSeats < plan.includedSeats) ctx.addIssue({ code: 'custom', path: ['maximumSeats'], message: 'Máximo inferior a plazas incluidas' });
});
export type PlanVersion = z.infer<typeof planVersionSchema>;

export const subscriptionSnapshotSchema = z.object({
  id: z.uuid(), clinicId: z.uuid(), version: z.number().int().positive(),
  plan: planVersionSchema, seats: z.number().int().positive(), occupiedSeats: z.number().int().nonnegative(),
  status: z.enum(['active', 'cancelled']), effectiveAt: z.iso.datetime({ offset: true }),
  cancelledAt: z.iso.datetime({ offset: true }).nullable(),
  commercialMode: z.literal('internal-demonstration'),
}).strict().superRefine((subscription, ctx) => {
  if (subscription.seats < subscription.plan.includedSeats) ctx.addIssue({ code: 'custom', path: ['seats'], message: 'Plazas inferiores al mínimo incluido del plan' });
  // Membership changes may temporarily exceed the selected seats. The read model
  // must expose that real state so administration can resolve it explicitly.
  if (subscription.plan.maximumSeats !== null && subscription.seats > subscription.plan.maximumSeats) ctx.addIssue({ code: 'custom', path: ['seats'], message: 'Plazas exceden máximo del plan' });
  if ((subscription.status === 'cancelled') !== (subscription.cancelledAt !== null)) ctx.addIssue({ code: 'custom', path: ['cancelledAt'], message: 'Estado y fecha cancelación incompatibles' });
  if (subscription.cancelledAt !== null && Date.parse(subscription.cancelledAt) < Date.parse(subscription.effectiveAt)) ctx.addIssue({ code: 'custom', path: ['cancelledAt'], message: 'Cancelación anterior a vigencia' });
});
export type SubscriptionSnapshot = z.infer<typeof subscriptionSnapshotSchema>;

const base = {
  schemaVersion: z.literal(2), operationId: z.uuid(), idempotencyKey: z.uuid(),
  subscriptionId: z.uuid(), clinicId: z.uuid(), expectedVersion: z.number().int().nonnegative(),
  confirmation: z.literal(true), commercialMode: z.literal('internal-demonstration'),
};
export const subscriptionCommandSchema = z.discriminatedUnion('action', [
  z.object({ ...base, action: z.literal('select-plan'), planVersionId: z.uuid(), seats: z.number().int().positive() }).strict(),
  z.object({ ...base, action: z.literal('change-plan'), planVersionId: z.uuid(), seats: z.number().int().positive(), reason: z.string().trim().min(1).max(10000) }).strict(),
  z.object({ ...base, action: z.literal('cancel'), reason: z.string().trim().min(1).max(10000) }).strict(),
]).superRefine((command, ctx) => {
  if (command.action === 'select-plan' ? command.expectedVersion !== 0 : command.expectedVersion === 0) ctx.addIssue({ code: 'custom', path: ['expectedVersion'], message: 'Alta requiere versión0; cambios requieren versión persistida' });
});
export type SubscriptionCommand = z.infer<typeof subscriptionCommandSchema>;

export const internalCommercialDocumentSchema = z.object({
  id: z.uuid(), clinicId: z.uuid(), subscriptionId: z.uuid().nullable(), version: z.number().int().positive(),
  kind: z.enum(['internal-summary', 'internal-proposal', 'internal-agreement']),
  title: z.string().trim().min(1).max(300), issuedAt: z.iso.datetime({ offset: true }),
  lines: z.array(z.object({ description: z.string().trim().min(1).max(1000), amountMinor: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER) }).strict()).max(100),
  currency: z.string().regex(/^[A-Z]{3}$/), minorUnitDigits: z.number().int().min(0).max(3),
  attachmentVersionId: z.uuid().nullable(), predecessorId: z.uuid().nullable(), archived: z.boolean(),
  demonstration: z.literal(true), taxDocument: z.literal(false), paymentRequested: z.literal(false),
}).strict();

// Repository must check clinic admin authority, actual occupied seats and immutable
// catalog version atomically. Cancellation never deletes clinical data or memberships.
// No provider token, card details, tax folio or charge action belongs to this contract.

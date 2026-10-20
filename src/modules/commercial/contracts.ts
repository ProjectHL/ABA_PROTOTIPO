import { z } from 'zod';
import { internalCommercialDocumentSchema, planVersionSchema, subscriptionCommandSchema, subscriptionSnapshotSchema } from '@/domain/commercial/subscription';

export const commercialDocumentDtoSchema = internalCommercialDocumentSchema.extend({
  attachmentAvailable: z.boolean(), createdAt: z.iso.datetime({ offset: true }), updatedAt: z.iso.datetime({ offset: true }),
}).strict();
export type CommercialDocumentDto = z.infer<typeof commercialDocumentDtoSchema>;

export const commercialPageDataSchema = z.object({
  clinicId: z.uuid(), actorId: z.uuid(), isClinicAdmin: z.boolean(),
  plans: z.array(planVersionSchema).max(1000), subscription: subscriptionSnapshotSchema.nullable(),
  documents: z.array(commercialDocumentDtoSchema).max(100000),
  commercialMode: z.literal('internal-demonstration'),
}).strict();
export type CommercialPageData = z.infer<typeof commercialPageDataSchema>;

export const subscriptionCommandRequestSchema = z.object({ clinicId: z.uuid(), command: subscriptionCommandSchema }).strict();
export type SubscriptionCommandRequest = z.infer<typeof subscriptionCommandRequestSchema>;

export const commercialDocumentCommandSchema = z.object({
  schemaVersion: z.literal(2), operationId: z.uuid(), idempotencyKey: z.uuid(), clinicId: z.uuid(),
  documentId: z.uuid(), expectedVersion: z.number().int().nonnegative(), confirmation: z.literal(true),
  action: z.enum(['create', 'replace', 'archive']),
  document: internalCommercialDocumentSchema.optional(),
}).strict().superRefine((value, ctx) => {
  if (value.action === 'create' ? value.expectedVersion !== 0 : value.expectedVersion === 0) {
    ctx.addIssue({ code: 'custom', path: ['expectedVersion'], message: 'Alta requiere versión 0; cambios requieren una versión persistida.' });
  }
  if ((value.action === 'create' || value.action === 'replace') && !value.document) {
    ctx.addIssue({ code: 'custom', path: ['document'], message: 'La creación o sustitución exige documento interno completo.' });
  }
  if (value.document && (value.document.id !== value.documentId || value.document.clinicId !== value.clinicId)) {
    ctx.addIssue({ code: 'custom', path: ['document'], message: 'El documento no corresponde al recurso o clínica del comando.' });
  }
  if (value.action === 'archive' && value.document) {
    ctx.addIssue({ code: 'custom', path: ['document'], message: 'Archivar no acepta un documento alternativo.' });
  }
});
export type CommercialDocumentCommand = z.infer<typeof commercialDocumentCommandSchema>;

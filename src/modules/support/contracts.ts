import { z } from 'zod';
import { commercialInquirySchema, ticketCommandSchema, ticketSnapshotSchema } from '@/domain/support/ticket';

export const supportPageDataSchema = z.object({
  clinicId: z.uuid(), actorId: z.uuid(), canManageTickets: z.boolean(),
  tickets: z.array(ticketSnapshotSchema).max(100000), supportMode: z.literal('local-tickets'),
}).strict();
export type SupportPageData = z.infer<typeof supportPageDataSchema>;

export const ticketCommandRequestSchema = z.object({ clinicId: z.uuid(), command: ticketCommandSchema }).strict();
export type TicketCommandRequest = z.infer<typeof ticketCommandRequestSchema>;

/** A commercial inquiry carries only contact data and permission, never a clinical identifier or session. */
export { commercialInquirySchema };

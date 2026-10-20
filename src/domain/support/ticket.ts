import { z } from 'zod';

const status = z.enum(['open', 'in-progress', 'waiting-requester', 'resolved', 'closed']);
const body = z.string().trim().min(1).max(10000);
const base = {
  schemaVersion: z.literal(2), operationId: z.uuid(), idempotencyKey: z.uuid(),
  ticketId: z.uuid(), clinicId: z.uuid(), expectedVersion: z.number().int().nonnegative(),
};
export const ticketCommandSchema = z.discriminatedUnion('action', [
  z.object({ ...base, action: z.literal('create'), title: z.string().trim().min(1).max(300),
    category: z.enum(['technical', 'account', 'commercial', 'other']), messageId: z.uuid(), body }).strict(),
  z.object({ ...base, action: z.literal('reply'), messageId: z.uuid(), body }).strict(),
  z.object({ ...base, action: z.literal('change-status'), status, reason: body }).strict(),
]).superRefine((command, ctx) => {
  if (command.action === 'create' ? command.expectedVersion !== 0 : command.expectedVersion === 0) ctx.addIssue({ code: 'custom', path: ['expectedVersion'], message: 'Alta requiere versión0; cambios requieren versión persistida' });
});
export type TicketCommand = z.infer<typeof ticketCommandSchema>;
export const ticketMessageSchema = z.object({
  id: z.uuid(), ticketId: z.uuid(), authorUserId: z.uuid(), body,
  createdAt: z.iso.datetime({ offset: true }), sequence: z.number().int().positive(),
}).strict();
export const ticketSnapshotSchema = z.object({
  id: z.uuid(), clinicId: z.uuid(), requesterUserId: z.uuid(), version: z.number().int().positive(),
  title: z.string().trim().min(1).max(300), category: z.enum(['technical', 'account', 'commercial', 'other']), status,
  createdAt: z.iso.datetime({ offset: true }), updatedAt: z.iso.datetime({ offset: true }),
  messages: z.array(ticketMessageSchema).max(10000),
  supportMode: z.literal('local-tickets'),
}).strict().superRefine((ticket, ctx) => {
  if (Date.parse(ticket.updatedAt) < Date.parse(ticket.createdAt)) ctx.addIssue({ code: 'custom', path: ['updatedAt'], message: 'Actualización anterior al alta' });
  const ids = ticket.messages.map((m) => m.id);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', path: ['messages'], message: 'Mensajes repetidos' });
  ticket.messages.forEach((message, index) => {
    if (message.ticketId !== ticket.id || message.sequence !== index + 1) ctx.addIssue({ code: 'custom', path: ['messages', index], message: 'Ticket o secuencia incorrectos; snapshot completo ordenado requerido' });
  });
});
export type TicketSnapshot = z.infer<typeof ticketSnapshotSchema>;

// Transition legality is separate from permission. The server checks requester or
// authorized clinic support staff; payload never supplies authority or author ID.
export function ticketTransitionAllowed(from: z.infer<typeof status>, to: z.infer<typeof status>): boolean {
  const transitions: Record<z.infer<typeof status>, readonly z.infer<typeof status>[]> = {
    open: ['in-progress', 'waiting-requester', 'resolved', 'closed'],
    'in-progress': ['waiting-requester', 'resolved', 'closed'],
    'waiting-requester': ['in-progress', 'resolved', 'closed'],
    resolved: ['open', 'closed'], closed: ['open'],
  };
  return transitions[from].includes(to);
}

export const commercialInquirySchema = z.object({
  schemaVersion: z.literal(2), id: z.uuid(), operationId: z.uuid(), idempotencyKey: z.uuid(),
  name: z.string().trim().min(1).max(200), email: z.string().trim().toLowerCase().pipe(z.email()),
  organization: z.string().trim().max(300), message: body,
  contactPermission: z.literal(true),
}).strict();
// Public inquiries require server abuse controls and no clinical information.
// Local tickets promise neither AI assistance nor instant/24x7 human response.

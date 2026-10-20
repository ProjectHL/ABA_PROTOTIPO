import { z } from 'zod';

const base = { schemaVersion: z.literal(2), operationId: z.uuid(), idempotencyKey: z.uuid(),
  conversationId: z.uuid(), studentId: z.uuid(), expectedVersion: z.number().int().nonnegative() };
export const chatCommandSchema = z.discriminatedUnion('action', [
  z.object({ ...base, action: z.literal('create-conversation'), title: z.string().trim().min(1).max(300),
    participantUserIds: z.array(z.uuid()).min(1).max(100), audience: z.enum(['professionals', 'family']) }).strict(),
  z.object({ ...base, action: z.literal('send-message'), messageId: z.uuid(),
    body: z.string().trim().max(10000), attachmentVersionIds: z.array(z.uuid()).max(10) }).strict(),
  z.object({ ...base, action: z.literal('mark-read'), throughSequence: z.number().int().nonnegative() }).strict(),
]).superRefine((command, ctx) => {
  if (command.action === 'create-conversation') {
    if (command.expectedVersion !== 0) ctx.addIssue({ code: 'custom', path: ['expectedVersion'], message: 'Alta requiere versión0' });
    if (new Set(command.participantUserIds).size !== command.participantUserIds.length) ctx.addIssue({ code: 'custom', path: ['participantUserIds'], message: 'Participantes repetidos' });
  } else {
    if (command.expectedVersion === 0) ctx.addIssue({ code: 'custom', path: ['expectedVersion'], message: 'Conversación persistida requiere versión positiva' });
    if (command.action === 'send-message') {
      if (!command.body && !command.attachmentVersionIds.length) ctx.addIssue({ code: 'custom', path: ['body'], message: 'Mensaje requiere texto o adjunto' });
      if (new Set(command.attachmentVersionIds).size !== command.attachmentVersionIds.length) ctx.addIssue({ code: 'custom', path: ['attachmentVersionIds'], message: 'Adjuntos repetidos' });
    }
  }
});
export type ChatCommand = z.infer<typeof chatCommandSchema>;

export const chatMessageSchema = z.object({
  id: z.uuid(), conversationId: z.uuid(), studentId: z.uuid(), authorUserId: z.uuid(),
  sequence: z.number().int().positive(), createdAt: z.iso.datetime({ offset: true }),
  body: z.string().max(10000), attachmentVersionIds: z.array(z.uuid()).max(10),
}).strict().superRefine((message, ctx) => {
  if (!message.body.trim() && !message.attachmentVersionIds.length) ctx.addIssue({ code: 'custom', path: ['body'], message: 'Mensaje persistido vacío' });
  if (new Set(message.attachmentVersionIds).size !== message.attachmentVersionIds.length) ctx.addIssue({ code: 'custom', path: ['attachmentVersionIds'], message: 'Adjuntos repetidos' });
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export const chatMessagePageSchema = z.object({
  conversationId: z.uuid(), studentId: z.uuid(), afterSequence: z.number().int().nonnegative(),
  messages: z.array(chatMessageSchema).max(500), hasMore: z.boolean(),
}).strict().superRefine((page, ctx) => {
  const ids = new Set<string>(); let previous = page.afterSequence;
  page.messages.forEach((message, index) => {
    if (message.conversationId !== page.conversationId || message.studentId !== page.studentId || message.sequence <= previous || ids.has(message.id)) {
      ctx.addIssue({ code: 'custom', path: ['messages', index], message: 'Recurso, orden o identidad incorrectos' });
    }
    previous = message.sequence; ids.add(message.id);
  });
  if (page.hasMore && !page.messages.length) ctx.addIssue({ code: 'custom', path: ['hasMore'], message: 'Página vacía no puede avanzar cursor' });
});
export const chatReadStateSchema = z.object({
  conversationId: z.uuid(), userId: z.uuid(), throughSequence: z.number().int().nonnegative(),
  readAt: z.iso.datetime({ offset: true }), version: z.number().int().positive(),
}).strict();

// Server derives author/read user from validated identity and checks current
// participants, student capability or family linkage, and each private attachment.
// Family participation grants no general clinical reads. Revocation blocks reads/sends.
// Durable ordered SQL pages recover after reconnect; Realtime merely triggers refresh.
// Mark-read is monotonic and cannot exceed the last visible persisted sequence.

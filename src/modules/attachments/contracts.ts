import { z } from 'zod';
import { attachmentVersionSchema } from '@/domain/attachments/attachment';
import { commandResultSchema } from '@/domain/commands/result';

/** A version is useful only when tied to the durable receipt that produced it. */
export const attachmentCommandEnvelope = z.object({
  result: commandResultSchema,
  version: attachmentVersionSchema.nullable(),
}).strict().superRefine((value, ctx) => {
  if (value.result.status === 'acknowledged' && !value.version) {
    ctx.addIssue({ code: 'custom', path: ['version'], message: 'Un recibo confirmado requiere su versión de adjunto.' });
  }
  if (value.result.status !== 'acknowledged' && value.version) {
    ctx.addIssue({ code: 'custom', path: ['version'], message: 'Conflictos y rechazos no exponen una versión de adjunto.' });
  }
  if (value.version && value.version.attachmentId !== value.result.resourceId) {
    ctx.addIssue({ code: 'custom', path: ['version'], message: 'La versión no corresponde al recurso del recibo.' });
  }
});
export type AttachmentCommandEnvelope = z.infer<typeof attachmentCommandEnvelope>;

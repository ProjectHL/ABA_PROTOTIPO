import { z } from 'zod';

export const notificationDto = z.object({
  id:z.uuid(),clinicId:z.uuid(),kind:z.enum(['share-invited','share-accepted','share-rejected','share-level-changed','share-revoked','reminder']),
  title:z.string().min(1).max(200),body:z.string().max(2000),resourcePath:z.string().startsWith('/').max(500),
  readAt:z.iso.datetime({offset:true}).nullable(),version:z.number().int().positive(),createdAt:z.iso.datetime({offset:true}),
}).strict();
export type NotificationDto=z.infer<typeof notificationDto>;
export const notificationsPage=z.object({actorId:z.uuid(),notifications:z.array(notificationDto).max(100)}).strict();
export const reminderDispatch=z.object({actorId:z.uuid(),dispatchedCount:z.number().int().nonnegative(),dispatchedAt:z.iso.datetime({offset:true})}).strict();
export const notificationStateCommand=z.object({notificationId:z.uuid(),read:z.boolean(),expectedVersion:z.number().int().positive(),operationId:z.uuid(),idempotencyKey:z.uuid()}).strict();
export type NotificationStateCommand=z.infer<typeof notificationStateCommand>;

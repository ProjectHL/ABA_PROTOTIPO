import { z } from 'zod';
import { professionalRole } from './identity.types';
export const deliveryReceipt=z.object({
  deliveryId:z.uuid(),organizationId:z.uuid(),invitationId:z.uuid(),operationId:z.uuid(),idempotencyKey:z.uuid(),payloadVersion:z.literal(1),
  state:z.enum(['pending','claimed','sent','failed','unknown']),version:z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  createdAt:z.iso.datetime({offset:true}),updatedAt:z.iso.datetime({offset:true}),expiresAt:z.iso.datetime({offset:true}).nullable(),
  errorCode:z.enum(['already-accepted','auth-rejected','transport-unknown','claim-expired','reservation-expired','operator-observed-mailpit','operator-authorized-possible-duplicate']).nullable(),
  confirmationSource:z.enum(['auth','operator-mailpit']).nullable(),testRunId:z.uuid().nullable(),
}).strict();
export const teamInvitation=z.object({invitationId:z.uuid(),userId:z.uuid(),email:z.email(),role:professionalRole,accepted:z.boolean(),eligible:z.boolean(),lastDelivery:deliveryReceipt.nullable()}).strict();
export const resendInvitationCommand=z.object({clinicId:z.uuid(),invitationId:z.uuid(),operationId:z.uuid(),idempotencyKey:z.uuid()}).strict();
export const resolveDeliveryCommand=z.object({clinicId:z.uuid(),invitationId:z.uuid(),deliveryId:z.uuid(),expectedVersion:z.number().int().positive(),decision:z.enum(['observed-sent','allow-new-request']),evidenceAck:z.literal(true)}).strict();
export type DeliveryReceipt=z.infer<typeof deliveryReceipt>;
export type TeamInvitation=z.infer<typeof teamInvitation>;
export type ResendInvitationCommand=z.infer<typeof resendInvitationCommand>;

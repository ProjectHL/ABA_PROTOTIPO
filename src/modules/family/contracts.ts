import { z } from 'zod';
import { familyPublicationCommandSchema } from '@/domain/collaboration/student-share';
const base={operationId:z.uuid(),idempotencyKey:z.uuid(),linkId:z.uuid(),studentId:z.uuid(),familyPersonId:z.uuid(),expectedVersion:z.number().int().nonnegative()};
export const familyAccessCommand=z.discriminatedUnion('action',[
  z.object({...base,action:z.literal('invite'),recipientEmail:z.email().max(254).transform(value=>value.toLowerCase()),message:z.string().max(5000)}).strict(),
  z.object({...base,action:z.literal('accept')}).strict(),z.object({...base,action:z.literal('reject')}).strict(),
  z.object({...base,action:z.literal('cancel')}).strict(),z.object({...base,action:z.literal('revoke'),confirmation:z.literal(true),reason:z.string().trim().min(1).max(2000)}).strict(),
]).superRefine((command,ctx)=>{if((command.action==='invite')!==(command.expectedVersion===0))ctx.addIssue({code:'custom',path:['expectedVersion'],message:'La invitación nueva parte en versión cero'});});
export const clinicFamilyAccessCommand=z.object({clinicId:z.uuid(),command:familyAccessCommand}).strict();
export const clinicFamilyPublicationCommand=z.object({clinicId:z.uuid(),command:familyPublicationCommandSchema}).strict();
export const familyAccessLink=z.object({id:z.uuid(),clinicId:z.uuid(),studentId:z.uuid(),familyPersonId:z.uuid(),familyLabel:z.string().min(1).max(200),recipientEmail:z.email(),recipientUserId:z.uuid().nullable(),message:z.string().max(5000),status:z.enum(['pending','active','revoked','rejected','cancelled']),version:z.number().int().positive(),createdAt:z.iso.datetime({offset:true}),updatedAt:z.iso.datetime({offset:true}),direction:z.enum(['sent','received'])}).strict();
export const familyAccessPage=z.object({clinicId:z.uuid().nullable(),actorId:z.uuid(),links:z.array(familyAccessLink)}).strict();
export const familyProgram=z.object({id:z.uuid(),programId:z.uuid(),type:z.enum(['acquisition','behavior']),version:z.number().int().positive(),title:z.string().min(1).max(160),design:z.record(z.string(),z.unknown())}).strict();
export const familyResult=z.object({id:z.uuid(),recordId:z.uuid(),revision:z.number().int().positive(),measurement:z.record(z.string(),z.unknown()),createdAt:z.iso.datetime({offset:true})}).strict();
export const familyDocument=z.object({id:z.uuid(),attachmentId:z.uuid(),version:z.number().int().positive(),name:z.string().min(1).max(240),mimeType:z.enum(['application/pdf','image/jpeg','image/png']),byteLength:z.number().int().positive(),sha256:z.string().regex(/^[a-f0-9]{64}$/),createdAt:z.iso.datetime({offset:true})}).strict();
export const familyPortalPublication=z.object({id:z.uuid(),clinicId:z.uuid(),studentId:z.uuid(),studentLabel:z.string().min(1).max(200),version:z.number().int().positive(),introduction:z.string().max(10000),publishedAt:z.iso.datetime({offset:true}),programs:z.array(familyProgram),results:z.array(familyResult),documents:z.array(familyDocument)}).strict();
export const familyPortalPage=z.object({actorId:z.uuid(),publications:z.array(familyPortalPublication)}).strict();
export const familyManagementPerson=z.object({id:z.uuid(),label:z.string().min(1).max(200),email:z.email().nullable(),accessLinkId:z.uuid().nullable(),accessStatus:z.enum(['pending','active','revoked','rejected','cancelled']).nullable(),accessVersion:z.number().int().positive().nullable()}).strict();
export const familyManagementProgram=z.object({id:z.uuid(),title:z.string().min(1).max(160),type:z.enum(['acquisition','behavior']),version:z.number().int().positive(),state:z.enum(['released','superseded'])}).strict();
export const familyManagementRevision=z.object({id:z.uuid(),recordId:z.uuid(),revision:z.number().int().positive(),measurement:z.record(z.string(),z.unknown()),createdAt:z.iso.datetime({offset:true})}).strict();
export const familyManagementAttachment=z.object({id:z.uuid(),attachmentId:z.uuid(),name:z.string().min(1).max(240),mimeType:z.enum(['application/pdf','image/jpeg','image/png']),byteLength:z.number().int().positive(),createdAt:z.iso.datetime({offset:true})}).strict();
export const familyCurrentPublication=z.object({id:z.uuid(),version:z.number().int().positive(),introduction:z.string().max(10000),publishedAt:z.iso.datetime({offset:true}),familyPersonIds:z.array(z.uuid()),programVersionIds:z.array(z.uuid()),recordRevisionIds:z.array(z.uuid()),attachmentVersionIds:z.array(z.uuid())}).strict();
export const familyManagementPage=z.object({clinicId:z.uuid(),studentId:z.uuid(),actorId:z.uuid(),currentPublication:familyCurrentPublication.nullable(),familyPeople:z.array(familyManagementPerson),programVersions:z.array(familyManagementProgram),recordRevisions:z.array(familyManagementRevision),attachmentVersions:z.array(familyManagementAttachment)}).strict();
export const familyCalendarAppointment=z.object({id:z.uuid(),clinicId:z.uuid(),studentId:z.uuid(),studentLabel:z.string().min(1).max(200),familyPersonId:z.uuid(),familyPersonLabel:z.string().min(1).max(200),title:z.string().min(1).max(300),startsAt:z.iso.datetime({offset:true}),endsAt:z.iso.datetime({offset:true}),timeZone:z.string().min(1).max(100),status:z.enum(['scheduled','cancelled']),cancelledAt:z.iso.datetime({offset:true}).nullable(),cancellationReason:z.string().max(10000).nullable()}).strict();
export const familyCalendarPage=z.object({clinicId:z.uuid(),actorId:z.uuid(),appointments:z.array(familyCalendarAppointment)}).strict();
export type FamilyAccessCommand=z.infer<typeof familyAccessCommand>;
export type FamilyPortalPage=z.infer<typeof familyPortalPage>;
export type FamilyAccessLink=z.infer<typeof familyAccessLink>;
export type FamilyManagementPage=z.infer<typeof familyManagementPage>;
export type FamilyCalendarPage=z.infer<typeof familyCalendarPage>;

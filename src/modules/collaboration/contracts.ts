import { z } from 'zod';
import { studentShareCommandSchema, studentShareSchema } from '@/domain/collaboration/student-share';
import { accessRequestCreateCommandSchema, accessRequestDecisionCommandSchema, accessRequestDtoSchema } from '@/domain/collaboration/access-request';
import { authorizedStudentSummary } from '@/modules/students/contracts';

export const collaborationInvitation = studentShareSchema.extend({
  studentName: z.string().min(1).max(200),
  direction: z.enum(['sent', 'received']),
}).strict();
export type CollaborationInvitation = z.infer<typeof collaborationInvitation>;

export const collaborationPageData = z.object({
  clinicId: z.uuid().nullable(), actorId: z.uuid(),
  invitations: z.array(collaborationInvitation),
  manageableStudents: z.array(authorizedStudentSummary),
  accessRequests: z.array(accessRequestDtoSchema),
  requestableStudents: z.array(authorizedStudentSummary),
}).strict();
export type CollaborationPageData = z.infer<typeof collaborationPageData>;

export const clinicStudentShareCommand = z.object({
  clinicId: z.uuid(), command: studentShareCommandSchema,
}).strict();

export const clinicAccessRequestCreateCommand = z.object({
  clinicId: z.uuid(), command: accessRequestCreateCommandSchema,
}).strict();

export const clinicAccessRequestDecisionCommand = z.object({
  clinicId: z.uuid(), command: accessRequestDecisionCommandSchema,
}).strict();

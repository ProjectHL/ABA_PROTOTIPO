import { z } from 'zod';
export const professionalRole = z.enum(['admin','supervisor','therapist']);
export const clinicContextRole = z.enum(['admin','supervisor','therapist','external','family']);
export const avatarPreset = z.enum(['blue','indigo','green','violet']);
export const profileInput = z.object({
  name:z.string().trim().min(3).max(160), profession:z.string().trim().min(2).max(120),
  title:z.string().trim().max(160), description:z.string().trim().max(2000),
  phone:z.string().trim().max(40), avatarObjectPath:z.string().max(500).nullable(), avatarPreset,
}).strict();
// Historical identities may have no professional data; reads never invent a name/profession.
export const professionalProfile = profileInput.extend({name:z.string().max(160),profession:z.string().max(120),id:z.uuid(),email:z.email(),joinedDate:z.string(),version:z.number().int().nonnegative(),updatedAt:z.string().nullable()});
export const clinicChoice = z.object({id:z.uuid(),name:z.string(),role:clinicContextRole});
export const identityDto = z.object({userId:z.uuid(),email:z.email(),profile:professionalProfile,choices:z.array(clinicChoice),active:clinicChoice.nullable()});
export const teamMember = professionalProfile.extend({role:professionalRole,status:z.enum(['active','inactive']),avatar:z.string().default('')});
export type ProfessionalProfile = z.infer<typeof professionalProfile>;
export type ProfileInput = z.infer<typeof profileInput>;
export type IdentityDto = z.infer<typeof identityDto>;
export type TeamMember = z.infer<typeof teamMember>;
export type ClinicChoice = z.infer<typeof clinicChoice>;
export const saveProfileCommand = z.object({clinicId:z.uuid(),targetUserId:z.uuid(),expectedVersion:z.number().int().nonnegative(),operationId:z.uuid(),idempotencyKey:z.uuid(),payload:profileInput}).strict();
export type SaveProfileCommand = z.infer<typeof saveProfileCommand>;

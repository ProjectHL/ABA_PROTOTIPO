'use server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSessionUser } from '@/lib/auth/session';
import { dbAsUser } from '@/lib/db';
import { putObject } from '@/lib/storage';
import { readCommandResult } from '@/domain/commands/result';
import { identityDto,teamMember,saveProfileCommand,professionalRole, type IdentityDto } from './identity.types';
import { deliveryReceipt } from './invitation.types';
import { inviteClinicMember } from './invitation.service';
async function authorized() {
  const user=await requireSessionUser();
  return {db:dbAsUser(user.id),user};
}
export async function loadIdentity():Promise<IdentityDto> {
  const {db,user}=await authorized();
  const selected=(await cookies()).get('aba-clinic')?.value;
  const parsedClinic=z.uuid().safeParse(selected);
  const result=await db.rpc('aba_identity_context',{p_organization_id:parsedClinic.success?parsedClinic.data:undefined});
  if(result.error) {
    console.error('[identity] aba_identity_context failed', {
      code: result.error.code,
      message: result.error.message,
      details: result.error.details,
      hint: result.error.hint,
    });
    throw new Error('No se pudo verificar identidad y clínica. No se utilizaron datos de demostración.');
  }
  const dto=identityDto.parse(result.data);if(dto.userId!==user.id)throw new Error('La respuesta no corresponde a la identidad autenticada.');return dto;
}
async function expectedClinic(clinicId:string){const expected=z.uuid().parse(clinicId);const ctx=await loadIdentity();if(ctx.active?.id!==expected)throw new Error('La clínica cambió. Conserva tu trabajo y vuelve a abrir la operación en su clínica original; no se envió el comando.');return ctx;}
export async function selectIdentityClinic(id:string) {
  const ctx=await loadIdentity();
  if(!ctx.choices.some(choice=>choice.id===id)) throw new Error('Clínica no autorizada.');
  (await cookies()).set('aba-clinic',id,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/'});
  revalidatePath('/','layout');
}
export async function loadTeam(clinicId:string) {
  const ctx=await expectedClinic(clinicId);
  if(ctx.active?.role!=='admin') throw new Error('Solo administración de esta clínica puede gestionar equipo.');
  const {db}=await authorized();
  const result=await db.rpc('aba_team',{p_organization_id:ctx.active.id});
  if(result.error) throw new Error('No se pudo cargar el equipo autorizado.');
  return z.array(teamMember).parse(result.data);
}
export async function saveProfessionalProfile(raw:unknown) {
  const command=saveProfileCommand.parse(raw);
  const ctx=await expectedClinic(command.clinicId);
  if(!ctx.active) throw new Error('Selecciona una clínica autorizada.');
  const {db}=await authorized();
  const result=await db.rpc('aba_save_professional_profile',{
    p_organization_id:ctx.active.id,p_target_user_id:command.targetUserId,p_expected_version:command.expectedVersion,
    p_operation_id:command.operationId,p_idempotency_key:command.idempotencyKey,p_payload:command.payload,
  });
  if(result.error) throw new Error(result.error.code==='40001'?'El perfil cambió o la clave fue reutilizada. Conserva tus cambios y revisa la versión del servidor.':result.error.code==='42501'?'No tienes permiso vigente para editar este perfil.':'El servidor no confirmó el cambio de perfil.');
  const receipt=readCommandResult(result.data,{operationId:command.operationId,idempotencyKey:command.idempotencyKey,resourceId:command.targetUserId});
  if(receipt.status!=='acknowledged') throw new Error(receipt.message);
  revalidatePath('/','layout'); return receipt;
}
export async function setTeamMembership(raw:unknown) {
  const command=z.object({clinicId:z.uuid(),userId:z.uuid(),role:professionalRole,status:z.enum(['active','inactive'])}).strict().parse(raw);
  const ctx=await expectedClinic(command.clinicId);
  if(ctx.active?.role!=='admin') throw new Error('Administración de clínica requerida.');
  const {db}=await authorized();
  const result=await db.rpc('mvp_set_member',{p_organization_id:ctx.active.id,p_user_id:command.userId,p_role:command.role,p_status:command.status});
  if(result.error || !result.data) throw new Error('Membresía no modificada. No se permite retirar al último administrador activo.');
  const receipt=z.object({user_id:z.uuid(),role:professionalRole,status:z.enum(['active','inactive'])}).parse(result.data);
  if(receipt.user_id!==command.userId||receipt.role!==command.role||receipt.status!==command.status)throw new Error('El recibo no corresponde al cambio de membresía solicitado.');
  revalidatePath('/','layout'); return receipt;
}
export async function inviteTeamMember(raw:unknown) {
  const command=z.object({clinicId:z.uuid(),email:z.email().max(254),role:professionalRole,operationId:z.uuid()}).strict().parse(raw);
  const ctx=await expectedClinic(command.clinicId);
  if(ctx.active?.role!=='admin') throw new Error('Administración de clínica requerida.');
  const data=await inviteClinicMember({actorId:ctx.userId,organizationId:ctx.active.id,email:command.email,role:command.role,operationId:command.operationId});
  const receipt=z.object({operationId:z.uuid(),requestedOperationId:z.uuid(),status:z.literal('completed'),userId:z.uuid(),role:professionalRole,
    invited:z.boolean(),replayed:z.boolean(),alreadyAccepted:z.boolean(),delivery:deliveryReceipt.nullable(),deliveryError:z.enum(['outcome-not-confirmed','initial-owner-required']).nullable()}).strict().parse(data);
  if(receipt.role!==command.role||receipt.requestedOperationId!==command.operationId)throw new Error('El servidor no confirmó la operación y el perfil solicitados. No se presenta como invitación enviada.');
  if(receipt.delivery&&(receipt.delivery.organizationId!==command.clinicId||receipt.delivery.invitationId!==receipt.operationId||receipt.delivery.operationId!==receipt.operationId||receipt.delivery.idempotencyKey!==receipt.operationId))throw new Error('El recibo de correo no corresponde a la invitación canónica y su clínica.');
  if(receipt.invited&&(!receipt.delivery||receipt.delivery.state!=='sent'||receipt.delivery.confirmationSource!=='auth'))throw new Error('El servidor no aportó un comprobante de aceptación Auth del correo.');
  // Existing invitation intents may replay their canonical operation UUID.
  revalidatePath('/','layout'); return receipt;
}
export async function uploadProfileAvatar(targetId:string,form:FormData,clinicId:string) {
  const ctx=await expectedClinic(clinicId);
  const target=z.uuid().parse(targetId);
  if(target!==ctx.userId && ctx.active?.role!=='admin') throw new Error('Perfil no autorizado.');
  const file=form.get('avatar');
  if(!(file instanceof File) || file.size>5*1024*1024 || file.size===0 || !['image/jpeg','image/png'].includes(file.type)) throw new Error('Avatar: JPEG/PNG hasta 5 MiB.');
  const bytes=new Uint8Array(await file.arrayBuffer());
  const png=[137,80,78,71,13,10,26,10].every((value,i)=>bytes[i]===value);
  const jpg=bytes[0]===255 && bytes[1]===216 && bytes[2]===255;
  if((file.type==='image/png'&&!png)||(file.type==='image/jpeg'&&!jpg)) throw new Error('Contenido de avatar inválido.');
  const objectPath=`${target}/${crypto.randomUUID()}.${png?'png':'jpg'}`;
  await authorized();
  await putObject('profile-avatars',objectPath,bytes,target);
  return objectPath;
}
export async function profileAvatarUrl(objectPath:string|null) {
  if(!objectPath) return '';
  await authorized();
  return `/api/avatars/${objectPath.split('/')[0]}?v=${encodeURIComponent(objectPath)}`;
}
export async function loadTeamAssignments(userId:string,clinicId:string) {
  const target=z.uuid().parse(userId);const ctx=await expectedClinic(clinicId);
  if(ctx.active?.role!=='admin')throw new Error('Administración de clínica requerida.');
  const {db}=await authorized();
  const member=await db.from('memberships').select('user_id').eq('organization_id',ctx.active.id).eq('user_id',target).maybeSingle();
  if(member.error||!member.data)throw new Error('Miembro no disponible en esta clínica.');
  const clients=await db.from('clients').select('id,clinical_id,initials').eq('organization_id',ctx.active.id).eq('status','active');
  const assignments=await db.from('student_assignments').select('id,client_id,role,status,is_primary,effective_at,ended_at').eq('organization_id',ctx.active.id).eq('user_id',target);
  if(clients.error||assignments.error)throw new Error('No se pudieron cargar asignaciones autorizadas.');
  return {clients:clients.data,assignments:assignments.data};
}
export async function setTeamAssignment(raw:unknown) {
  const command=z.object({clinicId:z.uuid(),clientId:z.uuid(),userId:z.uuid(),role:z.enum(['supervisor','therapist']),status:z.enum(['active','inactive'])}).strict().parse(raw);
  const ctx=await expectedClinic(command.clinicId);if(ctx.active?.role!=='admin')throw new Error('Administración de clínica requerida.');
  const {db}=await authorized();
  const client=await db.from('clients').select('id').eq('organization_id',ctx.active.id).eq('id',command.clientId).maybeSingle();
  if(client.error||!client.data)throw new Error('Ficha no disponible en esta clínica.');
  const result=await db.rpc('set_student_assignment',{p_client_id:command.clientId,p_user_id:command.userId,p_role:command.role,p_status:command.status});
  if(result.error||!result.data)throw new Error('El servidor no confirmó la asignación. Revisa permisos, membresía activa y asignación propia.');
  const receipt=z.object({id:z.uuid(),organization_id:z.uuid(),client_id:z.uuid(),user_id:z.uuid(),role:z.enum(['supervisor','therapist']),status:z.enum(['active','inactive'])}).parse(result.data);
  if(receipt.organization_id!==command.clinicId||receipt.client_id!==command.clientId||receipt.user_id!==command.userId||receipt.role!==command.role||receipt.status!==command.status)throw new Error('El recibo no corresponde a la asignación solicitada en esta clínica.');
  revalidatePath('/','layout');return receipt;
}

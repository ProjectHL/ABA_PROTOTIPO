'use server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { loadIdentity } from './identity.server';
import { deliveryReceipt,teamInvitation,resendInvitationCommand,resolveDeliveryCommand,type DeliveryReceipt,type ResendInvitationCommand } from './invitation.types';
async function clinic(clinicId:string){
  const id=z.uuid().parse(clinicId);const ctx=await loadIdentity();
  if(ctx.active?.id!==id)throw new Error('La clínica cambió. No se envió la operación antigua a otra clínica.');
  if(ctx.active.role!=='admin')throw new Error('Administración activa de esta clínica requerida.');
  const db=await createClient();const user=await db.auth.getUser();
  if(user.error||user.data.user?.id!==ctx.userId)throw new Error('La identidad cambió o la sesión caducó. Conserva la operación y vuelve a iniciar sesión.');
  return {db,id};
}
function match(raw:unknown,command:ResendInvitationCommand):DeliveryReceipt{
  const d=deliveryReceipt.parse(raw);
  if(d.organizationId!==command.clinicId||d.invitationId!==command.invitationId||d.operationId!==command.operationId||d.idempotencyKey!==command.idempotencyKey)throw new Error('El recibo no corresponde a la operación de reenvío enviada.');
  return d;
}
export async function loadTeamInvitations(clinicId:string){
  const {db,id}=await clinic(clinicId);const result=await db.rpc('aba_team_invitation_deliveries',{p_org:id});
  if(result.error)throw new Error('No se pudo consultar las invitaciones de la clínica. No se muestran entregas simuladas.');
  const rows=z.array(teamInvitation).parse(result.data);
  if(rows.some(row=>row.lastDelivery&&(row.lastDelivery.organizationId!==id||row.lastDelivery.invitationId!==row.invitationId)))throw new Error('Respuesta de invitaciones fuera de su clínica.');
  return rows;
}
export async function queryTeamInvitationDelivery(raw:unknown){
  const c=resendInvitationCommand.parse(raw);const {db}=await clinic(c.clinicId);
  const result=await db.rpc('aba_team_invitation_delivery_status',{p_org:c.clinicId,p_invite:c.invitationId,p_operation:c.operationId,p_key:c.idempotencyKey});
  if(result.error)throw new Error('No se pudo revalidar el estado de entrega. No repitas una nueva operación sin resolver su resultado.');
  return result.data===null?null:match(result.data,c);
}
export async function resendTeamInvitation(raw:unknown){
  const c=resendInvitationCommand.parse(raw);const {db}=await clinic(c.clinicId);
  const result=await db.functions.invoke('resend-clinic-invitation',{body:{organizationId:c.clinicId,invitationId:c.invitationId,operationId:c.operationId,idempotencyKey:c.idempotencyKey}});
  if(result.error)throw new Error('No se recibió un comprobante de reenvío. La operación puede seguir pendiente o incierta; consulta su estado con los mismos IDs. No se afirma correo enviado.');
  const envelope=z.object({delivery:deliveryReceipt}).strict().parse(result.data);
  return match(envelope.delivery,c);
}
export async function resolveTeamInvitationDelivery(raw:unknown){
  const c=resolveDeliveryCommand.parse(raw);const {db}=await clinic(c.clinicId);
  const result=await db.rpc('aba_resolve_team_invitation_delivery',{p_org:c.clinicId,p_delivery:c.deliveryId,p_expected_version:c.expectedVersion,p_decision:c.decision,p_evidence_ack:c.evidenceAck});
  if(result.error)throw new Error(result.error.code==='40001'?'El estado cambió. Reconsulta antes de resolver; no se sobrescribió otra resolución.':'No se confirmó la resolución. Reconsulta el estado antes de solicitar otro correo.');
  const d=deliveryReceipt.parse(result.data);
  const expectedState=c.decision==='observed-sent'?'sent':'failed';const expectedCode=c.decision==='observed-sent'?'operator-observed-mailpit':'operator-authorized-possible-duplicate';
  if(d.organizationId!==c.clinicId||d.invitationId!==c.invitationId||d.deliveryId!==c.deliveryId||d.version!==c.expectedVersion+1||d.state!==expectedState||d.errorCode!==expectedCode)throw new Error('El recibo no corresponde a la resolución enviada.');
  return d;
}

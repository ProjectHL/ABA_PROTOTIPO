-- Forward-only fix: command actions and persisted audit event names differ.
-- Preserve canonical CHECK, authorization, ledger, locking and existing data.
create or replace function private.a4_student_share_command_impl(p_organization_id uuid,p_command jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_actor uuid:=auth.uid(); v_operation uuid; v_key uuid; v_invitation_id uuid;
  v_client_id uuid; v_expected bigint; v_action text; v_replay jsonb;
  v_invitation public.student_share_invitations_v2; v_access public.student_external_access_v2;
  v_test uuid; v_sequence integer; v_actor_email text; v_can_manage boolean;
begin
  if not private.a4_share_command_valid(p_command) then
    raise exception using errcode='22023',message='student_share_command_invalid';
  end if;
  v_operation:=(p_command->>'operationId')::uuid;
  v_key:=(p_command->>'idempotencyKey')::uuid;
  v_invitation_id:=(p_command->>'invitationId')::uuid;
  v_client_id:=(p_command->>'studentId')::uuid;
  v_expected:=(p_command->>'expectedVersion')::bigint;
  v_action:=p_command->>'action';
  if v_actor is null then
    return private.command_rejected_result(v_operation,v_key,v_invitation_id,
      'permission-denied','Se requiere una sesión autenticada.');
  end if;
  select lower(email) into v_actor_email from auth.users where id=v_actor;
  v_can_manage:=private.has_internal_student_capability(v_client_id,
    case when v_action='revoke' then 'authorization.revoke' else 'authorization.decide' end);
  if (v_action in ('invite','resend','cancel','change-level','revoke') and not v_can_manage)
    or (v_action in ('accept','reject') and v_actor_email is null) then
    return private.command_rejected_result(v_operation,v_key,v_invitation_id,
      'permission-denied','No tienes autorización vigente para esta invitación.');
  end if;
  v_replay:=private.command_identity_or_replay_result(
    p_organization_id,v_operation,v_key,v_invitation_id,'student-share-v2',p_command);
  if v_replay is not null then
    if v_action in ('invite','resend','cancel','change-level','revoke') then
      v_can_manage:=private.has_internal_student_capability(v_client_id,
        case when v_action='revoke' then 'authorization.revoke' else 'authorization.decide' end);
      if not v_can_manage then
        return private.command_rejected_result(v_operation,v_key,v_invitation_id,
          'permission-denied','El permiso para gestionar la invitación fue revocado.');
      end if;
    elsif not exists(select 1 from public.student_share_invitations_v2 invitation
      where invitation.id=v_invitation_id and invitation.organization_id=p_organization_id
        and invitation.client_id=v_client_id
        and (invitation.recipient_user_id=v_actor or invitation.recipient_email=v_actor_email)) then
      return private.command_rejected_result(v_operation,v_key,v_invitation_id,
        'permission-denied','La invitación ya no corresponde a tu identidad.');
    end if;
    return v_replay;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_invitation_id::text,0));
  select * into v_invitation from public.student_share_invitations_v2
    where id=v_invitation_id for update;
  if v_action='invite' then
    if found then
      return private.command_version_conflict_result(v_operation,v_key,v_invitation_id,0,
        v_invitation.version,'La invitación ya existe.');
    end if;
    if not exists(select 1 from public.clients client where client.id=v_client_id
      and client.organization_id=p_organization_id and client.status='active') then
      return private.command_rejected_result(v_operation,v_key,v_invitation_id,
        'resource-unavailable','La ficha no está disponible.');
    end if;
    v_can_manage:=private.has_internal_student_capability(v_client_id,'authorization.decide');
    if not v_can_manage then
      return private.command_rejected_result(v_operation,v_key,v_invitation_id,
        'permission-denied','El permiso para compartir la ficha fue revocado.');
    end if;
    if exists(select 1 from public.student_share_invitations_v2 invitation
      where invitation.client_id=v_client_id
        and invitation.recipient_email=p_command->>'recipientEmail'
        and invitation.status='pending')
      or exists(select 1 from public.student_external_access_v2 access
        join auth.users recipient on recipient.id=access.user_id
        where access.client_id=v_client_id and access.status='active'
          and lower(recipient.email)=p_command->>'recipientEmail') then
      return private.command_rejected_result(v_operation,v_key,v_invitation_id,
        'invalid-transition','Ya existe una invitación pendiente o un acceso activo.');
    end if;
    select client.test_run_id into v_test from public.clients client
      where client.id=v_client_id and client.organization_id=p_organization_id;
    perform private.require_open_test_batch(p_organization_id,v_test);
    insert into public.student_share_invitations_v2(
      id,organization_id,client_id,invited_by,recipient_email,recipient_user_id,
      access_level,message,status,version,test_run_id)
    values(v_invitation_id,p_organization_id,v_client_id,v_actor,
      p_command->>'recipientEmail',(select id from auth.users where lower(email)=p_command->>'recipientEmail' limit 1),
      p_command->>'level',p_command->>'message','pending',1,v_test)
    returning * into v_invitation;
    insert into public.student_share_events_v2(
      id,invitation_id,organization_id,client_id,sequence,event_type,actor_user_id,snapshot,test_run_id)
    values(gen_random_uuid(),v_invitation_id,p_organization_id,v_client_id,1,'invited',v_actor,p_command,v_test);
  else
    if not found or v_invitation.organization_id<>p_organization_id or v_invitation.client_id<>v_client_id then
      return private.command_rejected_result(v_operation,v_key,v_invitation_id,
        'resource-unavailable','La invitación no está disponible.');
    end if;
    perform private.require_open_test_batch(p_organization_id,v_invitation.test_run_id);
    if v_invitation.version<>v_expected then
      return private.command_version_conflict_result(v_operation,v_key,v_invitation_id,
        v_expected,v_invitation.version,'La invitación cambió desde la última lectura.');
    end if;
    if v_action in ('accept','reject') then
      if v_invitation.status<>'pending' or not (
        v_invitation.recipient_user_id=v_actor or
        (v_invitation.recipient_user_id is null and v_invitation.recipient_email=v_actor_email)) then
        return private.command_rejected_result(v_operation,v_key,v_invitation_id,
          'permission-denied','La invitación pendiente no corresponde a tu identidad.');
      end if;
      update public.student_share_invitations_v2 set
        recipient_user_id=coalesce(recipient_user_id,v_actor),
        accepted_by=case when v_action='accept' then v_actor else null end,
        accepted_at=case when v_action='accept' then now() else null end,
        status=case when v_action='accept' then 'accepted' else 'rejected' end,
        version=version+1,updated_at=now()
      where id=v_invitation_id returning * into v_invitation;
      if v_action='accept' then
        insert into public.student_external_access_v2(
          id,invitation_id,organization_id,client_id,user_id,access_level,status,version,test_run_id)
        values(gen_random_uuid(),v_invitation_id,p_organization_id,v_client_id,v_actor,
          v_invitation.access_level,'active',1,v_invitation.test_run_id)
        returning * into v_access;
      end if;
    else
      v_can_manage:=private.has_internal_student_capability(v_client_id,
        case when v_action='revoke' then 'authorization.revoke' else 'authorization.decide' end);
      if not v_can_manage then
        return private.command_rejected_result(v_operation,v_key,v_invitation_id,
          'permission-denied','El permiso para gestionar el acceso fue revocado.');
      end if;
      if v_action in ('resend','cancel') and v_invitation.status<>'pending' then
        return private.command_rejected_result(v_operation,v_key,v_invitation_id,
          'invalid-transition','La invitación ya no está pendiente.');
      elsif v_action in ('change-level','revoke') and v_invitation.status<>'accepted' then
        return private.command_rejected_result(v_operation,v_key,v_invitation_id,
          'invalid-transition','No existe un acceso aceptado para modificar.');
      end if;
      if v_action='resend' then
        update public.student_share_invitations_v2 set version=version+1,updated_at=now(),
          expires_at=null where id=v_invitation_id returning * into v_invitation;
      elsif v_action='cancel' then
        update public.student_share_invitations_v2 set status='cancelled',version=version+1,
          updated_at=now() where id=v_invitation_id returning * into v_invitation;
      elsif v_action='change-level' then
        update public.student_share_invitations_v2 set access_level=p_command->>'level',
          version=version+1,updated_at=now() where id=v_invitation_id returning * into v_invitation;
        update public.student_external_access_v2 set access_level=p_command->>'level',
          version=version+1,updated_at=now()
          where invitation_id=v_invitation_id and status='active';
      else
        update public.student_share_invitations_v2 set status='revoked',revoked_at=now(),
          version=version+1,updated_at=now() where id=v_invitation_id returning * into v_invitation;
        update public.student_external_access_v2 set status='revoked',revoked_at=now(),
          version=version+1,updated_at=now()
          where invitation_id=v_invitation_id and status='active';
      end if;
    end if;
    select coalesce(max(sequence),0)+1 into v_sequence
      from public.student_share_events_v2 where invitation_id=v_invitation_id;
    insert into public.student_share_events_v2(
      id,invitation_id,organization_id,client_id,sequence,event_type,actor_user_id,reason,snapshot,test_run_id)
    values(gen_random_uuid(),v_invitation_id,p_organization_id,v_client_id,v_sequence,
      case v_action when 'change-level' then 'level-changed'
        when 'accept' then 'accepted' when 'reject' then 'rejected'
        when 'resend' then 'resent' when 'cancel' then 'cancelled'
        when 'revoke' then 'revoked' else v_action end,v_actor,
      coalesce(p_command->>'reason',''),p_command,v_invitation.test_run_id);
  end if;
  return private.issue_command_receipt(p_organization_id,v_operation,v_key,v_invitation_id,
    'student-share-v2',p_command,v_invitation.version,v_invitation.test_run_id);
end;
$$;

revoke all on function private.a4_student_share_command_impl(uuid,jsonb)
  from public,anon,authenticated,service_role;

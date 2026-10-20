-- Authenticated users may inspect only their exact pending verification target.
-- They cannot perform the state transition. The verified transition is callable
-- only by the internal Edge credential and is rebound to the reservation actor so
-- the ordinary capability engine and command ledger remain authoritative.

create function public.aba_attachment_verification_target_v2(
  p_organization_id uuid,p_reservation jsonb,p_confirmation jsonb
)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_record public.attachment_records%rowtype;
  v_version public.attachment_versions%rowtype;v_attachment uuid;v_version_id uuid;
begin
  if v_actor is null then raise exception using errcode='42501',message='authenticated_identity_required';end if;
  if not private.attachment_command_v2_valid(p_reservation)
    or not private.attachment_command_v2_valid(p_confirmation)
    or p_reservation->>'action'<>'reserve-upload' or p_confirmation->>'action'<>'confirm-upload'
    or p_reservation->>'attachmentId'<>p_confirmation->>'attachmentId'
    or p_reservation->>'versionId'<>p_confirmation->>'versionId'
    or p_reservation->'resource'<>p_confirmation->'resource'
    or p_reservation->>'operationId'=p_confirmation->>'operationId'
    or p_reservation->>'idempotencyKey'=p_confirmation->>'idempotencyKey' then
    raise exception using errcode='22023',message='attachment_verification_contract_invalid';
  end if;
  if not private.attachment_resource_authorized_v2(
    p_organization_id,p_confirmation->'resource','student.edit') then
    raise exception using errcode='42501',message='attachment_resource_edit_required';end if;
  v_attachment:=(p_confirmation->>'attachmentId')::uuid;
  v_version_id:=(p_confirmation->>'versionId')::uuid;
  select r.* into v_record from public.attachment_records r where r.id=v_attachment;
  select v.* into v_version from public.attachment_versions v
    where v.id=v_version_id and v.attachment_id=v_attachment;
  if v_record.id is null or v_version.id is null
    or v_record.current_version_id<>v_version.id or v_record.state<>'pending-upload'
    or v_version.state<>'pending-upload' or v_version.created_by<>v_actor
    or v_record.created_by<>v_actor or private.attachment_record_resource_v2(v_record)<>p_confirmation->'resource'
    or v_record.version::text<>p_confirmation->>'expectedVersion'
    or v_record.purpose<>p_reservation#>>'{upload,purpose}'
    or v_version.mime_type<>p_reservation#>>'{upload,mimeType}'
    or v_version.original_name<>btrim(p_reservation#>>'{upload,fileName}')
    or v_version.byte_length::text<>p_reservation#>>'{upload,byteLength}'
    or v_version.sha256<>p_reservation#>>'{upload,sha256}' then
    raise exception using errcode='P0002',message='attachment_verification_target_unavailable';
  end if;
  return jsonb_build_object(
    'actorId',v_actor,'attachmentId',v_attachment,'versionId',v_version.id,
    'bucket',v_version.bucket_id,'objectKey',v_version.object_key,
    'mimeType',v_version.mime_type,'byteLength',v_version.byte_length,'sha256',v_version.sha256);
end;
$$;

create function public.aba_attachment_confirm_verified_v2(
  p_organization_id uuid,p_actor_user_id uuid,p_reservation jsonb,p_confirmation jsonb,
  p_verified_sha256 text
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_operation uuid;v_key uuid;v_attachment uuid;v_version_id uuid;v_expected bigint;
  v_replay jsonb;v_record public.attachment_records%rowtype;v_version public.attachment_versions%rowtype;
begin
  if p_actor_user_id is null or p_verified_sha256 !~ '^[a-f0-9]{64}$'
    or not private.attachment_command_v2_valid(p_reservation)
    or not private.attachment_command_v2_valid(p_confirmation)
    or p_reservation->>'action'<>'reserve-upload' or p_confirmation->>'action'<>'confirm-upload'
    or p_reservation->>'attachmentId'<>p_confirmation->>'attachmentId'
    or p_reservation->>'versionId'<>p_confirmation->>'versionId'
    or p_reservation->'resource'<>p_confirmation->'resource'
    or p_reservation->>'operationId'=p_confirmation->>'operationId'
    or p_reservation->>'idempotencyKey'=p_confirmation->>'idempotencyKey' then
    raise exception using errcode='22023',message='attachment_verified_confirmation_invalid';
  end if;
  perform set_config('request.jwt.claim.sub',p_actor_user_id::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  if auth.uid() is distinct from p_actor_user_id then
    raise exception using errcode='42501',message='attachment_actor_rebind_failed';end if;
  if not private.attachment_resource_authorized_v2(
    p_organization_id,p_confirmation->'resource','student.edit') then
    raise exception using errcode='42501',message='attachment_resource_edit_required';end if;

  v_operation:=(p_confirmation->>'operationId')::uuid;
  v_key:=(p_confirmation->>'idempotencyKey')::uuid;
  v_attachment:=(p_confirmation->>'attachmentId')::uuid;
  v_version_id:=(p_confirmation->>'versionId')::uuid;
  v_expected:=(p_confirmation->>'expectedVersion')::bigint;
  v_replay:=private.command_identity_or_replay_result(
    p_organization_id,v_operation,v_key,v_attachment,'attachment-confirm-v2',p_confirmation);
  if v_replay is not null then return private.attachment_envelope_v2(v_replay,v_version_id);end if;

  select r.* into v_record from public.attachment_records r where r.id=v_attachment for update;
  select v.* into v_version from public.attachment_versions v
    where v.id=v_version_id and v.attachment_id=v_attachment for update;
  if v_record.id is null or v_version.id is null
    or v_record.current_version_id<>v_version.id or v_record.state<>'pending-upload'
    or v_version.state<>'pending-upload' or v_version.created_by<>p_actor_user_id
    or v_record.created_by<>p_actor_user_id
    or private.attachment_record_resource_v2(v_record)<>p_confirmation->'resource'
    or v_record.purpose<>p_reservation#>>'{upload,purpose}'
    or v_version.mime_type<>p_reservation#>>'{upload,mimeType}'
    or v_version.original_name<>btrim(p_reservation#>>'{upload,fileName}')
    or v_version.byte_length::text<>p_reservation#>>'{upload,byteLength}'
    or v_version.sha256<>p_reservation#>>'{upload,sha256}'
    or v_version.sha256<>p_verified_sha256 then
    return private.attachment_envelope_v2(private.command_rejected_result(
      v_operation,v_key,v_attachment,'resource-unavailable','La reserva verificada ya no está disponible.'));
  end if;
  if v_record.version::bigint<>v_expected then
    return private.attachment_envelope_v2(private.command_version_conflict_result(
      v_operation,v_key,v_attachment,v_expected,v_record.version,'La versión del adjunto cambió.'));
  end if;
  if not private.attachment_resource_authorized_v2(
    p_organization_id,p_confirmation->'resource','student.edit') then
    return private.attachment_envelope_v2(private.command_rejected_result(
      v_operation,v_key,v_attachment,'permission-denied','La autorización para confirmar dejó de estar vigente.'));
  end if;
  perform private.require_open_test_batch(p_organization_id,v_record.test_run_id);
  if v_version.supersedes_version_id is not null then
    update public.attachment_versions set state='archived',archived_at=now()
      where id=v_version.supersedes_version_id and attachment_id=v_attachment and state in ('available','failed');
  end if;
  update public.attachment_versions set state='available',confirmed_at=now(),archived_at=null
    where id=v_version_id;
  update public.attachment_records set state='available',archived_at=null where id=v_attachment;
  insert into public.attachment_events_v2(
    organization_id,attachment_id,version_id,action,actor_user_id,test_run_id)
  values(p_organization_id,v_attachment,v_version_id,'confirmed',p_actor_user_id,v_record.test_run_id);
  if v_record.resource_kind='student' then
    insert into public.audit_events(organization_id,actor_user_id,entity_type,entity_id,action,test_run_id)
    values(p_organization_id,p_actor_user_id,'client',v_record.client_id,'updated',v_record.test_run_id);
  end if;
  return private.attachment_envelope_v2(private.issue_command_receipt(
    p_organization_id,v_operation,v_key,v_attachment,'attachment-confirm-v2',p_confirmation,
    v_record.version,v_record.test_run_id),v_version_id);
end;
$$;

create function public.aba_attachment_mark_verification_failed_v2(
  p_organization_id uuid,p_actor_user_id uuid,p_reservation jsonb,p_reason text
)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_attachment uuid;v_version_id uuid;v_record public.attachment_records%rowtype;
  v_version public.attachment_versions%rowtype;
begin
  if p_actor_user_id is null or p_reason not in ('bytes-mismatch','download-unavailable')
    or not private.attachment_command_v2_valid(p_reservation)
    or p_reservation->>'action'<>'reserve-upload' then
    raise exception using errcode='22023',message='attachment_failure_marker_invalid';end if;
  v_attachment:=(p_reservation->>'attachmentId')::uuid;
  v_version_id:=(p_reservation->>'versionId')::uuid;
  select r.* into v_record from public.attachment_records r where r.id=v_attachment for update;
  select v.* into v_version from public.attachment_versions v
    where v.id=v_version_id and v.attachment_id=v_attachment for update;
  if v_record.id is null or v_version.id is null or v_record.current_version_id<>v_version.id
    or v_version.created_by<>p_actor_user_id or v_version.state<>'pending-upload'
    or v_version.sha256<>p_reservation#>>'{upload,sha256}' then return false;end if;
  update public.attachment_versions set state='failed' where id=v_version_id;
  update public.attachment_records set state='failed' where id=v_attachment;
  insert into public.attachment_events_v2(
    organization_id,attachment_id,version_id,action,actor_user_id,test_run_id)
  values(p_organization_id,v_attachment,v_version_id,'verification-failed',p_actor_user_id,v_record.test_run_id);
  return true;
end;
$$;

revoke all on function public.aba_attachment_verification_target_v2(uuid,jsonb,jsonb)
  from public,anon,service_role;
grant execute on function public.aba_attachment_verification_target_v2(uuid,jsonb,jsonb)
  to authenticated;
revoke all on function
  public.aba_attachment_confirm_verified_v2(uuid,uuid,jsonb,jsonb,text),
  public.aba_attachment_mark_verification_failed_v2(uuid,uuid,jsonb,text)
from public,anon,authenticated;
grant execute on function
  public.aba_attachment_confirm_verified_v2(uuid,uuid,jsonb,jsonb,text),
  public.aba_attachment_mark_verification_failed_v2(uuid,uuid,jsonb,text)
to service_role;

comment on function public.aba_attachment_confirm_verified_v2(uuid,uuid,jsonb,jsonb,text) is
  'Internal Edge-only transition after actual object bytes matched the reserved size, magic signature and SHA-256.';

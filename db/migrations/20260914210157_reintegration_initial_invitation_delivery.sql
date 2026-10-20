-- Root reviewed and ordered after migration37; do not rewrite applied history.
-- Existing completed replay recovers the SAME durable initial delivery.
-- New operations for existing members must use explicit resend, never direct Auth.
create or replace function private.mvp_begin_clinic_invitation_impl(
  p_organization_id uuid,p_operation_id uuid,p_email text,p_role text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_email text:=lower(btrim(p_email)); v_operation private.clinic_invitation_operations;
  v_existing_member boolean;
begin
  if auth.uid() is null or not private.is_clinic_admin(p_organization_id) then
    raise exception using errcode='42501',message='clinic_admin_required';
  end if;
  if p_operation_id is null or p_role is null or p_role not in ('admin','supervisor','therapist')
    or v_email is null or char_length(v_email) not between 3 and 254
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception using errcode='22023',message='invalid_invitation';
  end if;
  perform 1 from public.organizations where id=p_organization_id for update;
  if not found then raise exception using errcode='22023',message='organization_not_found'; end if;
  if auth.uid() is null or not private.is_clinic_admin(p_organization_id) then
    raise exception using errcode='42501',message='clinic_admin_required';
  end if;
  select exists(select 1 from public.memberships m join auth.users u on u.id=m.user_id
    where m.organization_id=p_organization_id and lower(u.email)=v_email) into v_existing_member;
  select * into v_operation from private.clinic_invitation_operations
    where organization_id=p_organization_id and id=p_operation_id for update;
  if found then
    if v_operation.email<>v_email or v_operation.requested_role<>p_role then
      raise exception using errcode='22023',message='invitation_idempotency_conflict';
    end if;
    if v_operation.status='pending' and v_existing_member then
      -- Do not email a historical pending intent whose member now exists.
      -- Initial replay recovery should complete it first without sending mail,
      -- then use the canonical delivery operation (same stable operation/key).
      raise exception using errcode='22023',message='existing_membership_use_resend';
    end if;
    return jsonb_build_object('operation_id',v_operation.id,'status',v_operation.status,
      'user_id',v_operation.subject_user_id,'role',v_operation.requested_role);
  end if;
  if v_existing_member then
    raise exception using errcode='22023',message='existing_membership_use_resend';
  end if;
  select * into v_operation from private.clinic_invitation_operations
    where organization_id=p_organization_id and email=v_email and status='pending' for update;
  if found then
    if v_operation.requested_role<>p_role then
      raise exception using errcode='22023',message='invitation_pending_conflict';
    end if;
    return jsonb_build_object('operation_id',v_operation.id,'status',v_operation.status,'user_id',null,'role',v_operation.requested_role);
  end if;
  insert into private.clinic_invitation_operations(organization_id,id,email,requested_role,actor_user_id)
    values(p_organization_id,p_operation_id,v_email,p_role,auth.uid()) returning * into v_operation;
  return jsonb_build_object('operation_id',v_operation.id,'status',v_operation.status,'user_id',null,'role',v_operation.requested_role);
end $$;
-- Existing wrapper/grants remain unchanged. No new grant or public definer here.

-- Reserve the canonical invitation UUID namespace for the initial actor only.
-- Explicit resends use fresh independent UUIDs; cannot impersonate another
-- actor's initial delivery after its sent terminal state.
create or replace function private.aba_reserve_team_invitation_delivery_impl(p_org uuid,p_invite uuid,p_operation uuid,p_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a uuid:=auth.uid(); i private.clinic_invitation_operations; d private.team_invitation_deliveries;
  batch uuid; hash text;
begin
  if a is null or not private.is_clinic_admin(p_org) then raise exception using errcode='42501',message='clinic_admin_required'; end if;
  if p_invite is null or p_operation is null or p_key is null then raise exception using errcode='22023',message='invalid_delivery_command'; end if;
  perform 1 from public.organizations where id=p_org for update;
  perform private.require_delivery_actor(p_org,a);
  i:=private.require_delivery_target(p_org,p_invite);
  perform private.expire_team_invitation_claims(p_org,a);
  if (p_operation=p_invite or p_key=p_invite) and
    (p_operation<>p_invite or p_key<>p_invite or i.actor_user_id<>a) then
    raise exception using errcode='42501',message='initial_delivery_actor_required';
  end if;
  select test_run_id into batch from public.organizations where id=p_org;
  perform private.require_open_test_batch(p_org,batch);
  hash:=encode(extensions.digest(jsonb_build_object('version',1,'organizationId',p_org,'invitationId',p_invite,
    'userId',i.subject_user_id,'email',i.email,'role',i.requested_role)::text,'sha256'),'hex');
  select * into d from private.team_invitation_deliveries where organization_id=p_org and actor_user_id=a
    and (operation_id=p_operation or idempotency_key=p_key) order by created_at limit 1 for update;
  if found then
    if d.operation_id<>p_operation or d.idempotency_key<>p_key or d.invitation_id<>p_invite or d.payload_hash<>hash then
      raise exception using errcode='22023',message='delivery_idempotency_conflict';
    end if;
    return private.team_invitation_delivery_json(d);
  end if;
  if exists(select 1 from auth.users where id=i.subject_user_id and email_confirmed_at is not null) then
    raise exception using errcode='22023',message='invitation_already_accepted';
  end if;
  if exists(select 1 from private.team_invitation_deliveries where organization_id=p_org and subject_user_id=i.subject_user_id and state in ('pending','claimed','unknown')) then
    raise exception using errcode='22023',message='delivery_requires_resolution';
  end if;
  insert into private.team_invitation_deliveries(organization_id,invitation_id,subject_user_id,actor_user_id,operation_id,idempotency_key,payload_hash,test_run_id)
    values(p_org,p_invite,i.subject_user_id,a,p_operation,p_key,hash,batch) returning * into d;
  insert into public.clinic_admin_events(organization_id,actor_user_id,subject_user_id,action)
    values(p_org,a,i.subject_user_id,'team_invitation_delivery.reserve');
  return private.team_invitation_delivery_json(d);
end $$;

-- Pending expiry is known mail-free: no claim means no authorised SMTP attempt.
-- Existing helper callers (claim/finish/list/status/resolve) inherit both expiries.
alter table private.team_invitation_deliveries drop constraint team_invitation_deliveries_error_code_check;
alter table private.team_invitation_deliveries add constraint team_invitation_deliveries_error_code_check
  check(error_code in ('already-accepted','auth-rejected','transport-unknown','claim-expired','reservation-expired','operator-observed-mailpit','operator-authorized-possible-duplicate'));
create or replace function private.team_invitation_delivery_json(d private.team_invitation_deliveries)
returns jsonb language sql stable security invoker set search_path='' as $$
  select jsonb_build_object('deliveryId',d.id,'organizationId',d.organization_id,'invitationId',d.invitation_id,
    'operationId',d.operation_id,'idempotencyKey',d.idempotency_key,'payloadVersion',d.payload_version,
    'state',d.state,'version',d.version,'createdAt',d.created_at,'updatedAt',d.updated_at,
    'expiresAt',case when d.state='claimed' then d.claimed_at+interval '90 seconds'
      when d.state='pending' then d.created_at+interval '90 seconds' end,
    'errorCode',d.error_code,'confirmationSource',d.confirmation_source,'testRunId',d.test_run_id);
$$;
create or replace function private.expire_team_invitation_claims(p_org uuid,p_actor uuid) returns void
language plpgsql security invoker set search_path='' as $$ begin
  with changed as (
    update private.team_invitation_deliveries set
      error_code=case when state='pending' then 'reservation-expired' else 'claim-expired' end,
      state=case when state='pending' then 'failed' else 'unknown' end,
      claim_token=null,completed_at=now(),version=version+1,updated_at=now()
    where organization_id=p_org and ((state='pending' and created_at<now()-interval '90 seconds')
      or (state='claimed' and claimed_at<now()-interval '90 seconds'))
    returning invitation_id,error_code
  ) insert into public.clinic_admin_events(organization_id,actor_user_id,subject_user_id,action)
    select p_org,p_actor,i.subject_user_id,'team_invitation_delivery.'||c.error_code
    from changed c join private.clinic_invitation_operations i on i.organization_id=p_org and i.id=c.invitation_id;
end $$;

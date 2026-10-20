-- A1 R1 proposal ONLY. Root reviews/orders migration. Not applied by A1.
-- Separate durable email delivery, never the completed membership intent.
create table private.team_invitation_deliveries (
  organization_id uuid not null references public.organizations(id) on delete restrict,
  id uuid not null default gen_random_uuid(), invitation_id uuid not null,
  subject_user_id uuid not null references auth.users(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  operation_id uuid not null, idempotency_key uuid not null,
  payload_version integer not null default 1 check(payload_version=1),
  payload_hash text not null check(payload_hash ~ '^[0-9a-f]{64}$'),
  state text not null default 'pending' check(state in ('pending','claimed','sent','failed','unknown')),
  version bigint not null default 1 check(version between 1 and 9007199254740991),
  claim_token uuid, claimed_at timestamptz, completed_at timestamptz,
  error_code text check(error_code in ('already-accepted','auth-rejected','transport-unknown','claim-expired','operator-observed-mailpit','operator-authorized-possible-duplicate')),
  confirmation_source text check(confirmation_source in ('auth','operator-mailpit')),
  resolved_by uuid references auth.users(id) on delete restrict,
  test_run_id uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key(organization_id,id),
  unique(organization_id,actor_user_id,operation_id),
  unique(organization_id,actor_user_id,idempotency_key),
  foreign key(organization_id,invitation_id) references private.clinic_invitation_operations(organization_id,id) on delete restrict,
  foreign key(organization_id,test_run_id) references public.test_data_batches(organization_id,id) on delete restrict,
  check ((state='pending' and claim_token is null and claimed_at is null and completed_at is null)
    or (state='claimed' and claim_token is not null and claimed_at is not null and completed_at is null)
    or (state in ('sent','failed','unknown') and claim_token is null and completed_at is not null))
);
create unique index team_invitation_delivery_blocking_idx on private.team_invitation_deliveries(organization_id,subject_user_id) where state in ('pending','claimed','unknown');
create index team_invitation_delivery_recent_idx on private.team_invitation_deliveries(organization_id,invitation_id,created_at desc);
create index team_invitation_delivery_actor_idx on private.team_invitation_deliveries(actor_user_id);
create index team_invitation_delivery_resolved_by_idx on private.team_invitation_deliveries(resolved_by) where resolved_by is not null;
create index team_invitation_delivery_test_run_idx on private.team_invitation_deliveries(organization_id,test_run_id) where test_run_id is not null;
grant usage on schema private to service_role;
alter table private.team_invitation_deliveries enable row level security;
revoke all on table private.team_invitation_deliveries from public,anon,authenticated,service_role;

create function private.team_invitation_delivery_json(d private.team_invitation_deliveries)
returns jsonb language sql stable security invoker set search_path='' as $$
  select jsonb_build_object('deliveryId',d.id,'organizationId',d.organization_id,'invitationId',d.invitation_id,
    'operationId',d.operation_id,'idempotencyKey',d.idempotency_key,'payloadVersion',d.payload_version,
    'state',d.state,'version',d.version,'createdAt',d.created_at,'updatedAt',d.updated_at,
    'expiresAt',case when d.state='claimed' then d.claimed_at+interval '90 seconds' end,
    'errorCode',d.error_code,'confirmationSource',d.confirmation_source,'testRunId',d.test_run_id);
$$;
revoke all on function private.team_invitation_delivery_json(private.team_invitation_deliveries) from public,anon,authenticated,service_role;

-- Worker actor is derived from verified JWT by Edge; no actor field in browser body.
-- This is the same active-admin boundary as existing private.is_clinic_admin,
-- with explicit actor because service_role has no application auth.uid().
create function private.require_delivery_actor(p_org uuid,p_actor uuid) returns void
language plpgsql security invoker set search_path='' as $$ begin
  if p_actor is null or not exists(select 1 from auth.users u join public.memberships m on m.user_id=u.id
    join public.organizations o on o.id=m.organization_id
    where u.id=p_actor and o.id=p_org and o.status='active' and m.role='admin' and m.status='active') then
    raise exception using errcode='42501',message='clinic_admin_required';
  end if;
end $$;
revoke all on function private.require_delivery_actor(uuid,uuid) from public,anon,authenticated,service_role;

create function private.require_delivery_target(p_org uuid,p_invite uuid)
returns private.clinic_invitation_operations language plpgsql security invoker set search_path='' as $$
declare i private.clinic_invitation_operations; begin
  select * into i from private.clinic_invitation_operations where organization_id=p_org and id=p_invite for share;
  if not found or i.status<>'completed' or not exists(select 1 from public.memberships m join auth.users u on u.id=m.user_id
    where m.organization_id=p_org and m.user_id=i.subject_user_id and m.status='active' and m.role=i.requested_role and lower(u.email)=i.email) then
    raise exception using errcode='22023',message='invitation_target_changed';
  end if;
  return i;
end $$;
revoke all on function private.require_delivery_target(uuid,uuid) from public,anon,authenticated,service_role;

create function private.aba_reserve_team_invitation_delivery_impl(p_org uuid,p_invite uuid,p_operation uuid,p_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a uuid:=auth.uid(); i private.clinic_invitation_operations; d private.team_invitation_deliveries;
  batch uuid; hash text; begin
  if a is null or not private.is_clinic_admin(p_org) then raise exception using errcode='42501',message='clinic_admin_required'; end if;
  if p_invite is null or p_operation is null or p_key is null then raise exception using errcode='22023',message='invalid_delivery_command'; end if;
  perform 1 from public.organizations where id=p_org for update;
  perform private.require_delivery_actor(p_org,a);
  i:=private.require_delivery_target(p_org,p_invite);
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
  -- New explicit operations are allowed after sent/definitive failed, never while unresolved.
  if exists(select 1 from private.team_invitation_deliveries where organization_id=p_org and subject_user_id=i.subject_user_id and state in ('pending','claimed','unknown')) then
    raise exception using errcode='22023',message='delivery_requires_resolution';
  end if;
  insert into private.team_invitation_deliveries(organization_id,invitation_id,subject_user_id,actor_user_id,operation_id,idempotency_key,payload_hash,test_run_id)
    values(p_org,p_invite,i.subject_user_id,a,p_operation,p_key,hash,batch) returning * into d;
  insert into public.clinic_admin_events(organization_id,actor_user_id,subject_user_id,action)
    values(p_org,a,i.subject_user_id,'team_invitation_delivery.reserve');
  return private.team_invitation_delivery_json(d);
end $$;

create function private.expire_team_invitation_claims(p_org uuid,p_actor uuid) returns void
language plpgsql security invoker set search_path='' as $$ begin
  with changed as (
    update private.team_invitation_deliveries set state='unknown',claim_token=null,completed_at=now(),
      error_code='claim-expired',version=version+1,updated_at=now()
    where organization_id=p_org and state='claimed' and claimed_at<now()-interval '90 seconds'
    returning invitation_id
  ) insert into public.clinic_admin_events(organization_id,actor_user_id,subject_user_id,action)
    select p_org,p_actor,i.subject_user_id,'team_invitation_delivery.claim-expired'
    from changed c join private.clinic_invitation_operations i on i.organization_id=p_org and i.id=c.invitation_id;
end $$;
revoke all on function private.expire_team_invitation_claims(uuid,uuid) from public,anon,authenticated,service_role;

create function private.aba_claim_team_invitation_delivery_impl(p_org uuid,p_delivery uuid,p_actor uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d private.team_invitation_deliveries; i private.clinic_invitation_operations; begin
  if (auth.jwt()->>'role') is distinct from 'service_role' then raise exception using errcode='42501',message='delivery_worker_required'; end if;
  perform private.require_delivery_actor(p_org,p_actor);
  perform 1 from public.organizations where id=p_org for update;
  perform private.require_delivery_actor(p_org,p_actor);
  perform private.expire_team_invitation_claims(p_org,p_actor);
  select * into d from private.team_invitation_deliveries where organization_id=p_org and id=p_delivery for update;
  if not found or d.actor_user_id<>p_actor then raise exception using errcode='42501',message='delivery_not_available'; end if;
  i:=private.require_delivery_target(p_org,d.invitation_id);
  perform private.require_open_test_batch(p_org,d.test_run_id);
  if d.state<>'pending' then return jsonb_build_object('send',false,'delivery',private.team_invitation_delivery_json(d)); end if;
  if exists(select 1 from auth.users where id=i.subject_user_id and email_confirmed_at is not null) then
    update private.team_invitation_deliveries set state='failed',error_code='already-accepted',completed_at=now(),version=version+1,updated_at=now()
      where organization_id=p_org and id=p_delivery returning * into d;
    insert into public.clinic_admin_events(organization_id,actor_user_id,subject_user_id,action)
      values(p_org,p_actor,i.subject_user_id,'team_invitation_delivery.already-accepted');
    return jsonb_build_object('send',false,'delivery',private.team_invitation_delivery_json(d));
  end if;
  update private.team_invitation_deliveries set state='claimed',claim_token=gen_random_uuid(),claimed_at=now(),version=version+1,updated_at=now()
    where organization_id=p_org and id=p_delivery returning * into d;
  insert into public.clinic_admin_events(organization_id,actor_user_id,subject_user_id,action)
    values(p_org,p_actor,i.subject_user_id,'team_invitation_delivery.claim');
  -- This response is granted ONLY service_role; claimToken never enters browser DTO.
  return jsonb_build_object('send',true,'delivery',private.team_invitation_delivery_json(d),
    'recipient',i.email,'subjectUserId',i.subject_user_id,'claimToken',d.claim_token);
end $$;

create function private.aba_finish_team_invitation_delivery_impl(p_org uuid,p_delivery uuid,p_actor uuid,p_claim uuid,p_outcome text,p_error text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d private.team_invitation_deliveries; i private.clinic_invitation_operations; begin
  if (auth.jwt()->>'role') is distinct from 'service_role' then raise exception using errcode='42501',message='delivery_worker_required'; end if;
  perform private.require_delivery_actor(p_org,p_actor);
  perform 1 from public.organizations where id=p_org for update;
  perform private.require_delivery_actor(p_org,p_actor);
  perform private.expire_team_invitation_claims(p_org,p_actor);
  select * into d from private.team_invitation_deliveries where organization_id=p_org and id=p_delivery for update;
  if not found or d.actor_user_id<>p_actor then raise exception using errcode='42501',message='delivery_not_available'; end if;
  i:=private.require_delivery_target(p_org,d.invitation_id);
  perform private.require_open_test_batch(p_org,d.test_run_id);
  if d.state<>'claimed' then return private.team_invitation_delivery_json(d); end if;
  if p_claim is null or d.claim_token<>p_claim then raise exception using errcode='42501',message='delivery_claim_mismatch'; end if;
  if p_outcome not in ('sent','failed','unknown') or p_outcome is null
    or (p_outcome='sent' and p_error is not null)
    or (p_outcome='failed' and (p_error is null or p_error not in ('already-accepted','auth-rejected')))
    or (p_outcome='unknown' and p_error is distinct from 'transport-unknown') then
    raise exception using errcode='22023',message='invalid_delivery_outcome';
  end if;
  update private.team_invitation_deliveries set state=p_outcome,claim_token=null,completed_at=now(),error_code=p_error,
    confirmation_source=case when p_outcome='sent' then 'auth' end,version=version+1,updated_at=now()
    where organization_id=p_org and id=p_delivery returning * into d;
  insert into public.clinic_admin_events(organization_id,actor_user_id,subject_user_id,action)
    values(p_org,p_actor,i.subject_user_id,'team_invitation_delivery.'||p_outcome);
  return private.team_invitation_delivery_json(d);
end $$;

create function private.aba_team_invitation_deliveries_impl(p_org uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a uuid:=auth.uid(); result jsonb; begin
  if a is null or not private.is_clinic_admin(p_org) then raise exception using errcode='42501',message='clinic_admin_required'; end if;
  perform 1 from public.organizations where id=p_org for update;
  perform private.require_delivery_actor(p_org,a);
  perform private.expire_team_invitation_claims(p_org,a);
  select coalesce(jsonb_agg(jsonb_build_object('invitationId',i.id,'userId',i.subject_user_id,'email',i.email,'role',i.requested_role,
    'accepted',u.email_confirmed_at is not null,
    'eligible',m.status='active' and m.role=i.requested_role and lower(u.email)=i.email,
    'lastDelivery',case when d.id is null then null else private.team_invitation_delivery_json(d) end)
    order by i.created_at desc),'[]'::jsonb) into result
  from (select distinct on(subject_user_id) * from private.clinic_invitation_operations
    where organization_id=p_org and status='completed' order by subject_user_id,
      exists(select 1 from private.team_invitation_deliveries b where b.organization_id=p_org
        and b.invitation_id=clinic_invitation_operations.id and b.state in ('pending','claimed','unknown')) desc,
      created_at desc,id) i
  join auth.users u on u.id=i.subject_user_id
  join public.memberships m on m.organization_id=p_org and m.user_id=i.subject_user_id
  left join lateral (select * from private.team_invitation_deliveries where organization_id=p_org and invitation_id=i.id order by created_at desc,id limit 1) d on true;
  return result;
end $$;

create function private.aba_team_invitation_delivery_status_impl(p_org uuid,p_invite uuid,p_operation uuid,p_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a uuid:=auth.uid(); d private.team_invitation_deliveries; begin
  if a is null or not private.is_clinic_admin(p_org) then raise exception using errcode='42501',message='clinic_admin_required'; end if;
  perform 1 from public.organizations where id=p_org for update;
  perform private.require_delivery_actor(p_org,a);
  perform private.require_delivery_target(p_org,p_invite);
  perform private.expire_team_invitation_claims(p_org,a);
  select * into d from private.team_invitation_deliveries where organization_id=p_org and actor_user_id=a
    and invitation_id=p_invite and operation_id=p_operation and idempotency_key=p_key;
  if not found then return null; end if;
  return private.team_invitation_delivery_json(d);
end $$;

create function private.aba_resolve_team_invitation_delivery_impl(p_org uuid,p_delivery uuid,p_expected_version bigint,p_decision text,p_evidence_ack boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a uuid:=auth.uid(); d private.team_invitation_deliveries; i private.clinic_invitation_operations; begin
  if a is null or not private.is_clinic_admin(p_org) then raise exception using errcode='42501',message='clinic_admin_required'; end if;
  perform 1 from public.organizations where id=p_org for update;
  perform private.require_delivery_actor(p_org,a);
  perform private.expire_team_invitation_claims(p_org,a);
  select * into d from private.team_invitation_deliveries where organization_id=p_org and id=p_delivery for update;
  if not found then raise exception using errcode='22023',message='delivery_not_available'; end if;
  i:=private.require_delivery_target(p_org,d.invitation_id);
  perform private.require_open_test_batch(p_org,d.test_run_id);
  if p_evidence_ack is not true or p_decision is null or p_decision not in ('observed-sent','allow-new-request') then
    raise exception using errcode='22023',message='explicit_delivery_resolution_required';
  end if;
  if p_expected_version is null or d.version<>p_expected_version then raise exception using errcode='40001',message='delivery_version_conflict'; end if;
  if d.state<>'unknown' then raise exception using errcode='22023',message='delivery_not_unknown'; end if;
  update private.team_invitation_deliveries set state=case when p_decision='observed-sent' then 'sent' else 'failed' end,
    error_code=case when p_decision='observed-sent' then 'operator-observed-mailpit' else 'operator-authorized-possible-duplicate' end,
    confirmation_source=case when p_decision='observed-sent' then 'operator-mailpit' end,
    resolved_by=a,version=version+1,updated_at=now()
    where organization_id=p_org and id=p_delivery returning * into d;
  insert into public.clinic_admin_events(organization_id,actor_user_id,subject_user_id,action)
    values(p_org,a,i.subject_user_id,'team_invitation_delivery.resolve.'||p_decision);
  return private.team_invitation_delivery_json(d);
end $$;

create function public.aba_reserve_team_invitation_delivery(p_org uuid,p_invite uuid,p_operation uuid,p_key uuid)
returns jsonb language sql security invoker set search_path='' as $$ select private.aba_reserve_team_invitation_delivery_impl(p_org,p_invite,p_operation,p_key) $$;
create function public.aba_team_invitation_deliveries(p_org uuid)
returns jsonb language sql security invoker set search_path='' as $$ select private.aba_team_invitation_deliveries_impl(p_org) $$;
create function public.aba_team_invitation_delivery_status(p_org uuid,p_invite uuid,p_operation uuid,p_key uuid)
returns jsonb language sql security invoker set search_path='' as $$ select private.aba_team_invitation_delivery_status_impl(p_org,p_invite,p_operation,p_key) $$;
create function public.aba_resolve_team_invitation_delivery(p_org uuid,p_delivery uuid,p_expected_version bigint,p_decision text,p_evidence_ack boolean)
returns jsonb language sql security invoker set search_path='' as $$ select private.aba_resolve_team_invitation_delivery_impl(p_org,p_delivery,p_expected_version,p_decision,p_evidence_ack) $$;
create function public.aba_claim_team_invitation_delivery(p_org uuid,p_delivery uuid,p_actor uuid)
returns jsonb language sql security invoker set search_path='' as $$ select private.aba_claim_team_invitation_delivery_impl(p_org,p_delivery,p_actor) $$;
create function public.aba_finish_team_invitation_delivery(p_org uuid,p_delivery uuid,p_actor uuid,p_claim uuid,p_outcome text,p_error text default null)
returns jsonb language sql security invoker set search_path='' as $$ select private.aba_finish_team_invitation_delivery_impl(p_org,p_delivery,p_actor,p_claim,p_outcome,p_error) $$;

revoke all on function private.aba_reserve_team_invitation_delivery_impl(uuid,uuid,uuid,uuid),private.aba_team_invitation_deliveries_impl(uuid),
  private.aba_team_invitation_delivery_status_impl(uuid,uuid,uuid,uuid),private.aba_resolve_team_invitation_delivery_impl(uuid,uuid,bigint,text,boolean),
  public.aba_reserve_team_invitation_delivery(uuid,uuid,uuid,uuid),public.aba_team_invitation_deliveries(uuid),
  public.aba_team_invitation_delivery_status(uuid,uuid,uuid,uuid),public.aba_resolve_team_invitation_delivery(uuid,uuid,bigint,text,boolean)
  from public,anon,authenticated,service_role;
grant execute on function private.aba_reserve_team_invitation_delivery_impl(uuid,uuid,uuid,uuid),private.aba_team_invitation_deliveries_impl(uuid),
  private.aba_team_invitation_delivery_status_impl(uuid,uuid,uuid,uuid),private.aba_resolve_team_invitation_delivery_impl(uuid,uuid,bigint,text,boolean),
  public.aba_reserve_team_invitation_delivery(uuid,uuid,uuid,uuid),public.aba_team_invitation_deliveries(uuid),
  public.aba_team_invitation_delivery_status(uuid,uuid,uuid,uuid),public.aba_resolve_team_invitation_delivery(uuid,uuid,bigint,text,boolean)
  to authenticated;
revoke all on function private.aba_claim_team_invitation_delivery_impl(uuid,uuid,uuid),private.aba_finish_team_invitation_delivery_impl(uuid,uuid,uuid,uuid,text,text),
  public.aba_claim_team_invitation_delivery(uuid,uuid,uuid),public.aba_finish_team_invitation_delivery(uuid,uuid,uuid,uuid,text,text)
  from public,anon,authenticated,service_role;
grant execute on function private.aba_claim_team_invitation_delivery_impl(uuid,uuid,uuid),private.aba_finish_team_invitation_delivery_impl(uuid,uuid,uuid,uuid,text,text),
  public.aba_claim_team_invitation_delivery(uuid,uuid,uuid),public.aba_finish_team_invitation_delivery(uuid,uuid,uuid,uuid,text,text)
  to service_role;
-- Claim token/recipient are exposed only by service-role worker wrappers.
-- No ledger ack is fabricated for SMTP. Delivery UUID/version/state is its durable receipt.
-- Auth/SMTP and PostgreSQL are not one transaction: ambiguous transport remains unknown.

-- Durable, retryable hand-off between Supabase Auth invitation and clinic DB state.
create table private.clinic_invitation_operations (
  organization_id uuid not null references public.organizations(id) on delete restrict,
  id uuid not null,
  email text not null check (
    email = lower(btrim(email))
    and char_length(email) between 3 and 254
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  requested_role text not null check (requested_role in ('admin', 'supervisor', 'therapist')),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  subject_user_id uuid references auth.users(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (organization_id, id),
  check (
    (status = 'pending' and subject_user_id is null and completed_at is null)
    or (status = 'completed' and subject_user_id is not null and completed_at is not null)
  )
);

create unique index clinic_invitation_operations_pending_email_idx
  on private.clinic_invitation_operations(organization_id, email)
  where status = 'pending';
create index clinic_invitation_operations_actor_idx
  on private.clinic_invitation_operations(actor_user_id);
create index clinic_invitation_operations_subject_idx
  on private.clinic_invitation_operations(subject_user_id)
  where subject_user_id is not null;
create index clinic_invitation_operations_status_idx
  on private.clinic_invitation_operations(organization_id, status, created_at);

revoke all on table private.clinic_invitation_operations
  from public, anon, authenticated;

create function public.mvp_begin_clinic_invitation(
  p_organization_id uuid,
  p_operation_id uuid,
  p_email text,
  p_role text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(p_email));
  v_operation private.clinic_invitation_operations;
begin
  if (select auth.uid()) is null or not private.is_clinic_admin(p_organization_id) then
    raise exception using errcode = '42501', message = 'clinic_admin_required';
  end if;
  if p_operation_id is null
    or p_role is null
    or p_role not in ('admin', 'supervisor', 'therapist')
    or char_length(v_email) not between 3 and 254
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  then
    raise exception using errcode = '22023', message = 'invalid_invitation';
  end if;

  -- Serialize invitations with membership changes for this small MVP tenant.
  perform 1
  from public.organizations
  where id = p_organization_id
  for update;
  if not found then
    raise exception using errcode = '22023', message = 'organization_not_found';
  end if;

  select * into v_operation
  from private.clinic_invitation_operations
  where organization_id = p_organization_id and id = p_operation_id
  for update;

  if found then
    if v_operation.email <> v_email or v_operation.requested_role <> p_role then
      raise exception using errcode = '22023', message = 'invitation_idempotency_conflict';
    end if;
    return jsonb_build_object(
      'operation_id', v_operation.id,
      'status', v_operation.status,
      'user_id', v_operation.subject_user_id,
      'role', v_operation.requested_role
    );
  end if;

  select * into v_operation
  from private.clinic_invitation_operations
  where organization_id = p_organization_id
    and email = v_email
    and status = 'pending'
  for update;

  if found then
    if v_operation.requested_role <> p_role then
      raise exception using errcode = '22023', message = 'invitation_pending_conflict';
    end if;
    return jsonb_build_object(
      'operation_id', v_operation.id,
      'status', v_operation.status,
      'user_id', null,
      'role', v_operation.requested_role
    );
  end if;

  insert into private.clinic_invitation_operations(
    organization_id, id, email, requested_role, actor_user_id
  ) values (
    p_organization_id, p_operation_id, v_email, p_role, (select auth.uid())
  )
  returning * into v_operation;

  return jsonb_build_object(
    'operation_id', v_operation.id,
    'status', v_operation.status,
    'user_id', null,
    'role', v_operation.requested_role
  );
end;
$$;

create function public.mvp_complete_clinic_invitation(
  p_organization_id uuid,
  p_operation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_operation private.clinic_invitation_operations;
  v_subject_user_id uuid;
begin
  if (select auth.uid()) is null or not private.is_clinic_admin(p_organization_id) then
    raise exception using errcode = '42501', message = 'clinic_admin_required';
  end if;

  perform 1
  from public.organizations
  where id = p_organization_id
  for update;
  if not found then
    raise exception using errcode = '22023', message = 'organization_not_found';
  end if;

  select * into v_operation
  from private.clinic_invitation_operations
  where organization_id = p_organization_id and id = p_operation_id
  for update;
  if not found then
    raise exception using errcode = '22023', message = 'invitation_not_found';
  end if;

  if v_operation.status = 'completed' then
    return jsonb_build_object(
      'operation_id', v_operation.id,
      'status', v_operation.status,
      'user_id', v_operation.subject_user_id,
      'role', v_operation.requested_role
    );
  end if;

  select id into v_subject_user_id
  from auth.users
  where lower(email) = v_operation.email
  limit 1;
  if not found then
    raise exception using errcode = '22023', message = 'invited_auth_user_not_found';
  end if;

  insert into public.memberships(organization_id, user_id, role, status)
  values (p_organization_id, v_subject_user_id, v_operation.requested_role, 'active')
  on conflict (organization_id, user_id) do update
  set role = excluded.role,
      status = excluded.status;

  insert into public.clinic_admin_events(
    organization_id, actor_user_id, subject_user_id, action
  ) values (
    p_organization_id,
    v_operation.actor_user_id,
    v_subject_user_id,
    'invitation_completed:' || v_operation.requested_role
  );

  update private.clinic_invitation_operations
  set status = 'completed',
      subject_user_id = v_subject_user_id,
      completed_at = now()
  where organization_id = p_organization_id and id = p_operation_id
  returning * into v_operation;

  return jsonb_build_object(
    'operation_id', v_operation.id,
    'status', v_operation.status,
    'user_id', v_operation.subject_user_id,
    'role', v_operation.requested_role
  );
end;
$$;

revoke all on function
  public.mvp_begin_clinic_invitation(uuid, uuid, text, text),
  public.mvp_complete_clinic_invitation(uuid, uuid)
from public, anon;
grant execute on function
  public.mvp_begin_clinic_invitation(uuid, uuid, text, text),
  public.mvp_complete_clinic_invitation(uuid, uuid)
to authenticated;

-- Legacy or out-of-scope commands have no application consumer in the MVP.
-- Keep their definitions for migration compatibility, but remove the API grant.
revoke execute on function
  public.append_clinical_history_entries(uuid, jsonb, uuid),
  public.create_client(text, text, text, date, text, jsonb, jsonb, uuid),
  public.decide_student_authorization(uuid, text, timestamptz, uuid),
  public.request_student_authorization(uuid, text, text[], text, uuid),
  public.revoke_student_authorization(uuid, uuid)
from authenticated;

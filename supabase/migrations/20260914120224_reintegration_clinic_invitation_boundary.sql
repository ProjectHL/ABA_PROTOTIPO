-- Preserve invitation API/idempotency while removing its role-change bypass.
-- Auth mail is a separate side effect; completed never implies mail delivered.
create function private.mvp_begin_clinic_invitation_impl(
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
  -- Membership can change while this transaction waits for the tenant lock.
  if (select auth.uid()) is null or not private.is_clinic_admin(p_organization_id) then
    raise exception using errcode = '42501', message = 'clinic_admin_required';
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

create function private.mvp_complete_clinic_invitation_impl(
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
  v_membership public.memberships;
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
  -- Membership can change while this transaction waits for the tenant lock.
  if (select auth.uid()) is null or not private.is_clinic_admin(p_organization_id) then
    raise exception using errcode = '42501', message = 'clinic_admin_required';
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

  select * into v_membership
  from public.memberships
  where organization_id = p_organization_id and user_id = v_subject_user_id
  for update;
  if found then
    -- An invitation is not a role-change or membership-reactivation command.
    -- In particular, it cannot bypass the final-admin guard in team management.
    if v_membership.role <> v_operation.requested_role or v_membership.status <> 'active' then
      raise exception using errcode = '22023', message = 'existing_membership_conflict_use_team_management';
    end if;
  else
    insert into public.memberships(organization_id, user_id, role, status)
    values (p_organization_id, v_subject_user_id, v_operation.requested_role, 'active');
  end if;

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


create or replace function public.mvp_begin_clinic_invitation(
  p_organization_id uuid, p_operation_id uuid, p_email text, p_role text
) returns jsonb language sql security invoker set search_path = '' as $$
  select private.mvp_begin_clinic_invitation_impl(p_organization_id, p_operation_id, p_email, p_role);
$$;
create or replace function public.mvp_complete_clinic_invitation(
  p_organization_id uuid, p_operation_id uuid
) returns jsonb language sql security invoker set search_path = '' as $$
  select private.mvp_complete_clinic_invitation_impl(p_organization_id, p_operation_id);
$$;
revoke all on function
  private.mvp_begin_clinic_invitation_impl(uuid, uuid, text, text),
  private.mvp_complete_clinic_invitation_impl(uuid, uuid),
  public.mvp_begin_clinic_invitation(uuid, uuid, text, text),
  public.mvp_complete_clinic_invitation(uuid, uuid)
from public, anon, authenticated, service_role;
grant execute on function
  private.mvp_begin_clinic_invitation_impl(uuid, uuid, text, text),
  private.mvp_complete_clinic_invitation_impl(uuid, uuid),
  public.mvp_begin_clinic_invitation(uuid, uuid, text, text),
  public.mvp_complete_clinic_invitation(uuid, uuid)
to authenticated;

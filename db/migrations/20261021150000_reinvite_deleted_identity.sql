-- An invitation to a soft-deleted address used to hit the unique index on
-- lower(email) as a raw 23505. Revive the existing identity instead of
-- inserting a duplicate: sign-in resolves accounts by email.
create or replace function private.mvp_complete_clinic_invitation_impl(
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

  -- Reinviting a deactivated account revives that identity. Creating a second
  -- row with the same email is impossible: auth.users has a unique index on
  -- lower(email), and two rows would make sign-in ambiguous.
  select id into v_subject_user_id
  from auth.users
  where lower(email) = v_operation.email
  order by deleted_at nulls first
  limit 1;
  if not found then
    raise exception using errcode = '22023', message = 'invited_auth_user_not_found';
  end if;
  update auth.users
     set deleted_at = null, updated_at = now()
   where id = v_subject_user_id and deleted_at is not null;

  select * into v_membership
  from public.memberships
  where organization_id = p_organization_id and user_id = v_subject_user_id
  for update;
  if found then
    -- An invitation is not a role-change or membership-reactivation command.
    -- In particular, it cannot bypass the final-admin guard in team management.
    if v_membership.role <> v_operation.requested_role
      or v_membership.status not in ('active', 'pending') then
      raise exception using errcode = '22023', message = 'existing_membership_conflict_use_team_management';
    end if;
  else
    -- Pending grants no access; see the memberships_status_check note above.
    insert into public.memberships(organization_id, user_id, role, status)
    values (p_organization_id, v_subject_user_id, v_operation.requested_role, 'pending');
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

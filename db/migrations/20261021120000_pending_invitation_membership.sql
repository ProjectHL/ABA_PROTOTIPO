-- An invitation is not access. A membership created by an invitation starts
-- `pending`: every authorization function requires `active`, so the invitee
-- cannot read or write clinical data until the invitation is accepted.
-- Acceptance is the invite token being consumed to define a password
-- (src/lib/auth/service.ts `resetPassword`), which activates the membership.
alter table public.memberships drop constraint if exists memberships_status_check;
alter table public.memberships add constraint memberships_status_check
  check (status in ('active', 'inactive', 'pending'));

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

  -- Reinviting a deactivated account must not be blocked by the historical
  -- identity: the invitation creates a new subject user instead.
  select id into v_subject_user_id
  from auth.users
  where lower(email) = v_operation.email and deleted_at is null
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

-- Delivery is allowed for a pending invitation: sending the mail is the step
-- that turns it into an accepted account.
create or replace function private.require_delivery_target(p_org uuid, p_invite uuid)
returns private.clinic_invitation_operations
language plpgsql
security invoker
set search_path = ''
as $$
declare
  i private.clinic_invitation_operations;
begin
  select * into i
  from private.clinic_invitation_operations
  where organization_id = p_org and id = p_invite
  for share;
  if not found or i.status <> 'completed' or not exists (
    select 1
    from public.memberships m
    join auth.users u on u.id = m.user_id
    where m.organization_id = p_org
      and m.user_id = i.subject_user_id
      and m.status in ('active', 'pending')
      and m.role = i.requested_role
      and lower(u.email) = i.email
  ) then
    raise exception using errcode = '22023', message = 'invitation_target_changed';
  end if;
  return i;
end;
$$;

-- An administrator may keep a pending invitation pending while correcting its
-- role, or cancel it with `inactive`.
create or replace function public.mvp_set_member(p_organization_id uuid,p_user_id uuid,p_role text,p_status text)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  -- Serialize admin changes; do not permit removing the last active administrator.
  perform 1 from public.organizations where id=p_organization_id for update;
  if not private.is_clinic_admin(p_organization_id) then
    raise exception using errcode='42501',message='clinic_admin_required';
  end if;
  if p_role is null or p_status is null or p_role not in ('admin','supervisor','therapist') or p_status not in ('active','inactive','pending') then
    raise exception using errcode='22023',message='invalid_membership';
  end if;
  if not exists(select 1 from public.memberships where organization_id=p_organization_id and user_id=p_user_id) then
    raise exception using errcode='22023',message='member_not_found';
  end if;
  if (p_role<>'admin' or p_status<>'active') and exists (
    select 1 from public.memberships where organization_id=p_organization_id and user_id=p_user_id and role='admin' and status='active'
  ) and (select count(*) from public.memberships where organization_id=p_organization_id and role='admin' and status='active')<=1 then
    raise exception using errcode='22023',message='last_admin_required';
  end if;
  update public.memberships set role=p_role,status=p_status where organization_id=p_organization_id and user_id=p_user_id;
  insert into public.clinic_admin_events(organization_id,actor_user_id,subject_user_id,action)
    values(p_organization_id,auth.uid(),p_user_id,'membership:'||p_role||':'||p_status);
  return jsonb_build_object('user_id',p_user_id,'role',p_role,'status',p_status);
end;
$$;

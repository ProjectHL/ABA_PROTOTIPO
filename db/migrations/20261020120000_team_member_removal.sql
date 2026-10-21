-- Remove a professional from one clinic without deleting their global identity,
-- clinical history or audit references. The membership and any active student
-- assignment end; the event stays in clinic_admin_events.
create function public.aba_remove_team_member(p_organization_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_membership public.memberships;
begin
  if v_actor is null or p_organization_id is null or p_user_id is null then
    raise exception using errcode = '42501', message = 'clinic_admin_required';
  end if;

  -- Serialize membership changes for this tenant, as mvp_set_member does.
  perform 1 from public.organizations where id = p_organization_id for update;
  if not found then
    raise exception using errcode = '22023', message = 'organization_not_found';
  end if;

  if not private.is_clinic_admin(p_organization_id) then
    raise exception using errcode = '42501', message = 'clinic_admin_required';
  end if;

  -- Another administrator must remove you; this avoids an accidental lockout.
  if p_user_id = v_actor then
    raise exception using errcode = '22023', message = 'cannot_remove_self';
  end if;

  select * into v_membership
  from public.memberships
  where organization_id = p_organization_id and user_id = p_user_id
  for update;
  if not found then
    raise exception using errcode = '22023', message = 'member_not_found';
  end if;

  if v_membership.role = 'admin' and v_membership.status = 'active'
    and (select count(*) from public.memberships
           where organization_id = p_organization_id and role = 'admin' and status = 'active') <= 1 then
    raise exception using errcode = '22023', message = 'last_admin_required';
  end if;

  -- Assignment-derived authority (clinical reads, chat, family links) ends
  -- here; the rows themselves are kept as history.
  update public.student_assignments
     set status = 'inactive', ended_at = now()
   where organization_id = p_organization_id
     and user_id = p_user_id
     and status = 'active'
     -- Family links are not team authority; a professional may also be a
     -- relative of a patient in the same clinic.
     and role in ('supervisor', 'coordinator', 'therapist');

  delete from public.memberships
   where organization_id = p_organization_id and user_id = p_user_id;

  insert into public.clinic_admin_events(organization_id, actor_user_id, subject_user_id, action)
  values (p_organization_id, v_actor, p_user_id, 'membership:removed');

  return jsonb_build_object('user_id', p_user_id, 'removed', true);
end;
$$;

revoke all on function public.aba_remove_team_member(uuid,uuid) from public, anon;
grant execute on function public.aba_remove_team_member(uuid,uuid) to authenticated;

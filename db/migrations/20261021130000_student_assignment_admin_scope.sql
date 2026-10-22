-- A test-run assignment must inherit the student's batch. The application
-- never sends p_test_run_id, so assignments on a test student were inserted
-- untagged and survived test-data cleanup.
create or replace function public.set_student_assignment(
  p_client_id uuid, p_user_id uuid, p_role text, p_status text default 'active',
  p_test_run_id uuid default null
)
returns public.student_assignments
language plpgsql security definer set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_test_run_id uuid;
  v_assignment public.student_assignments;
begin
  -- The existing authorization boundary is unchanged; it already admits the
  -- clinic administrator of the student's clinic and the primary supervisor.
  select c.organization_id, c.test_run_id
    into strict v_organization_id, v_test_run_id
    from public.clients c where c.id = p_client_id;

  if not (select private.is_primary_student_supervisor(p_client_id)) then
    raise exception using errcode = '42501', message = 'primary_supervisor_required';
  end if;
  if p_user_id = (select auth.uid()) then
    raise exception using errcode = '22023', message = 'self_assignment_change_not_allowed';
  end if;
  if p_role not in ('supervisor', 'coordinator', 'therapist', 'family') or p_status not in ('active', 'inactive') then
    raise exception using errcode = '22023', message = 'invalid_assignment';
  end if;
  v_test_run_id := coalesce(p_test_run_id, v_test_run_id);
  if not exists (select 1 from public.memberships m where m.organization_id = v_organization_id and m.user_id = p_user_id and m.status = 'active') then
    raise exception using errcode = '42501', message = 'active_membership_required';
  end if;
  select * into v_assignment from public.student_assignments sa
  where sa.client_id = p_client_id and sa.user_id = p_user_id and sa.status = 'active' for update;
  if found then
    update public.student_assignments
    set role = p_role, status = p_status,
        ended_at = case when p_status = 'inactive' then now() else null end,
        test_run_id = coalesce(v_test_run_id, test_run_id)
    where id = v_assignment.id returning * into v_assignment;
  elsif p_status = 'active' then
    insert into public.student_assignments (
      organization_id, client_id, user_id, role, is_primary, created_by, test_run_id
    ) values (
      v_organization_id, p_client_id, p_user_id, p_role, false, (select auth.uid()), v_test_run_id
    ) returning * into v_assignment;
  else raise exception using errcode = '22023', message = 'active_assignment_not_found';
  end if;
  perform private.audit_student_access_event(
    v_organization_id, p_client_id, 'student_assignment', v_assignment.id,
    case when p_status = 'active' then 'assigned' else 'unassigned' end, v_test_run_id
  );
  return v_assignment;
end;
$$;

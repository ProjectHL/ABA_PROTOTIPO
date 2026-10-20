-- Recovered from ABA_staging migration history; schema only.
-- S-ABA-01: distinguish revoked/missing authorization from optimistic concurrency conflicts.
create or replace function public.save_client_context(
  p_client_id uuid,
  p_home_adaptations text default null,
  p_schooling text default null,
  p_school_adaptations text default null,
  p_expected_version integer default null,
  p_test_run_id uuid default null
)
returns public.client_context_profiles
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_profile public.client_context_profiles;
begin
  if not (select private.has_student_capability(p_client_id, 'student.edit')) then
    raise exception using errcode = '42501', message = 'student_edit_required';
  end if;
  select c.organization_id into strict v_organization_id from public.clients c where c.id = p_client_id;
  if p_expected_version is null then
    insert into public.client_context_profiles (
      client_id, organization_id, home_adaptations, schooling, school_adaptations,
      updated_by, test_run_id
    ) values (
      p_client_id, v_organization_id, nullif(btrim(p_home_adaptations), ''),
      nullif(btrim(p_schooling), ''), nullif(btrim(p_school_adaptations), ''),
      (select auth.uid()), p_test_run_id
    )
    on conflict (client_id) do nothing
    returning * into v_profile;
    if found then return v_profile; end if;
  end if;
  update public.client_context_profiles
  set home_adaptations = nullif(btrim(p_home_adaptations), ''),
      schooling = nullif(btrim(p_schooling), ''),
      school_adaptations = nullif(btrim(p_school_adaptations), ''),
      version = version + 1,
      updated_at = now(),
      updated_by = (select auth.uid()),
      test_run_id = coalesce(p_test_run_id, test_run_id)
  where client_id = p_client_id
    and p_expected_version = version
  returning * into v_profile;
  if not found then
    raise exception using errcode = '40001', message = 'context_version_conflict';
  end if;
  return v_profile;
end;
$$;

revoke all on function public.save_client_context(uuid, text, text, text, integer, uuid)
  from public, anon, authenticated;
grant execute on function public.save_client_context(uuid, text, text, text, integer, uuid)
  to authenticated;

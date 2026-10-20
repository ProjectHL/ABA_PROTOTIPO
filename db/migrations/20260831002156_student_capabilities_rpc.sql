-- Recovered from ABA_staging migration history; schema only.
-- S-ABA-01: expose only the current user's effective capability names.
create function public.get_student_capabilities(p_client_id uuid)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(capability order by capability), '{}'::text[])
  from unnest(array[
    'student.view', 'student.edit', 'program.view', 'program.create', 'program.edit',
    'record_config.view', 'record_config.create', 'record_config.edit',
    'record.view', 'record.capture', 'record.submit',
    'chart.view', 'chart.configure', 'result.download',
    'authorization.request', 'authorization.decide', 'authorization.revoke'
  ]) capability
  where private.has_student_capability(p_client_id, capability);
$$;

revoke all on function public.get_student_capabilities(uuid) from public, anon, authenticated;
grant execute on function public.get_student_capabilities(uuid) to authenticated;

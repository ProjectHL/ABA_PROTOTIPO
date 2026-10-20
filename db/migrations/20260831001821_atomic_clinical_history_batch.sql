-- Recovered from ABA_staging migration history; schema only.
-- S-ABA-02: append a synthetic history form atomically.
create function public.append_clinical_history_entries(
  p_client_id uuid,
  p_entries jsonb,
  p_test_run_id uuid default null
)
returns setof public.clinical_history_entries
language plpgsql
security definer
set search_path = ''
as $$
declare
  item jsonb;
  v_entry public.clinical_history_entries;
begin
  if not (select private.has_student_capability(p_client_id, 'student.edit')) then
    raise exception using errcode = '42501', message = 'student_edit_required';
  end if;
  if jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) = 0 then
    raise exception using errcode = '22023', message = 'history_entries_must_be_non_empty_array';
  end if;
  for item in select value from jsonb_array_elements(p_entries)
  loop
    select * into v_entry
    from public.append_clinical_history_entry(
      p_client_id,
      item ->> 'kind',
      item ->> 'descriptor',
      nullif(item ->> 'occurred_on', '')::date,
      item ->> 'dose',
      item ->> 'prescriber_descriptor',
      nullif(item ->> 'started_on', '')::date,
      nullif(item ->> 'ended_on', '')::date,
      nullif(item ->> 'supersedes_id', '')::uuid,
      p_test_run_id
    );
    return next v_entry;
  end loop;
end;
$$;

revoke all on function public.append_clinical_history_entries(uuid, jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.append_clinical_history_entries(uuid, jsonb, uuid)
  to authenticated;

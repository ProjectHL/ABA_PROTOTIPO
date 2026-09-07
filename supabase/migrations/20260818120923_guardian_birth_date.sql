-- Recovered from ABA_staging migration history; schema only.
-- Preserve the guardian birth date already captured by the approved frontend form.

alter table public.guardians
  add column birth_date date
  check (birth_date is null or birth_date <= current_date);

create or replace function public.create_client(
  p_clinical_id text,
  p_initials text,
  p_primary_language text,
  p_birth_date date,
  p_living_arrangement text default null,
  p_guardians jsonb default '[]'::jsonb,
  p_siblings jsonb default '[]'::jsonb,
  p_test_run_id uuid default null
)
returns public.clients
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_membership_count integer;
  v_client public.clients;
begin
  select count(*), min(m.organization_id::text)::uuid
    into v_membership_count, v_organization_id
  from public.memberships m
  where m.user_id = (select auth.uid())
    and m.role in ('admin', 'clinician');

  if v_membership_count <> 1 then
    raise exception using
      errcode = '42501',
      message = 'single_writable_membership_required';
  end if;

  if jsonb_typeof(p_guardians) <> 'array' or jsonb_typeof(p_siblings) <> 'array' then
    raise exception using
      errcode = '22023',
      message = 'family_payload_must_be_arrays';
  end if;

  insert into public.clients (
    organization_id,
    clinical_id,
    initials,
    primary_language,
    birth_date,
    living_arrangement,
    test_run_id
  ) values (
    v_organization_id,
    btrim(p_clinical_id),
    upper(btrim(p_initials)),
    btrim(p_primary_language),
    p_birth_date,
    nullif(btrim(p_living_arrangement), ''),
    p_test_run_id
  )
  returning * into v_client;

  insert into public.guardians (client_id, initials, birth_date, position, test_run_id)
  select
    v_client.id,
    upper(btrim(item.value ->> 'initials')),
    nullif(item.value ->> 'birth_date', '')::date,
    item.ordinality - 1,
    p_test_run_id
  from jsonb_array_elements(p_guardians) with ordinality as item(value, ordinality);

  insert into public.siblings (client_id, initials, birth_date, position, test_run_id)
  select
    v_client.id,
    upper(btrim(item.value ->> 'initials')),
    nullif(item.value ->> 'birth_date', '')::date,
    item.ordinality - 1,
    p_test_run_id
  from jsonb_array_elements(p_siblings) with ordinality as item(value, ordinality);

  return v_client;
end;
$$;

revoke all on function public.create_client(text, text, text, date, text, jsonb, jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.create_client(text, text, text, date, text, jsonb, jsonb, uuid)
  to authenticated;

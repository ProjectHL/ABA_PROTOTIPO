-- F1: keep the existing optimistic-concurrency contract for student saves,
-- while making the new version explicit in the same transaction.
create or replace function public.mvp_save_student(
  p_organization_id uuid,
  p_client_id uuid,
  p_expected_updated_at timestamptz,
  p_payload jsonb,
  p_test_run_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client public.clients;
  v_family jsonb;
  v_item jsonb;
  v_pos integer;
begin
  if (select auth.uid()) is null or not exists (
    select 1
    from public.memberships m
    join public.organizations o on o.id = m.organization_id
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and o.status = 'active'
  ) then
    raise exception using errcode = '42501', message = 'active_membership_required';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' or exists (
    select 1
    from jsonb_object_keys(p_payload) k
    where k not in (
      'clinical_id','initials','birth_date','primary_language',
      'living_arrangement','guardians','siblings'
    )
  ) then
    raise exception using errcode = '22023', message = 'invalid_student_payload';
  end if;

  if p_client_id is null then
    if not exists (
      select 1
      from public.memberships
      where organization_id = p_organization_id
        and user_id = (select auth.uid())
        and status = 'active'
        and role in ('admin','supervisor')
    ) then
      raise exception using errcode = '42501', message = 'student_create_required';
    end if;

    if p_test_run_id is not null then
      if not private.is_clinic_admin(p_organization_id) then
        raise exception using errcode = '42501', message = 'test_batch_admin_required';
      end if;
      perform private.require_open_test_batch(p_organization_id, p_test_run_id);
    end if;

    insert into public.clients(
      organization_id, clinical_id, initials, birth_date,
      primary_language, living_arrangement, test_run_id
    ) values (
      p_organization_id,
      btrim(p_payload->>'clinical_id'),
      upper(btrim(p_payload->>'initials')),
      (p_payload->>'birth_date')::date,
      btrim(p_payload->>'primary_language'),
      nullif(btrim(p_payload->>'living_arrangement'),''),
      p_test_run_id
    )
    returning * into v_client;

    insert into public.student_assignments(
      organization_id, client_id, user_id, role, is_primary, created_by, test_run_id
    ) values (
      p_organization_id, v_client.id, (select auth.uid()), 'supervisor',
      true, (select auth.uid()), p_test_run_id
    );
  else
    if p_test_run_id is not null then
      raise exception using errcode = '22023', message = 'test_batch_is_create_only';
    end if;
    if not private.has_student_capability(p_client_id,'student.edit') then
      raise exception using errcode = '42501', message = 'student_edit_required';
    end if;

    select * into strict v_client
    from public.clients
    where id = p_client_id and organization_id = p_organization_id
    for update;

    if p_expected_updated_at is null or v_client.updated_at <> p_expected_updated_at then
      raise exception using errcode = '40001', message = 'student_version_conflict';
    end if;

    update public.clients
    set clinical_id = btrim(p_payload->>'clinical_id'),
        initials = upper(btrim(p_payload->>'initials')),
        birth_date = (p_payload->>'birth_date')::date,
        primary_language = btrim(p_payload->>'primary_language'),
        living_arrangement = nullif(btrim(p_payload->>'living_arrangement'),''),
        updated_at = now()
    where id = p_client_id
    returning * into v_client;
  end if;

  v_family := coalesce(p_payload->'guardians','[]'::jsonb);
  if jsonb_typeof(v_family) <> 'array' or jsonb_array_length(v_family) > 20 then
    raise exception using errcode = '22023', message = 'invalid_guardians';
  end if;

  delete from public.guardians where client_id = v_client.id;
  v_pos := 0;
  for v_item in select value from jsonb_array_elements(v_family)
  loop
    insert into public.guardians(
      client_id, initials, birth_date, position, relationship, phone, test_run_id
    ) values (
      v_client.id,
      upper(btrim(v_item->>'initials')),
      nullif(v_item->>'birth_date','')::date,
      v_pos,
      nullif(btrim(v_item->>'relationship'),''),
      nullif(btrim(v_item->>'phone'),''),
      v_client.test_run_id
    );
    v_pos := v_pos + 1;
  end loop;

  v_family := coalesce(p_payload->'siblings','[]'::jsonb);
  if jsonb_typeof(v_family) <> 'array' or jsonb_array_length(v_family) > 30 then
    raise exception using errcode = '22023', message = 'invalid_siblings';
  end if;

  delete from public.siblings where client_id = v_client.id;
  insert into public.siblings(client_id, initials, birth_date, position, test_run_id)
  select
    v_client.id,
    upper(btrim(value->>'initials')),
    nullif(value->>'birth_date','')::date,
    ordinality - 1,
    v_client.test_run_id
  from jsonb_array_elements(v_family) with ordinality;

  return to_jsonb(v_client);
end;
$$;

revoke all on function public.mvp_save_student(uuid, uuid, timestamptz, jsonb, uuid)
  from public, anon;
grant execute on function public.mvp_save_student(uuid, uuid, timestamptz, jsonb, uuid)
  to authenticated;

create function public.mvp_set_student_status(
  p_organization_id uuid,
  p_client_id uuid,
  p_expected_updated_at timestamptz,
  p_status text
)
returns public.clients
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client public.clients;
begin
  if (select auth.uid()) is null or not exists (
    select 1
    from public.memberships m
    join public.organizations o on o.id = m.organization_id
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and o.status = 'active'
  ) then
    raise exception using errcode = '42501', message = 'active_membership_required';
  end if;

  if p_status not in ('active', 'archived') then
    raise exception using errcode = '22023', message = 'invalid_student_status';
  end if;
  if not private.has_student_capability(p_client_id, 'student.edit') then
    raise exception using errcode = '42501', message = 'student_edit_required';
  end if;

  select * into strict v_client
  from public.clients
  where id = p_client_id and organization_id = p_organization_id
  for update;

  if p_expected_updated_at is null or v_client.updated_at <> p_expected_updated_at then
    raise exception using errcode = '40001', message = 'student_version_conflict';
  end if;

  if v_client.status = p_status then
    return v_client;
  end if;

  update public.clients
  set status = p_status,
      updated_at = now()
  where id = p_client_id
  returning * into v_client;

  return v_client;
end;
$$;

revoke all on function public.mvp_set_student_status(uuid, uuid, timestamptz, text)
  from public, anon;
grant execute on function public.mvp_set_student_status(uuid, uuid, timestamptz, text)
  to authenticated;

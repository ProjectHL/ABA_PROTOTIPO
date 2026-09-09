-- B0: deny-by-default grants, command-only clinical writes and governed dummy batches.

-- Supabase projects grant client roles on future public objects by default. Objects
-- created by our versioned migrations are owned by postgres and must opt into the
-- Data API explicitly. Platform-owned supabase_admin defaults cannot be changed by
-- the project postgres role, so every application object also gets explicit grants.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

-- Existing objects created while broad defaults were active.
revoke all on table public.clinic_admin_events from anon;
revoke all on table public.clinical_record_events from anon;
revoke all on table public.session_program_records from anon;
revoke all on table public.test_data_cleanup_log from anon;

-- These tables are command-owned. Keeping DML through the Data API would allow an
-- authorized user to bypass optimistic concurrency, family atomicity or supersedes.
revoke insert, update, delete on table
  public.clients,
  public.guardians,
  public.siblings,
  public.client_context_profiles,
  public.clinical_history_entries
from authenticated;

create table public.test_data_batches (
  organization_id uuid not null references public.organizations(id) on delete restrict,
  id uuid not null,
  status text not null default 'open' check (status in ('open', 'frozen', 'cleaned')),
  source text not null default 'manual' check (source in ('manual', 'legacy')),
  created_by uuid references auth.users(id) on delete restrict,
  opened_at timestamptz not null default now(),
  frozen_at timestamptz,
  cleaned_at timestamptz,
  primary key (organization_id, id),
  check (
    (status = 'open' and frozen_at is null and cleaned_at is null)
    or (status = 'frozen' and frozen_at is not null and cleaned_at is null)
    or (status = 'cleaned' and frozen_at is not null and cleaned_at is not null)
  ),
  check (source = 'legacy' or created_by is not null)
);

create index test_data_batches_status_idx
  on public.test_data_batches(organization_id, status, opened_at desc);

-- Existing client tags become explicit legacy batches. The same UUID may exist in
-- two clinics, so the batch identity is intentionally composite.
insert into public.test_data_batches(organization_id, id, status, source)
select distinct organization_id, test_run_id, 'open', 'legacy'
from public.clients
where test_run_id is not null
on conflict (organization_id, id) do nothing;

create index clients_test_batch_idx
  on public.clients(organization_id, test_run_id);

alter table public.clients
  add constraint clients_test_batch_fkey
  foreign key (organization_id, test_run_id)
  references public.test_data_batches(organization_id, id)
  on delete restrict;

alter table public.test_data_batches enable row level security;
revoke all on table public.test_data_batches from public, anon, authenticated;
grant select on table public.test_data_batches to authenticated, service_role;

create policy test_data_batches_read_admin
on public.test_data_batches for select to authenticated
using ((select private.is_clinic_admin(organization_id)));

create function private.require_open_test_batch(
  p_organization_id uuid,
  p_test_run_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_test_run_id is null then
    return;
  end if;

  perform 1
  from public.test_data_batches b
  where b.organization_id = p_organization_id
    and b.id = p_test_run_id
    and b.status = 'open'
  for key share;

  if not found then
    raise exception using errcode = '22023', message = 'test_batch_not_open';
  end if;
end;
$$;

revoke all on function private.require_open_test_batch(uuid, uuid)
  from public, anon, authenticated;

create function public.mvp_open_test_batch(
  p_organization_id uuid,
  p_test_run_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_batch public.test_data_batches;
begin
  if p_test_run_id is null or not private.is_clinic_admin(p_organization_id) then
    raise exception using errcode = '42501', message = 'clinic_admin_required';
  end if;

  insert into public.test_data_batches(
    organization_id, id, status, source, created_by
  ) values (
    p_organization_id, p_test_run_id, 'open', 'manual', (select auth.uid())
  )
  on conflict (organization_id, id) do nothing;

  select * into strict v_batch
  from public.test_data_batches b
  where b.organization_id = p_organization_id and b.id = p_test_run_id
  for update;

  if v_batch.status <> 'open' then
    raise exception using errcode = '22023', message = 'test_batch_not_open';
  end if;

  return jsonb_build_object(
    'organization_id', v_batch.organization_id,
    'test_run_id', v_batch.id,
    'status', v_batch.status
  );
end;
$$;

create function public.mvp_freeze_test_batch(
  p_organization_id uuid,
  p_test_run_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_batch public.test_data_batches;
begin
  if p_test_run_id is null or not private.is_clinic_admin(p_organization_id) then
    raise exception using errcode = '42501', message = 'clinic_admin_required';
  end if;

  select * into v_batch
  from public.test_data_batches b
  where b.organization_id = p_organization_id and b.id = p_test_run_id
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'test_batch_not_found';
  end if;
  if v_batch.status = 'cleaned' then
    raise exception using errcode = '22023', message = 'test_batch_already_cleaned';
  end if;

  if v_batch.status = 'open' then
    update public.test_data_batches
    set status = 'frozen', frozen_at = now()
    where organization_id = p_organization_id and id = p_test_run_id
    returning * into v_batch;
  end if;

  return jsonb_build_object(
    'organization_id', v_batch.organization_id,
    'test_run_id', v_batch.id,
    'status', v_batch.status
  );
end;
$$;

revoke all on function
  public.mvp_open_test_batch(uuid, uuid),
  public.mvp_freeze_test_batch(uuid, uuid)
from public, anon;
grant execute on function
  public.mvp_open_test_batch(uuid, uuid),
  public.mvp_freeze_test_batch(uuid, uuid)
to authenticated;

-- Frozen dummy clients disappear from all capability-based read/write paths.
create or replace function private.has_active_student_assignment(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from public.clients c
    join public.memberships m on m.organization_id = c.organization_id
    join public.student_assignments sa
      on sa.client_id = c.id
      and sa.organization_id = c.organization_id
      and sa.user_id = m.user_id
    where c.id = p_client_id
      and (
        c.test_run_id is null
        or exists (
          select 1 from public.test_data_batches b
          where b.organization_id = c.organization_id
            and b.id = c.test_run_id
            and b.status = 'open'
        )
      )
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and sa.status = 'active'
      and sa.effective_at <= now()
      and (sa.ended_at is null or sa.ended_at > now())
  );
$$;

create or replace function private.student_assignment_role(p_client_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select sa.role
  from public.student_assignments sa
  join public.clients c
    on c.id = sa.client_id and c.organization_id = sa.organization_id
  join public.memberships m
    on m.organization_id = sa.organization_id
    and m.user_id = sa.user_id
  where sa.client_id = p_client_id
    and (
      c.test_run_id is null
      or exists (
        select 1 from public.test_data_batches b
        where b.organization_id = c.organization_id
          and b.id = c.test_run_id
          and b.status = 'open'
      )
    )
    and sa.user_id = (select auth.uid())
    and sa.status = 'active'
    and m.status = 'active'
    and sa.effective_at <= now()
    and (sa.ended_at is null or sa.ended_at > now())
  limit 1;
$$;

create or replace function private.is_primary_student_supervisor(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.clients c
    join public.organizations o on o.id = c.organization_id
    where c.id = p_client_id
      and o.status = 'active'
      and (
        c.test_run_id is null
        or exists (
          select 1 from public.test_data_batches b
          where b.organization_id = c.organization_id
            and b.id = c.test_run_id
            and b.status = 'open'
        )
      )
      and (
        private.is_clinic_admin(c.organization_id)
        or exists (
          select 1
          from public.student_assignments sa
          join public.memberships m
            on m.organization_id = sa.organization_id and m.user_id = sa.user_id
          where sa.client_id = c.id
            and sa.organization_id = c.organization_id
            and sa.user_id = (select auth.uid())
            and sa.role = 'supervisor'
            and sa.is_primary
            and sa.status = 'active'
            and m.status = 'active'
            and sa.effective_at <= now()
            and (sa.ended_at is null or sa.ended_at > now())
        )
      )
  );
$$;

create or replace function private.has_student_capability(
  p_client_id uuid,
  p_capability text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(p_capability = any(array[
    'student.view','student.edit','program.view','program.create','program.edit',
    'record_config.view','record_config.create','record_config.edit','record.view',
    'record.capture','record.submit','chart.view','chart.configure','result.download',
    'authorization.request','authorization.decide','authorization.revoke'
  ]) and exists (
    select 1
    from public.clients c
    join public.organizations o on o.id = c.organization_id
    where c.id = p_client_id
      and o.status = 'active'
      and (
        c.test_run_id is null
        or exists (
          select 1 from public.test_data_batches b
          where b.organization_id = c.organization_id
            and b.id = c.test_run_id
            and b.status = 'open'
        )
      )
      and (
        private.is_clinic_admin(c.organization_id)
        or exists (
          select 1
          from public.student_assignments sa
          join public.memberships m
            on m.organization_id = sa.organization_id and m.user_id = sa.user_id
          where sa.client_id = c.id
            and sa.organization_id = c.organization_id
            and sa.user_id = (select auth.uid())
            and m.status = 'active'
            and sa.status = 'active'
            and sa.effective_at <= now()
            and (sa.ended_at is null or sa.ended_at > now())
            and (
              (
                sa.role = 'supervisor'
                and (
                  p_capability not in ('authorization.decide','authorization.revoke')
                  or sa.is_primary
                )
              )
              or (
                sa.role in ('coordinator','therapist')
                and p_capability in (
                  'student.view','program.view','record_config.view','record.view',
                  'record.capture','record.submit','chart.view','result.download'
                )
              )
              or (sa.role = 'coordinator' and p_capability = 'authorization.request')
              or (
                sa.role = 'coordinator'
                and exists (
                  select 1
                  from public.student_authorization_requests r
                  join public.student_authorization_decisions d on d.request_id = r.id
                  where r.client_id = c.id
                    and r.requester_user_id = sa.user_id
                    and r.status = 'approved'
                    and d.decision = 'approved'
                    and p_capability = any(d.granted_actions)
                    and d.effective_at <= now()
                    and d.expires_at > now()
                    and not exists (
                      select 1
                      from public.student_authorization_decisions x
                      where x.supersedes_decision_id = d.id
                        and x.decision = 'revoked'
                    )
                )
              )
            )
        )
      )
  ), false);
$$;

-- Reassert the exact helper grants used by RLS after replacing the functions.
revoke all on function private.has_active_student_assignment(uuid) from public, anon;
revoke all on function private.student_assignment_role(uuid) from public, anon;
revoke all on function private.is_primary_student_supervisor(uuid) from public, anon;
revoke all on function private.has_student_capability(uuid, text) from public, anon;
grant execute on function private.has_active_student_assignment(uuid) to authenticated;
grant execute on function private.student_assignment_role(uuid) to authenticated;
grant execute on function private.is_primary_student_supervisor(uuid) to authenticated;
grant execute on function private.has_student_capability(uuid, text) to authenticated;

-- A dummy client can only be created by a clinic admin against an open,
-- registered batch. Existing records never accept a caller-provided batch.
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
        living_arrangement = nullif(btrim(p_payload->>'living_arrangement'),'')
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

create or replace function public.mvp_cleanup_test_run(
  p_organization_id uuid,
  p_test_run_id uuid,
  p_confirm text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_batch public.test_data_batches;
  v_clients uuid[];
  v_count integer;
  v_summary jsonb;
begin
  if p_test_run_id is null or not private.is_clinic_admin(p_organization_id) then
    raise exception using errcode = '42501', message = 'clinic_admin_required';
  end if;

  select * into v_batch
  from public.test_data_batches b
  where b.organization_id = p_organization_id and b.id = p_test_run_id
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'test_batch_not_found';
  end if;
  if v_batch.status = 'cleaned' then
    return jsonb_build_object(
      'test_run_id', p_test_run_id,
      'status', 'cleaned',
      'executed', false,
      'already_cleaned', true
    );
  end if;

  select coalesce(array_agg(id),'{}'::uuid[]) into v_clients
  from public.clients
  where organization_id = p_organization_id and test_run_id = p_test_run_id;

  v_count := cardinality(v_clients);
  v_summary := jsonb_build_object(
    'test_run_id', p_test_run_id,
    'status', v_batch.status,
    'clients', v_count,
    'guardians', (select count(*) from public.guardians where client_id = any(v_clients)),
    'siblings', (select count(*) from public.siblings where client_id = any(v_clients)),
    'assessments', (select count(*) from public.assessments where client_id = any(v_clients)),
    'acquisition_programs', (select count(*) from public.acquisition_programs where client_id = any(v_clients)),
    'acquisition_goals', (select count(*) from public.acquisition_goals where client_id = any(v_clients)),
    'behavior_plans', (select count(*) from public.behavior_plans where client_id = any(v_clients)),
    'assignments', (select count(*) from public.student_assignments where client_id = any(v_clients)),
    'authorization_requests', (select count(*) from public.student_authorization_requests where client_id = any(v_clients)),
    'authorization_decisions', (select count(*) from public.student_authorization_decisions where client_id = any(v_clients)),
    'access_audit_events', (select count(*) from public.student_access_audit_events where client_id = any(v_clients)),
    'context_profiles', (select count(*) from public.client_context_profiles where client_id = any(v_clients)),
    'history', (select count(*) from public.clinical_history_entries where client_id = any(v_clients)),
    'consent_records', (select count(*) from public.consent_records where client_id = any(v_clients)),
    'consent_events', (select count(*) from public.consent_events where client_id = any(v_clients)),
    'programs', (select count(*) from public.programs where client_id = any(v_clients)),
    'program_versions', (select count(*) from public.program_versions where client_id = any(v_clients)),
    'program_lifecycle_events', (select count(*) from public.program_lifecycle_events where client_id = any(v_clients)),
    'sessions', (select count(*) from public.clinical_sessions where client_id = any(v_clients)),
    'behavior_measurements', (select count(*) from public.session_behavior_measurements where client_id = any(v_clients)),
    'acquisition_trials', (select count(*) from public.session_acquisition_trials where client_id = any(v_clients)),
    'records', (select count(*) from public.session_program_records where client_id = any(v_clients)),
    'record_events', (select count(*) from public.clinical_record_events where client_id = any(v_clients)),
    'clinical_audit_events', (
      select count(*) from public.clinical_audit_events
      where organization_id = p_organization_id
        and (client_id = any(v_clients) or test_run_id = p_test_run_id)
    ),
    'audit_events', (
      select count(*) from public.audit_events
      where organization_id = p_organization_id
        and (entity_id = any(v_clients) or test_run_id = p_test_run_id)
    )
  );

  if p_confirm is distinct from 'DELETE TEST DATA ' || p_test_run_id::text then
    return v_summary || jsonb_build_object(
      'executed', false,
      'required_confirmation', 'DELETE TEST DATA ' || p_test_run_id::text
    );
  end if;

  if v_batch.status <> 'frozen' then
    raise exception using errcode = '22023', message = 'test_batch_must_be_frozen';
  end if;

  delete from public.clinical_record_events where client_id = any(v_clients);
  delete from public.session_program_records where client_id = any(v_clients);
  delete from public.session_acquisition_trials where client_id = any(v_clients);
  delete from public.session_behavior_measurements where client_id = any(v_clients);
  delete from public.clinical_sessions where client_id = any(v_clients);
  delete from public.program_lifecycle_events where client_id = any(v_clients);
  update public.programs set current_version_id = null where client_id = any(v_clients);
  delete from public.program_versions where client_id = any(v_clients);
  delete from public.programs where client_id = any(v_clients);
  delete from public.consent_events where client_id = any(v_clients);
  delete from public.consent_records where client_id = any(v_clients);
  delete from public.clinical_history_entries where client_id = any(v_clients);
  delete from public.client_context_profiles where client_id = any(v_clients);
  delete from public.student_access_audit_events where client_id = any(v_clients);
  delete from public.student_authorization_decisions where client_id = any(v_clients);
  delete from public.student_authorization_requests where client_id = any(v_clients);
  delete from public.student_assignments where client_id = any(v_clients);
  delete from public.acquisition_goals where client_id = any(v_clients);
  delete from public.acquisition_programs where client_id = any(v_clients);
  delete from public.behavior_plans where client_id = any(v_clients);
  delete from public.assessments where client_id = any(v_clients);
  delete from public.guardians where client_id = any(v_clients);
  delete from public.siblings where client_id = any(v_clients);
  delete from public.clinical_audit_events
  where organization_id = p_organization_id
    and (client_id = any(v_clients) or test_run_id = p_test_run_id);
  delete from public.audit_events
  where organization_id = p_organization_id
    and (entity_id = any(v_clients) or test_run_id = p_test_run_id);
  delete from public.clients
  where id = any(v_clients)
    and organization_id = p_organization_id
    and test_run_id = p_test_run_id;

  update public.test_data_batches
  set status = 'cleaned', cleaned_at = now()
  where organization_id = p_organization_id and id = p_test_run_id;

  insert into public.test_data_cleanup_log(
    organization_id, test_run_id, actor_user_id, deleted_clients, summary
  ) values (
    p_organization_id, p_test_run_id, (select auth.uid()), v_count, v_summary
  );

  return v_summary || jsonb_build_object('status', 'cleaned', 'executed', true);
end;
$$;

revoke all on function public.mvp_cleanup_test_run(uuid, uuid, text)
  from public, anon;
grant execute on function public.mvp_cleanup_test_run(uuid, uuid, text)
  to authenticated;

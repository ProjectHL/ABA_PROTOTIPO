-- Recovered from ABA_staging migration history; schema only.
-- S-ABA-03: versioned ABA programs and non-destructive lifecycle.
-- Synthetic/local candidate only. Additive: no DROP, DELETE, TRUNCATE or legacy rewrites.

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  program_type text not null check (program_type in ('acquisition', 'behavior')),
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'achieved', 'discontinued')),
  current_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete restrict,
  test_run_id uuid,
  unique (id, client_id, program_type)
);

create table public.program_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  program_id uuid not null,
  program_type text not null check (program_type in ('acquisition', 'behavior')),
  version integer not null check (version > 0),
  version_state text not null default 'draft'
    check (version_state in ('draft', 'released', 'superseded')),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  design jsonb not null check (jsonb_typeof(design) = 'object'),
  supersedes_version_id uuid references public.program_versions(id) on delete restrict,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete restrict,
  test_run_id uuid,
  constraint program_versions_program_client_type_fkey
    foreign key (program_id, client_id, program_type)
    references public.programs (id, client_id, program_type) on delete restrict,
  unique (program_id, version),
  check (
    (version_state = 'draft' and activated_at is null)
    or (version_state in ('released', 'superseded') and activated_at is not null)
  ),
  check (design ->> 'kind' = program_type)
);

alter table public.programs
  add constraint programs_current_version_fkey
  foreign key (current_version_id) references public.program_versions(id) on delete restrict;

create table public.program_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  program_id uuid not null references public.programs(id) on delete restrict,
  program_version_id uuid references public.program_versions(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (action in (
    'draft_created', 'version_created', 'activated', 'paused', 'reactivated',
    'achieved', 'discontinued'
  )),
  prior_status text,
  next_status text,
  created_at timestamptz not null default now(),
  test_run_id uuid
);

create index programs_client_status_idx
  on public.programs (client_id, status, updated_at desc);
create index program_versions_program_version_idx
  on public.program_versions (program_id, version desc);
create index program_versions_client_state_idx
  on public.program_versions (client_id, version_state, created_at desc);
create index program_versions_supersedes_idx
  on public.program_versions (supersedes_version_id)
  where supersedes_version_id is not null;
create index program_lifecycle_events_program_idx
  on public.program_lifecycle_events (program_id, created_at desc);
create index program_lifecycle_events_client_idx
  on public.program_lifecycle_events (client_id, created_at desc);

alter table public.programs enable row level security;
alter table public.program_versions enable row level security;
alter table public.program_lifecycle_events enable row level security;

create policy programs_select_granted on public.programs for select to authenticated
  using ((select private.has_student_capability(client_id, 'program.view')));
create policy programs_insert_granted on public.programs for insert to authenticated
  with check ((select private.has_student_capability(client_id, 'program.edit')));
create policy programs_update_granted on public.programs for update to authenticated
  using ((select private.has_student_capability(client_id, 'program.edit')))
  with check ((select private.has_student_capability(client_id, 'program.edit')));

create policy program_versions_select_granted on public.program_versions for select to authenticated
  using ((select private.has_student_capability(client_id, 'program.view')));
create policy program_versions_insert_granted on public.program_versions for insert to authenticated
  with check ((select private.has_student_capability(client_id, 'program.edit')));
create policy program_versions_update_granted on public.program_versions for update to authenticated
  using ((select private.has_student_capability(client_id, 'program.edit')))
  with check ((select private.has_student_capability(client_id, 'program.edit')));

create function private.program_design_is_complete(p_program_type text, p_design jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_program_type
    when 'acquisition' then
      jsonb_typeof(p_design) = 'object'
      and p_design ->> 'kind' = 'acquisition'
      and nullif(btrim(p_design ->> 'goal'), '') is not null
      and nullif(btrim(p_design ->> 'skillArea'), '') is not null
      and nullif(btrim(p_design ->> 'antecedent'), '') is not null
      and jsonb_typeof(p_design -> 'steps') = 'array'
      and jsonb_array_length(p_design -> 'steps') > 0
      and nullif(btrim(p_design ->> 'teachingProcedure'), '') is not null
      and jsonb_typeof(p_design -> 'sets') = 'array'
      and jsonb_array_length(p_design -> 'sets') > 0
      and jsonb_typeof(p_design -> 'promptLevels') = 'array'
      and jsonb_array_length(p_design -> 'promptLevels') > 0
      and nullif(btrim(p_design ->> 'errorCorrection'), '') is not null
      and nullif(btrim(p_design ->> 'masteryCriterion'), '') is not null
    when 'behavior' then
      jsonb_typeof(p_design) = 'object'
      and p_design ->> 'kind' = 'behavior'
      and nullif(btrim(p_design ->> 'topography'), '') is not null
      and nullif(btrim(p_design ->> 'operationalDefinition'), '') is not null
      and nullif(btrim(p_design ->> 'hypothesizedFunction'), '') is not null
      and nullif(btrim(p_design ->> 'replacementBehavior'), '') is not null
      and p_design ->> 'measurementUnit' in ('frequency', 'duration', 'latency', 'interval')
      and nullif(btrim(p_design ->> 'preventionStrategy'), '') is not null
      and nullif(btrim(p_design ->> 'responseStrategy'), '') is not null
      and nullif(btrim(p_design ->> 'masteryCriterion'), '') is not null
    else false
  end;
$$;

create function private.enforce_program_insert()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status <> 'draft' or new.current_version_id is not null then
    raise exception using errcode = '22023', message = 'program_must_start_as_draft';
  end if;
  return new;
end;
$$;

create function private.enforce_program_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.id <> old.id or new.organization_id <> old.organization_id
    or new.client_id <> old.client_id or new.program_type <> old.program_type
    or new.created_by <> old.created_by or new.created_at <> old.created_at then
    raise exception using errcode = '22023', message = 'program_identity_immutable';
  end if;
  if new.status <> old.status and not (
    (old.status = 'draft' and new.status in ('active', 'discontinued'))
    or (old.status = 'active' and new.status in ('paused', 'achieved', 'discontinued'))
    or (old.status = 'paused' and new.status in ('active', 'discontinued'))
  ) then
    raise exception using errcode = '22023', message = 'program_transition_invalid';
  end if;
  if new.current_version_id is not null and not exists (
    select 1 from public.program_versions pv
    where pv.id = new.current_version_id and pv.program_id = old.id
      and pv.client_id = old.client_id and pv.program_type = old.program_type
      and pv.version_state = 'released'
  ) then
    raise exception using errcode = '22023', message = 'program_current_version_invalid';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create function private.enforce_program_version_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.version_state <> 'draft' or new.activated_at is not null then
      raise exception using errcode = '22023', message = 'program_version_must_start_as_draft';
    end if;
    return new;
  end if;
  if new.id <> old.id or new.organization_id <> old.organization_id
    or new.client_id <> old.client_id or new.program_id <> old.program_id
    or new.program_type <> old.program_type or new.version <> old.version
    or new.supersedes_version_id is distinct from old.supersedes_version_id
    or new.created_by <> old.created_by or new.created_at <> old.created_at then
    raise exception using errcode = '22023', message = 'program_version_identity_immutable';
  end if;
  if old.version_state = 'draft' and new.version_state = 'draft' then
    if new.activated_at is not null then
      raise exception using errcode = '22023', message = 'draft_program_version_cannot_be_activated';
    end if;
    return new;
  end if;
  if new.title <> old.title or new.design <> old.design then
    raise exception using errcode = '22023', message = 'released_program_version_immutable';
  end if;
  if not (
    (old.version_state = 'draft' and new.version_state = 'released')
    or (old.version_state = 'released' and new.version_state = 'superseded')
  ) then
    raise exception using errcode = '22023', message = 'program_version_transition_invalid';
  end if;
  return new;
end;
$$;

create trigger programs_enforce_insert before insert on public.programs
  for each row execute function private.enforce_program_insert();
create trigger programs_enforce_update before update on public.programs
  for each row execute function private.enforce_program_update();
create trigger program_versions_enforce_write before insert or update on public.program_versions
  for each row execute function private.enforce_program_version_write();

create function private.audit_program_lifecycle(
  p_organization_id uuid,
  p_client_id uuid,
  p_program_id uuid,
  p_program_version_id uuid,
  p_action text,
  p_prior_status text,
  p_next_status text,
  p_test_run_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.program_lifecycle_events (
    organization_id, client_id, program_id, program_version_id,
    actor_user_id, action, prior_status, next_status, test_run_id
  ) values (
    p_organization_id, p_client_id, p_program_id, p_program_version_id,
    (select auth.uid()), p_action, p_prior_status, p_next_status, p_test_run_id
  );
end;
$$;

create function public.create_program_draft(
  p_client_id uuid,
  p_program_type text,
  p_title text,
  p_design jsonb,
  p_test_run_id uuid default null
)
returns public.program_versions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_program public.programs;
  v_version public.program_versions;
begin
  if p_program_type not in ('acquisition', 'behavior')
    or jsonb_typeof(p_design) <> 'object'
    or p_design ->> 'kind' <> p_program_type then
    raise exception using errcode = '22023', message = 'program_payload_invalid';
  end if;
  select c.organization_id into strict v_organization_id
  from public.clients c where c.id = p_client_id;
  insert into public.programs (
    organization_id, client_id, program_type, created_by, test_run_id
  ) values (
    v_organization_id, p_client_id, p_program_type, (select auth.uid()), p_test_run_id
  ) returning * into v_program;
  insert into public.program_versions (
    organization_id, client_id, program_id, program_type, version,
    title, design, created_by, test_run_id
  ) values (
    v_organization_id, p_client_id, v_program.id, p_program_type, 1,
    btrim(p_title), p_design, (select auth.uid()), p_test_run_id
  ) returning * into v_version;
  perform private.audit_program_lifecycle(
    v_organization_id, p_client_id, v_program.id, v_version.id,
    'draft_created', null, 'draft', p_test_run_id
  );
  return v_version;
end;
$$;

create function public.create_program_successor(
  p_version_id uuid,
  p_title text,
  p_design jsonb,
  p_test_run_id uuid default null
)
returns public.program_versions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_prior public.program_versions;
  v_program public.programs;
  v_version public.program_versions;
begin
  select * into strict v_prior from public.program_versions
  where id = p_version_id for update;
  select * into strict v_program from public.programs
  where id = v_prior.program_id for update;
  if v_program.status not in ('active', 'paused')
    or v_prior.version_state <> 'released'
    or jsonb_typeof(p_design) <> 'object'
    or p_design ->> 'kind' <> v_program.program_type then
    raise exception using errcode = '22023', message = 'program_successor_invalid';
  end if;
  insert into public.program_versions (
    organization_id, client_id, program_id, program_type, version, title,
    design, supersedes_version_id, created_by, test_run_id
  ) values (
    v_program.organization_id, v_program.client_id, v_program.id, v_program.program_type,
    (select max(version) + 1 from public.program_versions where program_id = v_program.id),
    btrim(p_title), p_design, v_prior.id, (select auth.uid()), p_test_run_id
  ) returning * into v_version;
  perform private.audit_program_lifecycle(
    v_program.organization_id, v_program.client_id, v_program.id, v_version.id,
    'version_created', v_program.status, v_program.status, p_test_run_id
  );
  return v_version;
end;
$$;

create function public.transition_program(
  p_program_id uuid,
  p_version_id uuid,
  p_next_status text,
  p_test_run_id uuid default null
)
returns public.programs
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_program public.programs;
  v_version public.program_versions;
  v_action text;
  v_prior_status text;
begin
  select * into strict v_program from public.programs where id = p_program_id for update;
  v_prior_status := v_program.status;
  if p_next_status = 'active' and p_version_id is not null
    and v_program.status in ('draft', 'active', 'paused') then
    select * into strict v_version from public.program_versions
    where id = p_version_id and program_id = v_program.id for update;
    if v_version.version_state <> 'draft'
      or not (select private.program_design_is_complete(v_program.program_type, v_version.design)) then
      raise exception using errcode = '22023', message = 'program_design_incomplete';
    end if;
    update public.program_versions
    set version_state = 'superseded'
    where program_id = v_program.id and version_state = 'released';
    update public.program_versions
    set version_state = 'released', activated_at = now()
    where id = v_version.id;
    update public.programs
    set status = case when status = 'draft' then 'active' else status end,
      current_version_id = v_version.id
    where id = v_program.id returning * into v_program;
    v_action := 'activated';
  elsif p_next_status = 'active' and v_program.status = 'paused' then
    update public.programs set status = 'active'
    where id = v_program.id returning * into v_program;
    v_action := 'reactivated';
  elsif p_next_status = 'paused' and v_program.status = 'active' then
    update public.programs set status = 'paused'
    where id = v_program.id returning * into v_program;
    v_action := 'paused';
  elsif p_next_status = 'achieved' and v_program.status = 'active' then
    update public.programs set status = 'achieved'
    where id = v_program.id returning * into v_program;
    v_action := 'achieved';
  elsif p_next_status = 'discontinued'
    and v_program.status in ('draft', 'active', 'paused') then
    update public.programs set status = 'discontinued'
    where id = v_program.id returning * into v_program;
    v_action := 'discontinued';
  else
    raise exception using errcode = '22023', message = 'program_transition_invalid';
  end if;
  perform private.audit_program_lifecycle(
    v_program.organization_id, v_program.client_id, v_program.id,
    case when p_version_id is null then v_program.current_version_id else p_version_id end,
    v_action,
    v_prior_status,
    v_program.status, p_test_run_id
  );
  return v_program;
end;
$$;

revoke all on table public.programs from public, anon, authenticated;
revoke all on table public.program_versions from public, anon, authenticated;
revoke all on table public.program_lifecycle_events from public, anon, authenticated;
grant select, insert, update on table public.programs to authenticated;
grant select, insert, update on table public.program_versions to authenticated;

revoke all on function private.program_design_is_complete(text, jsonb) from public, anon, authenticated;
revoke all on function private.enforce_program_insert() from public, anon, authenticated;
revoke all on function private.enforce_program_update() from public, anon, authenticated;
revoke all on function private.enforce_program_version_write() from public, anon, authenticated;
revoke all on function private.audit_program_lifecycle(uuid, uuid, uuid, uuid, text, text, text, uuid)
  from public, anon, authenticated;
revoke all on function public.create_program_draft(uuid, text, text, jsonb, uuid)
  from public, anon, authenticated;
revoke all on function public.create_program_successor(uuid, text, jsonb, uuid)
  from public, anon, authenticated;
revoke all on function public.transition_program(uuid, uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.create_program_draft(uuid, text, text, jsonb, uuid)
  to authenticated;
grant execute on function public.create_program_successor(uuid, text, jsonb, uuid)
  to authenticated;
grant execute on function public.transition_program(uuid, uuid, text, uuid)
  to authenticated;

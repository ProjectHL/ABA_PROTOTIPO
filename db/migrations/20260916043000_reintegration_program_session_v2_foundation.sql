-- A3/R2: canonical additive storage and exact closed validators for programs,
-- sessions and raw ABA observations. V1 rows remain readable and untouched.

alter table public.programs
  add column if not exists revision integer not null default 0 check (revision >= 0);
alter table public.program_versions
  add column if not exists revision integer not null default 0 check (revision >= 0);

alter table public.programs
  add constraint programs_organization_client_fkey
  foreign key (organization_id, client_id)
  references public.clients(organization_id, id) on delete restrict,
  add constraint programs_organization_client_id_key
  unique (organization_id, client_id, id);
alter table public.program_versions
  add constraint program_versions_organization_client_fkey
  foreign key (organization_id, client_id)
  references public.clients(organization_id, id) on delete restrict,
  add constraint program_versions_organization_client_program_id_key
  unique (organization_id, client_id, program_id, id);
alter table public.program_lifecycle_events
  add constraint program_lifecycle_events_program_scope_fkey
  foreign key (organization_id, client_id, program_id)
  references public.programs(organization_id, client_id, id) on delete restrict,
  add constraint program_lifecycle_events_version_scope_fkey
  foreign key (organization_id, client_id, program_id, program_version_id)
  references public.program_versions(organization_id, client_id, program_id, id) on delete restrict;

alter table public.clinical_sessions
  drop constraint if exists clinical_sessions_status_check,
  drop constraint if exists clinical_sessions_notes_check;
alter table public.clinical_sessions
  add constraint clinical_sessions_status_check
    check (status in ('draft', 'completed', 'cancelled', 'archived')),
  add constraint clinical_sessions_notes_check
    check (notes is null or char_length(notes) <= 10000);

create table public.clinical_session_v2_state (
  session_id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  client_id uuid not null,
  schema_version smallint not null default 2 check (schema_version = 2),
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'finished', 'cancelled')),
  version integer not null default 0 check (version >= 0),
  captured_at timestamptz not null,
  notes text not null default '' check (char_length(notes) <= 10000),
  selected_programs jsonb not null default '[]'::jsonb
    check (jsonb_typeof(selected_programs) = 'array'),
  created_by uuid not null references auth.users(id) on delete restrict,
  test_run_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, client_id, session_id),
  foreign key (organization_id, client_id)
    references public.clients(organization_id, id) on delete restrict,
  foreign key (session_id, client_id)
    references public.clinical_sessions(id, client_id) on delete restrict,
  foreign key (organization_id, test_run_id)
    references public.test_data_batches(organization_id, id) on delete restrict
);

create table public.clinical_session_v2_events (
  id uuid primary key,
  session_id uuid not null,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  client_id uuid not null,
  sequence integer not null check (sequence > 0),
  event_type text not null
    check (event_type in ('started', 'paused', 'resumed', 'finished', 'cancelled')),
  occurred_at timestamptz not null,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  notes text not null default '' check (char_length(notes) <= 10000),
  test_run_id uuid,
  created_at timestamptz not null default now(),
  unique (session_id, sequence),
  foreign key (organization_id, client_id)
    references public.clients(organization_id, id) on delete restrict,
  foreign key (organization_id, client_id, session_id)
    references public.clinical_session_v2_state(organization_id, client_id, session_id) on delete restrict,
  foreign key (organization_id, test_run_id)
    references public.test_data_batches(organization_id, id) on delete restrict
);

create table public.session_program_records_v2 (
  id uuid primary key,
  session_id uuid not null,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  client_id uuid not null,
  program_id uuid not null,
  program_version_id uuid not null,
  schema_version smallint not null default 2 check (schema_version = 2),
  dimension text not null
    check (dimension in ('percentage', 'frequency', 'interval', 'duration', 'latency')),
  measurement jsonb not null check (jsonb_typeof(measurement) = 'object'),
  version integer not null default 1 check (version > 0),
  state text not null check (state in ('draft', 'submitted', 'discarded')),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  submitted_at timestamptz,
  discarded_at timestamptz,
  test_run_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, client_id, id),
  check (measurement ->> 'dimension' = dimension),
  check (
    (state = 'draft' and submitted_at is null and discarded_at is null)
    or (state = 'submitted' and submitted_at is not null and discarded_at is null)
    or (state = 'discarded' and submitted_at is null and discarded_at is not null)
  ),
  foreign key (organization_id, client_id)
    references public.clients(organization_id, id) on delete restrict,
  foreign key (organization_id, client_id, session_id)
    references public.clinical_session_v2_state(organization_id, client_id, session_id) on delete restrict,
  foreign key (organization_id, client_id, program_id)
    references public.programs(organization_id, client_id, id) on delete restrict,
  foreign key (organization_id, client_id, program_id, program_version_id)
    references public.program_versions(organization_id, client_id, program_id, id) on delete restrict,
  foreign key (organization_id, test_run_id)
    references public.test_data_batches(organization_id, id) on delete restrict
);

create table public.session_program_record_revisions_v2 (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  client_id uuid not null,
  revision integer not null check (revision > 0),
  prior_measurement jsonb not null check (jsonb_typeof(prior_measurement) = 'object'),
  replacement_measurement jsonb not null check (jsonb_typeof(replacement_measurement) = 'object'),
  reason text not null check (char_length(btrim(reason)) between 1 and 2000),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  test_run_id uuid,
  unique (record_id, revision),
  foreign key (organization_id, client_id)
    references public.clients(organization_id, id) on delete restrict,
  foreign key (organization_id, client_id, record_id)
    references public.session_program_records_v2(organization_id, client_id, id) on delete restrict,
  foreign key (organization_id, test_run_id)
    references public.test_data_batches(organization_id, id) on delete restrict
);

create index clinical_session_v2_student_status_idx
  on public.clinical_session_v2_state(client_id, status, updated_at desc);
create index clinical_session_v2_org_status_idx
  on public.clinical_session_v2_state(organization_id, status, updated_at desc);
create index clinical_session_v2_events_client_idx
  on public.clinical_session_v2_events(client_id, occurred_at desc);
create index session_records_v2_session_idx
  on public.session_program_records_v2(session_id, created_at);
create index session_records_v2_program_idx
  on public.session_program_records_v2(program_id, program_version_id, created_at desc);
create index session_records_v2_client_state_idx
  on public.session_program_records_v2(client_id, state, created_at desc);

alter table public.clinical_session_v2_state enable row level security;
alter table public.clinical_session_v2_events enable row level security;
alter table public.session_program_records_v2 enable row level security;
alter table public.session_program_record_revisions_v2 enable row level security;

create policy clinical_session_v2_state_read on public.clinical_session_v2_state
  for select to authenticated
  using ((select private.has_student_capability(client_id, 'record.view')));
create policy clinical_session_v2_events_read on public.clinical_session_v2_events
  for select to authenticated
  using ((select private.has_student_capability(client_id, 'record.view')));
create policy session_program_records_v2_read on public.session_program_records_v2
  for select to authenticated
  using ((select private.has_student_capability(client_id, 'record.view')));
create policy session_program_record_revisions_v2_read on public.session_program_record_revisions_v2
  for select to authenticated
  using ((select private.has_student_capability(client_id, 'record.view')));

revoke all on public.clinical_session_v2_state, public.clinical_session_v2_events,
  public.session_program_records_v2, public.session_program_record_revisions_v2
from public, anon, authenticated, service_role;

create function private.a3_command_envelope_valid(p_command jsonb, p_resource_key text)
returns boolean language sql immutable security invoker set search_path = '' as $$
  select coalesce(
    jsonb_typeof(p_command) = 'object'
    and jsonb_typeof(p_command -> 'operationId') = 'string'
    and jsonb_typeof(p_command -> 'idempotencyKey') = 'string'
    and jsonb_typeof(p_command -> 'studentId') = 'string'
    and jsonb_typeof(p_command -> p_resource_key) = 'string'
    and (p_command ->> 'operationId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and (p_command ->> 'idempotencyKey') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and (p_command ->> 'studentId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and (p_command ->> p_resource_key) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and jsonb_typeof(p_command -> 'expectedVersion') = 'number'
    and (p_command ->> 'expectedVersion') ~ '^[0-9]+$'
    and (p_command ->> 'expectedVersion')::numeric <= 2147483647,
    false
  );
$$;

create function private.a3_session_program_refs_valid(p_value jsonb)
returns boolean language sql immutable security invoker set search_path = '' as $$
  select coalesce(
    jsonb_typeof(p_value) = 'array' and jsonb_array_length(p_value) <= 1000
    and not exists (
      select 1 from jsonb_array_elements(p_value) item
      where jsonb_typeof(item) <> 'object'
        or (select count(*) from jsonb_object_keys(item)) <> 2
        or jsonb_typeof(item -> 'programId') <> 'string'
        or jsonb_typeof(item -> 'programVersionId') <> 'string'
        or exists (select 1 from jsonb_object_keys(item) key
          where key not in ('programId', 'programVersionId'))
        or not ((item ->> 'programId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
        or not ((item ->> 'programVersionId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
    )
    and (select count(*) = count(distinct value ->> 'programId')
      from jsonb_array_elements(p_value)),
    false
  );
$$;

create function private.a3_iso_timestamp_valid(p_value jsonb)
returns boolean language plpgsql immutable security invoker set search_path = '' as $$
begin
  if jsonb_typeof(p_value) <> 'string'
    or not ((p_value #>> '{}') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}(:[0-9]{2}(\.[0-9]+)?)?(Z|[+-][0-9]{2}:[0-9]{2})$') then
    return false;
  end if;
  perform (p_value #>> '{}')::timestamptz;
  return true;
exception when invalid_datetime_format or datetime_field_overflow then
  return false;
end;
$$;

create function private.a3_measurement_v2_valid(p_value jsonb, p_for_submit boolean)
returns boolean language plpgsql immutable security invoker set search_path = '' as $$
declare
  d text; i jsonb; j jsonb; captured timestamptz; s timestamptz; e timestamptz; t timestamptz;
  recorded integer := 0; ids text[] := '{}'; orders numeric[] := '{}'; prior_end timestamptz;
begin
  if jsonb_typeof(p_value) <> 'object'
    or jsonb_typeof(p_value -> 'schemaVersion') <> 'number' or p_value ->> 'schemaVersion' <> '2'
    or jsonb_typeof(p_value -> 'phase') <> 'string'
    or p_value ->> 'phase' not in ('baseline','treatment','generalization','maintenance')
    or jsonb_typeof(p_value -> 'dimension') <> 'string'
    or not private.a3_iso_timestamp_valid(p_value -> 'capturedAt')
    or jsonb_typeof(p_value -> 'notes') <> 'string' or char_length(p_value ->> 'notes') > 10000 then return false;
  end if;
  captured := (p_value ->> 'capturedAt')::timestamptz; d := p_value ->> 'dimension';
  if d = 'percentage' then
    if (select count(*) from jsonb_object_keys(p_value)) <> 6
      or exists (select 1 from jsonb_object_keys(p_value) key where key not in ('schemaVersion','phase','capturedAt','notes','dimension','trials'))
      or jsonb_typeof(p_value -> 'trials') <> 'array'
      or jsonb_array_length(p_value -> 'trials') not between 1 and 1000 then return false;
    end if;
    for i in select value from jsonb_array_elements(p_value -> 'trials') loop
      if jsonb_typeof(i) <> 'object' or (select count(*) from jsonb_object_keys(i)) <> 7
        or exists (select 1 from jsonb_object_keys(i) key where key not in ('id','order','response','recordedAt','responsePrompt','stimulusPrompts','notes'))
        or not ((i ->> 'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
        or jsonb_typeof(i -> 'order') <> 'number' or not ((i ->> 'order') ~ '^[1-9][0-9]*$')
        or (i ->> 'order')::numeric > 9007199254740991
        or jsonb_typeof(i -> 'notes') <> 'string' or char_length(i ->> 'notes') > 10000
        or jsonb_typeof(i -> 'stimulusPrompts') <> 'array'
        or jsonb_array_length(i -> 'stimulusPrompts') > 20 then return false;
      end if;
      if i ->> 'id' = any(ids) or (i ->> 'order')::numeric = any(orders) then return false; end if;
      ids := array_append(ids, i ->> 'id'); orders := array_append(orders, (i ->> 'order')::numeric);
      if i -> 'response' = 'null'::jsonb then
        if i -> 'recordedAt' <> 'null'::jsonb or i -> 'responsePrompt' <> 'null'::jsonb then return false; end if;
      elsif i ->> 'response' not in ('independent','prompted','error','no-response')
        or not private.a3_iso_timestamp_valid(i -> 'recordedAt') then return false;
      else
        t := (i ->> 'recordedAt')::timestamptz;
        if t > captured or (i ->> 'response' <> 'prompted' and i -> 'responsePrompt' <> 'null'::jsonb)
          or (p_for_submit and i ->> 'response' = 'prompted' and i -> 'responsePrompt' = 'null'::jsonb) then return false;
        end if;
        recorded := recorded + 1;
      end if;
      if i -> 'responsePrompt' <> 'null'::jsonb and i ->> 'responsePrompt' not in
        ('full-physical','partial-physical','gestural','shadow','model','echoic-full','echoic-partial','verbal-full','verbal-partial','unspecified') then return false;
      end if;
      for j in select value from jsonb_array_elements(i -> 'stimulusPrompts') loop
        if jsonb_typeof(j) <> 'string' or (j #>> '{}') not in
          ('position','redundancy','movement','time-delay-0','time-delay-3','time-delay-5','time-delay-10') then return false;
        end if;
      end loop;
    end loop;
    return not p_for_submit or recorded > 0;
  elsif d = 'frequency' then
    if (select count(*) from jsonb_object_keys(p_value)) <> 7
      or exists (select 1 from jsonb_object_keys(p_value) key where key not in ('schemaVersion','phase','capturedAt','notes','dimension','windows','events'))
      or jsonb_typeof(p_value -> 'windows') <> 'array' or jsonb_array_length(p_value -> 'windows') > 1000
      or jsonb_typeof(p_value -> 'events') <> 'array' or jsonb_array_length(p_value -> 'events') > 100000 then return false;
    end if;
    if exists (select 1 from jsonb_array_elements(p_value -> 'windows') w
      where jsonb_typeof(w) <> 'object' or (select count(*) from jsonb_object_keys(w)) <> 3
        or exists (select 1 from jsonb_object_keys(w) key where key not in ('id','startedAt','endedAt'))
        or jsonb_typeof(w -> 'id') <> 'string'
        or not ((w ->> 'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
        or not private.a3_iso_timestamp_valid(w -> 'startedAt')
        or (w -> 'endedAt' <> 'null'::jsonb and not private.a3_iso_timestamp_valid(w -> 'endedAt'))) then return false;
    end if;
    for i in select value from jsonb_array_elements(p_value -> 'windows') order by (value ->> 'startedAt')::timestamptz loop
      if i ->> 'id' = any(ids) then return false; end if;
      ids := array_append(ids, i ->> 'id'); s := (i ->> 'startedAt')::timestamptz;
      e := case when i -> 'endedAt' = 'null'::jsonb then captured else (i ->> 'endedAt')::timestamptz end;
      if s > captured or e < s or (prior_end is not null and s < prior_end)
        or (p_for_submit and i -> 'endedAt' = 'null'::jsonb) then return false;
      end if;
      prior_end := e;
    end loop;
    ids := '{}';
    for i in select value from jsonb_array_elements(p_value -> 'events') loop
      if jsonb_typeof(i) <> 'object' or (select count(*) from jsonb_object_keys(i)) <> 3
        or exists (select 1 from jsonb_object_keys(i) key where key not in ('id','occurredAt','notes'))
        or not ((i ->> 'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
        or not private.a3_iso_timestamp_valid(i -> 'occurredAt') or i ->> 'id' = any(ids)
        or jsonb_typeof(i -> 'notes') <> 'string' or char_length(i ->> 'notes') > 10000 then return false;
      end if;
      ids := array_append(ids, i ->> 'id'); t := (i ->> 'occurredAt')::timestamptz;
      if t > captured or not exists (select 1 from jsonb_array_elements(p_value -> 'windows') w
        where t between (w ->> 'startedAt')::timestamptz
          and case when w -> 'endedAt' = 'null'::jsonb then captured else (w ->> 'endedAt')::timestamptz end) then return false;
      end if;
    end loop;
    return not p_for_submit or exists (select 1 from jsonb_array_elements(p_value -> 'windows') w
      where w -> 'endedAt' <> 'null'::jsonb and (w ->> 'endedAt')::timestamptz > (w ->> 'startedAt')::timestamptz);
  elsif d = 'interval' then
    if (select count(*) from jsonb_object_keys(p_value)) <> 7
      or exists (select 1 from jsonb_object_keys(p_value) key where key not in ('schemaVersion','phase','capturedAt','notes','dimension','method','intervals'))
      or jsonb_typeof(p_value -> 'method') <> 'string' or p_value ->> 'method' not in ('whole','partial','momentary')
      or jsonb_typeof(p_value -> 'intervals') <> 'array'
      or jsonb_array_length(p_value -> 'intervals') not between 1 and 1000 then return false;
    end if;
    for i in select value from jsonb_array_elements(p_value -> 'intervals') loop
      if jsonb_typeof(i) <> 'object' or (select count(*) from jsonb_object_keys(i)) <> 7
        or exists (select 1 from jsonb_object_keys(i) key where key not in ('id','order','startedAt','endedAt','observedAt','occurred','notes'))
        or not ((i ->> 'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
        or not private.a3_iso_timestamp_valid(i -> 'startedAt') or not private.a3_iso_timestamp_valid(i -> 'endedAt')
        or (i -> 'observedAt' <> 'null'::jsonb and not private.a3_iso_timestamp_valid(i -> 'observedAt'))
        or i ->> 'id' = any(ids) or jsonb_typeof(i -> 'order') <> 'number'
        or not ((i ->> 'order') ~ '^[1-9][0-9]*$') or (i ->> 'order')::numeric > 9007199254740991
        or (i ->> 'order')::numeric = any(orders)
        or jsonb_typeof(i -> 'notes') <> 'string' or char_length(i ->> 'notes') > 10000 then return false;
      end if;
      ids := array_append(ids, i ->> 'id'); orders := array_append(orders, (i ->> 'order')::numeric);
      s := (i ->> 'startedAt')::timestamptz; e := (i ->> 'endedAt')::timestamptz;
      if e <= s then return false; end if;
      if i -> 'occurred' = 'null'::jsonb then
        if i -> 'observedAt' <> 'null'::jsonb then return false; end if;
      elsif jsonb_typeof(i -> 'occurred') <> 'boolean' or jsonb_typeof(i -> 'observedAt') <> 'string' then return false;
      else
        t := (i ->> 'observedAt')::timestamptz;
        if t < s or t > captured or e > captured then return false; end if;
        recorded := recorded + 1;
      end if;
    end loop;
    return not p_for_submit or recorded > 0;
  elsif d = 'duration' then
    if (select count(*) from jsonb_object_keys(p_value)) <> 6
      or exists (select 1 from jsonb_object_keys(p_value) key where key not in ('schemaVersion','phase','capturedAt','notes','dimension','episodes'))
      or jsonb_typeof(p_value -> 'episodes') <> 'array' or jsonb_array_length(p_value -> 'episodes') > 10000 then return false;
    end if;
    for i in select value from jsonb_array_elements(p_value -> 'episodes') loop
      if jsonb_typeof(i) <> 'object' or (select count(*) from jsonb_object_keys(i)) <> 4
        or exists (select 1 from jsonb_object_keys(i) key where key not in ('id','startedAt','endedAt','notes'))
        or not ((i ->> 'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
        or not private.a3_iso_timestamp_valid(i -> 'startedAt')
        or (i -> 'endedAt' <> 'null'::jsonb and not private.a3_iso_timestamp_valid(i -> 'endedAt'))
        or i ->> 'id' = any(ids) or jsonb_typeof(i -> 'notes') <> 'string'
        or char_length(i ->> 'notes') > 10000 then return false;
      end if;
      ids := array_append(ids, i ->> 'id'); s := (i ->> 'startedAt')::timestamptz;
      if s > captured then return false; end if;
      if i -> 'endedAt' <> 'null'::jsonb then
        e := (i ->> 'endedAt')::timestamptz; if e < s or e > captured then return false; end if;
      elsif p_for_submit then return false;
      end if;
    end loop;
    return not p_for_submit or jsonb_array_length(p_value -> 'episodes') > 0;
  elsif d = 'latency' then
    if (select count(*) from jsonb_object_keys(p_value)) <> 6
      or exists (select 1 from jsonb_object_keys(p_value) key where key not in ('schemaVersion','phase','capturedAt','notes','dimension','trials'))
      or jsonb_typeof(p_value -> 'trials') <> 'array' or jsonb_array_length(p_value -> 'trials') > 1000 then return false;
    end if;
    for i in select value from jsonb_array_elements(p_value -> 'trials') loop
      if jsonb_typeof(i) <> 'object' or (select count(*) from jsonb_object_keys(i)) <> 8
        or exists (select 1 from jsonb_object_keys(i) key where key not in ('id','order','antecedent','antecedentAt','responseAt','outcome','closedAt','notes'))
        or not ((i ->> 'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
        or not private.a3_iso_timestamp_valid(i -> 'antecedentAt')
        or (i -> 'responseAt' <> 'null'::jsonb and not private.a3_iso_timestamp_valid(i -> 'responseAt'))
        or (i -> 'closedAt' <> 'null'::jsonb and not private.a3_iso_timestamp_valid(i -> 'closedAt'))
        or i ->> 'id' = any(ids) or jsonb_typeof(i -> 'order') <> 'number'
        or not ((i ->> 'order') ~ '^[1-9][0-9]*$') or (i ->> 'order')::numeric > 9007199254740991
        or (i ->> 'order')::numeric = any(orders)
        or jsonb_typeof(i -> 'antecedent') <> 'string' or char_length(i ->> 'antecedent') > 2000
        or jsonb_typeof(i -> 'notes') <> 'string' or char_length(i ->> 'notes') > 10000 then return false;
      end if;
      ids := array_append(ids, i ->> 'id'); orders := array_append(orders, (i ->> 'order')::numeric);
      s := (i ->> 'antecedentAt')::timestamptz; if s > captured then return false; end if;
      if i ->> 'outcome' = 'pending' then
        if i -> 'responseAt' <> 'null'::jsonb or i -> 'closedAt' <> 'null'::jsonb or p_for_submit then return false; end if;
      elsif i ->> 'outcome' = 'no-response' then
        if i -> 'responseAt' <> 'null'::jsonb or i -> 'closedAt' = 'null'::jsonb then return false; end if;
        e := (i ->> 'closedAt')::timestamptz; if e < s or e > captured then return false; end if;
        recorded := recorded + 1;
      elsif i ->> 'outcome' = 'responded' then
        if i -> 'responseAt' = 'null'::jsonb or i -> 'closedAt' = 'null'::jsonb
          or i ->> 'responseAt' <> i ->> 'closedAt' then return false;
        end if;
        t := (i ->> 'responseAt')::timestamptz; if t < s or t > captured then return false; end if;
        recorded := recorded + 1;
      else return false;
      end if;
    end loop;
    return not p_for_submit or recorded > 0;
  end if;
  return false;
exception when invalid_text_representation or invalid_datetime_format
  or datetime_field_overflow or numeric_value_out_of_range then return false;
end;
$$;

create function private.a3_program_design_v2_valid(p_value jsonb, p_published boolean)
returns boolean language plpgsql immutable security invoker set search_path = '' as $$
declare
  v_kind text := p_value ->> 'kind';
  v_item jsonb;
begin
  if jsonb_typeof(p_value) <> 'object'
    or jsonb_typeof(p_value -> 'schemaVersion') <> 'number'
    or p_value ->> 'schemaVersion' <> '2'
    or jsonb_typeof(p_value -> 'kind') <> 'string'
    or jsonb_typeof(p_value -> 'measurementDimension') <> 'string'
    or p_value ->> 'measurementDimension' not in ('percentage','frequency','interval','duration','latency')
    or jsonb_typeof(p_value -> 'procedure') <> 'string'
    or char_length(p_value ->> 'procedure') > 10000
    or jsonb_typeof(p_value -> 'masteryCriteria') <> 'string'
    or char_length(p_value ->> 'masteryCriteria') > 10000 then
    return false;
  end if;
  if v_kind = 'acquisition' then
    if (select count(*) from jsonb_object_keys(p_value)) <> 15
      or exists (select 1 from jsonb_object_keys(p_value) key where key not in
        ('schemaVersion','measurementDimension','kind','procedure','masteryCriteria','objective','antecedent','steps','sets','prompts','errorCorrection','generalization','skillArea','teachingProcedure','promptLevels'))
      or jsonb_typeof(p_value -> 'objective') <> 'string' or char_length(p_value ->> 'objective') > 10000
      or jsonb_typeof(p_value -> 'antecedent') <> 'string' or char_length(p_value ->> 'antecedent') > 10000
      or jsonb_typeof(p_value -> 'prompts') <> 'string' or char_length(p_value ->> 'prompts') > 10000
      or jsonb_typeof(p_value -> 'errorCorrection') <> 'string' or char_length(p_value ->> 'errorCorrection') > 10000
      or jsonb_typeof(p_value -> 'generalization') <> 'string' or char_length(p_value ->> 'generalization') > 10000
      or jsonb_typeof(p_value -> 'skillArea') <> 'string' or char_length(p_value ->> 'skillArea') > 200
      or jsonb_typeof(p_value -> 'teachingProcedure') <> 'string' or char_length(p_value ->> 'teachingProcedure') > 10000
      or jsonb_typeof(p_value -> 'steps') <> 'array' or jsonb_array_length(p_value -> 'steps') > 100
      or jsonb_typeof(p_value -> 'sets') <> 'array' or jsonb_array_length(p_value -> 'sets') > 100
      or jsonb_typeof(p_value -> 'promptLevels') <> 'array' or jsonb_array_length(p_value -> 'promptLevels') > 50
      or exists (select 1 from jsonb_array_elements(p_value -> 'promptLevels') item
        where jsonb_typeof(item) <> 'string' or char_length(item #>> '{}') > 200) then
      return false;
    end if;
    for v_item in select value from jsonb_array_elements(p_value -> 'steps') loop
      if jsonb_typeof(v_item) <> 'object'
        or (select count(*) from jsonb_object_keys(v_item)) <> 3
        or exists (select 1 from jsonb_object_keys(v_item) key where key not in ('id','order','description'))
        or jsonb_typeof(v_item -> 'id') <> 'string'
        or nullif(btrim(v_item ->> 'id'), '') is null
        or char_length(btrim(v_item ->> 'id')) > 100
        or jsonb_typeof(v_item -> 'order') <> 'number'
        or not ((v_item ->> 'order') ~ '^[1-9][0-9]*$')
        or (v_item ->> 'order')::numeric > 9007199254740991
        or jsonb_typeof(v_item -> 'description') <> 'string'
        or char_length(v_item ->> 'description') > 10000 then return false;
      end if;
    end loop;
    if (select count(*) <> count(distinct value ->> 'id')
      or count(*) <> count(distinct (value ->> 'order')::numeric)
      from jsonb_array_elements(p_value -> 'steps')) then return false;
    end if;
    for v_item in select value from jsonb_array_elements(p_value -> 'sets') loop
      if jsonb_typeof(v_item) <> 'object'
        or (select count(*) from jsonb_object_keys(v_item)) <> 3
        or exists (select 1 from jsonb_object_keys(v_item) key where key not in ('id','name','items'))
        or jsonb_typeof(v_item -> 'id') <> 'string'
        or nullif(btrim(v_item ->> 'id'), '') is null
        or char_length(btrim(v_item ->> 'id')) > 100
        or jsonb_typeof(v_item -> 'name') <> 'string' or char_length(v_item ->> 'name') > 200
        or jsonb_typeof(v_item -> 'items') <> 'array' or jsonb_array_length(v_item -> 'items') > 1000
        or exists (select 1 from jsonb_array_elements(v_item -> 'items') item
          where jsonb_typeof(item) <> 'string' or char_length(item #>> '{}') > 2000) then return false;
      end if;
    end loop;
    if (select count(*) <> count(distinct value ->> 'id')
      from jsonb_array_elements(p_value -> 'sets')) then return false;
    end if;
    if p_published and (
      nullif(btrim(p_value ->> 'objective'), '') is null
      or nullif(btrim(p_value ->> 'procedure'), '') is null
      or nullif(btrim(p_value ->> 'masteryCriteria'), '') is null
      or exists (select 1 from jsonb_array_elements(p_value -> 'steps') item
        where nullif(btrim(item ->> 'description'), '') is null)
      or exists (select 1 from jsonb_array_elements(p_value -> 'sets') item
        where nullif(btrim(item ->> 'name'), '') is null
          or exists (select 1 from jsonb_array_elements_text(item -> 'items') text_item
            where nullif(btrim(text_item), '') is null))
    ) then return false;
    end if;
    return true;
  elsif v_kind = 'behavior' then
    if (select count(*) from jsonb_object_keys(p_value)) <> 15
      or exists (select 1 from jsonb_object_keys(p_value) key where key not in
        ('schemaVersion','measurementDimension','kind','procedure','masteryCriteria','topography','operationalDefinition','currentDimension','precursorBehaviors','functions','replacementBehavior','crisisPlan','hypothesizedFunctionNotes','preventionStrategy','responseStrategy'))
      or jsonb_typeof(p_value -> 'topography') <> 'string' or char_length(p_value ->> 'topography') > 10000
      or jsonb_typeof(p_value -> 'operationalDefinition') <> 'string' or char_length(p_value ->> 'operationalDefinition') > 10000
      or jsonb_typeof(p_value -> 'currentDimension') <> 'string' or char_length(p_value ->> 'currentDimension') > 10000
      or jsonb_typeof(p_value -> 'precursorBehaviors') <> 'string' or char_length(p_value ->> 'precursorBehaviors') > 10000
      or jsonb_typeof(p_value -> 'replacementBehavior') <> 'string' or char_length(p_value ->> 'replacementBehavior') > 10000
      or jsonb_typeof(p_value -> 'crisisPlan') <> 'string' or char_length(p_value ->> 'crisisPlan') > 10000
      or jsonb_typeof(p_value -> 'hypothesizedFunctionNotes') <> 'string' or char_length(p_value ->> 'hypothesizedFunctionNotes') > 10000
      or jsonb_typeof(p_value -> 'preventionStrategy') <> 'string' or char_length(p_value ->> 'preventionStrategy') > 10000
      or jsonb_typeof(p_value -> 'responseStrategy') <> 'string' or char_length(p_value ->> 'responseStrategy') > 10000
      or jsonb_typeof(p_value -> 'functions') <> 'array' or jsonb_array_length(p_value -> 'functions') > 4
      or exists (select 1 from jsonb_array_elements(p_value -> 'functions') item
        where jsonb_typeof(item) <> 'string')
      or exists (select 1 from jsonb_array_elements_text(p_value -> 'functions') item
        where item not in ('attention','escape','sensory','tangible'))
      or (select count(*) <> count(distinct value)
        from jsonb_array_elements_text(p_value -> 'functions')) then return false;
    end if;
    if p_published and (
      nullif(btrim(p_value ->> 'topography'), '') is null
      or nullif(btrim(p_value ->> 'operationalDefinition'), '') is null
      or jsonb_array_length(p_value -> 'functions') = 0
      or nullif(btrim(p_value ->> 'procedure'), '') is null
      or nullif(btrim(p_value ->> 'masteryCriteria'), '') is null
    ) then return false;
    end if;
    return true;
  end if;
  return false;
exception when invalid_text_representation or numeric_value_out_of_range then
  return false;
end;
$$;
grant select on public.clinical_session_v2_state, public.clinical_session_v2_events,
  public.session_program_records_v2, public.session_program_record_revisions_v2
to authenticated;

revoke insert, update, delete on public.programs, public.program_versions,
  public.program_lifecycle_events, public.clinical_sessions, public.session_program_records,
  public.clinical_session_v2_state, public.clinical_session_v2_events,
  public.session_program_records_v2, public.session_program_record_revisions_v2
from public, anon, authenticated, service_role;

revoke all on function public.create_program_draft(uuid,text,text,jsonb,uuid),
  public.create_program_successor(uuid,text,jsonb,uuid),
  public.transition_program(uuid,uuid,text,uuid),
  public.mvp_update_program_draft(uuid,uuid,text,jsonb),
  public.mvp_save_record(uuid,uuid,uuid,uuid,text,jsonb,integer,boolean),
  public.mvp_discard_record(uuid,integer), public.mvp_finish_session(uuid),
  public.mvp_archive_session(uuid)
from public, anon, authenticated, service_role;

revoke all on function private.a3_command_envelope_valid(jsonb,text),
  private.a3_session_program_refs_valid(jsonb), private.a3_iso_timestamp_valid(jsonb),
  private.a3_program_design_v2_valid(jsonb,boolean),
  private.a3_measurement_v2_valid(jsonb,boolean)
from public, anon, authenticated, service_role;

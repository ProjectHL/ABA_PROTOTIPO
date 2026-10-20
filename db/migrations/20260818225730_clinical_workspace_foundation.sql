-- Recovered from ABA_staging migration history; schema only.
-- Slice 09: clinical workspace foundation for synthetic staging data only.
-- Applied remotely as migration `clinical_workspace_foundation`.

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  kind text not null check (kind in ('initial_interview', 'preference', 'functional')),
  status text not null default 'draft' check (status in ('draft', 'completed', 'archived')),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  occurred_on date,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  version integer not null default 1 check (version >= 1),
  test_run_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assessments_client_kind_status_idx
  on public.assessments (client_id, kind, status, updated_at desc);

create table public.acquisition_programs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  description text check (description is null or char_length(btrim(description)) between 1 and 2000),
  status text not null default 'draft' check (status in ('draft', 'active', 'mastered', 'archived')),
  test_run_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, client_id)
);

create index acquisition_programs_client_status_idx
  on public.acquisition_programs (client_id, status, updated_at desc);

create table public.acquisition_goals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  program_id uuid not null,
  skill_area text not null check (char_length(btrim(skill_area)) between 1 and 80),
  name text not null check (char_length(btrim(name)) between 1 and 160),
  mastery_criterion text not null check (char_length(btrim(mastery_criterion)) between 1 and 500),
  teaching_procedure text not null check (char_length(btrim(teaching_procedure)) between 1 and 2000),
  status text not null default 'draft' check (status in ('draft', 'active', 'mastered', 'archived')),
  position integer not null default 0 check (position >= 0),
  test_run_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, client_id),
  unique (program_id, position),
  constraint acquisition_goals_program_client_fkey
    foreign key (program_id, client_id)
    references public.acquisition_programs (id, client_id)
    on delete restrict
);

create index acquisition_goals_client_status_idx
  on public.acquisition_goals (client_id, status, position);
create index acquisition_goals_program_idx
  on public.acquisition_goals (program_id);

create table public.behavior_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  operational_definition text not null check (char_length(btrim(operational_definition)) between 1 and 2000),
  measurement_unit text not null check (measurement_unit in ('frequency', 'duration', 'latency', 'interval')),
  hypothesized_function text check (hypothesized_function is null or char_length(btrim(hypothesized_function)) between 1 and 500),
  antecedent_strategy text check (antecedent_strategy is null or char_length(btrim(antecedent_strategy)) between 1 and 2000),
  replacement_behavior text check (replacement_behavior is null or char_length(btrim(replacement_behavior)) between 1 and 1000),
  response_strategy text check (response_strategy is null or char_length(btrim(response_strategy)) between 1 and 2000),
  status text not null default 'draft' check (status in ('draft', 'active', 'resolved', 'archived')),
  test_run_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, client_id)
);

create index behavior_plans_client_status_idx
  on public.behavior_plans (client_id, status, updated_at desc);

create table public.clinical_sessions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  occurred_on date not null default current_date check (occurred_on <= current_date),
  status text not null default 'draft' check (status in ('draft', 'completed', 'archived')),
  notes text check (notes is null or char_length(btrim(notes)) between 1 and 4000),
  test_run_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, client_id)
);

create index clinical_sessions_client_occurred_idx
  on public.clinical_sessions (client_id, occurred_on desc, status);

create table public.session_behavior_measurements (
  session_id uuid not null,
  client_id uuid not null references public.clients(id) on delete restrict,
  behavior_plan_id uuid not null,
  value numeric(12, 2) not null check (value >= 0),
  test_run_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (session_id, behavior_plan_id),
  constraint session_behavior_measurements_session_client_fkey
    foreign key (session_id, client_id)
    references public.clinical_sessions (id, client_id)
    on delete restrict,
  constraint session_behavior_measurements_plan_client_fkey
    foreign key (behavior_plan_id, client_id)
    references public.behavior_plans (id, client_id)
    on delete restrict
);

create index session_behavior_measurements_client_idx
  on public.session_behavior_measurements (client_id, session_id);
create index session_behavior_measurements_plan_idx
  on public.session_behavior_measurements (behavior_plan_id);

create table public.session_acquisition_trials (
  session_id uuid not null,
  client_id uuid not null references public.clients(id) on delete restrict,
  goal_id uuid not null,
  correct integer not null default 0 check (correct >= 0),
  incorrect integer not null default 0 check (incorrect >= 0),
  test_run_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (session_id, goal_id),
  constraint session_acquisition_trials_session_client_fkey
    foreign key (session_id, client_id)
    references public.clinical_sessions (id, client_id)
    on delete restrict,
  constraint session_acquisition_trials_goal_client_fkey
    foreign key (goal_id, client_id)
    references public.acquisition_goals (id, client_id)
    on delete restrict
);

create index session_acquisition_trials_client_idx
  on public.session_acquisition_trials (client_id, session_id);
create index session_acquisition_trials_goal_idx
  on public.session_acquisition_trials (goal_id);

create table public.clinical_audit_events (
  id bigint generated by default as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  actor_user_id uuid,
  client_id uuid not null references public.clients(id) on delete restrict,
  entity_type text not null check (entity_type in ('assessment', 'acquisition_program', 'acquisition_goal', 'behavior_plan', 'clinical_session')),
  entity_id uuid not null,
  action text not null check (action in ('created', 'updated', 'archived')),
  test_run_id uuid,
  created_at timestamptz not null default now()
);

create index clinical_audit_events_organization_created_idx
  on public.clinical_audit_events (organization_id, created_at desc);
create index clinical_audit_events_client_created_idx
  on public.clinical_audit_events (client_id, created_at desc);
create index clinical_audit_events_entity_idx
  on public.clinical_audit_events (entity_type, entity_id);

alter table public.assessments enable row level security;
alter table public.acquisition_programs enable row level security;
alter table public.acquisition_goals enable row level security;
alter table public.behavior_plans enable row level security;
alter table public.clinical_sessions enable row level security;
alter table public.session_behavior_measurements enable row level security;
alter table public.session_acquisition_trials enable row level security;
alter table public.clinical_audit_events enable row level security;

create policy assessments_select_member on public.assessments for select to authenticated
using (exists (select 1 from public.clients c join public.memberships m on m.organization_id = c.organization_id where c.id = assessments.client_id and m.user_id = (select auth.uid()) and m.status = 'active'));
create policy assessments_insert_writer on public.assessments for insert to authenticated
with check (exists (select 1 from public.clients c join public.memberships m on m.organization_id = c.organization_id where c.id = assessments.client_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('admin', 'clinician')));
create policy assessments_update_writer on public.assessments for update to authenticated
using (exists (select 1 from public.clients c join public.memberships m on m.organization_id = c.organization_id where c.id = assessments.client_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('admin', 'clinician')))
with check (exists (select 1 from public.clients c join public.memberships m on m.organization_id = c.organization_id where c.id = assessments.client_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('admin', 'clinician')));

create policy acquisition_programs_select_member on public.acquisition_programs for select to authenticated
using (exists (select 1 from public.clients c join public.memberships m on m.organization_id = c.organization_id where c.id = acquisition_programs.client_id and m.user_id = (select auth.uid()) and m.status = 'active'));
create policy acquisition_programs_insert_writer on public.acquisition_programs for insert to authenticated
with check (exists (select 1 from public.clients c join public.memberships m on m.organization_id = c.organization_id where c.id = acquisition_programs.client_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('admin', 'clinician')));
create policy acquisition_programs_update_writer on public.acquisition_programs for update to authenticated
using (exists (select 1 from public.clients c join public.memberships m on m.organization_id = c.organization_id where c.id = acquisition_programs.client_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('admin', 'clinician')))
with check (exists (select 1 from public.clients c join public.memberships m on m.organization_id = c.organization_id where c.id = acquisition_programs.client_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('admin', 'clinician')));

create policy acquisition_goals_select_member on public.acquisition_goals for select to authenticated
using (exists (select 1 from public.clients c join public.memberships m on m.organization_id = c.organization_id where c.id = acquisition_goals.client_id and m.user_id = (select auth.uid()) and m.status = 'active'));
create policy acquisition_goals_insert_writer on public.acquisition_goals for insert to authenticated
with check (exists (select 1 from public.clients c join public.memberships m on m.organization_id = c.organization_id where c.id = acquisition_goals.client_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('admin', 'clinician')));
create policy acquisition_goals_update_writer on public.acquisition_goals for update to authenticated
using (exists (select 1 from public.clients c join public.memberships m on m.organization_id = c.organization_id where c.id = acquisition_goals.client_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('admin', 'clinician')))
with check (exists (select 1 from public.clients c join public.memberships m on m.organization_id = c.organization_id where c.id = acquisition_goals.client_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('admin', 'clinician')));

create policy behavior_plans_select_member on public.behavior_plans for select to authenticated
using (exists (select 1 from public.clients c join public.memberships m on m.organization_id = c.organization_id where c.id = behavior_plans.client_id and m.user_id = (select auth.uid()) and m.status = 'active'));
create policy behavior_plans_insert_writer on public.behavior_plans for insert to authenticated
with check (exists (select 1 from public.clients c join public.memberships m on m.organization_id = c.organization_id where c.id = behavior_plans.client_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('admin', 'clinician')));
create policy behavior_plans_update_writer on public.behavior_plans for update to authenticated
using (exists (select 1 from public.clients c join public.memberships m on m.organization_id = c.organization_id where c.id = behavior_plans.client_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('admin', 'clinician')))
with check (exists (select 1 from public.clients c join public.memberships m on m.organization_id = c.organization_id where c.id = behavior_plans.client_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('admin', 'clinician')));

create policy clinical_sessions_select_member on public.clinical_sessions for select to authenticated
using (exists (select 1 from public.clients c join public.memberships m on m.organization_id = c.organization_id where c.id = clinical_sessions.client_id and m.user_id = (select auth.uid()) and m.status = 'active'));
create policy clinical_sessions_insert_writer on public.clinical_sessions for insert to authenticated
with check (exists (select 1 from public.clients c join public.memberships m on m.organization_id = c.organization_id where c.id = clinical_sessions.client_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('admin', 'clinician')));
create policy clinical_sessions_update_writer on public.clinical_sessions for update to authenticated
using (exists (select 1 from public.clients c join public.memberships m on m.organization_id = c.organization_id where c.id = clinical_sessions.client_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('admin', 'clinician')))
with check (exists (select 1 from public.clients c join public.memberships m on m.organization_id = c.organization_id where c.id = clinical_sessions.client_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('admin', 'clinician')));

create policy session_behavior_measurements_select_member on public.session_behavior_measurements for select to authenticated
using (exists (select 1 from public.clients c join public.memberships m on m.organization_id = c.organization_id where c.id = session_behavior_measurements.client_id and m.user_id = (select auth.uid()) and m.status = 'active'));
create policy session_behavior_measurements_insert_writer on public.session_behavior_measurements for insert to authenticated
with check (exists (select 1 from public.clients c join public.memberships m on m.organization_id = c.organization_id where c.id = session_behavior_measurements.client_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('admin', 'clinician')));
create policy session_behavior_measurements_update_writer on public.session_behavior_measurements for update to authenticated
using (exists (select 1 from public.clients c join public.memberships m on m.organization_id = c.organization_id where c.id = session_behavior_measurements.client_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('admin', 'clinician')))
with check (exists (select 1 from public.clients c join public.memberships m on m.organization_id = c.organization_id where c.id = session_behavior_measurements.client_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('admin', 'clinician')));

create policy session_acquisition_trials_select_member on public.session_acquisition_trials for select to authenticated
using (exists (select 1 from public.clients c join public.memberships m on m.organization_id = c.organization_id where c.id = session_acquisition_trials.client_id and m.user_id = (select auth.uid()) and m.status = 'active'));
create policy session_acquisition_trials_insert_writer on public.session_acquisition_trials for insert to authenticated
with check (exists (select 1 from public.clients c join public.memberships m on m.organization_id = c.organization_id where c.id = session_acquisition_trials.client_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('admin', 'clinician')));
create policy session_acquisition_trials_update_writer on public.session_acquisition_trials for update to authenticated
using (exists (select 1 from public.clients c join public.memberships m on m.organization_id = c.organization_id where c.id = session_acquisition_trials.client_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('admin', 'clinician')))
with check (exists (select 1 from public.clients c join public.memberships m on m.organization_id = c.organization_id where c.id = session_acquisition_trials.client_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('admin', 'clinician')));

create policy clinical_audit_events_deny_client_roles on public.clinical_audit_events
for all to anon, authenticated using (false) with check (false);

create function private.touch_clinical_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.touch_clinical_updated_at() from public, anon, authenticated;

create trigger assessments_touch_updated_at before update on public.assessments
for each row execute function private.touch_clinical_updated_at();
create trigger acquisition_programs_touch_updated_at before update on public.acquisition_programs
for each row execute function private.touch_clinical_updated_at();
create trigger acquisition_goals_touch_updated_at before update on public.acquisition_goals
for each row execute function private.touch_clinical_updated_at();
create trigger behavior_plans_touch_updated_at before update on public.behavior_plans
for each row execute function private.touch_clinical_updated_at();
create trigger clinical_sessions_touch_updated_at before update on public.clinical_sessions
for each row execute function private.touch_clinical_updated_at();
create trigger session_behavior_measurements_touch_updated_at before update on public.session_behavior_measurements
for each row execute function private.touch_clinical_updated_at();
create trigger session_acquisition_trials_touch_updated_at before update on public.session_acquisition_trials
for each row execute function private.touch_clinical_updated_at();

create function private.audit_clinical_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_entity_type text;
  v_action text;
begin
  select c.organization_id into strict v_organization_id
  from public.clients c
  where c.id = new.client_id;

  v_entity_type := case tg_table_name
    when 'assessments' then 'assessment'
    when 'acquisition_programs' then 'acquisition_program'
    when 'acquisition_goals' then 'acquisition_goal'
    when 'behavior_plans' then 'behavior_plan'
    when 'clinical_sessions' then 'clinical_session'
  end;

  v_action := case
    when tg_op = 'INSERT' then 'created'
    when to_jsonb(new) ->> 'status' = 'archived'
      and to_jsonb(old) ->> 'status' is distinct from 'archived' then 'archived'
    else 'updated'
  end;

  insert into public.clinical_audit_events (
    organization_id, actor_user_id, client_id, entity_type,
    entity_id, action, test_run_id
  ) values (
    v_organization_id, (select auth.uid()), new.client_id, v_entity_type,
    new.id, v_action, new.test_run_id
  );

  return new;
end;
$$;

revoke all on function private.audit_clinical_change() from public, anon, authenticated;

create trigger assessments_audit_change after insert or update on public.assessments
for each row execute function private.audit_clinical_change();
create trigger acquisition_programs_audit_change after insert or update on public.acquisition_programs
for each row execute function private.audit_clinical_change();
create trigger acquisition_goals_audit_change after insert or update on public.acquisition_goals
for each row execute function private.audit_clinical_change();
create trigger behavior_plans_audit_change after insert or update on public.behavior_plans
for each row execute function private.audit_clinical_change();
create trigger clinical_sessions_audit_change after insert or update on public.clinical_sessions
for each row execute function private.audit_clinical_change();

revoke all on table public.assessments from public, anon, authenticated;
revoke all on table public.acquisition_programs from public, anon, authenticated;
revoke all on table public.acquisition_goals from public, anon, authenticated;
revoke all on table public.behavior_plans from public, anon, authenticated;
revoke all on table public.clinical_sessions from public, anon, authenticated;
revoke all on table public.session_behavior_measurements from public, anon, authenticated;
revoke all on table public.session_acquisition_trials from public, anon, authenticated;
revoke all on table public.clinical_audit_events from public, anon, authenticated;

grant select, insert, update on table public.assessments to authenticated;
grant select, insert, update on table public.acquisition_programs to authenticated;
grant select, insert, update on table public.acquisition_goals to authenticated;
grant select, insert, update on table public.behavior_plans to authenticated;
grant select, insert, update on table public.clinical_sessions to authenticated;
grant select, insert, update on table public.session_behavior_measurements to authenticated;
grant select, insert, update on table public.session_acquisition_trials to authenticated;

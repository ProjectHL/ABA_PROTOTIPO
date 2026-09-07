-- Recovered from ABA_staging migration history; schema only.
-- S-ABA-01 + S-ABA-02: student-scoped authorization and minimum clinical record.
-- Synthetic staging only. Additive and non-destructive: no DROP, DELETE or Storage.

create table public.student_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  role text not null check (role in ('supervisor', 'coordinator', 'therapist', 'family')),
  is_primary boolean not null default false,
  status text not null default 'active' check (status in ('active', 'inactive')),
  effective_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete restrict,
  test_run_id uuid,
  check ((role = 'supervisor') or not is_primary),
  check ((status = 'active' and ended_at is null) or status = 'inactive')
);

create unique index student_assignments_active_user_idx
  on public.student_assignments (client_id, user_id)
  where status = 'active';
create unique index student_assignments_primary_supervisor_idx
  on public.student_assignments (client_id)
  where status = 'active' and is_primary;
create index student_assignments_user_client_idx
  on public.student_assignments (user_id, client_id, status);
create index student_assignments_organization_idx
  on public.student_assignments (organization_id, client_id);

create table public.student_authorization_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  requester_user_id uuid not null references auth.users(id) on delete restrict,
  resource_type text not null check (resource_type in ('student', 'program', 'record_config', 'chart')),
  requested_actions text[] not null check (cardinality(requested_actions) > 0),
  reason text not null check (char_length(btrim(reason)) between 1 and 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  test_run_id uuid
);

create unique index student_authorization_requests_pending_idx
  on public.student_authorization_requests
    (client_id, requester_user_id, resource_type, requested_actions)
  where status = 'pending';
create index student_authorization_requests_client_status_idx
  on public.student_authorization_requests (client_id, status, created_at desc);
create index student_authorization_requests_requester_idx
  on public.student_authorization_requests (requester_user_id, created_at desc);

create table public.student_authorization_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  request_id uuid not null references public.student_authorization_requests(id) on delete restrict,
  decider_user_id uuid not null references auth.users(id) on delete restrict,
  decision text not null check (decision in ('approved', 'denied', 'revoked')),
  granted_actions text[] not null default '{}'::text[],
  effective_at timestamptz not null default now(),
  expires_at timestamptz,
  supersedes_decision_id uuid references public.student_authorization_decisions(id) on delete restrict,
  created_at timestamptz not null default now(),
  test_run_id uuid,
  check (
    (decision = 'approved' and cardinality(granted_actions) > 0 and expires_at is not null)
    or (decision in ('denied', 'revoked') and cardinality(granted_actions) = 0)
  ),
  check (expires_at is null or expires_at > effective_at)
);

create index student_authorization_decisions_request_idx
  on public.student_authorization_decisions (request_id, created_at desc);
create index student_authorization_decisions_client_idx
  on public.student_authorization_decisions (client_id, created_at desc);
create index student_authorization_decisions_supersedes_idx
  on public.student_authorization_decisions (supersedes_decision_id)
  where supersedes_decision_id is not null;

create table public.client_context_profiles (
  client_id uuid primary key references public.clients(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  home_adaptations text check (home_adaptations is null or char_length(btrim(home_adaptations)) between 1 and 2000),
  schooling text check (schooling is null or char_length(btrim(schooling)) between 1 and 500),
  school_adaptations text check (school_adaptations is null or char_length(btrim(school_adaptations)) between 1 and 2000),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users(id) on delete restrict,
  test_run_id uuid
);

create index client_context_profiles_organization_idx
  on public.client_context_profiles (organization_id, client_id);

create table public.clinical_history_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  kind text not null check (kind in ('reported_diagnosis', 'assessment', 'procedure', 'medication')),
  descriptor text not null check (char_length(btrim(descriptor)) between 1 and 200),
  occurred_on date check (occurred_on is null or occurred_on <= current_date),
  dose text check (dose is null or char_length(btrim(dose)) between 1 and 120),
  prescriber_descriptor text check (prescriber_descriptor is null or char_length(btrim(prescriber_descriptor)) between 1 and 120),
  started_on date check (started_on is null or started_on <= current_date),
  ended_on date check (ended_on is null or ended_on <= current_date),
  status text not null default 'active' check (status in ('active', 'superseded', 'entered_in_error')),
  supersedes_id uuid references public.clinical_history_entries(id) on delete restrict,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete restrict,
  test_run_id uuid,
  check (ended_on is null or started_on is null or ended_on >= started_on),
  check (
    kind = 'medication'
    or (dose is null and prescriber_descriptor is null and started_on is null and ended_on is null)
  )
);

create index clinical_history_entries_client_idx
  on public.clinical_history_entries (client_id, created_at desc);
create index clinical_history_entries_active_idx
  on public.clinical_history_entries (client_id, kind, created_at desc)
  where status = 'active';
create index clinical_history_entries_supersedes_idx
  on public.clinical_history_entries (supersedes_id)
  where supersedes_id is not null;

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  purpose_code text not null check (char_length(btrim(purpose_code)) between 1 and 80),
  notice_version text not null check (char_length(btrim(notice_version)) between 1 and 80),
  grantor_descriptor text not null check (char_length(btrim(grantor_descriptor)) between 1 and 120),
  channel text not null check (char_length(btrim(channel)) between 1 and 80),
  evidence_reference text check (evidence_reference is null or char_length(btrim(evidence_reference)) between 1 and 200),
  status text not null check (status in ('pending_review', 'valid', 'revoked', 'expired', 'superseded')),
  effective_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete restrict,
  supersedes_id uuid references public.consent_records(id) on delete restrict,
  test_run_id uuid,
  check (expires_at is null or effective_at is null or expires_at > effective_at)
);

create unique index consent_records_valid_purpose_idx
  on public.consent_records (client_id, purpose_code)
  where status = 'valid';
create index consent_records_client_idx
  on public.consent_records (client_id, purpose_code, created_at desc);
create index consent_records_supersedes_idx
  on public.consent_records (supersedes_id)
  where supersedes_id is not null;

create table public.consent_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  consent_record_id uuid not null references public.consent_records(id) on delete restrict,
  event_type text not null check (event_type in ('recorded', 'revoked', 'expired', 'superseded')),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  test_run_id uuid
);

create index consent_events_record_idx
  on public.consent_events (consent_record_id, created_at);
create index consent_events_client_idx
  on public.consent_events (client_id, created_at desc);

alter table public.student_assignments enable row level security;
alter table public.student_authorization_requests enable row level security;
alter table public.student_authorization_decisions enable row level security;
alter table public.client_context_profiles enable row level security;
alter table public.clinical_history_entries enable row level security;
alter table public.consent_records enable row level security;
alter table public.consent_events enable row level security;

create function private.has_active_student_assignment(p_client_id uuid)
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
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and sa.status = 'active'
      and sa.effective_at <= now()
      and (sa.ended_at is null or sa.ended_at > now())
  );
$$;

create function private.student_assignment_role(p_client_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select sa.role
  from public.student_assignments sa
  join public.memberships m
    on m.organization_id = sa.organization_id
    and m.user_id = sa.user_id
  where sa.client_id = p_client_id
    and sa.user_id = (select auth.uid())
    and sa.status = 'active'
    and m.status = 'active'
    and sa.effective_at <= now()
    and (sa.ended_at is null or sa.ended_at > now())
  limit 1;
$$;

create function private.is_primary_student_supervisor(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.student_assignments sa
    join public.memberships m
      on m.organization_id = sa.organization_id
      and m.user_id = sa.user_id
    where sa.client_id = p_client_id
      and sa.user_id = (select auth.uid())
      and sa.role = 'supervisor'
      and sa.is_primary
      and sa.status = 'active'
      and m.status = 'active'
  );
$$;

create function private.has_student_capability(p_client_id uuid, p_capability text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with assignment as (
    select sa.role, sa.user_id
    from public.student_assignments sa
    join public.memberships m
      on m.organization_id = sa.organization_id
      and m.user_id = sa.user_id
    where sa.client_id = p_client_id
      and sa.user_id = (select auth.uid())
      and sa.status = 'active'
      and m.status = 'active'
      and sa.effective_at <= now()
      and (sa.ended_at is null or sa.ended_at > now())
    limit 1
  )
  select exists (
    select 1 from assignment a
    where
      a.role = 'supervisor'
      or (
        a.role in ('coordinator', 'therapist')
        and p_capability in (
          'student.view', 'program.view', 'record_config.view', 'record.view',
          'record.capture', 'record.submit', 'chart.view', 'result.download'
        )
      )
      or (
        a.role = 'coordinator'
        and p_capability = 'authorization.request'
      )
      or (
        a.role = 'coordinator'
        and exists (
          select 1
          from public.student_authorization_requests r
          join public.student_authorization_decisions d on d.request_id = r.id
          where r.client_id = p_client_id
            and r.requester_user_id = a.user_id
            and r.status = 'approved'
            and d.decision = 'approved'
            and p_capability = any(d.granted_actions)
            and d.effective_at <= now()
            and d.expires_at > now()
            and not exists (
              select 1 from public.student_authorization_decisions revoked
              where revoked.supersedes_decision_id = d.id
                and revoked.decision = 'revoked'
            )
        )
      )
  );
$$;

revoke all on function private.has_active_student_assignment(uuid) from public, anon, authenticated;
revoke all on function private.student_assignment_role(uuid) from public, anon, authenticated;
revoke all on function private.is_primary_student_supervisor(uuid) from public, anon, authenticated;
revoke all on function private.has_student_capability(uuid, text) from public, anon, authenticated;

-- Explicit legacy mapping. The audited creator (or first active writer fallback) becomes
-- primary supervisor; other clinicians become therapists; viewer receives no assignment.
with candidates as (
  select c.id as client_id, c.organization_id, m.user_id, m.role, m.created_at,
    coalesce(
      (
        select ae.actor_user_id
        from public.audit_events ae
        join public.memberships creator_membership
          on creator_membership.organization_id = c.organization_id
          and creator_membership.user_id = ae.actor_user_id
          and creator_membership.status = 'active'
        where ae.entity_type = 'client' and ae.entity_id = c.id and ae.action = 'created'
        order by ae.created_at
        limit 1
      ),
      first_value(m.user_id) over (
        partition by c.id
        order by case when m.role = 'admin' then 0 else 1 end, m.created_at, m.user_id
      )
    ) as primary_user_id
  from public.clients c
  join public.memberships m on m.organization_id = c.organization_id
  where m.status = 'active' and m.role in ('admin', 'clinician')
), mapped as (
  select client_id, organization_id, user_id,
    case when user_id = primary_user_id then 'supervisor' else 'therapist' end as mapped_role,
    user_id = primary_user_id as mapped_primary
  from candidates
)
insert into public.student_assignments (
  organization_id, client_id, user_id, role, is_primary, created_by, test_run_id
)
select organization_id, client_id, user_id, mapped_role,
  mapped_primary,
  null, null
from mapped
on conflict do nothing;

create policy student_assignments_select_team
on public.student_assignments for select to authenticated
using ((select private.has_active_student_assignment(client_id)));

create policy authorization_requests_select_participant
on public.student_authorization_requests for select to authenticated
using (
  requester_user_id = (select auth.uid())
  or (select private.is_primary_student_supervisor(client_id))
);

create policy authorization_decisions_select_participant
on public.student_authorization_decisions for select to authenticated
using (
  (select private.is_primary_student_supervisor(client_id))
  or exists (
    select 1 from public.student_authorization_requests r
    where r.id = student_authorization_decisions.request_id
      and r.requester_user_id = (select auth.uid())
  )
);

create policy client_context_profiles_select_assigned
on public.client_context_profiles for select to authenticated
using ((select private.has_student_capability(client_id, 'student.view')));
create policy client_context_profiles_insert_editor
on public.client_context_profiles for insert to authenticated
with check (
  (select private.has_student_capability(client_id, 'student.edit'))
  and updated_by = (select auth.uid())
  and organization_id = (select c.organization_id from public.clients c where c.id = client_id)
);
create policy client_context_profiles_update_editor
on public.client_context_profiles for update to authenticated
using ((select private.has_student_capability(client_id, 'student.edit')))
with check (
  (select private.has_student_capability(client_id, 'student.edit'))
  and updated_by = (select auth.uid())
  and organization_id = (select c.organization_id from public.clients c where c.id = client_id)
);

create policy clinical_history_entries_select_assigned
on public.clinical_history_entries for select to authenticated
using ((select private.has_student_capability(client_id, 'student.view')));
create policy clinical_history_entries_insert_editor
on public.clinical_history_entries for insert to authenticated
with check (
  (select private.has_student_capability(client_id, 'student.edit'))
  and created_by = (select auth.uid())
  and organization_id = (select c.organization_id from public.clients c where c.id = client_id)
);

create policy consent_records_select_professional
on public.consent_records for select to authenticated
using ((select private.student_assignment_role(client_id)) in ('supervisor', 'coordinator'));
create policy consent_events_select_professional
on public.consent_events for select to authenticated
using ((select private.student_assignment_role(client_id)) in ('supervisor', 'coordinator'));

-- Existing client and clinical policies become student-scoped.
alter policy clients_select_member on public.clients
  using ((select private.has_student_capability(id, 'student.view')));
alter policy clients_insert_writer on public.clients
  with check (exists (
    select 1 from public.memberships m
    where m.organization_id = clients.organization_id
      and m.user_id = (select auth.uid()) and m.status = 'active' and m.role = 'admin'
  ));
alter policy clients_update_writer on public.clients
  using ((select private.has_student_capability(id, 'student.edit')))
  with check ((select private.has_student_capability(id, 'student.edit')));

alter policy guardians_select_member on public.guardians
  using ((select private.has_student_capability(client_id, 'student.view')));
alter policy guardians_insert_writer on public.guardians
  with check ((select private.has_student_capability(client_id, 'student.edit')));
alter policy guardians_update_writer on public.guardians
  using ((select private.has_student_capability(client_id, 'student.edit')))
  with check ((select private.has_student_capability(client_id, 'student.edit')));

alter policy siblings_select_member on public.siblings
  using ((select private.has_student_capability(client_id, 'student.view')));
alter policy siblings_insert_writer on public.siblings
  with check ((select private.has_student_capability(client_id, 'student.edit')));
alter policy siblings_update_writer on public.siblings
  using ((select private.has_student_capability(client_id, 'student.edit')))
  with check ((select private.has_student_capability(client_id, 'student.edit')));

alter policy assessments_select_member on public.assessments
  using ((select private.has_student_capability(client_id, 'student.view')));
alter policy assessments_insert_writer on public.assessments
  with check ((select private.has_student_capability(client_id, 'student.edit')));
alter policy assessments_update_writer on public.assessments
  using ((select private.has_student_capability(client_id, 'student.edit')))
  with check ((select private.has_student_capability(client_id, 'student.edit')));

alter policy acquisition_programs_select_member on public.acquisition_programs
  using ((select private.has_student_capability(client_id, 'program.view')));
alter policy acquisition_programs_insert_writer on public.acquisition_programs
  with check ((select private.has_student_capability(client_id, 'program.edit')));
alter policy acquisition_programs_update_writer on public.acquisition_programs
  using ((select private.has_student_capability(client_id, 'program.edit')))
  with check ((select private.has_student_capability(client_id, 'program.edit')));

alter policy acquisition_goals_select_member on public.acquisition_goals
  using ((select private.has_student_capability(client_id, 'program.view')));
alter policy acquisition_goals_insert_writer on public.acquisition_goals
  with check ((select private.has_student_capability(client_id, 'program.edit')));
alter policy acquisition_goals_update_writer on public.acquisition_goals
  using ((select private.has_student_capability(client_id, 'program.edit')))
  with check ((select private.has_student_capability(client_id, 'program.edit')));

alter policy behavior_plans_select_member on public.behavior_plans
  using ((select private.has_student_capability(client_id, 'program.view')));
alter policy behavior_plans_insert_writer on public.behavior_plans
  with check ((select private.has_student_capability(client_id, 'program.edit')));
alter policy behavior_plans_update_writer on public.behavior_plans
  using ((select private.has_student_capability(client_id, 'program.edit')))
  with check ((select private.has_student_capability(client_id, 'program.edit')));

alter policy clinical_sessions_select_member on public.clinical_sessions
  using ((select private.has_student_capability(client_id, 'record.view')));
alter policy clinical_sessions_insert_writer on public.clinical_sessions
  with check ((select private.has_student_capability(client_id, 'record.capture')));
alter policy clinical_sessions_update_writer on public.clinical_sessions
  using ((select private.has_student_capability(client_id, 'record.submit')))
  with check ((select private.has_student_capability(client_id, 'record.submit')));

alter policy session_behavior_measurements_select_member on public.session_behavior_measurements
  using ((select private.has_student_capability(client_id, 'record.view')));
alter policy session_behavior_measurements_insert_writer on public.session_behavior_measurements
  with check ((select private.has_student_capability(client_id, 'record.capture')));
alter policy session_behavior_measurements_update_writer on public.session_behavior_measurements
  using ((select private.has_student_capability(client_id, 'record.capture')))
  with check ((select private.has_student_capability(client_id, 'record.capture')));

alter policy session_acquisition_trials_select_member on public.session_acquisition_trials
  using ((select private.has_student_capability(client_id, 'record.view')));
alter policy session_acquisition_trials_insert_writer on public.session_acquisition_trials
  with check ((select private.has_student_capability(client_id, 'record.capture')));
alter policy session_acquisition_trials_update_writer on public.session_acquisition_trials
  using ((select private.has_student_capability(client_id, 'record.capture')))
  with check ((select private.has_student_capability(client_id, 'record.capture')));

create function public.request_student_authorization(
  p_client_id uuid,
  p_resource_type text,
  p_actions text[],
  p_reason text,
  p_test_run_id uuid default null
)
returns public.student_authorization_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_request public.student_authorization_requests;
  v_actions text[];
begin
  if (select auth.uid()) is null or (select private.student_assignment_role(p_client_id)) <> 'coordinator' then
    raise exception using errcode = '42501', message = 'coordinator_assignment_required';
  end if;
  if p_resource_type not in ('student', 'program', 'record_config', 'chart') then
    raise exception using errcode = '22023', message = 'invalid_resource_type';
  end if;
  select array_agg(distinct action order by action) into v_actions from unnest(p_actions) action;
  if cardinality(v_actions) = 0 or exists (
    select 1 from unnest(v_actions) action
    where action not in ('student.edit', 'program.edit', 'record_config.create', 'record_config.edit', 'chart.configure')
  ) then
    raise exception using errcode = '22023', message = 'invalid_requested_actions';
  end if;
  select c.organization_id into strict v_organization_id from public.clients c where c.id = p_client_id;
  select * into v_request
  from public.student_authorization_requests r
  where r.client_id = p_client_id
    and r.requester_user_id = (select auth.uid())
    and r.resource_type = p_resource_type
    and r.requested_actions = v_actions
    and r.status = 'pending'
  limit 1;
  if found then return v_request; end if;
  insert into public.student_authorization_requests (
    organization_id, client_id, requester_user_id, resource_type,
    requested_actions, reason, test_run_id
  ) values (
    v_organization_id, p_client_id, (select auth.uid()), p_resource_type,
    v_actions, btrim(p_reason), p_test_run_id
  ) returning * into v_request;
  insert into public.clinical_audit_events (
    organization_id, actor_user_id, client_id, entity_type, entity_id, action, test_run_id
  ) values (
    v_organization_id, (select auth.uid()), p_client_id,
    'student_authorization_request', v_request.id, 'requested', p_test_run_id
  );
  return v_request;
end;
$$;

create function public.decide_student_authorization(
  p_request_id uuid,
  p_decision text,
  p_expires_at timestamptz default null,
  p_test_run_id uuid default null
)
returns public.student_authorization_decisions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.student_authorization_requests;
  v_decision public.student_authorization_decisions;
begin
  select * into strict v_request
  from public.student_authorization_requests r
  where r.id = p_request_id for update;
  if not (select private.is_primary_student_supervisor(v_request.client_id)) then
    raise exception using errcode = '42501', message = 'primary_supervisor_required';
  end if;
  if v_request.status <> 'pending' then
    raise exception using errcode = '40001', message = 'authorization_state_changed';
  end if;
  if p_decision not in ('approved', 'denied') then
    raise exception using errcode = '22023', message = 'invalid_authorization_decision';
  end if;
  if p_decision = 'approved' and (
    p_expires_at is null or p_expires_at <= now() or p_expires_at > now() + interval '90 days'
  ) then
    raise exception using errcode = '22023', message = 'authorization_expiry_out_of_range';
  end if;
  insert into public.student_authorization_decisions (
    organization_id, client_id, request_id, decider_user_id, decision,
    granted_actions, expires_at, test_run_id
  ) values (
    v_request.organization_id, v_request.client_id, v_request.id, (select auth.uid()), p_decision,
    case when p_decision = 'approved' then v_request.requested_actions else '{}'::text[] end,
    case when p_decision = 'approved' then p_expires_at else null end,
    p_test_run_id
  ) returning * into v_decision;
  update public.student_authorization_requests
  set status = p_decision, resolved_at = now()
  where id = v_request.id;
  insert into public.clinical_audit_events (
    organization_id, actor_user_id, client_id, entity_type, entity_id, action, test_run_id
  ) values (
    v_request.organization_id, (select auth.uid()), v_request.client_id,
    'student_authorization_decision', v_decision.id, p_decision, p_test_run_id
  );
  return v_decision;
end;
$$;

create function public.revoke_student_authorization(
  p_decision_id uuid,
  p_test_run_id uuid default null
)
returns public.student_authorization_decisions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prior public.student_authorization_decisions;
  v_revocation public.student_authorization_decisions;
begin
  select * into strict v_prior from public.student_authorization_decisions d
  where d.id = p_decision_id and d.decision = 'approved';
  if not (select private.is_primary_student_supervisor(v_prior.client_id)) then
    raise exception using errcode = '42501', message = 'primary_supervisor_required';
  end if;
  if exists (select 1 from public.student_authorization_decisions d where d.supersedes_decision_id = v_prior.id and d.decision = 'revoked') then
    raise exception using errcode = '40001', message = 'authorization_state_changed';
  end if;
  insert into public.student_authorization_decisions (
    organization_id, client_id, request_id, decider_user_id, decision,
    granted_actions, supersedes_decision_id, test_run_id
  ) values (
    v_prior.organization_id, v_prior.client_id, v_prior.request_id,
    (select auth.uid()), 'revoked', '{}'::text[], v_prior.id, p_test_run_id
  ) returning * into v_revocation;
  insert into public.clinical_audit_events (
    organization_id, actor_user_id, client_id, entity_type, entity_id, action, test_run_id
  ) values (
    v_prior.organization_id, (select auth.uid()), v_prior.client_id,
    'student_authorization_decision', v_revocation.id, 'revoked', p_test_run_id
  );
  return v_revocation;
end;
$$;

create function public.save_client_context(
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

create function public.append_clinical_history_entry(
  p_client_id uuid,
  p_kind text,
  p_descriptor text,
  p_occurred_on date default null,
  p_dose text default null,
  p_prescriber_descriptor text default null,
  p_started_on date default null,
  p_ended_on date default null,
  p_supersedes_id uuid default null,
  p_test_run_id uuid default null
)
returns public.clinical_history_entries
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_prior public.clinical_history_entries;
  v_entry public.clinical_history_entries;
begin
  if not (select private.has_student_capability(p_client_id, 'student.edit')) then
    raise exception using errcode = '42501', message = 'student_edit_required';
  end if;
  select c.organization_id into strict v_organization_id from public.clients c where c.id = p_client_id;
  if p_supersedes_id is not null then
    select * into strict v_prior from public.clinical_history_entries e
    where e.id = p_supersedes_id and e.client_id = p_client_id and e.kind = p_kind and e.status = 'active'
    for update;
    update public.clinical_history_entries set status = 'superseded' where id = v_prior.id;
  end if;
  insert into public.clinical_history_entries (
    organization_id, client_id, kind, descriptor, occurred_on, dose,
    prescriber_descriptor, started_on, ended_on, supersedes_id, created_by, test_run_id
  ) values (
    v_organization_id, p_client_id, p_kind, btrim(p_descriptor), p_occurred_on,
    nullif(btrim(p_dose), ''), nullif(btrim(p_prescriber_descriptor), ''),
    p_started_on, p_ended_on, p_supersedes_id, (select auth.uid()), p_test_run_id
  ) returning * into v_entry;
  return v_entry;
end;
$$;

create function public.set_student_assignment(
  p_client_id uuid,
  p_user_id uuid,
  p_role text,
  p_status text default 'active',
  p_test_run_id uuid default null
)
returns public.student_assignments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_assignment public.student_assignments;
begin
  if not (select private.is_primary_student_supervisor(p_client_id)) then
    raise exception using errcode = '42501', message = 'primary_supervisor_required';
  end if;
  if p_user_id = (select auth.uid()) then
    raise exception using errcode = '22023', message = 'self_assignment_change_not_allowed';
  end if;
  if p_role not in ('supervisor', 'coordinator', 'therapist', 'family')
    or p_status not in ('active', 'inactive') then
    raise exception using errcode = '22023', message = 'invalid_assignment';
  end if;
  select c.organization_id into strict v_organization_id from public.clients c where c.id = p_client_id;
  if not exists (
    select 1 from public.memberships m
    where m.organization_id = v_organization_id and m.user_id = p_user_id and m.status = 'active'
  ) then
    raise exception using errcode = '42501', message = 'active_membership_required';
  end if;
  select * into v_assignment
  from public.student_assignments sa
  where sa.client_id = p_client_id and sa.user_id = p_user_id and sa.status = 'active'
  for update;
  if found then
    update public.student_assignments
    set role = p_role,
        status = p_status,
        ended_at = case when p_status = 'inactive' then now() else null end,
        test_run_id = coalesce(p_test_run_id, test_run_id)
    where id = v_assignment.id
    returning * into v_assignment;
  elsif p_status = 'active' then
    insert into public.student_assignments (
      organization_id, client_id, user_id, role, is_primary, created_by, test_run_id
    ) values (
      v_organization_id, p_client_id, p_user_id, p_role, false, (select auth.uid()), p_test_run_id
    ) returning * into v_assignment;
  else
    raise exception using errcode = '22023', message = 'active_assignment_not_found';
  end if;
  insert into public.clinical_audit_events (
    organization_id, actor_user_id, client_id, entity_type, entity_id, action, test_run_id
  ) values (
    v_organization_id, (select auth.uid()), p_client_id, 'student_assignment',
    v_assignment.id, case when p_status = 'active' then 'assigned' else 'unassigned' end, p_test_run_id
  );
  return v_assignment;
end;
$$;

create function public.record_consent_reference(
  p_client_id uuid,
  p_purpose_code text,
  p_notice_version text,
  p_grantor_descriptor text,
  p_channel text,
  p_status text,
  p_effective_at timestamptz default null,
  p_expires_at timestamptz default null,
  p_evidence_reference text default null,
  p_supersedes_id uuid default null,
  p_test_run_id uuid default null
)
returns public.consent_records
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_prior public.consent_records;
  v_record public.consent_records;
begin
  if not (select private.is_primary_student_supervisor(p_client_id)) then
    raise exception using errcode = '42501', message = 'primary_supervisor_required';
  end if;
  if p_status not in ('pending_review', 'valid', 'revoked', 'expired', 'superseded') then
    raise exception using errcode = '22023', message = 'invalid_consent_status';
  end if;
  select c.organization_id into strict v_organization_id from public.clients c where c.id = p_client_id;
  if p_supersedes_id is not null then
    select * into strict v_prior from public.consent_records cr
    where cr.id = p_supersedes_id and cr.client_id = p_client_id for update;
    update public.consent_records set status = 'superseded' where id = v_prior.id;
  end if;
  insert into public.consent_records (
    organization_id, client_id, purpose_code, notice_version, grantor_descriptor,
    channel, evidence_reference, status, effective_at, expires_at,
    created_by, supersedes_id, test_run_id
  ) values (
    v_organization_id, p_client_id, btrim(p_purpose_code), btrim(p_notice_version),
    btrim(p_grantor_descriptor), btrim(p_channel), nullif(btrim(p_evidence_reference), ''),
    p_status, p_effective_at, p_expires_at, (select auth.uid()), p_supersedes_id, p_test_run_id
  ) returning * into v_record;
  insert into public.consent_events (
    organization_id, client_id, consent_record_id, event_type, actor_user_id, test_run_id
  ) values (
    v_organization_id, p_client_id, v_record.id,
    case when p_status in ('revoked', 'expired', 'superseded') then p_status else 'recorded' end,
    (select auth.uid()), p_test_run_id
  );
  return v_record;
end;
$$;

revoke all on table public.student_assignments from public, anon, authenticated;
revoke all on table public.student_authorization_requests from public, anon, authenticated;
revoke all on table public.student_authorization_decisions from public, anon, authenticated;
revoke all on table public.client_context_profiles from public, anon, authenticated;
revoke all on table public.clinical_history_entries from public, anon, authenticated;
revoke all on table public.consent_records from public, anon, authenticated;
revoke all on table public.consent_events from public, anon, authenticated;

grant select on table public.student_assignments to authenticated;
grant select on table public.student_authorization_requests to authenticated;
grant select on table public.student_authorization_decisions to authenticated;
grant select, insert, update on table public.client_context_profiles to authenticated;
grant select, insert on table public.clinical_history_entries to authenticated;
grant select on table public.consent_records to authenticated;
grant select on table public.consent_events to authenticated;

revoke all on function public.request_student_authorization(uuid, text, text[], text, uuid) from public, anon, authenticated;
revoke all on function public.decide_student_authorization(uuid, text, timestamptz, uuid) from public, anon, authenticated;
revoke all on function public.revoke_student_authorization(uuid, uuid) from public, anon, authenticated;
revoke all on function public.save_client_context(uuid, text, text, text, integer, uuid) from public, anon, authenticated;
revoke all on function public.append_clinical_history_entry(uuid, text, text, date, text, text, date, date, uuid, uuid) from public, anon, authenticated;
revoke all on function public.record_consent_reference(uuid, text, text, text, text, text, timestamptz, timestamptz, text, uuid, uuid) from public, anon, authenticated;
revoke all on function public.set_student_assignment(uuid, uuid, text, text, uuid) from public, anon, authenticated;

grant execute on function public.request_student_authorization(uuid, text, text[], text, uuid) to authenticated;
grant execute on function public.decide_student_authorization(uuid, text, timestamptz, uuid) to authenticated;
grant execute on function public.revoke_student_authorization(uuid, uuid) to authenticated;
grant execute on function public.save_client_context(uuid, text, text, text, integer, uuid) to authenticated;
grant execute on function public.append_clinical_history_entry(uuid, text, text, date, text, text, date, date, uuid, uuid) to authenticated;
grant execute on function public.record_consent_reference(uuid, text, text, text, text, text, timestamptz, timestamptz, text, uuid, uuid) to authenticated;
grant execute on function public.set_student_assignment(uuid, uuid, text, text, uuid) to authenticated;

-- New clients are created only by legacy admin members and receive a primary supervisor assignment.
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
security definer
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
    and m.status = 'active'
    and (
      m.role = 'admin'
      or exists (
        select 1 from public.student_assignments sa
        where sa.organization_id = m.organization_id
          and sa.user_id = m.user_id
          and sa.role = 'supervisor'
          and sa.is_primary
          and sa.status = 'active'
      )
    );
  if v_membership_count <> 1 then
    raise exception using errcode = '42501', message = 'single_supervisor_membership_required';
  end if;
  if jsonb_typeof(p_guardians) <> 'array' or jsonb_typeof(p_siblings) <> 'array' then
    raise exception using errcode = '22023', message = 'family_payload_must_be_arrays';
  end if;
  insert into public.clients (
    organization_id, clinical_id, initials, primary_language,
    birth_date, living_arrangement, test_run_id
  ) values (
    v_organization_id, btrim(p_clinical_id), upper(btrim(p_initials)),
    btrim(p_primary_language), p_birth_date, nullif(btrim(p_living_arrangement), ''), p_test_run_id
  ) returning * into v_client;
  insert into public.student_assignments (
    organization_id, client_id, user_id, role, is_primary, created_by, test_run_id
  ) values (
    v_organization_id, v_client.id, (select auth.uid()), 'supervisor', true,
    (select auth.uid()), p_test_run_id
  );
  insert into public.guardians (client_id, initials, birth_date, position, test_run_id)
  select v_client.id, upper(btrim(item.value ->> 'initials')),
    nullif(item.value ->> 'birth_date', '')::date, item.ordinality - 1, p_test_run_id
  from jsonb_array_elements(p_guardians) with ordinality as item(value, ordinality);
  insert into public.siblings (client_id, initials, birth_date, position, test_run_id)
  select v_client.id, upper(btrim(item.value ->> 'initials')),
    nullif(item.value ->> 'birth_date', '')::date, item.ordinality - 1, p_test_run_id
  from jsonb_array_elements(p_siblings) with ordinality as item(value, ordinality);
  return v_client;
end;
$$;

revoke insert on table public.clients from authenticated;
revoke insert on table public.guardians from authenticated;
revoke insert on table public.siblings from authenticated;
revoke all on function public.create_client(text, text, text, date, text, jsonb, jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.create_client(text, text, text, date, text, jsonb, jsonb, uuid)
  to authenticated;

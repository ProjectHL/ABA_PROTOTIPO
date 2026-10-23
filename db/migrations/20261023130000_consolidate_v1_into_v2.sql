-- Fase 3 of the simplification plan: consolidate V1 clinical storage into V2.
--
-- Family, history and session rows still living in the V1 tables are lifted
-- into the canonical V2 tables before the V1 tables and commands are removed.
-- The migration aborts instead of dropping a row that cannot be represented
-- (missing actor or program version). Test-batch references are detached when
-- the batch no longer belongs to the organization.
--
-- `clinical_sessions` also acted as the anchor row for every V2 session through
-- a foreign key and a compatibility mirror. The backfill keeps the V2 state,
-- the anchor is removed and the session command stops writing the mirror.

-- ---------------------------------------------------------------------------
-- 1. Family snapshot: guardians/siblings -> client_people_v2/client_siblings_v2
-- ---------------------------------------------------------------------------
create temporary table _f3_org_actor as
select o.id as organization_id,
  coalesce(
    (select m.user_id from public.memberships m
      where m.organization_id = o.id and m.status = 'active' and m.role = 'admin'
      order by m.created_at, m.user_id limit 1),
    (select m.user_id from public.memberships m
      where m.organization_id = o.id and m.status = 'active'
      order by m.created_at, m.user_id limit 1)
  ) as actor_id
from public.organizations o;

insert into public.client_people_v2(
  id, client_id, organization_id, full_name, initials, birth_date, relationship,
  phone, email, roles, is_primary_contact, version, created_at, updated_at,
  created_by, updated_by, archived_at, archived_by, test_run_id)
select g.id, g.client_id, c.organization_id, null, g.initials, g.birth_date,
  coalesce(g.relationship, ''), coalesce(g.phone, ''), null,
  array['family']::text[], false, 1,
  g.created_at + g.position * interval '1 microsecond',
  g.created_at + g.position * interval '1 microsecond',
  a.actor_id, a.actor_id, null, null,
  case when exists (
    select 1 from public.test_data_batches b
    where b.organization_id = c.organization_id and b.id = g.test_run_id
  ) then g.test_run_id else null end
from public.guardians g
join public.clients c on c.id = g.client_id
join _f3_org_actor a on a.organization_id = c.organization_id
where not exists (select 1 from public.client_people_v2 p where p.id = g.id);

insert into public.client_siblings_v2(
  id, client_id, organization_id, full_name, initials, birth_date, notes,
  version, created_at, updated_at, created_by, updated_by,
  archived_at, archived_by, test_run_id)
select s.id, s.client_id, c.organization_id, null, s.initials, s.birth_date, '',
  1, s.created_at + s.position * interval '1 microsecond',
  s.created_at + s.position * interval '1 microsecond',
  a.actor_id, a.actor_id, null, null,
  case when exists (
    select 1 from public.test_data_batches b
    where b.organization_id = c.organization_id and b.id = s.test_run_id
  ) then s.test_run_id else null end
from public.siblings s
join public.clients c on c.id = s.client_id
join _f3_org_actor a on a.organization_id = c.organization_id
where not exists (select 1 from public.client_siblings_v2 p where p.id = s.id);

drop table _f3_org_actor;

-- ---------------------------------------------------------------------------
-- 2. Clinical history: one V2 chain per V1 supersedes chain.
-- ---------------------------------------------------------------------------
create temporary table _f3_history_chain as
with recursive chain as (
  select h.id, h.id as root_id, array[h.id] as path, 1 as version
  from public.clinical_history_entries h
  where h.supersedes_id is null
  union all
  select h.id, c.root_id, c.path || h.id, c.version + 1
  from public.clinical_history_entries h
  join chain c on h.supersedes_id = c.id
  where not h.id = any(c.path)
)
select id, root_id, version from chain;

do $$
begin
  if exists (
    select 1 from public.clinical_history_entries h
    where not exists (select 1 from _f3_history_chain c where c.id = h.id)
  ) then
    raise exception 'clinical_history_entry_unreachable';
  end if;
end $$;

insert into public.clinical_history_versions_v2(
  id, history_id, client_id, organization_id, kind, action,
  descriptor, dose, frequency, prescriber_descriptor, started_on, ended_on,
  notes, status, supersedes_version_id, version, created_at, created_by, test_run_id)
select h.id, ch.root_id, h.client_id, h.organization_id, h.kind,
  case when ch.version = 1 then 'initialize-v2' else 'correct' end,
  h.descriptor, h.dose, null, h.prescriber_descriptor, h.started_on, h.ended_on,
  null,
  case
    when h.status <> 'active' then h.status
    when ch.version = (
      select max(c2.version) from _f3_history_chain c2 where c2.root_id = ch.root_id
    ) then 'active'
    else 'superseded'
  end,
  h.supersedes_id, ch.version, h.created_at, h.created_by,
  case when exists (
    select 1 from public.test_data_batches b
    where b.organization_id = h.organization_id and b.id = h.test_run_id
  ) then h.test_run_id else null end
from _f3_history_chain ch
join public.clinical_history_entries h on h.id = ch.id
where not exists (
  select 1 from public.clinical_history_versions_v2 hv
  where hv.history_id = ch.root_id
);

insert into public.clinical_history_events_v2(
  organization_id, client_id, history_id, version_id, action,
  actor_user_id, test_run_id, created_at)
select hv.organization_id, hv.client_id, hv.history_id, hv.id, hv.action,
  hv.created_by, hv.test_run_id, hv.created_at
from public.clinical_history_versions_v2 hv
join _f3_history_chain ch on ch.id = hv.id
where not exists (
  select 1 from public.clinical_history_events_v2 e where e.version_id = hv.id
);

drop table _f3_history_chain;

-- ---------------------------------------------------------------------------
-- 3. Sessions and records: lift only sessions still anchored in V1.
--    Legacy sessions become immutable V2 snapshots; V2 sessions already have
--    their own state and are left untouched.
-- ---------------------------------------------------------------------------
create temporary table _f3_session_actor as
select cs.id as session_id,
  coalesce(
    (select spr.actor_user_id from public.session_program_records spr
      where spr.session_id = cs.id order by spr.created_at, spr.id limit 1),
    (select m.user_id from public.memberships m
      join public.clients c on c.organization_id = m.organization_id
      where c.id = cs.client_id and m.status = 'active' and m.role = 'admin'
      order by m.created_at, m.user_id limit 1),
    (select m.user_id from public.memberships m
      join public.clients c on c.organization_id = m.organization_id
      where c.id = cs.client_id and m.status = 'active'
      order by m.created_at, m.user_id limit 1)
  ) as actor_id
from public.clinical_sessions cs;

insert into public.clinical_session_v2_state(
  session_id, organization_id, client_id, schema_version, status, version,
  captured_at, notes, selected_programs, created_by, test_run_id,
  created_at, updated_at)
select cs.id, c.organization_id, cs.client_id, 2,
  case cs.status
    when 'completed' then 'finished'
    when 'cancelled' then 'cancelled'
    when 'archived' then 'cancelled'
    else 'draft'
  end,
  0, greatest(cs.created_at, cs.updated_at), coalesce(cs.notes, ''),
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'programId', picked.program_id,
      'programVersionId', picked.program_version_id))
    from (
      select distinct on (pv.program_id)
        pv.program_id, spr.program_version_id
      from public.session_program_records spr
      join public.program_versions pv on pv.id = spr.program_version_id
      where spr.session_id = cs.id
      order by pv.program_id, pv.version desc, spr.created_at desc
    ) picked
  ), '[]'::jsonb),
  sa.actor_id,
  case when exists (
    select 1 from public.test_data_batches b
    where b.organization_id = c.organization_id and b.id = cs.test_run_id
  ) then cs.test_run_id else null end,
  cs.created_at, cs.updated_at
from public.clinical_sessions cs
join public.clients c on c.id = cs.client_id
join _f3_session_actor sa on sa.session_id = cs.id
where not exists (
  select 1 from public.clinical_session_v2_state s where s.session_id = cs.id
);

insert into public.session_program_records_v2(
  id, session_id, organization_id, client_id, program_id, program_version_id,
  schema_version, dimension, measurement, version, state, actor_user_id,
  submitted_at, discarded_at, test_run_id, created_at, updated_at)
select spr.id, spr.session_id, c.organization_id, spr.client_id, pv.program_id,
  spr.program_version_id, 2, spr.dimension,
  jsonb_build_object(
    'schemaVersion', 1, 'dimension', spr.dimension,
    'payload', spr.payload, 'detailsUnavailable', true),
  greatest(spr.version, 1),
  case when spr.submitted then 'submitted' else 'draft' end,
  spr.actor_user_id,
  case when spr.submitted then spr.updated_at else null end,
  null,
  case when exists (
    select 1 from public.test_data_batches b
    where b.organization_id = c.organization_id and b.id = spr.test_run_id
  ) then spr.test_run_id else null end,
  spr.created_at, spr.updated_at
from public.session_program_records spr
join public.clients c on c.id = spr.client_id
join public.program_versions pv on pv.id = spr.program_version_id
where not exists (
  select 1 from public.session_program_records_v2 r where r.id = spr.id
);

insert into public.clinical_session_v2_events(
  id, session_id, organization_id, client_id, sequence, event_type,
  occurred_at, actor_user_id, notes, test_run_id, created_at)
select gen_random_uuid(), cs.id, c.organization_id, cs.client_id, 1, 'started',
  cs.created_at, sa.actor_id, '', st.test_run_id, cs.created_at
from public.clinical_sessions cs
join public.clients c on c.id = cs.client_id
join _f3_session_actor sa on sa.session_id = cs.id
join public.clinical_session_v2_state st on st.session_id = cs.id
where cs.status in ('completed', 'cancelled', 'archived')
  and not exists (
    select 1 from public.clinical_session_v2_events e where e.session_id = cs.id
  );

insert into public.clinical_session_v2_events(
  id, session_id, organization_id, client_id, sequence, event_type,
  occurred_at, actor_user_id, notes, test_run_id, created_at)
select gen_random_uuid(), cs.id, c.organization_id, cs.client_id, 2,
  case when cs.status = 'completed' then 'finished' else 'cancelled' end,
  greatest(cs.created_at, cs.updated_at), sa.actor_id, '',
  st.test_run_id, greatest(cs.created_at, cs.updated_at)
from public.clinical_sessions cs
join public.clients c on c.id = cs.client_id
join _f3_session_actor sa on sa.session_id = cs.id
join public.clinical_session_v2_state st on st.session_id = cs.id
where cs.status in ('completed', 'cancelled', 'archived')
  and not exists (
    select 1 from public.clinical_session_v2_events e
    where e.session_id = cs.id and e.sequence = 2
  );

drop table _f3_session_actor;


create or replace function public.aba_student_detail_v2(
  p_organization_id uuid,
  p_client_id uuid
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_client public.clients%rowtype;
  v_profile public.client_profiles_v2%rowtype;
  v_context public.client_context_profiles%rowtype;
  v_capabilities text[];
  v_has_profile boolean := false;
  v_people jsonb := '[]'::jsonb;
  v_siblings jsonb := '[]'::jsonb;
  v_history jsonb := '[]'::jsonb;
  v_consents jsonb := '[]'::jsonb;
begin
  if p_organization_id is null or p_client_id is null then
    return null;
  end if;

  select c.* into v_client
  from public.clients c
  where c.organization_id = p_organization_id and c.id = p_client_id;
  if not found then
    return null;
  end if;

  v_capabilities := public.get_student_capabilities(p_client_id);
  if not ('student.view' = any(v_capabilities)) then
    return null;
  end if;

  select p.* into v_profile
  from public.client_profiles_v2 p
  where p.organization_id = p_organization_id and p.client_id = p_client_id;
  v_has_profile := found;

  select cp.* into v_context
  from public.client_context_profiles cp
  where cp.organization_id = p_organization_id and cp.client_id = p_client_id;

  if exists (
    select 1 from public.client_people_v2 p
    where p.organization_id = p_organization_id and p.client_id = p_client_id
  ) then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id,
      'fullName', p.full_name,
      'initials', p.initials,
      'birthDate', p.birth_date,
      'relationship', p.relationship,
      'phone', nullif(p.phone, ''),
      'email', p.email,
      'roles', to_jsonb(p.roles),
      'isPrimaryContact', p.is_primary_contact
    ) order by p.created_at, p.id), '[]'::jsonb)
    into v_people
    from public.client_people_v2 p
    where p.organization_id = p_organization_id
      and p.client_id = p_client_id
      and p.archived_at is null;
  end if;

  if exists (
    select 1 from public.client_siblings_v2 s
    where s.organization_id = p_organization_id and s.client_id = p_client_id
  ) then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', s.id,
      'fullName', s.full_name,
      'initials', s.initials,
      'birthDate', s.birth_date,
      'notes', nullif(s.notes, '')
    ) order by s.created_at, s.id), '[]'::jsonb)
    into v_siblings
    from public.client_siblings_v2 s
    where s.organization_id = p_organization_id
      and s.client_id = p_client_id
      and s.archived_at is null;
  end if;

  select coalesce(jsonb_agg(h.item order by h.created_at desc, h.version_order desc), '[]'::jsonb)
  into v_history
  from (
    select hv.created_at, hv.version as version_order, jsonb_build_object(
      'historyId', hv.history_id,
      'versionId', hv.id,
      'kind', hv.kind,
      'descriptor', hv.descriptor,
      'dose', hv.dose,
      'frequency', hv.frequency,
      'prescriber', hv.prescriber_descriptor,
      'startedOn', hv.started_on,
      'endedOn', hv.ended_on,
      'notes', hv.notes,
      'status', hv.status,
      'supersedesVersionId', hv.supersedes_version_id,
      'version', hv.version,
      'createdAt', hv.created_at
    ) as item
    from public.clinical_history_versions_v2 hv
    where hv.organization_id = p_organization_id and hv.client_id = p_client_id
  ) h;

  with recursive consent_roots as (
    select c.id, c.id as root_id, array[c.id]::uuid[] as path
    from public.consent_records c
    where c.organization_id = p_organization_id
      and c.client_id = p_client_id
      and c.supersedes_id is null
    union all
    select c.id, parent.root_id, parent.path || c.id
    from public.consent_records c
    join consent_roots parent on parent.id = c.supersedes_id
    where c.organization_id = p_organization_id
      and c.client_id = p_client_id
      and not c.id = any(parent.path)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'consentId', roots.root_id,
    'versionId', c.id,
    'version', c.version,
    'id', c.id,
    'purposeCode', c.purpose_code,
    'noticeVersion', c.notice_version,
    'grantor', c.grantor_descriptor,
    'channel', c.channel,
    'status', c.status,
    'evidenceAttachmentId', c.evidence_attachment_id,
    'supersedesVersionId', c.supersedes_id,
    'createdAt', c.created_at
  ) order by c.created_at desc, c.version desc), '[]'::jsonb)
  into v_consents
  from public.consent_records c
  join consent_roots roots on roots.id = c.id
  where c.organization_id = p_organization_id and c.client_id = p_client_id;

  return jsonb_build_object(
    'id', v_client.id,
    'clinicId', v_client.organization_id,
    'displayName', coalesce(v_profile.full_name, v_client.initials),
    'hasActiveSession', exists(
      select 1 from public.clinical_session_v2_state session
      where session.organization_id = v_client.organization_id
        and session.client_id = v_client.id
        and session.status in ('active', 'paused')
    ),
    'familyAccessEnabled', exists(
      select 1 from public.student_assignments assignment
      where assignment.organization_id = v_client.organization_id
        and assignment.client_id = v_client.id
        and assignment.role = 'family' and assignment.status = 'active'
    ),
    'assignedProfessional', (
      select coalesce(nullif(btrim(profile.name), ''), nullif(btrim(profile.title), ''), 'Profesional asignado')
      from public.student_assignments assignment
      left join public.professional_profiles profile on profile.user_id = assignment.user_id
      where assignment.organization_id = v_client.organization_id
        and assignment.client_id = v_client.id
        and assignment.role in ('supervisor', 'coordinator', 'therapist')
        and assignment.status = 'active'
      order by assignment.is_primary desc,
        case assignment.role when 'supervisor' then 0 when 'coordinator' then 1 else 2 end,
        assignment.effective_at, assignment.id
      limit 1
    ),
    'initials', v_client.initials,
    'rut', v_profile.rut_normalized,
    'photoAttachmentId', v_profile.photo_attachment_id,
    'status', v_client.status,
    'capabilities', to_jsonb(v_capabilities),
    'version', case when v_has_profile then v_profile.version else null end,
    'clinicalId', v_client.clinical_id,
    'fullName', v_profile.full_name,
    'birthDate', v_client.birth_date,
    'primaryLanguage', v_client.primary_language,
    'livingArrangement', v_client.living_arrangement,
    'reportedDiagnosis', case when v_has_profile then v_profile.reported_diagnosis else null end,
    'consultationReason', case when v_has_profile then v_profile.consultation_reason else null end,
    'context', jsonb_build_object(
      'home', case when v_has_profile then v_profile.context_home else coalesce(v_context.home_adaptations, '') end,
      'school', case when v_has_profile then v_profile.context_school else coalesce(v_context.schooling, '') end,
      'adaptations', case when v_has_profile then v_profile.context_adaptations else coalesce(v_context.school_adaptations, '') end
    ),
    'people', v_people,
    'siblings', v_siblings,
    'history', v_history,
    'consents', v_consents,
    'createdAt', v_client.created_at,
    'updatedAt', greatest(v_client.updated_at, v_profile.updated_at)
  );
end;
$$;

create or replace function public.read_program_session_v2(p_clinic_id uuid, p_student_id uuid)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  v_programs jsonb; v_sessions jsonb; v_records jsonb;
begin
  if auth.uid() is null
    or not exists (select 1 from public.clients client
      where client.id = p_student_id and client.organization_id = p_clinic_id)
    or not private.has_student_capability(p_student_id, 'student.view') then
    raise exception using errcode = '42501', message = 'student_view_required';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', program.id, 'studentId', program.client_id, 'clinicId', program.organization_id,
    'kind', program.program_type, 'status', program.status, 'revision', program.revision,
    'currentVersionId', program.current_version_id,
    'versions', (select coalesce(jsonb_agg(jsonb_build_object(
      'id', version.id, 'programId', version.program_id, 'studentId', version.client_id,
      'clinicId', version.organization_id, 'number', version.version, 'revision', version.revision,
      'state', version.version_state, 'title', version.title, 'originalDesign', version.design,
      'predecessorVersionId', version.supersedes_version_id, 'createdAt', version.created_at,
      'publishedAt', version.activated_at
    ) order by version.version desc), '[]'::jsonb)
      from public.program_versions version where version.program_id = program.id)
  ) order by program.updated_at desc), '[]'::jsonb)
  into v_programs
  from public.programs program
  where program.organization_id = p_clinic_id and program.client_id = p_student_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'schemaVersion', 2, 'id', session.session_id, 'studentId', session.client_id,
    'clinicId', session.organization_id, 'version', session.version,
    'capturedAt', greatest(session.captured_at,
      (select max(event.occurred_at) from public.clinical_session_v2_events event
        where event.session_id = session.session_id)), 'notes', session.notes,
    'programs', session.selected_programs,
    'events', (select coalesce(jsonb_agg(jsonb_build_object(
      'id', event.id, 'sequence', event.sequence, 'occurredAt', event.occurred_at,
      'type', event.event_type, 'actorId', event.actor_user_id, 'notes', event.notes
    ) order by event.sequence), '[]'::jsonb)
      from public.clinical_session_v2_events event where event.session_id = session.session_id)
  ) order by session.created_at desc), '[]'::jsonb)
  into v_sessions
  from public.clinical_session_v2_state session
  where session.organization_id = p_clinic_id and session.client_id = p_student_id;

  select coalesce(jsonb_agg(item order by item ->> 'createdAt' desc), '[]'::jsonb)
  into v_records
  from (
    select jsonb_build_object(
      'id', record.id, 'sessionId', record.session_id, 'studentId', record.client_id,
      'programId', record.program_id, 'programVersionId', record.program_version_id,
      'version', record.version, 'submitted', record.state = 'submitted',
      'discarded', record.state = 'discarded', 'originalMeasurement', record.measurement,
      'createdAt', record.created_at, 'actorId', record.actor_user_id,
      'revisions', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', revision.id, 'number', revision.revision, 'reason', revision.reason,
        'originalMeasurement', revision.prior_measurement, 'createdAt', revision.created_at,
        'actorId', revision.actor_user_id
      ) order by revision.revision), '[]'::jsonb)
        from public.session_program_record_revisions_v2 revision where revision.record_id = record.id)
    ) item
    from public.session_program_records_v2 record
    where record.organization_id = p_clinic_id and record.client_id = p_student_id
  ) records_union;
  return jsonb_build_object(
    'actorId', auth.uid(), 'programs', v_programs,
    'sessions', v_sessions, 'records', v_records);
end;
$$;

create or replace function private.a3_session_v2_impl(p_clinic_id uuid, p_command jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_student uuid; v_id uuid; v_op uuid; v_key uuid; v_expected integer; v_action text;
  v_occurred timestamptz; v_state public.clinical_session_v2_state; v_replay jsonb;
  v_event text; v_test uuid; v_sequence integer; v_program jsonb; v_state_found boolean;
begin
  if not private.a3_command_envelope_valid(p_command, 'sessionId') then
    raise exception using errcode = '22023', message = 'command_envelope_invalid';
  end if;
  v_student := (p_command ->> 'studentId')::uuid; v_id := (p_command ->> 'sessionId')::uuid;
  v_op := (p_command ->> 'operationId')::uuid; v_key := (p_command ->> 'idempotencyKey')::uuid;
  v_expected := (p_command ->> 'expectedVersion')::integer; v_action := p_command ->> 'action';
  begin v_occurred := (p_command ->> 'occurredAt')::timestamptz;
  exception when invalid_datetime_format or datetime_field_overflow then
    return private.command_rejected_result(v_op, v_key, v_id, 'validation-failed', 'occurredAt inválido.', '[]'::jsonb);
  end;
  if auth.uid() is null
    or not exists (select 1 from public.clients where id = v_student and organization_id = p_clinic_id)
    or not private.has_student_capability(v_student,
      case when v_action in ('finish','cancel') then 'record.submit' else 'record.capture' end) then
    return private.command_rejected_result(v_op, v_key, v_id, 'permission-denied', 'Sesión no autorizada.', '[]'::jsonb);
  end if;
  if (select count(*) from jsonb_object_keys(p_command)) <> 11
    or jsonb_typeof(p_command -> 'schemaVersion') <> 'number' or p_command ->> 'schemaVersion' <> '2'
    or jsonb_typeof(p_command -> 'action') <> 'string'
    or v_action not in ('start','pause','resume','finish','cancel','update-notes','select-programs')
    or not private.a3_iso_timestamp_valid(p_command -> 'occurredAt')
    or jsonb_typeof(p_command -> 'terminalConfirmation') <> 'boolean'
    or (v_action in ('finish','cancel') and p_command -> 'terminalConfirmation' <> 'true'::jsonb)
    or not private.a3_session_program_refs_valid(p_command -> 'programs')
    or jsonb_typeof(p_command -> 'notes') <> 'string' or char_length(p_command ->> 'notes') > 10000
    or exists (select 1 from jsonb_object_keys(p_command) key where key not in
      ('schemaVersion','operationId','idempotencyKey','studentId','sessionId','expectedVersion','action','occurredAt','notes','programs','terminalConfirmation')) then
    return private.command_rejected_result(v_op, v_key, v_id, 'validation-failed', 'Comando de sesión inválido.', '[]'::jsonb);
  end if;
  v_replay := private.command_identity_or_replay_result(
    p_clinic_id, v_op, v_key, v_id, 'session-v2', p_command);
  if v_replay is not null then
    if not private.has_student_capability(v_student,
      case when v_action in ('finish','cancel') then 'record.submit' else 'record.capture' end) then
      return private.command_rejected_result(v_op, v_key, v_id, 'permission-denied', 'Permiso revocado.', '[]'::jsonb);
    end if;
    return v_replay;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_id::text, 0));
  select * into v_state from public.clinical_session_v2_state where session_id = v_id for update;
  v_state_found := found;
  if not private.has_student_capability(v_student,
    case when v_action in ('finish','cancel') then 'record.submit' else 'record.capture' end) then
    return private.command_rejected_result(v_op, v_key, v_id, 'permission-denied', 'Permiso revocado.', '[]'::jsonb);
  end if;
  if not v_state_found then
    if v_expected <> 0 then
      return private.command_version_conflict_result(v_op, v_key, v_id, v_expected, 0,
        'La sesión esperada no existe.');
    end if;
    if v_action not in ('start','update-notes','select-programs') then
      return private.command_rejected_result(v_op, v_key, v_id, 'invalid-transition',
        'La sesión todavía no existe para esa transición.', '[]'::jsonb);
    end if;
    select test_run_id into v_test from public.clients
      where id = v_student and organization_id = p_clinic_id;
    insert into public.clinical_session_v2_state(
      session_id, organization_id, client_id, captured_at, notes,
      selected_programs, created_by, test_run_id)
    values (v_id, p_clinic_id, v_student, v_occurred, p_command ->> 'notes',
      p_command -> 'programs', auth.uid(), v_test)
    returning * into v_state;
  end if;
  if v_state.client_id <> v_student or v_state.organization_id <> p_clinic_id then
    return private.command_rejected_result(v_op, v_key, v_id, 'resource-unavailable',
      'Sesión fuera de clínica/ficha.', '[]'::jsonb);
  end if;
  if v_state.version <> v_expected then
    return private.command_version_conflict_result(v_op, v_key, v_id, v_expected, v_state.version,
      'La sesión cambió desde la última lectura.');
  end if;
  if v_state.status in ('finished','cancelled') then
    return private.command_rejected_result(v_op, v_key, v_id, 'invalid-transition',
      'La sesión terminal es inmutable.', '[]'::jsonb);
  end if;
  if v_occurred < v_state.captured_at
    or exists (select 1 from public.clinical_session_v2_events event
      where event.session_id = v_id and event.occurred_at > v_occurred) then
    return private.command_rejected_result(v_op, v_key, v_id, 'validation-failed',
      'Timestamp fuera de la secuencia de sesión.', '[]'::jsonb);
  end if;
  if v_action in ('start','select-programs') then
    for v_program in select value from jsonb_array_elements(p_command -> 'programs') loop
      if not exists (
        select 1 from public.programs program
        join public.program_versions version on version.id = (v_program ->> 'programVersionId')::uuid
        where program.id = (v_program ->> 'programId')::uuid
          and program.client_id = v_student and program.organization_id = p_clinic_id
          and version.client_id = v_student and version.organization_id = p_clinic_id
          and version.program_id = program.id and program.current_version_id = version.id
          and program.status = 'active' and version.version_state = 'released'
      ) then
        return private.command_rejected_result(v_op, v_key, v_id, 'validation-failed',
          'Programa seleccionado no está activo/publicado.', '[]'::jsonb);
      end if;
    end loop;
  elsif p_command -> 'programs' <> v_state.selected_programs then
    return private.command_rejected_result(v_op, v_key, v_id, 'invalid-transition',
      'La sesión conserva el snapshot de versiones seleccionado al iniciar.', '[]'::jsonb);
  end if;
  if v_action = 'select-programs' and v_state.status <> 'draft' then
    return private.command_rejected_result(v_op, v_key, v_id, 'invalid-transition',
      'La selección sólo cambia en borrador.', '[]'::jsonb);
  end if;
  if v_action = 'start' and jsonb_array_length(p_command -> 'programs') = 0 then
    return private.command_rejected_result(v_op, v_key, v_id, 'validation-failed',
      'Selecciona al menos un programa antes de iniciar.', '[]'::jsonb);
  end if;
  if v_action = 'finish' and (
    exists (select 1 from jsonb_array_elements(v_state.selected_programs) selected
      where not exists (select 1 from public.session_program_records_v2 record
        where record.session_id = v_id
          and record.program_id = (selected ->> 'programId')::uuid
          and record.program_version_id = (selected ->> 'programVersionId')::uuid
          and record.state = 'submitted'))
    or exists (select 1 from public.session_program_records_v2 record
      where record.session_id = v_id and record.state = 'draft')) then
    return private.command_rejected_result(v_op, v_key, v_id, 'invalid-transition',
      'Finalizar requiere al menos un registro enviado por programa seleccionado y ningún borrador pendiente.', '[]'::jsonb);
  end if;
  if v_action = 'start' and v_state.status = 'draft' then v_event := 'started';
  elsif v_action = 'pause' and v_state.status = 'active' then v_event := 'paused';
  elsif v_action = 'resume' and v_state.status = 'paused' then v_event := 'resumed';
  elsif v_action = 'finish' and v_state.status in ('active','paused') then v_event := 'finished';
  elsif v_action = 'cancel' and v_state.status in ('active','paused') then v_event := 'cancelled';
  elsif v_action not in ('update-notes','select-programs') then
    return private.command_rejected_result(v_op, v_key, v_id, 'invalid-transition',
      'Transición de sesión inválida.', '[]'::jsonb);
  end if;
  update public.clinical_session_v2_state
    set status = case v_event when 'started' then 'active' when 'resumed' then 'active'
      else coalesce(v_event, status) end,
      notes = p_command ->> 'notes',
      selected_programs = p_command -> 'programs', version = version + 1, updated_at = now()
    where session_id = v_id returning * into v_state;
  if v_event is not null then
    select coalesce(max(sequence), 0) + 1 into v_sequence
      from public.clinical_session_v2_events where session_id = v_id;
    insert into public.clinical_session_v2_events(
      id, session_id, organization_id, client_id, sequence, event_type,
      occurred_at, actor_user_id, notes, test_run_id)
    values (v_op, v_id, p_clinic_id, v_student, v_sequence, v_event,
      v_occurred, auth.uid(), p_command ->> 'notes', v_state.test_run_id);
  end if;
  return private.issue_command_receipt(
    p_clinic_id, v_op, v_key, v_id, 'session-v2', p_command,
    v_state.version, v_state.test_run_id);
end;
$$;

create or replace function private.a3_archive_session_v2_impl(p_clinic_id uuid, p_command jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student uuid; v_id uuid; v_op uuid; v_key uuid; v_expected integer;
  v_state public.clinical_session_v2_state; v_replay jsonb;
begin
  if not private.a3_command_envelope_valid(p_command, 'sessionId') then
    raise exception using errcode = '22023', message = 'command_envelope_invalid';
  end if;
  v_student := (p_command ->> 'studentId')::uuid;
  v_id := (p_command ->> 'sessionId')::uuid;
  v_op := (p_command ->> 'operationId')::uuid;
  v_key := (p_command ->> 'idempotencyKey')::uuid;
  v_expected := (p_command ->> 'expectedVersion')::integer;
  if auth.uid() is null
    or not exists (select 1 from public.clients client
      where client.id = v_student and client.organization_id = p_clinic_id)
    or not private.has_student_capability(v_student, 'record.submit') then
    return private.command_rejected_result(v_op, v_key, v_id, 'permission-denied',
      'Archivo de sesión no autorizado.', '[]'::jsonb);
  end if;
  if (select count(*) from jsonb_object_keys(p_command)) <> 7
    or jsonb_typeof(p_command -> 'schemaVersion') <> 'number'
    or p_command ->> 'schemaVersion' <> '2'
    or jsonb_typeof(p_command -> 'reason') <> 'string'
    or nullif(btrim(p_command ->> 'reason'), '') is null
    or char_length(btrim(p_command ->> 'reason')) > 2000
    or exists (select 1 from jsonb_object_keys(p_command) key where key not in
      ('schemaVersion','operationId','idempotencyKey','studentId','sessionId','expectedVersion','reason')) then
    return private.command_rejected_result(v_op, v_key, v_id, 'validation-failed',
      'Comando de archivo de sesión inválido.', '[]'::jsonb);
  end if;
  v_replay := private.command_identity_or_replay_result(
    p_clinic_id, v_op, v_key, v_id, 'session-archive-v2', p_command);
  if v_replay is not null then
    if not private.has_student_capability(v_student, 'record.submit') then
      return private.command_rejected_result(v_op, v_key, v_id, 'permission-denied',
        'Permiso revocado.', '[]'::jsonb);
    end if;
    return v_replay;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_id::text, 0));
  select * into v_state
  from public.clinical_session_v2_state
  where session_id = v_id
  for update;
  if not found or v_state.organization_id <> p_clinic_id or v_state.client_id <> v_student then
    return private.command_rejected_result(v_op, v_key, v_id, 'resource-unavailable',
      'Sesión fuera de clínica/ficha.', '[]'::jsonb);
  end if;
  if not private.has_student_capability(v_student, 'record.submit') then
    return private.command_rejected_result(v_op, v_key, v_id, 'permission-denied',
      'Permiso revocado.', '[]'::jsonb);
  end if;
  if v_state.version <> v_expected then
    return private.command_version_conflict_result(v_op, v_key, v_id, v_expected, v_state.version,
      'La sesión cambió desde la última lectura.');
  end if;
  if v_state.archived_at is not null then
    return private.command_rejected_result(v_op, v_key, v_id, 'invalid-transition',
      'La sesión ya está archivada.', '[]'::jsonb);
  end if;
  if v_state.status not in ('draft','finished','cancelled') then
    return private.command_rejected_result(v_op, v_key, v_id, 'invalid-transition',
      'Pausa, finaliza o cancela la sesión activa antes de archivarla.', '[]'::jsonb);
  end if;
  update public.clinical_session_v2_state
  set archived_at = now(), version = version + 1, updated_at = now()
  where session_id = v_id
  returning * into v_state;
  return private.issue_command_receipt(
    p_clinic_id, v_op, v_key, v_id, 'session-archive-v2', p_command,
    v_state.version, v_state.test_run_id);
end;
$$;


create or replace function public.aba_clinical_history_command_v2(
  p_organization_id uuid,
  p_command jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_operation_id uuid;
  v_idempotency_key uuid;
  v_client_id uuid;
  v_history_id uuid;
  v_version_id uuid;
  v_supersedes_version_id uuid;
  v_expected_version bigint;
  v_action text;
  v_payload jsonb;
  v_replay jsonb;
  v_client public.clients%rowtype;
  v_current public.clinical_history_versions_v2%rowtype;
  v_next_version integer;
  v_new_status text;
begin
  if p_organization_id is null or jsonb_typeof(p_command) <> 'object'
    or jsonb_typeof(p_command->'operationId') <> 'string' or not private.is_uuid_text(p_command->>'operationId')
    or jsonb_typeof(p_command->'idempotencyKey') <> 'string' or not private.is_uuid_text(p_command->>'idempotencyKey')
    or jsonb_typeof(p_command->'studentId') <> 'string' or not private.is_uuid_text(p_command->>'studentId')
    or jsonb_typeof(p_command->'historyId') <> 'string' or not private.is_uuid_text(p_command->>'historyId')
  then
    raise exception using errcode = '22023', message = 'clinical_history_command_identity_invalid';
  end if;

  v_operation_id := (p_command->>'operationId')::uuid;
  v_idempotency_key := (p_command->>'idempotencyKey')::uuid;
  v_client_id := (p_command->>'studentId')::uuid;
  v_history_id := (p_command->>'historyId')::uuid;

  if v_actor is null then
    return private.command_rejected_result(v_operation_id,v_idempotency_key,v_history_id,
      'permission-denied','Se requiere una sesión autenticada.');
  end if;
  if not private.clinical_history_command_v2_valid(p_command,current_date)
    or (p_command->>'clinicId')::uuid <> p_organization_id then
    return private.command_rejected_result(v_operation_id,v_idempotency_key,v_history_id,
      'validation-failed','El comando de historial clínico no cumple el contrato V2.');
  end if;

  v_version_id := (p_command->>'versionId')::uuid;
  v_supersedes_version_id := (p_command->>'supersedesVersionId')::uuid;
  v_expected_version := (p_command->>'expectedVersion')::bigint;
  v_action := p_command->>'action';
  v_payload := p_command->'payload';

  if not exists (
    select 1 from public.clients c
    where c.organization_id=p_organization_id and c.id=v_client_id
  ) or not private.has_student_capability(v_client_id,'student.edit') then
    return private.command_rejected_result(v_operation_id,v_idempotency_key,v_history_id,
      'permission-denied','El historial no está disponible con capacidad de edición vigente.');
  end if;

  v_replay := private.command_identity_or_replay_result(
    p_organization_id,v_operation_id,v_idempotency_key,v_history_id,'clinical-history-v2',p_command
  );
  if v_replay is not null then return v_replay; end if;

  select c.* into v_client from public.clients c
  where c.organization_id=p_organization_id and c.id=v_client_id for update;
  if not found then
    return private.command_rejected_result(v_operation_id,v_idempotency_key,v_history_id,
      'resource-unavailable','La ficha ya no está disponible.');
  end if;
  if not private.has_student_capability(v_client_id,'student.edit') then
    return private.command_rejected_result(v_operation_id,v_idempotency_key,v_history_id,
      'permission-denied','La capacidad de edición dejó de estar vigente.');
  end if;
  perform private.require_open_test_batch(p_organization_id,v_client.test_run_id);

  if exists (
    select 1 from public.clinical_history_versions_v2 h where h.id=v_version_id
  ) then
    return private.command_rejected_result(v_operation_id,v_idempotency_key,v_history_id,
      'validation-failed','El identificador de versión clínica ya está en uso.');
  end if;
  if exists (
    select 1 from public.clinical_history_versions_v2 h
    where h.history_id=v_history_id
      and (h.organization_id<>p_organization_id or h.client_id<>v_client_id
        or h.test_run_id is distinct from v_client.test_run_id)
  ) then
    return private.command_rejected_result(v_operation_id,v_idempotency_key,v_history_id,
      'validation-failed','La identidad del historial pertenece a otro recurso.');
  end if;

  if v_action='create' then
    if exists(select 1 from public.clinical_history_versions_v2 h where h.history_id=v_history_id) then
      return private.command_rejected_result(v_operation_id,v_idempotency_key,v_history_id,
        'resource-unavailable','El historial ya existe; usa su versión vigente.');
    end if;
    v_next_version := 1;
  elsif v_action='initialize-v2' then
    if exists(select 1 from public.clinical_history_versions_v2 h where h.history_id=v_history_id) then
      return private.command_rejected_result(v_operation_id,v_idempotency_key,v_history_id,
        'invalid-transition','El historial ya tiene una versión V2.');
    end if;
    v_next_version := 1;
  else
    select h.* into v_current from public.clinical_history_versions_v2 h
    where h.organization_id=p_organization_id and h.client_id=v_client_id and h.history_id=v_history_id
    order by h.version desc limit 1 for update;
    if not found then
      return private.command_rejected_result(v_operation_id,v_idempotency_key,v_history_id,
        'resource-unavailable','El historial V2 no está disponible.');
    end if;
    if v_current.test_run_id is distinct from v_client.test_run_id then
      return private.command_rejected_result(v_operation_id,v_idempotency_key,v_history_id,
        'validation-failed','El historial y la ficha pertenecen a lotes distintos.');
    end if;
    if v_current.version::bigint <> v_expected_version then
      return private.command_version_conflict_result(v_operation_id,v_idempotency_key,v_history_id,
        v_expected_version,v_current.version,'La versión del historial clínico cambió.');
    end if;
    if v_current.id <> v_supersedes_version_id or v_current.kind <> v_payload->>'kind' then
      return private.command_rejected_result(v_operation_id,v_idempotency_key,v_history_id,
        'invalid-transition','La revisión no continúa la versión y el tipo clínico vigentes.');
    end if;
    if v_action in ('update-treatment','finish-treatment') and v_current.status <> 'active' then
      return private.command_rejected_result(v_operation_id,v_idempotency_key,v_history_id,
        'invalid-transition','Sólo un tratamiento activo admite esa transición.');
    end if;
    if v_action='reactivate-treatment' and v_current.status <> 'inactive' then
      return private.command_rejected_result(v_operation_id,v_idempotency_key,v_history_id,
        'invalid-transition','Sólo un tratamiento finalizado puede reactivarse.');
    end if;
    if v_action='retire-reference' and (
      v_current.status <> 'active' or v_current.kind='medication'
      or v_current.descriptor is distinct from btrim(v_payload->>'descriptor')
      or v_current.notes is distinct from nullif(btrim(v_payload->>'notes'),'')
    ) then
      return private.command_rejected_result(v_operation_id,v_idempotency_key,v_history_id,
        'invalid-transition','Sólo una referencia clínica activa admite retiro sin modificar su contenido.');
    end if;
    if v_action='correct' and v_current.kind<>'medication' and v_current.status='inactive' then
      return private.command_rejected_result(v_operation_id,v_idempotency_key,v_history_id,
        'invalid-transition','Una referencia retirada se conserva como evidencia y no admite corrección activa.');
    end if;
    update public.clinical_history_versions_v2
    set status=case when v_action='correct' then 'entered_in_error' else 'superseded' end
    where id=v_current.id;
    v_next_version := v_current.version+1;
  end if;

  v_new_status := case when v_action in ('finish-treatment','retire-reference') then 'inactive' else 'active' end;
  insert into public.clinical_history_versions_v2(
    id,history_id,client_id,organization_id,kind,action,descriptor,dose,frequency,
    prescriber_descriptor,started_on,ended_on,notes,status,supersedes_version_id,
    version,created_by,test_run_id
  ) values (
    v_version_id,v_history_id,v_client_id,p_organization_id,v_payload->>'kind',v_action,
    btrim(v_payload->>'descriptor'),nullif(btrim(v_payload->>'dose'),''),
    nullif(btrim(v_payload->>'frequency'),''),nullif(btrim(v_payload->>'prescriber'),''),
    (v_payload->>'startedOn')::date,(v_payload->>'endedOn')::date,
    nullif(btrim(v_payload->>'notes'),''),v_new_status,v_supersedes_version_id,
    v_next_version,v_actor,v_client.test_run_id
  );

  insert into public.clinical_history_events_v2(
    organization_id,client_id,history_id,version_id,action,actor_user_id,test_run_id
  ) values (
    p_organization_id,v_client_id,v_history_id,v_version_id,v_action,v_actor,v_client.test_run_id
  );
  insert into public.audit_events(organization_id,actor_user_id,entity_type,entity_id,action,test_run_id)
  values(p_organization_id,v_actor,'client',v_client_id,'updated',v_client.test_run_id);

  return private.issue_command_receipt(
    p_organization_id,v_operation_id,v_idempotency_key,v_history_id,
    'clinical-history-v2',p_command,v_next_version,v_client.test_run_id
  );
end;
$$;


-- ---------------------------------------------------------------------------
-- 4. Test-batch cleanup now counts and deletes the V2 rows before clients.
-- ---------------------------------------------------------------------------
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

  select coalesce(array_agg(id), '{}'::uuid[]) into v_clients
  from public.clients
  where organization_id = p_organization_id and test_run_id = p_test_run_id;

  v_count := cardinality(v_clients);
  v_summary := jsonb_build_object(
    'test_run_id', p_test_run_id,
    'status', v_batch.status,
    'clients', v_count,
    'people', (select count(*) from public.client_people_v2 where client_id = any(v_clients)),
    'siblings', (select count(*) from public.client_siblings_v2 where client_id = any(v_clients)),
    'assignments', (select count(*) from public.student_assignments where client_id = any(v_clients)),
    'authorization_requests', (select count(*) from public.student_authorization_requests where client_id = any(v_clients)),
    'authorization_decisions', (select count(*) from public.student_authorization_decisions where client_id = any(v_clients)),
    'access_audit_events', (select count(*) from public.student_access_audit_events where client_id = any(v_clients)),
    'context_profiles', (select count(*) from public.client_context_profiles where client_id = any(v_clients)),
    'history', (select count(*) from public.clinical_history_versions_v2 where client_id = any(v_clients)),
    'history_events', (select count(*) from public.clinical_history_events_v2 where client_id = any(v_clients)),
    'consent_records', (select count(*) from public.consent_records where client_id = any(v_clients)),
    'consent_events', (select count(*) from public.consent_events where client_id = any(v_clients)),
    'programs', (select count(*) from public.programs where client_id = any(v_clients)),
    'program_versions', (select count(*) from public.program_versions where client_id = any(v_clients)),
    'program_lifecycle_events', (select count(*) from public.program_lifecycle_events where client_id = any(v_clients)),
    'sessions', (select count(*) from public.clinical_session_v2_state where client_id = any(v_clients)),
    'session_events', (select count(*) from public.clinical_session_v2_events where client_id = any(v_clients)),
    'records', (select count(*) from public.session_program_records_v2 where client_id = any(v_clients)),
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

  delete from public.session_program_record_revisions_v2 where client_id = any(v_clients);
  delete from public.session_program_records_v2 where client_id = any(v_clients);
  delete from public.clinical_session_v2_events where client_id = any(v_clients);
  delete from public.clinical_session_v2_state where client_id = any(v_clients);
  delete from public.clinical_history_events_v2 where client_id = any(v_clients);
  delete from public.clinical_history_versions_v2 where client_id = any(v_clients);
  delete from public.program_lifecycle_events where client_id = any(v_clients);
  update public.programs set current_version_id = null where client_id = any(v_clients);
  delete from public.program_versions where client_id = any(v_clients);
  delete from public.programs where client_id = any(v_clients);
  delete from public.consent_events where client_id = any(v_clients);
  delete from public.consent_records where client_id = any(v_clients);
  delete from public.client_context_profiles where client_id = any(v_clients);
  delete from public.student_access_audit_events where client_id = any(v_clients);
  delete from public.student_authorization_decisions where client_id = any(v_clients);
  delete from public.student_authorization_requests where client_id = any(v_clients);
  delete from public.student_assignments where client_id = any(v_clients);
  delete from public.client_people_v2 where client_id = any(v_clients);
  delete from public.client_siblings_v2 where client_id = any(v_clients);
  delete from public.client_profiles_v2 where client_id = any(v_clients);
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



-- ---------------------------------------------------------------------------
-- 5. Remove the V1 commands, mirror anchor and tables.
-- ---------------------------------------------------------------------------
drop function if exists public.create_client(text, text, text, date, text, jsonb, jsonb, uuid);
drop function if exists public.mvp_save_student(uuid, uuid, timestamptz, jsonb, uuid);
drop function if exists public.mvp_save_record(uuid, uuid, uuid, uuid, text, jsonb, integer, boolean);
drop function if exists public.mvp_finish_session(uuid);
drop function if exists public.mvp_update_program_draft(uuid, uuid, text, jsonb);
drop function if exists public.mvp_discard_record(uuid, integer);
drop function if exists public.mvp_archive_session(uuid);
drop function if exists public.mvp_set_student_status(uuid, uuid, timestamptz, text);
drop function if exists public.append_clinical_history_entry(uuid, text, text, date, text, text, date, date, uuid, uuid);
drop function if exists public.append_clinical_history_entries(uuid, jsonb, uuid);

alter table public.clinical_session_v2_state
  drop constraint if exists clinical_session_v2_state_session_id_client_id_fkey;

drop table if exists public.clinical_record_events;
drop table if exists public.session_program_records;
drop table if exists public.clinical_sessions;
drop table if exists public.clinical_audit_events;
drop table if exists public.clinical_history_entries;
drop table if exists public.guardians;
drop table if exists public.siblings;

drop function if exists private.audit_clinical_record();
drop function if exists private.audit_clinical_change();
drop function if exists private.touch_clinical_updated_at();

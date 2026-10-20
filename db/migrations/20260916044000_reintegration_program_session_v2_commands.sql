-- A3/R2: receipt-bearing program, lifecycle, session and raw-capture commands.
-- Private implementations are reachable only through reviewed SECURITY DEFINER wrappers.

create function private.a3_program_draft_v2_impl(p_clinic_id uuid, p_command jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_student uuid; v_program_id uuid; v_version_id uuid; v_predecessor uuid;
  v_expected integer; v_program public.programs; v_version public.program_versions;
  v_replay jsonb; v_test uuid; v_program_found boolean; v_version_found boolean;
begin
  if not private.a3_command_envelope_valid(p_command, 'programVersionId')
    or not ((p_command ->> 'programId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$') then
    raise exception using errcode = '22023', message = 'command_envelope_invalid';
  end if;
  v_student := (p_command ->> 'studentId')::uuid;
  v_program_id := (p_command ->> 'programId')::uuid;
  v_version_id := (p_command ->> 'programVersionId')::uuid;
  v_expected := (p_command ->> 'expectedVersion')::integer;
  if p_command -> 'predecessorVersionId' <> 'null'::jsonb then
    begin v_predecessor := (p_command ->> 'predecessorVersionId')::uuid;
    exception when invalid_text_representation then
      return private.command_rejected_result(
        (p_command ->> 'operationId')::uuid, (p_command ->> 'idempotencyKey')::uuid,
        v_version_id, 'validation-failed', 'predecessorVersionId inválido.', '[]'::jsonb);
    end;
  end if;
  if auth.uid() is null
    or not exists (select 1 from public.clients c where c.id = v_student and c.organization_id = p_clinic_id)
    or not private.has_student_capability(v_student, 'program.edit') then
    return private.command_rejected_result(
      (p_command ->> 'operationId')::uuid, (p_command ->> 'idempotencyKey')::uuid,
      v_version_id, 'permission-denied', 'Programa no autorizado en esta clínica.', '[]'::jsonb);
  end if;
  if (select count(*) from jsonb_object_keys(p_command)) <> 10
    or jsonb_typeof(p_command -> 'schemaVersion') <> 'number' or p_command ->> 'schemaVersion' <> '2'
    or not private.a3_program_design_v2_valid(p_command -> 'design', false)
    or jsonb_typeof(p_command -> 'title') <> 'string'
    or nullif(btrim(p_command ->> 'title'), '') is null or char_length(btrim(p_command ->> 'title')) > 160
    or exists (select 1 from jsonb_object_keys(p_command) key where key not in
      ('schemaVersion','operationId','idempotencyKey','studentId','programId','programVersionId','predecessorVersionId','expectedVersion','title','design')) then
    return private.command_rejected_result(
      (p_command ->> 'operationId')::uuid, (p_command ->> 'idempotencyKey')::uuid,
      v_version_id, 'validation-failed', 'Diseño V2 inválido.', '[]'::jsonb);
  end if;
  v_replay := private.command_identity_or_replay_result(
    p_clinic_id, (p_command ->> 'operationId')::uuid, (p_command ->> 'idempotencyKey')::uuid,
    v_version_id, 'program-draft-v2', p_command);
  if v_replay is not null then
    if not private.has_student_capability(v_student, 'program.edit') then
      return private.command_rejected_result(
        (p_command ->> 'operationId')::uuid, (p_command ->> 'idempotencyKey')::uuid,
        v_version_id, 'permission-denied', 'Permiso revocado.', '[]'::jsonb);
    end if;
    return v_replay;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_program_id::text, 0));
  if not private.has_student_capability(v_student, 'program.edit') then
    return private.command_rejected_result(
      (p_command ->> 'operationId')::uuid, (p_command ->> 'idempotencyKey')::uuid,
      v_version_id, 'permission-denied', 'Permiso revocado.', '[]'::jsonb);
  end if;
  select * into v_program from public.programs where id = v_program_id for update;
  v_program_found := found;
  select * into v_version from public.program_versions where id = v_version_id for update;
  v_version_found := found;
  if v_version_found then
    if not v_program_found or v_program.client_id <> v_student or v_program.organization_id <> p_clinic_id
      or v_version.organization_id <> p_clinic_id or v_version.client_id <> v_student
      or v_version.program_id <> v_program.id or v_version.version_state <> 'draft'
      or v_program.program_type <> p_command -> 'design' ->> 'kind' then
      return private.command_rejected_result(
        (p_command ->> 'operationId')::uuid, (p_command ->> 'idempotencyKey')::uuid,
        v_version_id, 'invalid-transition', 'Sólo el borrador explícito puede editarse.', '[]'::jsonb);
    end if;
    if v_version.revision <> v_expected then
      return private.command_version_conflict_result(
        (p_command ->> 'operationId')::uuid, (p_command ->> 'idempotencyKey')::uuid,
        v_version_id, v_expected, v_version.revision,
        'El borrador cambió; conserva el trabajo y resuelve contra la versión actual.');
    end if;
    update public.program_versions
      set title = btrim(p_command ->> 'title'), design = p_command -> 'design', revision = revision + 1
      where id = v_version_id returning * into v_version;
  else
    if v_expected <> 0 then
      return private.command_version_conflict_result(
        (p_command ->> 'operationId')::uuid, (p_command ->> 'idempotencyKey')::uuid,
        v_version_id, v_expected, 0, 'El borrador esperado no existe.');
    end if;
    select test_run_id into v_test from public.clients where id = v_student and organization_id = p_clinic_id;
    if not v_program_found then
      if v_predecessor is not null then
        return private.command_rejected_result(
          (p_command ->> 'operationId')::uuid, (p_command ->> 'idempotencyKey')::uuid,
          v_version_id, 'resource-unavailable', 'Predecesor sin programa existente.', '[]'::jsonb);
      end if;
      insert into public.programs(id, organization_id, client_id, program_type, status, revision, created_by, test_run_id)
      values (v_program_id, p_clinic_id, v_student, p_command -> 'design' ->> 'kind', 'draft', 0, auth.uid(), v_test)
      returning * into v_program;
      insert into public.program_versions(id, organization_id, client_id, program_id, program_type, version, title, design, revision, created_by, test_run_id)
      values (v_version_id, p_clinic_id, v_student, v_program_id, v_program.program_type, 1,
        btrim(p_command ->> 'title'), p_command -> 'design', 0, auth.uid(), v_test)
      returning * into v_version;
      insert into public.program_lifecycle_events(
        organization_id, client_id, program_id, program_version_id, actor_user_id,
        action, prior_status, next_status, test_run_id)
      values (p_clinic_id, v_student, v_program_id, v_version_id, auth.uid(),
        'draft_created', null, 'draft', v_test);
    else
      if v_program.organization_id <> p_clinic_id or v_program.client_id <> v_student
        or v_predecessor is null or v_program.program_type <> p_command -> 'design' ->> 'kind'
        or v_program.status not in ('active', 'paused')
        or v_program.current_version_id is distinct from v_predecessor
        or exists (select 1 from public.program_versions existing
          where existing.program_id = v_program_id and existing.version_state = 'draft') then
        return private.command_rejected_result(
          (p_command ->> 'operationId')::uuid, (p_command ->> 'idempotencyKey')::uuid,
          v_version_id, 'invalid-transition', 'Programa, predecesor o borrador sucesor no disponibles.', '[]'::jsonb);
      end if;
      perform 1 from public.program_versions
        where id = v_predecessor and organization_id = p_clinic_id and client_id = v_student
          and program_id = v_program_id and version_state = 'released' for update;
      if not found then
        return private.command_rejected_result(
          (p_command ->> 'operationId')::uuid, (p_command ->> 'idempotencyKey')::uuid,
          v_version_id, 'invalid-transition', 'El sucesor requiere la versión publicada actual.', '[]'::jsonb);
      end if;
      insert into public.program_versions(
        id, organization_id, client_id, program_id, program_type, version, title, design,
        supersedes_version_id, revision, created_by, test_run_id)
      values (v_version_id, p_clinic_id, v_student, v_program_id, v_program.program_type,
        (select max(version) + 1 from public.program_versions where program_id = v_program_id),
        btrim(p_command ->> 'title'), p_command -> 'design', v_predecessor, 0, auth.uid(), v_program.test_run_id)
      returning * into v_version;
      insert into public.program_lifecycle_events(
        organization_id, client_id, program_id, program_version_id, actor_user_id,
        action, prior_status, next_status, test_run_id)
      values (p_clinic_id, v_student, v_program_id, v_version_id, auth.uid(),
        'version_created', v_program.status, v_program.status, v_program.test_run_id);
    end if;
  end if;
  return private.issue_command_receipt(
    p_clinic_id, (p_command ->> 'operationId')::uuid, (p_command ->> 'idempotencyKey')::uuid,
    v_version_id, 'program-draft-v2', p_command, v_version.revision, v_version.test_run_id);
end;
$$;

set check_function_bodies = off;

create function public.command_program_draft_v2(p_clinic_id uuid, p_command jsonb)
returns jsonb language sql volatile security definer set search_path = '' as $$
  select private.a3_program_draft_v2_impl(p_clinic_id, p_command);
$$;
create function public.command_program_lifecycle_v2(p_clinic_id uuid, p_command jsonb)
returns jsonb language sql volatile security definer set search_path = '' as $$
  select private.a3_program_lifecycle_v2_impl(p_clinic_id, p_command);
$$;
create function public.command_session_v2(p_clinic_id uuid, p_command jsonb)
returns jsonb language sql volatile security definer set search_path = '' as $$
  select private.a3_session_v2_impl(p_clinic_id, p_command);
$$;
create function public.command_capture_v2(p_clinic_id uuid, p_command jsonb)
returns jsonb language sql volatile security definer set search_path = '' as $$
  select private.a3_capture_v2_impl(p_clinic_id, p_command);
$$;

create function public.read_program_session_v2(p_clinic_id uuid, p_student_id uuid)
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
    'capturedAt', session.captured_at, 'notes', session.notes,
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
    union all
    select jsonb_build_object(
      'id', legacy.id, 'sessionId', legacy.session_id, 'studentId', legacy.client_id,
      'programId', version.program_id, 'programVersionId', legacy.program_version_id,
      'version', legacy.version, 'submitted', legacy.submitted, 'discarded', false,
      'originalMeasurement', jsonb_build_object(
        'schemaVersion', 1, 'dimension', legacy.dimension, 'payload', legacy.payload,
        'detailsUnavailable', true),
      'createdAt', legacy.created_at, 'actorId', legacy.actor_user_id, 'revisions', '[]'::jsonb
    ) item
    from public.session_program_records legacy
    join public.program_versions version on version.id = legacy.program_version_id
    where legacy.client_id = p_student_id
      and not exists (select 1 from public.session_program_records_v2 current where current.id = legacy.id)
  ) records_union;
  return jsonb_build_object(
    'actorId', auth.uid(), 'programs', v_programs,
    'sessions', v_sessions, 'records', v_records);
end;
$$;

revoke all on function public.command_program_draft_v2(uuid,jsonb),
  public.command_program_lifecycle_v2(uuid,jsonb), public.command_session_v2(uuid,jsonb),
  public.command_capture_v2(uuid,jsonb), public.read_program_session_v2(uuid,uuid)
from public, anon, authenticated, service_role;

grant execute on function public.command_program_draft_v2(uuid,jsonb),
  public.command_program_lifecycle_v2(uuid,jsonb), public.command_session_v2(uuid,jsonb),
  public.command_capture_v2(uuid,jsonb), public.read_program_session_v2(uuid,uuid)
to authenticated;

comment on function public.command_program_draft_v2(uuid,jsonb) is
  'A3 V2 command boundary. Returns a receipt/conflict/rejection envelope; never a local optimistic success.';
comment on function public.command_program_lifecycle_v2(uuid,jsonb) is
  'A3 V2 lifecycle boundary with expectedVersion, transactional audit and command receipt.';
comment on function public.command_session_v2(uuid,jsonb) is
  'A3 V2 session timeline boundary with immutable terminal states and selected-program snapshot.';
comment on function public.command_capture_v2(uuid,jsonb) is
  'A3 V2 raw observation boundary with stable record identity and immutable revision history.';

create function private.a3_session_v2_impl(p_clinic_id uuid, p_command jsonb)
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
    insert into public.clinical_sessions(id, client_id, status, notes, test_run_id)
    values (v_id, v_student, 'draft', p_command ->> 'notes', v_test);
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
      captured_at = v_occurred, notes = p_command ->> 'notes',
      selected_programs = p_command -> 'programs', version = version + 1, updated_at = now()
    where session_id = v_id returning * into v_state;
  update public.clinical_sessions
    set status = case when v_event = 'finished' then 'completed'
      when v_event = 'cancelled' then 'cancelled' else status end,
      notes = p_command ->> 'notes', updated_at = now()
    where id = v_id;
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

create function private.a3_capture_v2_impl(p_clinic_id uuid, p_command jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_student uuid; v_id uuid; v_session uuid; v_program uuid; v_version uuid;
  v_op uuid; v_key uuid; v_expected integer; v_action text;
  v_record public.session_program_records_v2; v_replay jsonb; v_test uuid;
  v_revision integer; v_record_found boolean;
begin
  if not private.a3_command_envelope_valid(p_command, 'recordId')
    or not ((p_command ->> 'sessionId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
    or not ((p_command ->> 'programId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
    or not ((p_command ->> 'programVersionId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$') then
    raise exception using errcode = '22023', message = 'command_envelope_invalid';
  end if;
  v_student := (p_command ->> 'studentId')::uuid; v_id := (p_command ->> 'recordId')::uuid;
  v_session := (p_command ->> 'sessionId')::uuid; v_program := (p_command ->> 'programId')::uuid;
  v_version := (p_command ->> 'programVersionId')::uuid; v_op := (p_command ->> 'operationId')::uuid;
  v_key := (p_command ->> 'idempotencyKey')::uuid; v_expected := (p_command ->> 'expectedVersion')::integer;
  v_action := p_command ->> 'action';
  if auth.uid() is null
    or not exists (select 1 from public.clients where id = v_student and organization_id = p_clinic_id)
    or not private.has_student_capability(v_student,
      case when v_action in ('submit','revise') then 'record.submit' else 'record.capture' end) then
    return private.command_rejected_result(v_op, v_key, v_id, 'permission-denied', 'Captura no autorizada.', '[]'::jsonb);
  end if;
  if (select count(*) from jsonb_object_keys(p_command)) <> 12
    or jsonb_typeof(p_command -> 'schemaVersion') <> 'number' or p_command ->> 'schemaVersion' <> '2'
    or jsonb_typeof(p_command -> 'action') <> 'string'
    or v_action not in ('save-draft','submit','revise','discard')
    or not private.a3_measurement_v2_valid(p_command -> 'measurement', v_action in ('submit','revise'))
    or (p_command -> 'revisionReason' <> 'null'::jsonb
      and (jsonb_typeof(p_command -> 'revisionReason') <> 'string'
        or char_length(btrim(p_command ->> 'revisionReason')) > 2000))
    or (v_action = 'revise' and (v_expected = 0 or nullif(btrim(p_command ->> 'revisionReason'), '') is null))
    or exists (select 1 from jsonb_object_keys(p_command) key where key not in
      ('schemaVersion','operationId','idempotencyKey','studentId','recordId','sessionId','programId','programVersionId','expectedVersion','action','measurement','revisionReason')) then
    return private.command_rejected_result(v_op, v_key, v_id, 'validation-failed',
      'MeasurementV2 o revisión inválida.', '[]'::jsonb);
  end if;
  v_replay := private.command_identity_or_replay_result(
    p_clinic_id, v_op, v_key, v_id, 'capture-v2', p_command);
  if v_replay is not null then
    if not private.has_student_capability(v_student,
      case when v_action in ('submit','revise') then 'record.submit' else 'record.capture' end) then
      return private.command_rejected_result(v_op, v_key, v_id, 'permission-denied', 'Permiso revocado.', '[]'::jsonb);
    end if;
    return v_replay;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_id::text, 0));
  select * into v_record from public.session_program_records_v2 where id = v_id for update;
  v_record_found := found;
  if not private.has_student_capability(v_student,
    case when v_action in ('submit','revise') then 'record.submit' else 'record.capture' end) then
    return private.command_rejected_result(v_op, v_key, v_id, 'permission-denied', 'Permiso revocado.', '[]'::jsonb);
  end if;
  if not exists (
    select 1 from public.clinical_session_v2_state session
    where session.session_id = v_session and session.organization_id = p_clinic_id
      and session.client_id = v_student
      and ((v_action = 'revise' and session.status in ('active','paused','finished'))
        or (v_action <> 'revise' and session.status in ('active','paused')))
      and session.selected_programs @> jsonb_build_array(jsonb_build_object(
        'programId', v_program, 'programVersionId', v_version)))
  ) or not exists (
    select 1 from public.programs program
    join public.program_versions version on version.id = v_version
    where program.id = v_program and program.client_id = v_student
      and program.organization_id = p_clinic_id and version.program_id = program.id
      and version.client_id = v_student and version.organization_id = p_clinic_id
      and version.design ->> 'measurementDimension' = p_command -> 'measurement' ->> 'dimension'
  ) then
    return private.command_rejected_result(v_op, v_key, v_id, 'resource-unavailable',
      'Relaciones sesión/programa/versión/dimensión inválidas.', '[]'::jsonb);
  end if;
  if not v_record_found then
    if v_expected <> 0 then
      return private.command_version_conflict_result(v_op, v_key, v_id, v_expected, 0,
        'El registro esperado no existe.');
    end if;
    if v_action in ('revise','discard') then
      return private.command_rejected_result(v_op, v_key, v_id, 'invalid-transition',
        'No existe un registro que revisar o descartar.', '[]'::jsonb);
    end if;
    select test_run_id into v_test from public.clients
      where id = v_student and organization_id = p_clinic_id;
    insert into public.session_program_records_v2(
      id, session_id, organization_id, client_id, program_id, program_version_id,
      dimension, measurement, state, actor_user_id, submitted_at, test_run_id)
    values (v_id, v_session, p_clinic_id, v_student, v_program, v_version,
      p_command -> 'measurement' ->> 'dimension', p_command -> 'measurement',
      case when v_action = 'submit' then 'submitted' else 'draft' end,
      auth.uid(), case when v_action = 'submit' then now() end, v_test)
    returning * into v_record;
  else
    if v_record.organization_id <> p_clinic_id or v_record.client_id <> v_student
      or v_record.session_id <> v_session or v_record.program_id <> v_program
      or v_record.program_version_id <> v_version then
      return private.command_rejected_result(v_op, v_key, v_id, 'resource-unavailable',
        'Identidad estable del registro no coincide.', '[]'::jsonb);
    end if;
    if v_record.version <> v_expected then
      return private.command_version_conflict_result(v_op, v_key, v_id, v_expected, v_record.version,
        'El registro cambió desde la última lectura.');
    end if;
    if v_action = 'revise' and v_record.state = 'submitted' then
      select coalesce(max(revision), 0) + 1 into v_revision
        from public.session_program_record_revisions_v2 where record_id = v_id;
      insert into public.session_program_record_revisions_v2(
        record_id, organization_id, client_id, revision, prior_measurement,
        replacement_measurement, reason, actor_user_id, test_run_id)
      values (v_id, p_clinic_id, v_student, v_revision, v_record.measurement,
        p_command -> 'measurement', btrim(p_command ->> 'revisionReason'), auth.uid(), v_record.test_run_id);
    elsif v_record.state <> 'draft' or v_action = 'revise' then
      return private.command_rejected_result(v_op, v_key, v_id, 'invalid-transition',
        'Sólo enviado puede revisarse; sólo borrador puede guardarse, enviarse o descartarse.', '[]'::jsonb);
    end if;
    update public.session_program_records_v2
      set measurement = p_command -> 'measurement',
        dimension = p_command -> 'measurement' ->> 'dimension',
        state = case when v_action = 'discard' then 'discarded'
          when v_action in ('submit','revise') then 'submitted' else 'draft' end,
        submitted_at = case when v_action = 'submit' then now() else submitted_at end,
        discarded_at = case when v_action = 'discard' then now() else discarded_at end,
        version = version + 1, updated_at = now()
      where id = v_id returning * into v_record;
  end if;
  return private.issue_command_receipt(
    p_clinic_id, v_op, v_key, v_id, 'capture-v2', p_command,
    v_record.version, v_record.test_run_id);
end;
$$;

create function private.a3_program_lifecycle_v2_impl(p_clinic_id uuid, p_command jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_student uuid; v_id uuid; v_vid uuid; v_op uuid; v_key uuid; v_expected integer;
  v_action text; v_program public.programs; v_version public.program_versions;
  v_replay jsonb; v_next text; v_prior text;
begin
  if not private.a3_command_envelope_valid(p_command, 'programId') then
    raise exception using errcode = '22023', message = 'command_envelope_invalid';
  end if;
  v_student := (p_command ->> 'studentId')::uuid; v_id := (p_command ->> 'programId')::uuid;
  v_op := (p_command ->> 'operationId')::uuid; v_key := (p_command ->> 'idempotencyKey')::uuid;
  v_expected := (p_command ->> 'expectedVersion')::integer; v_action := p_command ->> 'action';
  if p_command -> 'programVersionId' <> 'null'::jsonb then
    begin v_vid := (p_command ->> 'programVersionId')::uuid;
    exception when invalid_text_representation then
      return private.command_rejected_result(v_op, v_key, v_id, 'validation-failed', 'programVersionId inválido.', '[]'::jsonb);
    end;
  end if;
  if auth.uid() is null
    or not exists (select 1 from public.clients where id = v_student and organization_id = p_clinic_id)
    or not private.has_student_capability(v_student, 'program.edit') then
    return private.command_rejected_result(v_op, v_key, v_id, 'permission-denied', 'Programa no autorizado.', '[]'::jsonb);
  end if;
  if (select count(*) from jsonb_object_keys(p_command)) <> 9
    or jsonb_typeof(p_command -> 'schemaVersion') <> 'number' or p_command ->> 'schemaVersion' <> '2'
    or jsonb_typeof(p_command -> 'action') <> 'string'
    or v_action not in ('publish','pause','reactivate','achieve','discontinue')
    or (v_action = 'publish') <> (v_vid is not null)
    or jsonb_typeof(p_command -> 'terminalConfirmation') <> 'boolean'
    or (v_action in ('achieve','discontinue') and p_command -> 'terminalConfirmation' <> 'true'::jsonb)
    or exists (select 1 from jsonb_object_keys(p_command) key where key not in
      ('schemaVersion','operationId','idempotencyKey','studentId','programId','programVersionId','expectedVersion','action','terminalConfirmation')) then
    return private.command_rejected_result(v_op, v_key, v_id, 'validation-failed', 'Transición ambigua o sin confirmación.', '[]'::jsonb);
  end if;
  v_replay := private.command_identity_or_replay_result(
    p_clinic_id, v_op, v_key, v_id, 'program-lifecycle-v2', p_command);
  if v_replay is not null then
    if not private.has_student_capability(v_student, 'program.edit') then
      return private.command_rejected_result(v_op, v_key, v_id, 'permission-denied', 'Permiso revocado.', '[]'::jsonb);
    end if;
    return v_replay;
  end if;
  select * into v_program from public.programs
    where id = v_id and client_id = v_student and organization_id = p_clinic_id for update;
  if not found then
    return private.command_rejected_result(v_op, v_key, v_id, 'resource-unavailable', 'Programa no disponible.', '[]'::jsonb);
  end if;
  if not private.has_student_capability(v_student, 'program.edit') then
    return private.command_rejected_result(v_op, v_key, v_id, 'permission-denied', 'Permiso revocado.', '[]'::jsonb);
  end if;
  if v_program.revision <> v_expected then
    return private.command_version_conflict_result(v_op, v_key, v_id, v_expected, v_program.revision,
      'El programa cambió desde la última lectura.');
  end if;
  v_prior := v_program.status;
  if v_action = 'publish' then
    select * into v_version from public.program_versions
      where id = v_vid and program_id = v_id and organization_id = p_clinic_id and client_id = v_student for update;
    if not found or v_program.status not in ('draft','active','paused')
      or v_version.version_state <> 'draft'
      or not private.a3_program_design_v2_valid(v_version.design, true) then
      return private.command_rejected_result(v_op, v_key, v_id, 'invalid-transition',
        'Borrador publicable no disponible o incompleto.', '[]'::jsonb);
    end if;
    update public.program_versions set version_state = 'superseded'
      where program_id = v_id and version_state = 'released';
    update public.program_versions set version_state = 'released', activated_at = now() where id = v_vid;
    update public.programs
      set status = 'active', current_version_id = v_vid, revision = revision + 1, updated_at = now()
      where id = v_id returning * into v_program;
  elsif v_action = 'pause' and v_program.status = 'active' then v_next := 'paused';
  elsif v_action = 'reactivate' and v_program.status = 'paused' then v_next := 'active';
  elsif v_action = 'achieve' and v_program.status = 'active' then v_next := 'achieved';
  elsif v_action = 'discontinue' and v_program.status in ('draft','active','paused') then v_next := 'discontinued';
  else
    return private.command_rejected_result(v_op, v_key, v_id, 'invalid-transition',
      'Estado de programa incompatible.', '[]'::jsonb);
  end if;
  if v_next is not null then
    update public.programs set status = v_next, revision = revision + 1, updated_at = now()
      where id = v_id returning * into v_program;
  end if;
  insert into public.program_lifecycle_events(
    organization_id, client_id, program_id, program_version_id, actor_user_id,
    action, prior_status, next_status, test_run_id)
  values (p_clinic_id, v_student, v_id, coalesce(v_vid, v_program.current_version_id), auth.uid(),
    case v_action when 'publish' then 'activated' when 'reactivate' then 'reactivated' else v_action || 'd' end,
    v_prior, v_program.status, v_program.test_run_id);
  return private.issue_command_receipt(
    p_clinic_id, v_op, v_key, v_id, 'program-lifecycle-v2', p_command,
    v_program.revision, v_program.test_run_id);
end;
$$;

revoke all on function private.a3_program_draft_v2_impl(uuid,jsonb),
  private.a3_program_lifecycle_v2_impl(uuid,jsonb),
  private.a3_session_v2_impl(uuid,jsonb), private.a3_capture_v2_impl(uuid,jsonb)
from public, anon, authenticated, service_role;

set check_function_bodies = on;

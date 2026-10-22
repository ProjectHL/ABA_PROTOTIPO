-- Session creation time is immutable. Every command used to overwrite
-- captured_at with its own occurredAt, so dashboards projected the last
-- edit as the capture time. Ordering is still enforced against the
-- creation time and the events already persisted.
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
      notes = p_command ->> 'notes',
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


-- P1 close: a capture may explicitly override the program's default dimension,
-- while session archival remains a separate, versioned soft-delete command.

alter table public.clinical_session_v2_state
  add column archived_at timestamptz;

comment on column public.clinical_session_v2_state.archived_at is
  'Soft-delete marker. Records and immutable results remain attached and readable by reporting models.';

create index clinical_session_v2_state_active_student_idx
  on public.clinical_session_v2_state(organization_id, client_id, created_at desc)
  where archived_at is null;

do $migration$
declare
  v_definition text;
  v_start integer;
  v_finish integer;
  v_start_marker text := E'  if not exists (\n    select 1 from public.clinical_session_v2_state';
  v_finish_marker text := E'  if not v_record_found then';
  v_replacement text := $body$  if not exists (
    select 1 from public.clinical_session_v2_state session
    where session.session_id = v_session and session.organization_id = p_clinic_id
      and session.client_id = v_student and session.archived_at is null
      and ((v_action = 'revise' and session.status in ('active','paused','finished'))
        or (v_action <> 'revise' and session.status in ('active','paused')))
      and session.selected_programs @> jsonb_build_array(jsonb_build_object(
        'programId', v_program, 'programVersionId', v_version))
  ) then
    return private.command_rejected_result(v_op, v_key, v_id, 'resource-unavailable',
      'Relación sesión/programa/versión inválida.', '[]'::jsonb);
  end if;
  if not exists (
    select 1 from public.programs program
    join public.program_versions version on version.id = v_version
    where program.id = v_program and program.client_id = v_student
      and program.organization_id = p_clinic_id and version.program_id = program.id
      and version.client_id = v_student and version.organization_id = p_clinic_id
  ) then
    return private.command_rejected_result(v_op, v_key, v_id, 'resource-unavailable',
      'Relación programa/versión inválida.', '[]'::jsonb);
  end if;
$body$;
begin
  select pg_get_functiondef('private.a3_capture_v2_impl(uuid,jsonb)'::regprocedure)
  into v_definition;
  v_start := position(v_start_marker in v_definition);
  v_finish := position(v_finish_marker in v_definition);
  if v_start = 0 or v_finish <= v_start then
    raise exception 'capture_v2_relation_guard_source_changed';
  end if;
  v_definition := substring(v_definition from 1 for v_start - 1)
    || v_replacement || substring(v_definition from v_finish);
  execute v_definition;
end;
$migration$;

do $migration$
declare
  v_definition text;
  v_original text := $needle$where session.organization_id = p_clinic_id and session.client_id = p_student_id;$needle$;
  v_replacement text := $needle$where session.organization_id = p_clinic_id and session.client_id = p_student_id
    and session.archived_at is null;$needle$;
begin
  select pg_get_functiondef('public.read_program_session_v2(uuid,uuid)'::regprocedure)
  into v_definition;
  if position(v_original in v_definition) = 0 then
    raise exception 'program_session_read_source_changed';
  end if;
  execute replace(v_definition, v_original, v_replacement);
end;
$migration$;

create function private.a3_archive_session_v2_impl(p_clinic_id uuid, p_command jsonb)
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
  update public.clinical_sessions
  set status = 'archived', updated_at = now()
  where id = v_id and client_id = v_student;
  return private.issue_command_receipt(
    p_clinic_id, v_op, v_key, v_id, 'session-archive-v2', p_command,
    v_state.version, v_state.test_run_id);
end;
$$;

create function public.command_archive_session_v2(p_clinic_id uuid, p_command jsonb)
returns jsonb
language sql
volatile
security definer
set search_path = ''
as $$
  select private.a3_archive_session_v2_impl(p_clinic_id, p_command);
$$;

revoke all on function private.a3_archive_session_v2_impl(uuid,jsonb)
from public, anon, authenticated, service_role;
revoke all on function public.command_archive_session_v2(uuid,jsonb)
from public, anon, authenticated, service_role;
grant execute on function public.command_archive_session_v2(uuid,jsonb) to authenticated;

comment on function public.command_archive_session_v2(uuid,jsonb) is
  'Versioned soft archive for an existing V2 session. It never deletes or rewrites captured records.';
comment on function public.command_capture_v2(uuid,jsonb) is
  'A3 V2 raw observation boundary. Program design supplies the default dimension; each validated capture preserves its explicit dimension.';

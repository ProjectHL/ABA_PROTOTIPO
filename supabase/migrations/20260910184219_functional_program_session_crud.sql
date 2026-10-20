-- F2: local functional commands for the versioned-program and session lifecycle.
-- This migration is intentionally additive and is not applied by this change.
-- Existing RLS, capability helpers, and lifecycle triggers remain the authority.

create function public.mvp_update_program_draft(
  p_program_id uuid,
  p_version_id uuid,
  p_title text,
  p_design jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_program public.programs;
  v_version public.program_versions;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'authenticated_user_required';
  end if;
  if p_program_id is null or p_version_id is null
    or nullif(btrim(p_title), '') is null
    or char_length(btrim(p_title)) > 160
    or p_design is null
    or jsonb_typeof(p_design) <> 'object' then
    raise exception using errcode = '22023', message = 'program_draft_payload_invalid';
  end if;

  select * into strict v_program
  from public.programs
  where id = p_program_id
  for update;

  if not (select private.has_student_capability(v_program.client_id, 'program.edit')) then
    raise exception using errcode = '42501', message = 'program_edit_required';
  end if;

  select * into strict v_version
  from public.program_versions
  where id = p_version_id
    and program_id = v_program.id
    and client_id = v_program.client_id
  for update;

  if v_version.version_state <> 'draft'
    or v_version.program_type <> v_program.program_type
    or p_design ->> 'kind' <> v_program.program_type then
    raise exception using errcode = '22023', message = 'program_draft_not_editable';
  end if;

  -- The existing trigger preserves immutable fields and rejects writes to released versions.
  update public.program_versions
  set title = btrim(p_title), design = p_design
  where id = v_version.id
  returning * into v_version;

  return to_jsonb(v_version);
end;
$$;

create function public.mvp_discard_record(
  p_id uuid,
  p_expected_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_record public.session_program_records;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'authenticated_user_required';
  end if;
  if p_id is null or p_expected_version is null or p_expected_version < 1 then
    raise exception using errcode = '22023', message = 'record_discard_payload_invalid';
  end if;

  select * into strict v_record
  from public.session_program_records
  where id = p_id
  for update;

  if not (select private.has_student_capability(v_record.client_id, 'record.capture'))
    or v_record.actor_user_id <> (select auth.uid()) then
    raise exception using errcode = '42501', message = 'record_owner_required';
  end if;
  if v_record.submitted then
    raise exception using errcode = '22023', message = 'submitted_record_cannot_be_discarded';
  end if;
  if v_record.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'record_version_conflict';
  end if;

  -- A discard is physically limited to an unsubmitted measurement draft. The
  -- durable audit event intentionally remains after the draft row is removed.
  insert into public.clinical_record_events (client_id, actor_user_id, entity_id, action, test_run_id)
  values (
    v_record.client_id,
    (select auth.uid()),
    v_record.id,
    'session_program_records:discarded',
    v_record.test_run_id
  );
  delete from public.session_program_records where id = v_record.id;

  return jsonb_build_object('id', v_record.id, 'discarded', true);
end;
$$;

create function public.mvp_archive_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.clinical_sessions;
begin
  if (select auth.uid()) is null or p_session_id is null then
    raise exception using errcode = '42501', message = 'session_archive_required';
  end if;

  select * into strict v_session
  from public.clinical_sessions
  where id = p_session_id
  for update;

  if not (select private.has_student_capability(v_session.client_id, 'record.submit')) then
    raise exception using errcode = '42501', message = 'session_archive_required';
  end if;
  if v_session.status = 'archived' then
    return to_jsonb(v_session);
  end if;
  if v_session.status not in ('draft', 'completed') then
    raise exception using errcode = '22023', message = 'session_archive_state_invalid';
  end if;

  -- This is a soft-delete state transition. Completed sessions and their
  -- submitted records are never deleted or rewritten.
  update public.clinical_sessions
  set status = 'archived'
  where id = v_session.id
  returning * into v_session;

  return to_jsonb(v_session);
end;
$$;

revoke all on function public.mvp_update_program_draft(uuid, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.mvp_discard_record(uuid, integer) from public, anon, authenticated;
revoke all on function public.mvp_archive_session(uuid) from public, anon, authenticated;
grant execute on function public.mvp_update_program_draft(uuid, uuid, text, jsonb) to authenticated;
grant execute on function public.mvp_discard_record(uuid, integer) to authenticated;
grant execute on function public.mvp_archive_session(uuid) to authenticated;

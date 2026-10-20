-- Forward-only: preserve authorization, receipts and program-then-version lock order.
create or replace function private.a3_program_lifecycle_v2_impl(p_clinic_id uuid, p_command jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_student uuid; v_id uuid; v_vid uuid; v_op uuid; v_key uuid; v_expected integer; v_draft_expected integer;
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
  if (select count(*) from jsonb_object_keys(p_command)) <> 10
    or jsonb_typeof(p_command -> 'schemaVersion') <> 'number' or p_command ->> 'schemaVersion' <> '2'
    or jsonb_typeof(p_command -> 'action') <> 'string'
    or v_action not in ('publish','pause','reactivate','achieve','discontinue')
    or (v_action = 'publish') <> (v_vid is not null)
    or jsonb_typeof(p_command -> 'terminalConfirmation') <> 'boolean'
    or (v_action in ('achieve','discontinue') and p_command -> 'terminalConfirmation' <> 'true'::jsonb)
    or exists (select 1 from jsonb_object_keys(p_command) key where key not in
      ('schemaVersion','operationId','idempotencyKey','studentId','programId','programVersionId','expectedVersion','action','terminalConfirmation','expectedDraftRevision')) then
    return private.command_rejected_result(v_op, v_key, v_id, 'validation-failed', 'Transición ambigua o sin confirmación.', '[]'::jsonb);
  end if;
  -- Fail closed for legacy clients: publication must name the revision actually reviewed.
  if v_action = 'publish' then
    if jsonb_typeof(p_command -> 'expectedDraftRevision') is distinct from 'number'
      or (p_command ->> 'expectedDraftRevision') !~ '^[0-9]+$' then
      return private.command_rejected_result(v_op, v_key, v_id, 'validation-failed',
        'Publicar requiere expectedDraftRevision entero no negativo.', '[]'::jsonb);
    end if;
    begin
      v_draft_expected := (p_command ->> 'expectedDraftRevision')::integer;
    exception when numeric_value_out_of_range or invalid_text_representation then
      return private.command_rejected_result(v_op, v_key, v_id, 'validation-failed',
        'expectedDraftRevision fuera de rango.', '[]'::jsonb);
    end;
  elsif p_command -> 'expectedDraftRevision' is distinct from 'null'::jsonb then
    return private.command_rejected_result(v_op, v_key, v_id, 'validation-failed',
      'Esta transición requiere expectedDraftRevision nulo.', '[]'::jsonb);
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
    if v_version.revision <> v_draft_expected then
      return private.command_version_conflict_result(v_op, v_key, v_id,
        v_draft_expected, v_version.revision,
        'El borrador cambió antes de publicarse; revisa su contenido y confirma nuevamente.');
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

revoke all on function private.a3_program_lifecycle_v2_impl(uuid,jsonb) from public, anon, authenticated, service_role;

-- HISTORIAL-013 forward: retire a non-medication reference with an immutable
-- inactive successor. Preserve descriptor/notes, prior row, ledger identity,
-- capability authorization, optimistic version check and exact replay.
-- No DELETE, no new grants/RLS, no rewriting applied migration history.
alter table public.clinical_history_versions_v2 drop constraint clinical_history_versions_v2_action_check;
alter table public.clinical_history_versions_v2 add constraint clinical_history_versions_v2_action_check check (action in ('create','initialize-v2','correct','update-treatment','finish-treatment','reactivate-treatment','retire-reference'));
alter table public.clinical_history_events_v2 drop constraint clinical_history_events_v2_action_check;
alter table public.clinical_history_events_v2 add constraint clinical_history_events_v2_action_check check (action in ('create','initialize-v2','correct','update-treatment','finish-treatment','reactivate-treatment','retire-reference'));

create or replace function private.clinical_history_command_v2_valid(p_command jsonb, p_today date)
returns boolean
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  v_action text;
  v_expected bigint;
  v_payload jsonb;
  v_kind text;
  v_started text;
  v_ended text;
begin
  if p_today is null or not private.jsonb_has_exact_keys(p_command, array[
    'clinicId','operationId','idempotencyKey','studentId','expectedVersion','action',
    'historyId','versionId','supersedesVersionId','confirmation','payload'
  ])
    or jsonb_typeof(p_command->'clinicId') <> 'string' or not private.is_uuid_text(p_command->>'clinicId')
    or jsonb_typeof(p_command->'operationId') <> 'string' or not private.is_uuid_text(p_command->>'operationId')
    or jsonb_typeof(p_command->'idempotencyKey') <> 'string' or not private.is_uuid_text(p_command->>'idempotencyKey')
    or jsonb_typeof(p_command->'studentId') <> 'string' or not private.is_uuid_text(p_command->>'studentId')
    or jsonb_typeof(p_command->'historyId') <> 'string' or not private.is_uuid_text(p_command->>'historyId')
    or jsonb_typeof(p_command->'versionId') <> 'string' or not private.is_uuid_text(p_command->>'versionId')
    or not private.is_safe_nonnegative_integer_json(p_command->'expectedVersion')
    or jsonb_typeof(p_command->'action') <> 'string'
    or jsonb_typeof(p_command->'confirmation') <> 'boolean'
    or jsonb_typeof(p_command->'supersedesVersionId') not in ('string','null')
    or (jsonb_typeof(p_command->'supersedesVersionId') = 'string'
      and not private.is_uuid_text(p_command->>'supersedesVersionId'))
    or jsonb_typeof(p_command->'payload') <> 'object'
  then return false; end if;

  v_action := p_command->>'action';
  v_expected := (p_command->>'expectedVersion')::bigint;
  v_payload := p_command->'payload';
  if v_action not in ('create','initialize-v2','correct','update-treatment','finish-treatment','reactivate-treatment','retire-reference')
    or (v_action in ('create','initialize-v2') and (v_expected <> 0 or p_command->>'supersedesVersionId' is not null))
    or (v_action not in ('create','initialize-v2') and (v_expected = 0 or p_command->>'supersedesVersionId' is null))
    or (v_action in ('create','initialize-v2','correct') and (p_command->>'confirmation')::boolean)
    or (v_action in ('update-treatment','finish-treatment','reactivate-treatment','retire-reference') and not (p_command->>'confirmation')::boolean)
    or p_command->>'versionId' = p_command->>'supersedesVersionId'
  then return false; end if;

  if not private.jsonb_has_exact_keys(v_payload, array[
    'kind','descriptor','dose','frequency','prescriber','startedOn','endedOn','notes'
  ])
    or jsonb_typeof(v_payload->'kind') <> 'string'
    or v_payload->>'kind' not in ('reported_diagnosis','assessment','procedure','medication')
    or jsonb_typeof(v_payload->'descriptor') <> 'string'
    or char_length(btrim(v_payload->>'descriptor')) not between 1 and 200
    or jsonb_typeof(v_payload->'dose') not in ('string','null')
    or (jsonb_typeof(v_payload->'dose') = 'string' and char_length(btrim(v_payload->>'dose')) > 120)
    or jsonb_typeof(v_payload->'frequency') not in ('string','null')
    or (jsonb_typeof(v_payload->'frequency') = 'string' and char_length(btrim(v_payload->>'frequency')) > 120)
    or jsonb_typeof(v_payload->'prescriber') not in ('string','null')
    or (jsonb_typeof(v_payload->'prescriber') = 'string' and char_length(btrim(v_payload->>'prescriber')) > 120)
    or jsonb_typeof(v_payload->'startedOn') not in ('string','null')
    or (jsonb_typeof(v_payload->'startedOn') = 'string' and not private.is_iso_date_not_after(v_payload->>'startedOn', p_today))
    or jsonb_typeof(v_payload->'endedOn') not in ('string','null')
    or (jsonb_typeof(v_payload->'endedOn') = 'string' and not private.is_iso_date_not_after(v_payload->>'endedOn', p_today))
    or jsonb_typeof(v_payload->'notes') not in ('string','null')
    or (jsonb_typeof(v_payload->'notes') = 'string' and char_length(btrim(v_payload->>'notes')) > 2000)
  then return false; end if;

  v_kind := v_payload->>'kind';
  v_started := v_payload->>'startedOn';
  v_ended := v_payload->>'endedOn';
  if (v_started is not null and v_ended is not null and v_ended::date < v_started::date)
    or (v_kind <> 'medication' and (
      v_payload->>'dose' is not null or v_payload->>'frequency' is not null
      or v_payload->>'prescriber' is not null or v_started is not null or v_ended is not null
    ))
    or (v_action in ('update-treatment','finish-treatment','reactivate-treatment') and v_kind <> 'medication')
    or (v_action = 'retire-reference' and v_kind = 'medication')
    or (v_action = 'finish-treatment' and v_ended is null)
    or (v_action in ('update-treatment','reactivate-treatment') and v_ended is not null)
  then return false; end if;
  return true;
exception when invalid_datetime_format or datetime_field_overflow or numeric_value_out_of_range then
  return false;
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
  v_v1 public.clinical_history_entries%rowtype;
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
    if exists(select 1 from public.clinical_history_versions_v2 h where h.history_id=v_history_id)
      or exists(select 1 from public.clinical_history_entries h where h.id=v_history_id) then
      return private.command_rejected_result(v_operation_id,v_idempotency_key,v_history_id,
        'resource-unavailable','El historial ya existe; usa su versión vigente.');
    end if;
    v_next_version := 1;
  elsif v_action='initialize-v2' then
    select h.* into v_v1 from public.clinical_history_entries h
    where h.id=v_history_id and h.organization_id=p_organization_id and h.client_id=v_client_id
    for update;
    if not found then
      return private.command_rejected_result(v_operation_id,v_idempotency_key,v_history_id,
        'resource-unavailable','El historial V1 que se intenta inicializar no está disponible.');
    end if;
    if v_v1.test_run_id is distinct from v_client.test_run_id
      or exists(select 1 from public.clinical_history_versions_v2 h where h.history_id=v_history_id)
      or v_v1.kind <> v_payload->>'kind' then
      return private.command_rejected_result(v_operation_id,v_idempotency_key,v_history_id,
        'invalid-transition','El historial no admite una inicialización V2 con esos datos.');
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


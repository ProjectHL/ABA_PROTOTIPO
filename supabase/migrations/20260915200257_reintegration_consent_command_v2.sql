-- Canonical, linear consent chains. Existing V1 rows and their derived versions
-- remain visible; every new revision is appended through one command boundary.

alter table public.consent_events
  add constraint consent_events_org_client_fkey
    foreign key (organization_id,client_id)
    references public.clients(organization_id,id) on delete restrict,
  add constraint consent_events_same_record_fkey
    foreign key (organization_id,client_id,consent_record_id)
    references public.consent_records(organization_id,client_id,id) on delete restrict,
  add constraint consent_events_org_test_batch_fkey
    foreign key (organization_id,test_run_id)
    references public.test_data_batches(organization_id,id) on delete restrict;

create function private.consent_command_v2_valid(p_command jsonb)
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
begin
  if not private.jsonb_has_exact_keys(p_command,array[
    'clinicId','operationId','idempotencyKey','studentId','consentId','expectedVersion',
    'action','confirmation','versionId','supersedesVersionId','payload'
  ])
    or jsonb_typeof(p_command->'clinicId') <> 'string' or not private.is_uuid_text(p_command->>'clinicId')
    or jsonb_typeof(p_command->'operationId') <> 'string' or not private.is_uuid_text(p_command->>'operationId')
    or jsonb_typeof(p_command->'idempotencyKey') <> 'string' or not private.is_uuid_text(p_command->>'idempotencyKey')
    or jsonb_typeof(p_command->'studentId') <> 'string' or not private.is_uuid_text(p_command->>'studentId')
    or jsonb_typeof(p_command->'consentId') <> 'string' or not private.is_uuid_text(p_command->>'consentId')
    or jsonb_typeof(p_command->'versionId') <> 'string' or not private.is_uuid_text(p_command->>'versionId')
    or not private.is_safe_nonnegative_integer_json(p_command->'expectedVersion')
    or jsonb_typeof(p_command->'action') <> 'string'
    or jsonb_typeof(p_command->'confirmation') <> 'boolean'
    or jsonb_typeof(p_command->'supersedesVersionId') not in ('string','null')
    or (jsonb_typeof(p_command->'supersedesVersionId')='string'
      and not private.is_uuid_text(p_command->>'supersedesVersionId'))
    or jsonb_typeof(p_command->'payload') <> 'object'
  then return false; end if;

  v_action := p_command->>'action';
  v_expected := (p_command->>'expectedVersion')::bigint;
  v_payload := p_command->'payload';
  if v_action not in ('create','correct','replace','revoke')
    or (v_action='create' and (
      v_expected<>0 or p_command->>'supersedesVersionId' is not null
      or p_command->>'consentId'<>p_command->>'versionId'
    ))
    or (v_action<>'create' and (
      v_expected=0 or p_command->>'supersedesVersionId' is null
      or p_command->>'versionId'=p_command->>'supersedesVersionId'
    ))
    or ((p_command->>'confirmation')::boolean <> (v_action in ('replace','revoke')))
  then return false; end if;

  if not private.jsonb_has_exact_keys(v_payload,array[
    'purposeCode','noticeVersion','grantor','channel','evidenceAttachmentId','status'
  ])
    or jsonb_typeof(v_payload->'purposeCode') <> 'string'
    or char_length(btrim(v_payload->>'purposeCode')) not between 1 and 80
    or jsonb_typeof(v_payload->'noticeVersion') <> 'string'
    or char_length(btrim(v_payload->>'noticeVersion')) not between 1 and 80
    or jsonb_typeof(v_payload->'grantor') <> 'string'
    or char_length(btrim(v_payload->>'grantor')) not between 1 and 120
    or jsonb_typeof(v_payload->'channel') <> 'string'
    or char_length(btrim(v_payload->>'channel')) not between 1 and 80
    or jsonb_typeof(v_payload->'evidenceAttachmentId') not in ('string','null')
    or (jsonb_typeof(v_payload->'evidenceAttachmentId')='string'
      and not private.is_uuid_text(v_payload->>'evidenceAttachmentId'))
    or jsonb_typeof(v_payload->'status') <> 'string'
    or v_payload->>'status' not in ('pending_review','valid','revoked','expired')
    or ((v_action='revoke') <> (v_payload->>'status'='revoked'))
  then return false; end if;
  return true;
exception when numeric_value_out_of_range then
  return false;
end;
$$;

create function public.aba_consent_command_v2(
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
  v_consent_id uuid;
  v_version_id uuid;
  v_supersedes_version_id uuid;
  v_expected_version bigint;
  v_action text;
  v_payload jsonb;
  v_replay jsonb;
  v_client public.clients%rowtype;
  v_root public.consent_records%rowtype;
  v_current public.consent_records%rowtype;
  v_next_version integer;
  v_terminal_count integer;
begin
  if p_organization_id is null or jsonb_typeof(p_command) <> 'object'
    or jsonb_typeof(p_command->'operationId') <> 'string' or not private.is_uuid_text(p_command->>'operationId')
    or jsonb_typeof(p_command->'idempotencyKey') <> 'string' or not private.is_uuid_text(p_command->>'idempotencyKey')
    or jsonb_typeof(p_command->'studentId') <> 'string' or not private.is_uuid_text(p_command->>'studentId')
    or jsonb_typeof(p_command->'consentId') <> 'string' or not private.is_uuid_text(p_command->>'consentId')
  then
    raise exception using errcode='22023',message='consent_command_identity_invalid';
  end if;

  v_operation_id := (p_command->>'operationId')::uuid;
  v_idempotency_key := (p_command->>'idempotencyKey')::uuid;
  v_client_id := (p_command->>'studentId')::uuid;
  v_consent_id := (p_command->>'consentId')::uuid;
  if v_actor is null then
    return private.command_rejected_result(v_operation_id,v_idempotency_key,v_consent_id,
      'permission-denied','Se requiere una sesión autenticada.');
  end if;
  if not private.consent_command_v2_valid(p_command)
    or (p_command->>'clinicId')::uuid<>p_organization_id then
    return private.command_rejected_result(v_operation_id,v_idempotency_key,v_consent_id,
      'validation-failed','El comando de consentimiento no cumple el contrato V2.');
  end if;

  v_version_id := (p_command->>'versionId')::uuid;
  v_supersedes_version_id := (p_command->>'supersedesVersionId')::uuid;
  v_expected_version := (p_command->>'expectedVersion')::bigint;
  v_action := p_command->>'action';
  v_payload := p_command->'payload';

  if not exists(select 1 from public.clients c where c.organization_id=p_organization_id and c.id=v_client_id)
    or not private.has_student_capability(v_client_id,'student.edit')
    or not private.has_student_capability(v_client_id,'authorization.decide') then
    return private.command_rejected_result(v_operation_id,v_idempotency_key,v_consent_id,
      'permission-denied','El consentimiento requiere edición y decisión autorizadas vigentes.');
  end if;

  -- No dangling UUID is accepted before the attachment registry can prove the
  -- resource, tenant, student, confirmed bytes and non-archived version.
  if v_payload->>'evidenceAttachmentId' is not null then
    return private.command_rejected_result(v_operation_id,v_idempotency_key,v_consent_id,
      'resource-unavailable','Confirma primero el adjunto de evidencia en el servicio privado de archivos.');
  end if;

  v_replay := private.command_identity_or_replay_result(
    p_organization_id,v_operation_id,v_idempotency_key,v_consent_id,'consent-v2',p_command
  );
  if v_replay is not null then return v_replay; end if;

  select c.* into v_client from public.clients c
  where c.organization_id=p_organization_id and c.id=v_client_id for update;
  if not found then
    return private.command_rejected_result(v_operation_id,v_idempotency_key,v_consent_id,
      'resource-unavailable','La ficha ya no está disponible.');
  end if;
  if not private.has_student_capability(v_client_id,'student.edit')
    or not private.has_student_capability(v_client_id,'authorization.decide') then
    return private.command_rejected_result(v_operation_id,v_idempotency_key,v_consent_id,
      'permission-denied','La autorización para decidir consentimiento dejó de estar vigente.');
  end if;
  perform private.require_open_test_batch(p_organization_id,v_client.test_run_id);

  perform 1 from public.consent_records c
  where c.organization_id=p_organization_id and c.client_id=v_client_id
  order by c.id for update;
  if exists(select 1 from public.consent_records c where c.id=v_version_id) then
    return private.command_rejected_result(v_operation_id,v_idempotency_key,v_consent_id,
      'validation-failed','El identificador de versión de consentimiento ya está en uso.');
  end if;

  if v_action='create' then
    if exists(select 1 from public.consent_records c where c.id=v_consent_id) then
      return private.command_rejected_result(v_operation_id,v_idempotency_key,v_consent_id,
        'resource-unavailable','El consentimiento ya existe; usa su versión vigente.');
    end if;
    v_next_version := 1;
  else
    select c.* into v_root from public.consent_records c
    where c.organization_id=p_organization_id and c.client_id=v_client_id
      and c.id=v_consent_id and c.supersedes_id is null;
    if not found then
      return private.command_rejected_result(v_operation_id,v_idempotency_key,v_consent_id,
        'resource-unavailable','La raíz del consentimiento no está disponible.');
    end if;

    with recursive chain as (
      select c.* from public.consent_records c where c.id=v_consent_id
      union all
      select child.* from public.consent_records child
      join chain parent on child.supersedes_id=parent.id
      where child.organization_id=p_organization_id and child.client_id=v_client_id
    ), terminals as (
      select c.* from chain c
      where not exists(select 1 from chain child where child.supersedes_id=c.id)
    )
    select count(*) into v_terminal_count from terminals;
    if v_terminal_count<>1 then
      return private.command_rejected_result(v_operation_id,v_idempotency_key,v_consent_id,
        'invalid-transition','La cadena histórica de consentimiento no es lineal.');
    end if;

    with recursive chain as (
      select c.* from public.consent_records c where c.id=v_consent_id
      union all
      select child.* from public.consent_records child
      join chain parent on child.supersedes_id=parent.id
      where child.organization_id=p_organization_id and child.client_id=v_client_id
    )
    select c.* into v_current from chain c
    where not exists(select 1 from chain child where child.supersedes_id=c.id)
    limit 1;
    if v_current.test_run_id is distinct from v_client.test_run_id then
      return private.command_rejected_result(v_operation_id,v_idempotency_key,v_consent_id,
        'validation-failed','El consentimiento y la ficha pertenecen a lotes distintos.');
    end if;
    if v_current.version::bigint<>v_expected_version then
      return private.command_version_conflict_result(v_operation_id,v_idempotency_key,v_consent_id,
        v_expected_version,v_current.version,'La versión del consentimiento cambió.');
    end if;
    if v_current.id<>v_supersedes_version_id
      or v_current.purpose_code<>btrim(v_payload->>'purposeCode') then
      return private.command_rejected_result(v_operation_id,v_idempotency_key,v_consent_id,
        'invalid-transition','La revisión no continúa la versión y finalidad vigentes.');
    end if;
    if v_action='correct' and v_current.status<>v_payload->>'status' then
      return private.command_rejected_result(v_operation_id,v_idempotency_key,v_consent_id,
        'invalid-transition','Una corrección no puede cambiar el estado del consentimiento.');
    end if;
    if v_action='revoke' and v_current.status in ('revoked','expired') then
      return private.command_rejected_result(v_operation_id,v_idempotency_key,v_consent_id,
        'invalid-transition','El consentimiento ya no está vigente para revocarlo.');
    end if;
    update public.consent_records set status='superseded' where id=v_current.id;
    insert into public.consent_events(
      organization_id,client_id,consent_record_id,event_type,actor_user_id,test_run_id
    ) values (
      p_organization_id,v_client_id,v_current.id,'superseded',v_actor,v_client.test_run_id
    );
    v_next_version := v_current.version+1;
  end if;

  insert into public.consent_records(
    id,organization_id,client_id,purpose_code,notice_version,grantor_descriptor,channel,
    evidence_reference,evidence_attachment_id,status,effective_at,expires_at,created_by,
    supersedes_id,version,test_run_id
  ) values (
    v_version_id,p_organization_id,v_client_id,btrim(v_payload->>'purposeCode'),
    btrim(v_payload->>'noticeVersion'),btrim(v_payload->>'grantor'),btrim(v_payload->>'channel'),
    null,null,(v_payload->>'status'),case when v_payload->>'status'='valid' then now() else null end,
    null,v_actor,v_supersedes_version_id,v_next_version,v_client.test_run_id
  );
  insert into public.consent_events(
    organization_id,client_id,consent_record_id,event_type,actor_user_id,test_run_id
  ) values (
    p_organization_id,v_client_id,v_version_id,
    case when v_payload->>'status' in ('revoked','expired') then v_payload->>'status' else 'recorded' end,
    v_actor,v_client.test_run_id
  );
  insert into public.audit_events(organization_id,actor_user_id,entity_type,entity_id,action,test_run_id)
  values(p_organization_id,v_actor,'client',v_client_id,'updated',v_client.test_run_id);

  return private.issue_command_receipt(
    p_organization_id,v_operation_id,v_idempotency_key,v_consent_id,
    'consent-v2',p_command,v_next_version,v_client.test_run_id
  );
end;
$$;

revoke insert,update,delete on table public.consent_records
  from public,anon,authenticated,service_role;
revoke insert,update,delete on table public.consent_events
  from public,anon,authenticated,service_role;
revoke all on function public.record_consent_reference(uuid,text,text,text,text,text,timestamptz,timestamptz,text,uuid,uuid)
  from public,anon,authenticated,service_role;
revoke all on function private.consent_command_v2_valid(jsonb)
  from public,anon,authenticated,service_role;
revoke all on function public.aba_consent_command_v2(uuid,jsonb)
  from public,anon,service_role;
grant execute on function public.aba_consent_command_v2(uuid,jsonb) to authenticated;

comment on function public.aba_consent_command_v2(uuid,jsonb) is
  'Authorized linear consent command; result resourceId is consentId and non-null evidence is rejected until attachment confirmation exists.';

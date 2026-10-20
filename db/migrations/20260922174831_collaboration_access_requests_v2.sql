-- R4 closure for COMPARTIR-030/031. Extend the original internal
-- coordinator -> clinical owner authorization workflow. External invitations
-- remain a separate lifecycle and pending requests never grant access.

alter table public.student_authorization_requests
  add column version integer not null default 1 check (version > 0);

alter table public.student_authorization_decisions
  add column reason text not null default '' check (char_length(reason) <= 2000);

create function private.a4_access_request_create_valid(p_command jsonb)
returns boolean language sql immutable security invoker set search_path = '' as $$
  select coalesce(
    jsonb_typeof(p_command)='object'
    and (select count(*) from jsonb_object_keys(p_command))=9
    and not exists(select 1 from jsonb_object_keys(p_command) key where key not in
      ('operationId','idempotencyKey','requestId','studentId','expectedVersion',
       'action','resourceType','requestedActions','reason'))
    and private.is_uuid_text(p_command->>'operationId')
    and private.is_uuid_text(p_command->>'idempotencyKey')
    and private.is_uuid_text(p_command->>'requestId')
    and private.is_uuid_text(p_command->>'studentId')
    and p_command->>'action'='request'
    and p_command->'expectedVersion'='0'::jsonb
    and p_command->>'resourceType' in ('student','program','record_config','chart')
    and jsonb_typeof(p_command->'requestedActions')='array'
    and jsonb_array_length(p_command->'requestedActions') between 1 and 5
    and not exists(select 1 from jsonb_array_elements(p_command->'requestedActions') item
      where jsonb_typeof(item)<>'string')
    and jsonb_typeof(p_command->'reason')='string'
    and char_length(btrim(p_command->>'reason')) between 1 and 500,
    false
  );
$$;

create function private.a4_access_request_decision_valid(p_command jsonb)
returns boolean language sql immutable security invoker set search_path = '' as $$
  select coalesce(
    jsonb_typeof(p_command)='object'
    and (select count(*) from jsonb_object_keys(p_command))=9
    and not exists(select 1 from jsonb_object_keys(p_command) key where key not in
      ('operationId','idempotencyKey','requestId','studentId','expectedVersion',
       'action','expiresAt','reason','confirmation'))
    and private.is_uuid_text(p_command->>'operationId')
    and private.is_uuid_text(p_command->>'idempotencyKey')
    and private.is_uuid_text(p_command->>'requestId')
    and private.is_uuid_text(p_command->>'studentId')
    and jsonb_typeof(p_command->'expectedVersion')='number'
    and (p_command->>'expectedVersion')::numeric between 1 and 9007199254740991
    and (p_command->>'expectedVersion')::numeric=trunc((p_command->>'expectedVersion')::numeric)
    and p_command->>'action' in ('approve','deny')
    and jsonb_typeof(p_command->'reason')='string'
    and char_length(btrim(p_command->>'reason')) between 1 and 2000
    and p_command->'confirmation'='true'::jsonb
    and case p_command->>'action'
      when 'approve' then jsonb_typeof(p_command->'expiresAt')='string'
      else p_command->'expiresAt'='null'::jsonb
    end,
    false
  );
$$;

create function private.a4_access_request_create_impl(p_organization_id uuid,p_command jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_actor uuid:=auth.uid(); v_operation uuid; v_key uuid; v_request_id uuid;
  v_client_id uuid; v_replay jsonb; v_request public.student_authorization_requests;
  v_actions text[]; v_test uuid; v_resource text;
begin
  if not private.a4_access_request_create_valid(p_command) then
    raise exception using errcode='22023',message='student_access_request_command_invalid';
  end if;
  v_operation:=(p_command->>'operationId')::uuid;
  v_key:=(p_command->>'idempotencyKey')::uuid;
  v_request_id:=(p_command->>'requestId')::uuid;
  v_client_id:=(p_command->>'studentId')::uuid;
  v_resource:=p_command->>'resourceType';
  select array_agg(distinct value order by value) into v_actions
    from jsonb_array_elements_text(p_command->'requestedActions') value;
  if exists(select 1 from unnest(v_actions) requested where requested not in
      ('student.edit','program.edit','record_config.create','record_config.edit','chart.configure'))
    or exists(select 1 from unnest(v_actions) requested where
      (v_resource='student' and requested<>'student.edit')
      or (v_resource='program' and requested<>'program.edit')
      or (v_resource='record_config' and requested not in ('record_config.create','record_config.edit'))
      or (v_resource='chart' and requested<>'chart.configure')) then
    return private.command_rejected_result(v_operation,v_key,v_request_id,
      'validation-failed','Las acciones no corresponden al recurso solicitado.');
  end if;
  if v_actor is null or not private.has_internal_student_capability(v_client_id,'authorization.request') then
    return private.command_rejected_result(v_operation,v_key,v_request_id,
      'permission-denied','No tienes capacidad vigente para solicitar esta autorización.');
  end if;
  if not exists(select 1 from public.clients client
    where client.id=v_client_id and client.organization_id=p_organization_id) then
    return private.command_rejected_result(v_operation,v_key,v_request_id,
      'resource-unavailable','La ficha no pertenece a esta clínica.');
  end if;
  v_replay:=private.command_identity_or_replay_result(
    p_organization_id,v_operation,v_key,v_request_id,'student-access-request-v2',p_command);
  if v_replay is not null then
    if not private.has_internal_student_capability(v_client_id,'authorization.request') then
      return private.command_rejected_result(v_operation,v_key,v_request_id,
        'permission-denied','La capacidad para solicitar acceso fue revocada.');
    end if;
    return v_replay;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(
    'student-access-request:'||v_client_id::text||':'||v_actor::text,0));
  select client.test_run_id into v_test from public.clients client
    where client.id=v_client_id and client.organization_id=p_organization_id
      and client.status='active' for share;
  if not found or not private.has_internal_student_capability(v_client_id,'authorization.request') then
    return private.command_rejected_result(v_operation,v_key,v_request_id,
      'permission-denied','La ficha o la capacidad solicitante ya no está disponible.');
  end if;
  perform private.require_open_test_batch(p_organization_id,v_test);
  if exists(select 1 from public.student_authorization_requests request
    where request.client_id=v_client_id and request.requester_user_id=v_actor
      and request.resource_type=v_resource and request.requested_actions=v_actions
      and request.status='pending') then
    return private.command_rejected_result(v_operation,v_key,v_request_id,
      'invalid-transition','Ya existe una solicitud pendiente con el mismo alcance.');
  end if;
  insert into public.student_authorization_requests(
    id,organization_id,client_id,requester_user_id,resource_type,
    requested_actions,reason,status,version,test_run_id)
  values(v_request_id,p_organization_id,v_client_id,v_actor,v_resource,v_actions,
    btrim(p_command->>'reason'),'pending',1,v_test)
  returning * into v_request;
  perform private.audit_student_access_event(p_organization_id,v_client_id,
    'authorization_request',v_request_id,'requested',v_test);
  return private.issue_command_receipt(p_organization_id,v_operation,v_key,v_request_id,
    'student-access-request-v2',p_command,v_request.version,v_test);
end;
$$;

create function private.a4_access_request_decision_impl(p_organization_id uuid,p_command jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_actor uuid:=auth.uid(); v_operation uuid; v_key uuid; v_request_id uuid;
  v_client_id uuid; v_expected bigint; v_action text; v_replay jsonb;
  v_request public.student_authorization_requests; v_decision_id uuid:=gen_random_uuid();
  v_expires timestamptz; v_test uuid;
begin
  if not private.a4_access_request_decision_valid(p_command) then
    raise exception using errcode='22023',message='student_access_decision_command_invalid';
  end if;
  v_operation:=(p_command->>'operationId')::uuid;
  v_key:=(p_command->>'idempotencyKey')::uuid;
  v_request_id:=(p_command->>'requestId')::uuid;
  v_client_id:=(p_command->>'studentId')::uuid;
  v_expected:=(p_command->>'expectedVersion')::bigint;
  v_action:=p_command->>'action';
  if v_action='approve' then
    begin
      v_expires:=(p_command->>'expiresAt')::timestamptz;
    exception when invalid_datetime_format or datetime_field_overflow then
      return private.command_rejected_result(v_operation,v_key,v_request_id,
        'validation-failed','La expiración no es una fecha válida.');
    end;
  end if;
  if v_actor is null or not private.has_internal_student_capability(v_client_id,'authorization.decide') then
    return private.command_rejected_result(v_operation,v_key,v_request_id,
      'permission-denied','No tienes capacidad vigente para decidir esta solicitud.');
  end if;
  if not exists(select 1 from public.student_authorization_requests request
    where request.id=v_request_id and request.client_id=v_client_id
      and request.organization_id=p_organization_id) then
    return private.command_rejected_result(v_operation,v_key,v_request_id,
      'resource-unavailable','La solicitud no pertenece a esta clínica y ficha.');
  end if;
  v_replay:=private.command_identity_or_replay_result(
    p_organization_id,v_operation,v_key,v_request_id,'student-access-decision-v2',p_command);
  if v_replay is not null then
    if not private.has_internal_student_capability(v_client_id,'authorization.decide') then
      return private.command_rejected_result(v_operation,v_key,v_request_id,
        'permission-denied','La capacidad para decidir accesos fue revocada.');
    end if;
    return v_replay;
  end if;
  -- Time-relative validation applies only to new writes, never to an exact
  -- replay of an already committed decision and its durable receipt.
  if v_action='approve' and (v_expires<=now() or v_expires>now()+interval '90 days') then
    return private.command_rejected_result(v_operation,v_key,v_request_id,
      'validation-failed','La autorización debe expirar entre ahora y 90 días.');
  end if;
  select * into v_request from public.student_authorization_requests request
    where request.id=v_request_id for update;
  if not found or v_request.organization_id<>p_organization_id or v_request.client_id<>v_client_id then
    return private.command_rejected_result(v_operation,v_key,v_request_id,
      'resource-unavailable','La solicitud no está disponible en esta clínica y ficha.');
  end if;
  if not private.has_internal_student_capability(v_client_id,'authorization.decide') then
    return private.command_rejected_result(v_operation,v_key,v_request_id,
      'permission-denied','La capacidad para decidir accesos fue revocada.');
  end if;
  if v_request.version<>v_expected then
    return private.command_version_conflict_result(v_operation,v_key,v_request_id,
      v_expected,v_request.version,'La solicitud cambió desde la última lectura.');
  end if;
  if v_request.status<>'pending' then
    return private.command_rejected_result(v_operation,v_key,v_request_id,
      'invalid-transition','La solicitud ya fue resuelta.');
  end if;
  v_test:=v_request.test_run_id;
  perform private.require_open_test_batch(p_organization_id,v_test);
  insert into public.student_authorization_decisions(
    id,organization_id,client_id,request_id,decider_user_id,decision,
    granted_actions,effective_at,expires_at,reason,test_run_id)
  values(v_decision_id,p_organization_id,v_client_id,v_request_id,v_actor,
    case v_action when 'approve' then 'approved' else 'denied' end,
    case v_action when 'approve' then v_request.requested_actions else '{}'::text[] end,
    now(),case v_action when 'approve' then v_expires else null end,
    btrim(p_command->>'reason'),v_test);
  update public.student_authorization_requests set
    status=case v_action when 'approve' then 'approved' else 'denied' end,
    resolved_at=now(),version=version+1
    where id=v_request_id returning * into v_request;
  perform private.audit_student_access_event(p_organization_id,v_client_id,
    'authorization_decision',v_decision_id,
    case v_action when 'approve' then 'approved' else 'denied' end,v_test);
  return private.issue_command_receipt(p_organization_id,v_operation,v_key,v_request_id,
    'student-access-decision-v2',p_command,v_request.version,v_test);
end;
$$;

create function public.aba_student_access_request_command_v2(
  p_organization_id uuid,p_command jsonb)
returns jsonb language sql volatile security definer set search_path = '' as $$
  select private.a4_access_request_create_impl(p_organization_id,p_command);
$$;

create function public.aba_student_access_decision_command_v2(
  p_organization_id uuid,p_command jsonb)
returns jsonb language sql volatile security definer set search_path = '' as $$
  select private.a4_access_request_decision_impl(p_organization_id,p_command);
$$;

create function public.aba_student_access_request_read_v2(p_organization_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_actor uuid:=auth.uid(); v_rows jsonb;
begin
  if v_actor is null then
    raise exception using errcode='42501',message='authenticated_identity_required';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',request.id,'clinicId',request.organization_id,'studentId',request.client_id,
    'studentName',case when private.has_internal_student_capability(client.id,'student.view')
      then coalesce(client_profile.full_name,client.initials) else client.initials end,
    'requesterUserId',request.requester_user_id,
    'requesterName',coalesce(nullif(professional.name,''),requester.email,'Profesional'),
    'requesterEmail',requester.email,'requesterTitle',coalesce(professional.title,''),
    'resourceType',request.resource_type,'requestedActions',request.requested_actions,
    'reason',request.reason,'status',request.status,'version',request.version,
    'createdAt',request.created_at,'resolvedAt',request.resolved_at,
    'direction',case when request.requester_user_id=v_actor then 'requested' else 'incoming' end
  ) order by request.created_at desc),'[]'::jsonb) into v_rows
  from public.student_authorization_requests request
  join public.clients client on client.id=request.client_id
    and client.organization_id=request.organization_id
  left join public.client_profiles_v2 client_profile on client_profile.client_id=client.id
    and client_profile.organization_id=client.organization_id
  join auth.users requester on requester.id=request.requester_user_id
  left join public.professional_profiles professional on professional.user_id=request.requester_user_id
  where request.organization_id=p_organization_id and (
    request.requester_user_id=v_actor
    or private.has_internal_student_capability(request.client_id,'authorization.decide'));
  return jsonb_build_object('clinicId',p_organization_id,'actorId',v_actor,'requests',v_rows);
end;
$$;

-- Legacy functions remain in migration history but no longer form part of the API.
revoke execute on function public.request_student_authorization(uuid,text,text[],text,uuid),
  public.decide_student_authorization(uuid,text,timestamptz,uuid)
from public,anon,authenticated,service_role;

revoke all on function private.a4_access_request_create_valid(jsonb),
  private.a4_access_request_decision_valid(jsonb),
  private.a4_access_request_create_impl(uuid,jsonb),
  private.a4_access_request_decision_impl(uuid,jsonb),
  public.aba_student_access_request_command_v2(uuid,jsonb),
  public.aba_student_access_decision_command_v2(uuid,jsonb),
  public.aba_student_access_request_read_v2(uuid)
from public,anon,authenticated,service_role;

grant execute on function public.aba_student_access_request_command_v2(uuid,jsonb),
  public.aba_student_access_decision_command_v2(uuid,jsonb),
  public.aba_student_access_request_read_v2(uuid)
to authenticated;

comment on function public.aba_student_access_request_command_v2(uuid,jsonb) is
  'Internal professional request with exact replay receipt; grants nothing while pending.';
comment on function public.aba_student_access_decision_command_v2(uuid,jsonb) is
  'Clinical owner approval/denial with current capability, optimistic version and durable receipt.';
comment on function public.aba_student_access_request_read_v2(uuid) is
  'Authorized request inbox/history for requester or current access decision owner.';

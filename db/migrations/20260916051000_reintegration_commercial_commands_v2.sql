create function private.a5_command_envelope_valid(
  p_command jsonb, p_resource_key text, p_clinic_key text default 'clinicId')
returns boolean language sql immutable security invoker set search_path = '' as $$
  select coalesce(
    jsonb_typeof(p_command) = 'object'
    and jsonb_typeof(p_command -> 'schemaVersion') = 'number'
    and p_command ->> 'schemaVersion' = '2'
    and jsonb_typeof(p_command -> 'operationId') = 'string'
    and private.is_uuid_text(p_command ->> 'operationId')
    and jsonb_typeof(p_command -> 'idempotencyKey') = 'string'
    and private.is_uuid_text(p_command ->> 'idempotencyKey')
    and jsonb_typeof(p_command -> p_resource_key) = 'string'
    and private.is_uuid_text(p_command ->> p_resource_key)
    and jsonb_typeof(p_command -> p_clinic_key) = 'string'
    and private.is_uuid_text(p_command ->> p_clinic_key)
    and jsonb_typeof(p_command -> 'expectedVersion') = 'number'
    and (p_command ->> 'expectedVersion') ~ '^[0-9]+$'
    and (p_command ->> 'expectedVersion')::numeric <= 2147483647,
    false
  );
$$;

create function private.a5_document_v2_valid(p_document jsonb)
returns boolean language plpgsql immutable security invoker set search_path = '' as $$
declare v_line jsonb;
begin
  if jsonb_typeof(p_document) <> 'object'
    or (select count(*) from jsonb_object_keys(p_document)) <> 16
    or exists (select 1 from jsonb_object_keys(p_document) key where key not in
      ('id','clinicId','subscriptionId','version','kind','title','issuedAt','lines','currency',
       'minorUnitDigits','attachmentVersionId','predecessorId','archived','demonstration','taxDocument','paymentRequested'))
    or jsonb_typeof(p_document -> 'id') <> 'string' or not private.is_uuid_text(p_document ->> 'id')
    or jsonb_typeof(p_document -> 'clinicId') <> 'string' or not private.is_uuid_text(p_document ->> 'clinicId')
    or (p_document -> 'subscriptionId' <> 'null'::jsonb
      and (jsonb_typeof(p_document -> 'subscriptionId') <> 'string' or not private.is_uuid_text(p_document ->> 'subscriptionId')))
    or jsonb_typeof(p_document -> 'version') <> 'number'
    or not ((p_document ->> 'version') ~ '^[1-9][0-9]*$')
    or (p_document ->> 'version')::numeric > 2147483647
    or jsonb_typeof(p_document -> 'kind') <> 'string'
    or p_document ->> 'kind' not in ('internal-summary','internal-proposal','internal-agreement')
    or jsonb_typeof(p_document -> 'title') <> 'string'
    or nullif(btrim(p_document ->> 'title'), '') is null or char_length(btrim(p_document ->> 'title')) > 300
    or not private.a3_iso_timestamp_valid(p_document -> 'issuedAt')
    or jsonb_typeof(p_document -> 'lines') <> 'array' or jsonb_array_length(p_document -> 'lines') > 100
    or jsonb_typeof(p_document -> 'currency') <> 'string' or not ((p_document ->> 'currency') ~ '^[A-Z]{3}$')
    or jsonb_typeof(p_document -> 'minorUnitDigits') <> 'number'
    or not ((p_document ->> 'minorUnitDigits') ~ '^[0-3]$')
    or (p_document -> 'attachmentVersionId' <> 'null'::jsonb
      and (jsonb_typeof(p_document -> 'attachmentVersionId') <> 'string' or not private.is_uuid_text(p_document ->> 'attachmentVersionId')))
    or (p_document -> 'predecessorId' <> 'null'::jsonb
      and (jsonb_typeof(p_document -> 'predecessorId') <> 'string' or not private.is_uuid_text(p_document ->> 'predecessorId')))
    or jsonb_typeof(p_document -> 'archived') <> 'boolean'
    or p_document -> 'demonstration' <> 'true'::jsonb
    or p_document -> 'taxDocument' <> 'false'::jsonb
    or p_document -> 'paymentRequested' <> 'false'::jsonb then return false;
  end if;
  for v_line in select value from jsonb_array_elements(p_document -> 'lines') loop
    if jsonb_typeof(v_line) <> 'object'
      or (select count(*) from jsonb_object_keys(v_line)) <> 2
      or exists (select 1 from jsonb_object_keys(v_line) key where key not in ('description','amountMinor'))
      or jsonb_typeof(v_line -> 'description') <> 'string'
      or nullif(btrim(v_line ->> 'description'), '') is null
      or char_length(btrim(v_line ->> 'description')) > 1000
      or jsonb_typeof(v_line -> 'amountMinor') <> 'number'
      or not ((v_line ->> 'amountMinor') ~ '^[0-9]+$')
      or (v_line ->> 'amountMinor')::numeric > 9007199254740991 then return false;
    end if;
  end loop;
  return true;
exception when invalid_text_representation or numeric_value_out_of_range then return false;
end;
$$;

create function private.a5_commercial_document_command_v2_impl(p_organization_id uuid, p_command jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid(); v_id uuid; v_op uuid; v_key uuid; v_expected integer;
  v_action text; v_replay jsonb; v_current public.commercial_documents_v2;
  v_document jsonb; v_subscription uuid; v_attachment_version uuid;
  v_attachment_record uuid; v_predecessor uuid; v_test uuid;
begin
  if not private.a5_command_envelope_valid(p_command, 'documentId') then
    raise exception using errcode = '22023', message = 'command_envelope_invalid';
  end if;
  v_id := (p_command ->> 'documentId')::uuid;
  v_op := (p_command ->> 'operationId')::uuid;
  v_key := (p_command ->> 'idempotencyKey')::uuid;
  v_expected := (p_command ->> 'expectedVersion')::integer;
  v_action := p_command ->> 'action';
  if v_actor is null or p_command ->> 'clinicId' <> p_organization_id::text
    or not private.is_clinic_admin(p_organization_id) then
    return private.command_rejected_result(v_op, v_key, v_id, 'permission-denied',
      'Administración activa requerida.', '[]'::jsonb);
  end if;
  if p_command -> 'confirmation' <> 'true'::jsonb
    or v_action not in ('create','replace','archive')
    or (v_action = 'create' and v_expected <> 0)
    or (v_action <> 'create' and v_expected = 0)
    or (v_action in ('create','replace') and (
      (select count(*) from jsonb_object_keys(p_command)) <> 9
      or not private.a5_document_v2_valid(p_command -> 'document')))
    or (v_action = 'archive' and (select count(*) from jsonb_object_keys(p_command)) <> 8)
    or exists (select 1 from jsonb_object_keys(p_command) key where key not in
      ('schemaVersion','operationId','idempotencyKey','clinicId','documentId','expectedVersion','confirmation','action','document')) then
    return private.command_rejected_result(v_op, v_key, v_id, 'validation-failed',
      'Comando de documento interno inválido.', '[]'::jsonb);
  end if;
  if v_action in ('create','replace') then
    v_document := p_command -> 'document';
    if v_document ->> 'id' <> v_id::text or v_document ->> 'clinicId' <> p_organization_id::text
      or (v_document ->> 'version')::integer <> (case when v_action = 'create' then 1 else v_expected + 1 end)
      or v_document -> 'archived' <> 'false'::jsonb
      or (v_action = 'create' and v_document -> 'predecessorId' <> 'null'::jsonb) then
      return private.command_rejected_result(v_op, v_key, v_id, 'validation-failed',
        'Identidad, versión o estado del documento no coincide con el comando.', '[]'::jsonb);
    end if;
    if v_document -> 'subscriptionId' <> 'null'::jsonb then
      v_subscription := (v_document ->> 'subscriptionId')::uuid;
      if not exists (select 1 from public.clinic_subscriptions_v2 subscription
        where subscription.organization_id = p_organization_id and subscription.id = v_subscription) then
        return private.command_rejected_result(v_op, v_key, v_id, 'resource-unavailable',
          'Suscripción del documento no disponible.', '[]'::jsonb);
      end if;
    end if;
    if v_document -> 'predecessorId' <> 'null'::jsonb then
      v_predecessor := (v_document ->> 'predecessorId')::uuid;
      if not exists (select 1 from public.commercial_documents_v2 predecessor
        where predecessor.organization_id = p_organization_id and predecessor.id = v_predecessor
          and predecessor.id <> v_id) then
        return private.command_rejected_result(v_op, v_key, v_id, 'resource-unavailable',
          'Predecesor interno no disponible.', '[]'::jsonb);
      end if;
    end if;
    if v_document -> 'attachmentVersionId' <> 'null'::jsonb then
      v_attachment_version := (v_document ->> 'attachmentVersionId')::uuid;
      select version.attachment_id into v_attachment_record
      from public.attachment_versions version
      join public.attachment_records record on record.id = version.attachment_id
      where version.id = v_attachment_version and version.state = 'available'
        and record.organization_id = p_organization_id and record.resource_kind = 'commercial'
        and record.purpose = 'commercial-document' and record.commercial_document_id = v_id
        and record.state = 'available' and record.current_version_id = version.id;
      if not found then
        return private.command_rejected_result(v_op, v_key, v_id, 'resource-unavailable',
          'Adjunto comercial confirmado no disponible.', '[]'::jsonb);
      end if;
    end if;
  end if;
  v_replay := private.command_identity_or_replay_result(
    p_organization_id, v_op, v_key, v_id, 'commercial-document-v2', p_command);
  if v_replay is not null then
    if not private.is_clinic_admin(p_organization_id) then
      return private.command_rejected_result(v_op, v_key, v_id, 'permission-denied', 'Permiso revocado.', '[]'::jsonb);
    end if;
    return v_replay;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_id::text, 0));
  select * into v_current from public.commercial_documents_v2 where id = v_id for update;
  if not private.is_clinic_admin(p_organization_id) then
    return private.command_rejected_result(v_op, v_key, v_id, 'permission-denied', 'Permiso revocado.', '[]'::jsonb);
  end if;
  if v_action = 'create' then
    if found then
      return private.command_version_conflict_result(v_op, v_key, v_id, 0, v_current.version,
        'El documento interno ya existe.');
    end if;
    select test_run_id into v_test from public.memberships
      where organization_id = p_organization_id and user_id = v_actor;
    insert into public.commercial_documents_v2(
      id, organization_id, subscription_id, version, kind, title, issued_at, lines,
      currency, minor_unit_digits, attachment_record_id, attachment_version_id,
      predecessor_id, archived, created_by, test_run_id)
    values (v_id, p_organization_id, v_subscription, 1, v_document ->> 'kind',
      btrim(v_document ->> 'title'), (v_document ->> 'issuedAt')::timestamptz,
      v_document -> 'lines', v_document ->> 'currency',
      (v_document ->> 'minorUnitDigits')::smallint, v_attachment_record,
      v_attachment_version, v_predecessor, false, v_actor, v_test)
    returning * into v_current;
    insert into public.commercial_document_events_v2(
      organization_id, document_id, actor_user_id, action, prior_version,
      next_version, payload, test_run_id)
    values (p_organization_id, v_id, v_actor, 'created', null, 1, p_command, v_test);
  else
    if not found or v_current.organization_id <> p_organization_id then
      return private.command_rejected_result(v_op, v_key, v_id, 'resource-unavailable',
        'Documento interno no disponible.', '[]'::jsonb);
    end if;
    if v_current.version <> v_expected then
      return private.command_version_conflict_result(v_op, v_key, v_id, v_expected, v_current.version,
        'El documento interno cambió desde la última lectura.');
    end if;
    if v_current.archived then
      return private.command_rejected_result(v_op, v_key, v_id, 'invalid-transition',
        'El documento archivado es terminal.', '[]'::jsonb);
    end if;
    if v_action = 'replace' then
      update public.commercial_documents_v2 set
        subscription_id = v_subscription, version = version + 1,
        kind = v_document ->> 'kind', title = btrim(v_document ->> 'title'),
        issued_at = (v_document ->> 'issuedAt')::timestamptz, lines = v_document -> 'lines',
        currency = v_document ->> 'currency',
        minor_unit_digits = (v_document ->> 'minorUnitDigits')::smallint,
        attachment_record_id = v_attachment_record, attachment_version_id = v_attachment_version,
        predecessor_id = v_predecessor, updated_at = now()
      where id = v_id returning * into v_current;
      insert into public.commercial_document_events_v2(
        organization_id, document_id, actor_user_id, action, prior_version,
        next_version, payload, test_run_id)
      values (p_organization_id, v_id, v_actor, 'replaced', v_expected,
        v_current.version, p_command, v_current.test_run_id);
    else
      update public.commercial_documents_v2
        set archived = true, version = version + 1, updated_at = now()
        where id = v_id returning * into v_current;
      insert into public.commercial_document_events_v2(
        organization_id, document_id, actor_user_id, action, prior_version,
        next_version, payload, test_run_id)
      values (p_organization_id, v_id, v_actor, 'archived', v_expected,
        v_current.version, p_command, v_current.test_run_id);
    end if;
  end if;
  return private.issue_command_receipt(
    p_organization_id, v_op, v_key, v_id, 'commercial-document-v2', p_command,
    v_current.version, v_current.test_run_id);
end;
$$;

set check_function_bodies = off;

create function public.aba_subscription_command_v2(p_organization_id uuid, p_command jsonb)
returns jsonb language sql volatile security definer set search_path = '' as $$
  select private.a5_subscription_command_v2_impl(p_organization_id, p_command);
$$;
create function public.aba_commercial_document_command_v2(p_organization_id uuid, p_command jsonb)
returns jsonb language sql volatile security definer set search_path = '' as $$
  select private.a5_commercial_document_command_v2_impl(p_organization_id, p_command);
$$;

create function public.aba_commercial_read_v2(p_organization_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_plans jsonb; v_subscription jsonb; v_documents jsonb;
begin
  if v_actor is null or not private.is_clinic_admin(p_organization_id) then
    raise exception using errcode = '42501', message = 'clinic_admin_required';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'planId', version.plan_id, 'planVersionId', version.id, 'name', version.name,
    'description', version.description,
    'price', jsonb_build_object('amountMinor', version.amount_minor, 'currency', version.currency,
      'minorUnitDigits', version.minor_unit_digits, 'period', version.period, 'demonstration', true),
    'includedSeats', version.included_seats, 'maximumSeats', version.maximum_seats,
    'features', version.features, 'active', version.active
  ) order by version.included_seats), '[]'::jsonb)
  into v_plans
  from public.commercial_plan_versions_v2 version
  join public.commercial_plans_v2 plan on plan.id = version.plan_id
  where version.active and version.demonstration and plan.active;
  select jsonb_build_object(
    'id', subscription.id, 'clinicId', subscription.organization_id,
    'version', subscription.version,
    'plan', jsonb_build_object(
      'planId', version.plan_id, 'planVersionId', version.id, 'name', version.name,
      'description', version.description,
      'price', jsonb_build_object('amountMinor', version.amount_minor, 'currency', version.currency,
        'minorUnitDigits', version.minor_unit_digits, 'period', version.period, 'demonstration', true),
      'includedSeats', version.included_seats, 'maximumSeats', version.maximum_seats,
      'features', version.features, 'active', version.active),
    'seats', subscription.seats, 'occupiedSeats', subscription.occupied_seats,
    'status', subscription.status, 'effectiveAt', subscription.effective_at,
    'cancelledAt', subscription.cancelled_at, 'commercialMode', 'internal-demonstration'
  ) into v_subscription
  from public.clinic_subscriptions_v2 subscription
  join public.commercial_plan_versions_v2 version on version.id = subscription.plan_version_id
  where subscription.organization_id = p_organization_id;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', document.id, 'clinicId', document.organization_id,
    'subscriptionId', document.subscription_id, 'version', document.version,
    'kind', document.kind, 'title', document.title, 'issuedAt', document.issued_at,
    'lines', document.lines, 'currency', document.currency,
    'minorUnitDigits', document.minor_unit_digits,
    'attachmentVersionId', document.attachment_version_id,
    'predecessorId', document.predecessor_id, 'archived', document.archived,
    'demonstration', true, 'taxDocument', false, 'paymentRequested', false,
    'attachmentAvailable', exists (select 1 from public.attachment_versions attachment
      where attachment.id = document.attachment_version_id and attachment.state = 'available'),
    'createdAt', document.created_at, 'updatedAt', document.updated_at
  ) order by document.issued_at desc), '[]'::jsonb)
  into v_documents
  from public.commercial_documents_v2 document
  where document.organization_id = p_organization_id;
  return jsonb_build_object(
    'clinicId', p_organization_id, 'actorId', v_actor, 'isClinicAdmin', true,
    'plans', v_plans, 'subscription', v_subscription, 'documents', v_documents,
    'commercialMode', 'internal-demonstration');
end;
$$;

revoke all on function public.aba_subscription_command_v2(uuid,jsonb),
  public.aba_commercial_document_command_v2(uuid,jsonb), public.aba_commercial_read_v2(uuid)
from public, anon, authenticated, service_role;
grant execute on function public.aba_subscription_command_v2(uuid,jsonb),
  public.aba_commercial_document_command_v2(uuid,jsonb), public.aba_commercial_read_v2(uuid)
to authenticated;

create function private.a5_subscription_command_v2_impl(p_organization_id uuid, p_command jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid(); v_id uuid; v_op uuid; v_key uuid; v_plan_id uuid;
  v_expected integer; v_action text; v_seats integer; v_occupied integer;
  v_replay jsonb; v_current public.clinic_subscriptions_v2;
  v_plan public.commercial_plan_versions_v2; v_test uuid; v_reason text;
begin
  if not private.a5_command_envelope_valid(p_command, 'subscriptionId') then
    raise exception using errcode = '22023', message = 'command_envelope_invalid';
  end if;
  v_id := (p_command ->> 'subscriptionId')::uuid;
  v_op := (p_command ->> 'operationId')::uuid;
  v_key := (p_command ->> 'idempotencyKey')::uuid;
  v_expected := (p_command ->> 'expectedVersion')::integer;
  v_action := p_command ->> 'action';
  if v_actor is null or p_command ->> 'clinicId' <> p_organization_id::text
    or not private.is_clinic_admin(p_organization_id) then
    return private.command_rejected_result(v_op, v_key, v_id, 'permission-denied',
      'Administración activa requerida.', '[]'::jsonb);
  end if;
  if p_command -> 'confirmation' <> 'true'::jsonb
    or p_command ->> 'commercialMode' <> 'internal-demonstration'
    or jsonb_typeof(p_command -> 'action') <> 'string'
    or v_action not in ('select-plan','change-plan','cancel')
    or (v_action = 'select-plan' and v_expected <> 0)
    or (v_action <> 'select-plan' and v_expected = 0)
    or (v_action in ('select-plan','change-plan') and (
      (select count(*) from jsonb_object_keys(p_command)) <> case when v_action = 'select-plan' then 11 else 12 end
      or jsonb_typeof(p_command -> 'planVersionId') <> 'string'
      or not private.is_uuid_text(p_command ->> 'planVersionId')
      or jsonb_typeof(p_command -> 'seats') <> 'number'
      or not ((p_command ->> 'seats') ~ '^[1-9][0-9]*$')
      or (p_command ->> 'seats')::numeric > 2147483647))
    or (v_action = 'cancel' and (select count(*) from jsonb_object_keys(p_command)) <> 10)
    or (v_action in ('change-plan','cancel') and (
      jsonb_typeof(p_command -> 'reason') <> 'string'
      or nullif(btrim(p_command ->> 'reason'), '') is null
      or char_length(btrim(p_command ->> 'reason')) > 10000))
    or exists (select 1 from jsonb_object_keys(p_command) key where key not in
      ('schemaVersion','operationId','idempotencyKey','subscriptionId','clinicId','expectedVersion',
       'confirmation','commercialMode','action','planVersionId','seats','reason')) then
    return private.command_rejected_result(v_op, v_key, v_id, 'validation-failed',
      'Comando comercial cerrado inválido.', '[]'::jsonb);
  end if;
  if v_action in ('select-plan','change-plan') then
    v_plan_id := (p_command ->> 'planVersionId')::uuid;
    v_seats := (p_command ->> 'seats')::integer;
  else v_reason := btrim(p_command ->> 'reason');
  end if;
  if v_action = 'change-plan' then v_reason := btrim(p_command ->> 'reason'); end if;
  v_replay := private.command_identity_or_replay_result(
    p_organization_id, v_op, v_key, v_id, 'subscription-v2', p_command);
  if v_replay is not null then
    if not private.is_clinic_admin(p_organization_id) then
      return private.command_rejected_result(v_op, v_key, v_id, 'permission-denied', 'Permiso revocado.', '[]'::jsonb);
    end if;
    return v_replay;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('a5-subscription:' || p_organization_id::text, 0));
  perform 1 from public.memberships where organization_id = p_organization_id for share;
  if not private.is_clinic_admin(p_organization_id) then
    return private.command_rejected_result(v_op, v_key, v_id, 'permission-denied', 'Permiso revocado.', '[]'::jsonb);
  end if;
  select count(*)::integer into v_occupied from public.memberships
    where organization_id = p_organization_id and status = 'active';
  select test_run_id into v_test from public.memberships
    where organization_id = p_organization_id and user_id = v_actor;
  select * into v_current from public.clinic_subscriptions_v2
    where organization_id = p_organization_id for update;
  if v_action = 'select-plan' then
    if found or exists (select 1 from public.clinic_subscriptions_v2 where id = v_id) then
      return private.command_rejected_result(v_op, v_key, v_id, 'invalid-transition',
        'La clínica ya tiene una suscripción interna.', '[]'::jsonb);
    end if;
    select version.* into v_plan from public.commercial_plan_versions_v2 version
      join public.commercial_plans_v2 plan on plan.id = version.plan_id
      where version.id = v_plan_id and version.active and version.demonstration and plan.active for share;
    if not found or v_seats < greatest(v_plan.included_seats, v_occupied)
      or (v_plan.maximum_seats is not null and v_seats > v_plan.maximum_seats) then
      return private.command_rejected_result(v_op, v_key, v_id, 'validation-failed',
        'Plan o plazas incompatibles con la ocupación activa.', '[]'::jsonb);
    end if;
    insert into public.clinic_subscriptions_v2(
      id, organization_id, plan_version_id, version, seats, occupied_seats,
      status, effective_at, created_by, test_run_id)
    values (v_id, p_organization_id, v_plan_id, 1, v_seats, v_occupied,
      'active', now(), v_actor, v_test) returning * into v_current;
    insert into public.clinic_subscription_events_v2(
      organization_id, subscription_id, actor_user_id, action, prior_version,
      next_version, reason, payload, test_run_id)
    values (p_organization_id, v_id, v_actor, 'selected', null, 1, null, p_command, v_test);
  else
    if not found or v_current.id <> v_id then
      return private.command_rejected_result(v_op, v_key, v_id, 'resource-unavailable',
        'Suscripción interna no disponible.', '[]'::jsonb);
    end if;
    if v_current.version <> v_expected then
      return private.command_version_conflict_result(v_op, v_key, v_id, v_expected, v_current.version,
        'La suscripción cambió desde la última lectura.');
    end if;
    if v_current.status = 'cancelled' then
      return private.command_rejected_result(v_op, v_key, v_id, 'invalid-transition',
        'La suscripción cancelada es terminal.', '[]'::jsonb);
    end if;
    if v_action = 'change-plan' then
      select version.* into v_plan from public.commercial_plan_versions_v2 version
        join public.commercial_plans_v2 plan on plan.id = version.plan_id
        where version.id = v_plan_id and version.active and version.demonstration and plan.active for share;
      if not found or v_seats < greatest(v_plan.included_seats, v_occupied)
        or (v_plan.maximum_seats is not null and v_seats > v_plan.maximum_seats) then
        return private.command_rejected_result(v_op, v_key, v_id, 'validation-failed',
          'Plan o plazas incompatibles con la ocupación activa.', '[]'::jsonb);
      end if;
      update public.clinic_subscriptions_v2
        set plan_version_id = v_plan_id, seats = v_seats, occupied_seats = v_occupied,
          version = version + 1, updated_at = now()
        where id = v_id returning * into v_current;
      insert into public.clinic_subscription_events_v2(
        organization_id, subscription_id, actor_user_id, action, prior_version,
        next_version, reason, payload, test_run_id)
      values (p_organization_id, v_id, v_actor, 'plan-changed', v_expected,
        v_current.version, v_reason, p_command, v_current.test_run_id);
    else
      update public.clinic_subscriptions_v2
        set status = 'cancelled', cancelled_at = now(), occupied_seats = v_occupied,
          version = version + 1, updated_at = now()
        where id = v_id returning * into v_current;
      insert into public.clinic_subscription_events_v2(
        organization_id, subscription_id, actor_user_id, action, prior_version,
        next_version, reason, payload, test_run_id)
      values (p_organization_id, v_id, v_actor, 'cancelled', v_expected,
        v_current.version, v_reason, p_command, v_current.test_run_id);
    end if;
  end if;
  return private.issue_command_receipt(
    p_organization_id, v_op, v_key, v_id, 'subscription-v2', p_command,
    v_current.version, v_current.test_run_id);
end;
$$;

revoke all on function private.a5_command_envelope_valid(jsonb,text,text),
  private.a5_document_v2_valid(jsonb), private.a5_subscription_command_v2_impl(uuid,jsonb),
  private.a5_commercial_document_command_v2_impl(uuid,jsonb)
from public, anon, authenticated, service_role;

set check_function_bodies = on;

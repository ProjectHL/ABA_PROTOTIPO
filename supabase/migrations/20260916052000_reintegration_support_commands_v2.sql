create function private.a5_support_ticket_command_v2_impl(p_organization_id uuid, p_command jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid(); v_id uuid; v_op uuid; v_key uuid; v_expected integer;
  v_action text; v_message_id uuid; v_replay jsonb; v_ticket public.support_tickets_v2;
  v_test uuid; v_sequence integer; v_next text; v_prior text; v_is_admin boolean;
begin
  if not private.a5_command_envelope_valid(p_command, 'ticketId') then
    raise exception using errcode = '22023', message = 'command_envelope_invalid';
  end if;
  v_id := (p_command ->> 'ticketId')::uuid; v_op := (p_command ->> 'operationId')::uuid;
  v_key := (p_command ->> 'idempotencyKey')::uuid;
  v_expected := (p_command ->> 'expectedVersion')::integer; v_action := p_command ->> 'action';
  if v_actor is null or p_command ->> 'clinicId' <> p_organization_id::text
    or not exists (select 1 from public.memberships membership
      where membership.organization_id = p_organization_id
        and membership.user_id = v_actor and membership.status = 'active') then
    return private.command_rejected_result(v_op, v_key, v_id, 'permission-denied',
      'Membresía activa requerida.', '[]'::jsonb);
  end if;
  if jsonb_typeof(p_command -> 'action') <> 'string'
    or v_action not in ('create','reply','change-status')
    or (v_action = 'create' and (
      v_expected <> 0 or (select count(*) from jsonb_object_keys(p_command)) <> 11
      or jsonb_typeof(p_command -> 'title') <> 'string'
      or nullif(btrim(p_command ->> 'title'), '') is null or char_length(btrim(p_command ->> 'title')) > 300
      or jsonb_typeof(p_command -> 'category') <> 'string'
      or p_command ->> 'category' not in ('technical','account','commercial','other')
      or jsonb_typeof(p_command -> 'messageId') <> 'string' or not private.is_uuid_text(p_command ->> 'messageId')
      or jsonb_typeof(p_command -> 'body') <> 'string'
      or nullif(btrim(p_command ->> 'body'), '') is null or char_length(btrim(p_command ->> 'body')) > 10000))
    or (v_action = 'reply' and (
      v_expected = 0 or (select count(*) from jsonb_object_keys(p_command)) <> 9
      or jsonb_typeof(p_command -> 'messageId') <> 'string' or not private.is_uuid_text(p_command ->> 'messageId')
      or jsonb_typeof(p_command -> 'body') <> 'string'
      or nullif(btrim(p_command ->> 'body'), '') is null or char_length(btrim(p_command ->> 'body')) > 10000))
    or (v_action = 'change-status' and (
      v_expected = 0 or (select count(*) from jsonb_object_keys(p_command)) <> 9
      or jsonb_typeof(p_command -> 'status') <> 'string'
      or p_command ->> 'status' not in ('open','in-progress','waiting-requester','resolved','closed')
      or jsonb_typeof(p_command -> 'reason') <> 'string'
      or nullif(btrim(p_command ->> 'reason'), '') is null or char_length(btrim(p_command ->> 'reason')) > 10000))
    or exists (select 1 from jsonb_object_keys(p_command) key where key not in
      ('schemaVersion','operationId','idempotencyKey','ticketId','clinicId','expectedVersion',
       'action','title','category','messageId','body','status','reason')) then
    return private.command_rejected_result(v_op, v_key, v_id, 'validation-failed',
      'Comando de ticket cerrado inválido.', '[]'::jsonb);
  end if;
  if v_action in ('create','reply') then v_message_id := (p_command ->> 'messageId')::uuid; end if;
  v_replay := private.command_identity_or_replay_result(
    p_organization_id, v_op, v_key, v_id, 'support-ticket-v2', p_command);
  if v_replay is not null then
    if not exists (select 1 from public.memberships membership
      where membership.organization_id = p_organization_id
        and membership.user_id = v_actor and membership.status = 'active') then
      return private.command_rejected_result(v_op, v_key, v_id, 'permission-denied', 'Permiso revocado.', '[]'::jsonb);
    end if;
    return v_replay;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_id::text, 0));
  select * into v_ticket from public.support_tickets_v2 where id = v_id for update;
  v_is_admin := private.is_clinic_admin(p_organization_id);
  if not exists (select 1 from public.memberships membership
    where membership.organization_id = p_organization_id
      and membership.user_id = v_actor and membership.status = 'active') then
    return private.command_rejected_result(v_op, v_key, v_id, 'permission-denied', 'Permiso revocado.', '[]'::jsonb);
  end if;
  if v_action = 'create' then
    if found then
      return private.command_version_conflict_result(v_op, v_key, v_id, 0, v_ticket.version,
        'El ticket ya existe.');
    end if;
    if exists (select 1 from public.support_ticket_messages_v2 where id = v_message_id) then
      return private.command_rejected_result(v_op, v_key, v_id, 'resource-unavailable',
        'El identificador de mensaje ya está en uso.', '[]'::jsonb);
    end if;
    select test_run_id into v_test from public.memberships
      where organization_id = p_organization_id and user_id = v_actor;
    insert into public.support_tickets_v2(
      id, organization_id, requester_user_id, version, title, category, status, test_run_id)
    values (v_id, p_organization_id, v_actor, 1, btrim(p_command ->> 'title'),
      p_command ->> 'category', 'open', v_test) returning * into v_ticket;
    insert into public.support_ticket_messages_v2(
      id, ticket_id, organization_id, author_user_id, sequence, body, test_run_id)
    values (v_message_id, v_id, p_organization_id, v_actor, 1,
      btrim(p_command ->> 'body'), v_test);
    insert into public.support_ticket_events_v2(
      ticket_id, organization_id, actor_user_id, action, payload, test_run_id)
    values (v_id, p_organization_id, v_actor, 'created', p_command, v_test);
  else
    if not found or v_ticket.organization_id <> p_organization_id then
      return private.command_rejected_result(v_op, v_key, v_id, 'resource-unavailable',
        'Ticket no disponible.', '[]'::jsonb);
    end if;
    if v_ticket.requester_user_id <> v_actor and not v_is_admin then
      return private.command_rejected_result(v_op, v_key, v_id, 'permission-denied',
        'El ticket sólo admite a su solicitante o administración activa.', '[]'::jsonb);
    end if;
    if v_ticket.version <> v_expected then
      return private.command_version_conflict_result(v_op, v_key, v_id, v_expected, v_ticket.version,
        'El ticket cambió desde la última lectura.');
    end if;
    if v_action = 'reply' then
      if v_ticket.status = 'closed' then
        return private.command_rejected_result(v_op, v_key, v_id, 'invalid-transition',
          'Reabre el ticket antes de responder.', '[]'::jsonb);
      end if;
      if exists (select 1 from public.support_ticket_messages_v2 where id = v_message_id) then
        return private.command_rejected_result(v_op, v_key, v_id, 'resource-unavailable',
          'El identificador de mensaje ya está en uso.', '[]'::jsonb);
      end if;
      select coalesce(max(sequence), 0) + 1 into v_sequence
        from public.support_ticket_messages_v2 where ticket_id = v_id;
      insert into public.support_ticket_messages_v2(
        id, ticket_id, organization_id, author_user_id, sequence, body, test_run_id)
      values (v_message_id, v_id, p_organization_id, v_actor, v_sequence,
        btrim(p_command ->> 'body'), v_ticket.test_run_id);
      update public.support_tickets_v2
        set version = version + 1, updated_at = now() where id = v_id returning * into v_ticket;
      insert into public.support_ticket_events_v2(
        ticket_id, organization_id, actor_user_id, action, payload, test_run_id)
      values (v_id, p_organization_id, v_actor, 'replied', p_command, v_ticket.test_run_id);
    else
      if not v_is_admin then
        return private.command_rejected_result(v_op, v_key, v_id, 'permission-denied',
          'Sólo administración puede cambiar el estado.', '[]'::jsonb);
      end if;
      v_prior := v_ticket.status; v_next := p_command ->> 'status';
      if not (
        (v_prior = 'open' and v_next in ('in-progress','waiting-requester','resolved','closed'))
        or (v_prior = 'in-progress' and v_next in ('waiting-requester','resolved','closed'))
        or (v_prior = 'waiting-requester' and v_next in ('in-progress','resolved','closed'))
        or (v_prior = 'resolved' and v_next in ('open','closed'))
        or (v_prior = 'closed' and v_next = 'open')) then
        return private.command_rejected_result(v_op, v_key, v_id, 'invalid-transition',
          'Transición de ticket no permitida.', '[]'::jsonb);
      end if;
      update public.support_tickets_v2
        set status = v_next, version = version + 1, updated_at = now()
        where id = v_id returning * into v_ticket;
      insert into public.support_ticket_events_v2(
        ticket_id, organization_id, actor_user_id, action, from_status, to_status,
        reason, payload, test_run_id)
      values (v_id, p_organization_id, v_actor, 'status-changed', v_prior, v_next,
        btrim(p_command ->> 'reason'), p_command, v_ticket.test_run_id);
    end if;
  end if;
  return private.issue_command_receipt(
    p_organization_id, v_op, v_key, v_id, 'support-ticket-v2', p_command,
    v_ticket.version, v_ticket.test_run_id);
end;
$$;

create function public.aba_support_ticket_command_v2(p_organization_id uuid, p_command jsonb)
returns jsonb language sql volatile security definer set search_path = '' as $$
  select private.a5_support_ticket_command_v2_impl(p_organization_id, p_command);
$$;

create function public.aba_support_ticket_read_v2(p_organization_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_admin boolean; v_tickets jsonb;
begin
  if v_actor is null or not exists (select 1 from public.memberships membership
    where membership.organization_id = p_organization_id
      and membership.user_id = v_actor and membership.status = 'active') then
    raise exception using errcode = '42501', message = 'active_membership_required';
  end if;
  v_admin := private.is_clinic_admin(p_organization_id);
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', ticket.id, 'clinicId', ticket.organization_id,
    'requesterUserId', ticket.requester_user_id, 'version', ticket.version,
    'title', ticket.title, 'category', ticket.category, 'status', ticket.status,
    'createdAt', ticket.created_at, 'updatedAt', ticket.updated_at,
    'messages', (select coalesce(jsonb_agg(jsonb_build_object(
      'id', message.id, 'ticketId', message.ticket_id,
      'authorUserId', message.author_user_id, 'body', message.body,
      'createdAt', message.created_at, 'sequence', message.sequence
    ) order by message.sequence), '[]'::jsonb)
      from public.support_ticket_messages_v2 message where message.ticket_id = ticket.id),
    'supportMode', 'local-tickets'
  ) order by ticket.updated_at desc), '[]'::jsonb)
  into v_tickets
  from public.support_tickets_v2 ticket
  where ticket.organization_id = p_organization_id
    and (v_admin or ticket.requester_user_id = v_actor);
  return jsonb_build_object(
    'clinicId', p_organization_id, 'actorId', v_actor,
    'canManageTickets', v_admin, 'tickets', v_tickets, 'supportMode', 'local-tickets');
end;
$$;

create function public.aba_commercial_inquiry_v2(p_inquiry jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_id uuid; v_op uuid; v_key uuid; v_hash text; v_source text; v_headers jsonb := '{}'::jsonb;
  v_existing private.commercial_inquiries_v2; v_now timestamptz := now();
begin
  if jsonb_typeof(p_inquiry) <> 'object'
    or (select count(*) from jsonb_object_keys(p_inquiry)) <> 9
    or exists (select 1 from jsonb_object_keys(p_inquiry) key where key not in
      ('schemaVersion','id','operationId','idempotencyKey','name','email','organization','message','contactPermission'))
    or jsonb_typeof(p_inquiry -> 'schemaVersion') <> 'number' or p_inquiry ->> 'schemaVersion' <> '2'
    or jsonb_typeof(p_inquiry -> 'id') <> 'string' or not private.is_uuid_text(p_inquiry ->> 'id')
    or jsonb_typeof(p_inquiry -> 'operationId') <> 'string' or not private.is_uuid_text(p_inquiry ->> 'operationId')
    or jsonb_typeof(p_inquiry -> 'idempotencyKey') <> 'string' or not private.is_uuid_text(p_inquiry ->> 'idempotencyKey')
    or jsonb_typeof(p_inquiry -> 'name') <> 'string'
    or nullif(btrim(p_inquiry ->> 'name'), '') is null or char_length(btrim(p_inquiry ->> 'name')) > 200
    or jsonb_typeof(p_inquiry -> 'email') <> 'string'
    or char_length(btrim(p_inquiry ->> 'email')) > 254
    or not (lower(btrim(p_inquiry ->> 'email')) ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
    or jsonb_typeof(p_inquiry -> 'organization') <> 'string'
    or char_length(btrim(p_inquiry ->> 'organization')) > 300
    or jsonb_typeof(p_inquiry -> 'message') <> 'string'
    or nullif(btrim(p_inquiry ->> 'message'), '') is null or char_length(btrim(p_inquiry ->> 'message')) > 10000
    or p_inquiry -> 'contactPermission' <> 'true'::jsonb then
    raise exception using errcode = '22023', message = 'commercial_inquiry_invalid';
  end if;
  v_id := (p_inquiry ->> 'id')::uuid; v_op := (p_inquiry ->> 'operationId')::uuid;
  v_key := (p_inquiry ->> 'idempotencyKey')::uuid;
  v_hash := encode(sha256(convert_to(p_inquiry::text, 'UTF8')), 'hex');
  begin v_headers := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  exception when invalid_text_representation then v_headers := '{}'::jsonb; end;
  v_source := encode(sha256(convert_to(
    coalesce(v_headers ->> 'x-forwarded-for', v_headers ->> 'x-real-ip', 'local') || '|' ||
    coalesce(v_headers ->> 'user-agent', 'unknown'), 'UTF8')), 'hex');
  perform pg_advisory_xact_lock(hashtextextended('a5-inquiry:' || v_source, 0));
  for v_existing in select inquiry.* from private.commercial_inquiries_v2 inquiry
    where inquiry.operation_id = v_op or inquiry.idempotency_key = v_key or inquiry.id = v_id loop
    if v_existing.operation_id <> v_op then
      return jsonb_build_object('status','conflict','operationId',v_op,'idempotencyKey',v_key,
        'resourceId',v_id,'code','idempotency-key-reused','message','La clave idempotente ya identifica otra solicitud.');
    end if;
    if v_existing.idempotency_key <> v_key then
      return jsonb_build_object('status','conflict','operationId',v_op,'idempotencyKey',v_key,
        'resourceId',v_id,'code','operation-id-reused','message','La operación ya usa otra clave.');
    end if;
    if v_existing.id <> v_id or v_existing.payload_sha256 <> v_hash then
      return jsonb_build_object('status','conflict','operationId',v_op,'idempotencyKey',v_key,
        'resourceId',v_id,'code','idempotency-payload-conflict','message','La identidad no coincide con el payload original.');
    end if;
    return jsonb_build_object('status','acknowledged','operationId',v_op,'idempotencyKey',v_key,
      'resourceId',v_id,'receiptId',v_existing.receipt_id,'serverVersion',1,
      'committedAt',v_existing.created_at,'replayed',true);
  end loop;
  if (select count(*) from private.commercial_inquiries_v2 inquiry
    where inquiry.source_fingerprint = v_source and inquiry.created_at >= v_now - interval '15 minutes') >= 5 then
    raise exception using errcode = '42901', message = 'commercial_inquiry_rate_limited';
  end if;
  insert into private.commercial_inquiries_v2(
    id, operation_id, idempotency_key, payload_sha256, name, email,
    organization, message, contact_permission, source_fingerprint, created_at)
  values (v_id, v_op, v_key, v_hash, btrim(p_inquiry ->> 'name'),
    lower(btrim(p_inquiry ->> 'email')), btrim(p_inquiry ->> 'organization'),
    btrim(p_inquiry ->> 'message'), true, v_source, v_now)
  returning * into v_existing;
  return jsonb_build_object('status','acknowledged','operationId',v_op,'idempotencyKey',v_key,
    'resourceId',v_id,'receiptId',v_existing.receipt_id,'serverVersion',1,
    'committedAt',v_existing.created_at,'replayed',false);
end;
$$;

revoke all on function private.a5_support_ticket_command_v2_impl(uuid,jsonb)
from public, anon, authenticated, service_role;
revoke all on function public.aba_support_ticket_command_v2(uuid,jsonb),
  public.aba_support_ticket_read_v2(uuid), public.aba_commercial_inquiry_v2(jsonb)
from public, anon, authenticated, service_role;
grant execute on function public.aba_support_ticket_command_v2(uuid,jsonb),
  public.aba_support_ticket_read_v2(uuid) to authenticated;
grant execute on function public.aba_commercial_inquiry_v2(jsonb) to anon, authenticated;

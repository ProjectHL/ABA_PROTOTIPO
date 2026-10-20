-- R3/A4 family access and immutable publication boundary. Family identities never
-- become clinic members and never inherit the general student capability engine.

create function private.a4_family_access_command_valid(p_command jsonb)
returns boolean language sql immutable security invoker set search_path = '' as $$
  select coalesce(
    jsonb_typeof(p_command)='object'
    and jsonb_typeof(p_command->'operationId')='string'
    and private.is_uuid_text(p_command->>'operationId')
    and jsonb_typeof(p_command->'idempotencyKey')='string'
    and private.is_uuid_text(p_command->>'idempotencyKey')
    and jsonb_typeof(p_command->'linkId')='string'
    and private.is_uuid_text(p_command->>'linkId')
    and jsonb_typeof(p_command->'studentId')='string'
    and private.is_uuid_text(p_command->>'studentId')
    and jsonb_typeof(p_command->'familyPersonId')='string'
    and private.is_uuid_text(p_command->>'familyPersonId')
    and jsonb_typeof(p_command->'expectedVersion')='number'
    and (p_command->>'expectedVersion')::numeric between 0 and 9007199254740991
    and (p_command->>'expectedVersion')::numeric=trunc((p_command->>'expectedVersion')::numeric)
    and jsonb_typeof(p_command->'action')='string'
    and p_command->>'action' in ('invite','accept','reject','cancel','revoke')
    and case p_command->>'action'
      when 'invite' then private.jsonb_has_exact_keys(p_command,array[
        'operationId','idempotencyKey','linkId','studentId','familyPersonId',
        'expectedVersion','action','recipientEmail','message'])
        and (p_command->>'expectedVersion')::numeric=0
        and jsonb_typeof(p_command->'recipientEmail')='string'
        and char_length(p_command->>'recipientEmail') between 3 and 254
        and p_command->>'recipientEmail'=lower(btrim(p_command->>'recipientEmail'))
        and p_command->>'recipientEmail' ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
        and jsonb_typeof(p_command->'message')='string'
        and char_length(p_command->>'message')<=5000
      when 'revoke' then private.jsonb_has_exact_keys(p_command,array[
        'operationId','idempotencyKey','linkId','studentId','familyPersonId',
        'expectedVersion','action','confirmation','reason'])
        and (p_command->>'expectedVersion')::numeric>0
        and p_command->'confirmation'='true'::jsonb
        and jsonb_typeof(p_command->'reason')='string'
        and char_length(btrim(p_command->>'reason')) between 1 and 2000
      else private.jsonb_has_exact_keys(p_command,array[
        'operationId','idempotencyKey','linkId','studentId','familyPersonId',
        'expectedVersion','action'])
        and (p_command->>'expectedVersion')::numeric>0
      end,
    false
  );
$$;

create function private.a4_family_access_command_impl(p_organization_id uuid,p_command jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_actor uuid:=auth.uid(); v_actor_email text; v_operation uuid; v_key uuid;
  v_link_id uuid; v_client_id uuid; v_person_id uuid; v_expected bigint;
  v_action text; v_replay jsonb; v_link public.family_access_links_v2;
  v_test uuid; v_can_manage boolean;
begin
  if not private.a4_family_access_command_valid(p_command) then
    raise exception using errcode='22023',message='family_access_command_invalid';
  end if;
  v_operation:=(p_command->>'operationId')::uuid;
  v_key:=(p_command->>'idempotencyKey')::uuid;
  v_link_id:=(p_command->>'linkId')::uuid;
  v_client_id:=(p_command->>'studentId')::uuid;
  v_person_id:=(p_command->>'familyPersonId')::uuid;
  v_expected:=(p_command->>'expectedVersion')::bigint;
  v_action:=p_command->>'action';
  if v_actor is null then
    return private.command_rejected_result(v_operation,v_key,v_link_id,
      'permission-denied','Se requiere una sesión autenticada.');
  end if;
  select lower(email) into v_actor_email from auth.users where id=v_actor;
  v_can_manage:=private.has_internal_student_capability(v_client_id,'authorization.decide');
  if (v_action in ('invite','cancel','revoke') and not v_can_manage)
    or (v_action in ('accept','reject') and v_actor_email is null) then
    return private.command_rejected_result(v_operation,v_key,v_link_id,
      'permission-denied','No tienes autorización vigente para este acceso familiar.');
  end if;
  v_replay:=private.command_identity_or_replay_result(
    p_organization_id,v_operation,v_key,v_link_id,'family-access-v2',p_command);
  if v_replay is not null then
    if v_action in ('invite','cancel','revoke') and
      not private.has_internal_student_capability(v_client_id,'authorization.decide') then
      return private.command_rejected_result(v_operation,v_key,v_link_id,
        'permission-denied','El permiso para gestionar el acceso fue revocado.');
    elsif v_action in ('accept','reject') and not exists(
      select 1 from public.family_access_links_v2 link
      where link.id=v_link_id and link.organization_id=p_organization_id
        and link.client_id=v_client_id and link.family_person_id=v_person_id
        and (link.recipient_user_id=v_actor or link.recipient_email=v_actor_email)
    ) then
      return private.command_rejected_result(v_operation,v_key,v_link_id,
        'permission-denied','El acceso familiar ya no corresponde a tu identidad.');
    end if;
    return v_replay;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_link_id::text,0));
  select * into v_link from public.family_access_links_v2 where id=v_link_id for update;
  if v_action='invite' then
    if found then
      return private.command_version_conflict_result(v_operation,v_key,v_link_id,0,
        v_link.version,'El acceso familiar ya existe.');
    end if;
    if not exists(
      select 1 from public.clients client
      join public.client_people_v2 person on person.organization_id=client.organization_id
        and person.client_id=client.id and person.id=v_person_id
      where client.organization_id=p_organization_id and client.id=v_client_id
        and client.status='active' and person.archived_at is null
        and 'family'=any(person.roles) and person.email=p_command->>'recipientEmail'
    ) then
      return private.command_rejected_result(v_operation,v_key,v_link_id,
        'validation-failed','La persona familiar activa y su correo no coinciden con la ficha.');
    end if;
    if not private.has_internal_student_capability(v_client_id,'authorization.decide') then
      return private.command_rejected_result(v_operation,v_key,v_link_id,
        'permission-denied','El permiso para gestionar el acceso fue revocado.');
    end if;
    if exists(select 1 from public.family_access_links_v2 link
      where link.client_id=v_client_id and (link.family_person_id=v_person_id
        or link.recipient_email=p_command->>'recipientEmail')
        and link.status in ('pending','active')) then
      return private.command_rejected_result(v_operation,v_key,v_link_id,
        'invalid-transition','Ya existe una invitación pendiente o un acceso familiar activo.');
    end if;
    select client.test_run_id into v_test from public.clients client
      where client.organization_id=p_organization_id and client.id=v_client_id;
    perform private.require_open_test_batch(p_organization_id,v_test);
    insert into public.family_access_links_v2(
      id,organization_id,client_id,family_person_id,recipient_email,recipient_user_id,
      invited_by,status,version,message,test_run_id)
    values(v_link_id,p_organization_id,v_client_id,v_person_id,p_command->>'recipientEmail',
      (select id from auth.users where lower(email)=p_command->>'recipientEmail' limit 1),
      v_actor,'pending',1,p_command->>'message',v_test)
    returning * into v_link;
  else
    if not found or v_link.organization_id<>p_organization_id
      or v_link.client_id<>v_client_id or v_link.family_person_id<>v_person_id then
      return private.command_rejected_result(v_operation,v_key,v_link_id,
        'resource-unavailable','El acceso familiar no está disponible.');
    end if;
    perform private.require_open_test_batch(p_organization_id,v_link.test_run_id);
    if v_link.version<>v_expected then
      return private.command_version_conflict_result(v_operation,v_key,v_link_id,
        v_expected,v_link.version,'El acceso familiar cambió desde la última lectura.');
    end if;
    if v_action in ('accept','reject') then
      if v_link.status<>'pending' or not (v_link.recipient_user_id=v_actor or
        (v_link.recipient_user_id is null and v_link.recipient_email=v_actor_email)) then
        return private.command_rejected_result(v_operation,v_key,v_link_id,
          'permission-denied','La invitación familiar pendiente no corresponde a tu identidad.');
      end if;
      update public.family_access_links_v2 set
        recipient_user_id=coalesce(recipient_user_id,v_actor),
        status=case when v_action='accept' then 'active' else 'rejected' end,
        accepted_at=case when v_action='accept' then now() else null end,
        version=version+1,updated_at=now()
      where id=v_link_id returning * into v_link;
    else
      if not private.has_internal_student_capability(v_client_id,'authorization.decide') then
        return private.command_rejected_result(v_operation,v_key,v_link_id,
          'permission-denied','El permiso para gestionar el acceso fue revocado.');
      end if;
      if v_action='cancel' and v_link.status<>'pending' then
        return private.command_rejected_result(v_operation,v_key,v_link_id,
          'invalid-transition','La invitación familiar ya no está pendiente.');
      elsif v_action='revoke' and v_link.status<>'active' then
        return private.command_rejected_result(v_operation,v_key,v_link_id,
          'invalid-transition','No existe un acceso familiar activo para revocar.');
      end if;
      update public.family_access_links_v2 set
        status=case when v_action='cancel' then 'cancelled' else 'revoked' end,
        revoked_at=case when v_action='revoke' then now() else null end,
        version=version+1,updated_at=now()
      where id=v_link_id returning * into v_link;
    end if;
  end if;
  return private.issue_command_receipt(p_organization_id,v_operation,v_key,v_link_id,
    'family-access-v2',p_command,v_link.version,v_link.test_run_id);
end;
$$;

create function private.a4_family_publication_command_valid(p_command jsonb)
returns boolean language plpgsql immutable security invoker set search_path = '' as $$
declare v_key text; v_value jsonb;
begin
  if not coalesce(jsonb_typeof(p_command)='object'
    and private.jsonb_has_exact_keys(p_command,array['operationId','idempotencyKey',
      'publicationId','studentId','expectedVersion','predecessorId','programVersionIds',
      'recordRevisionIds','attachmentVersionIds','familyPersonIds','introduction'])
    and jsonb_typeof(p_command->'operationId')='string' and private.is_uuid_text(p_command->>'operationId')
    and jsonb_typeof(p_command->'idempotencyKey')='string' and private.is_uuid_text(p_command->>'idempotencyKey')
    and jsonb_typeof(p_command->'publicationId')='string' and private.is_uuid_text(p_command->>'publicationId')
    and jsonb_typeof(p_command->'studentId')='string' and private.is_uuid_text(p_command->>'studentId')
    and jsonb_typeof(p_command->'expectedVersion')='number'
    and (p_command->>'expectedVersion')::numeric between 0 and 9007199254740991
    and (p_command->>'expectedVersion')::numeric=trunc((p_command->>'expectedVersion')::numeric)
    and (p_command->'predecessorId'='null'::jsonb or
      (jsonb_typeof(p_command->'predecessorId')='string' and private.is_uuid_text(p_command->>'predecessorId')))
    and jsonb_typeof(p_command->'introduction')='string'
    and char_length(p_command->>'introduction')<=10000,false) then return false; end if;
  if ((p_command->>'expectedVersion')::numeric=0) <> (p_command->'predecessorId'='null'::jsonb) then return false; end if;
  foreach v_key in array array['programVersionIds','recordRevisionIds','attachmentVersionIds','familyPersonIds'] loop
    v_value:=p_command->v_key;
    if jsonb_typeof(v_value)<>'array' or jsonb_array_length(v_value)>1000
      or exists(select 1 from jsonb_array_elements(v_value) item
        where jsonb_typeof(item)<>'string' or not private.is_uuid_text(item#>>'{}'))
      or (select count(*) from jsonb_array_elements_text(v_value))<>
        (select count(distinct item) from jsonb_array_elements_text(v_value) item) then return false; end if;
  end loop;
  return true;
end;
$$;

create function private.a4_family_publication_command_impl(p_organization_id uuid,p_command jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_actor uuid:=auth.uid(); v_operation uuid; v_key uuid; v_publication_id uuid;
  v_client_id uuid; v_predecessor_id uuid; v_expected bigint; v_replay jsonb;
  v_predecessor public.family_publications_v2; v_publication public.family_publications_v2;
  v_test uuid;
begin
  if not private.a4_family_publication_command_valid(p_command) then
    raise exception using errcode='22023',message='family_publication_command_invalid';
  end if;
  v_operation:=(p_command->>'operationId')::uuid;
  v_key:=(p_command->>'idempotencyKey')::uuid;
  v_publication_id:=(p_command->>'publicationId')::uuid;
  v_client_id:=(p_command->>'studentId')::uuid;
  v_predecessor_id:=(p_command->>'predecessorId')::uuid;
  v_expected:=(p_command->>'expectedVersion')::bigint;
  if v_actor is null or not private.has_internal_student_capability(v_client_id,'authorization.decide') then
    return private.command_rejected_result(v_operation,v_key,v_publication_id,
      'permission-denied','No tienes autorización para publicar a la familia.');
  end if;
  v_replay:=private.command_identity_or_replay_result(p_organization_id,v_operation,v_key,
    v_publication_id,'family-publication-v2',p_command);
  if v_replay is not null then
    if not private.has_internal_student_capability(v_client_id,'authorization.decide') then
      return private.command_rejected_result(v_operation,v_key,v_publication_id,
        'permission-denied','El permiso para publicar a la familia fue revocado.');
    end if;
    return v_replay;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('family-publication:'||v_client_id::text,0));
  if exists(select 1 from public.family_publications_v2 where id=v_publication_id) then
    select * into v_publication from public.family_publications_v2 where id=v_publication_id;
    return private.command_version_conflict_result(v_operation,v_key,v_publication_id,0,
      v_publication.version,'El identificador de publicación ya existe.');
  end if;
  select client.test_run_id into v_test from public.clients client
    where client.organization_id=p_organization_id and client.id=v_client_id and client.status='active';
  if not found then
    return private.command_rejected_result(v_operation,v_key,v_publication_id,
      'resource-unavailable','La ficha no está disponible.');
  end if;
  perform private.require_open_test_batch(p_organization_id,v_test);
  if not private.has_internal_student_capability(v_client_id,'authorization.decide') then
    return private.command_rejected_result(v_operation,v_key,v_publication_id,
      'permission-denied','El permiso para publicar a la familia fue revocado.');
  end if;
  if v_predecessor_id is null then
    if exists(select 1 from public.family_publications_v2 publication
      where publication.client_id=v_client_id and publication.superseded_at is null) then
      return private.command_rejected_result(v_operation,v_key,v_publication_id,
        'invalid-transition','La ficha ya tiene una publicación familiar vigente.');
    end if;
  else
    select * into v_predecessor from public.family_publications_v2
      where id=v_predecessor_id for update;
    if not found or v_predecessor.organization_id<>p_organization_id
      or v_predecessor.client_id<>v_client_id then
      return private.command_rejected_result(v_operation,v_key,v_publication_id,
        'resource-unavailable','La publicación predecesora no está disponible.');
    end if;
    if v_predecessor.version<>v_expected then
      return private.command_version_conflict_result(v_operation,v_key,v_publication_id,
        v_expected,v_predecessor.version,'La publicación familiar cambió desde la última lectura.');
    end if;
    if v_predecessor.superseded_at is not null then
      return private.command_rejected_result(v_operation,v_key,v_publication_id,
        'invalid-transition','La publicación predecesora ya fue sustituida.');
    end if;
  end if;
  if (select count(*) from jsonb_array_elements_text(p_command->'programVersionIds')) <>
    (select count(*) from jsonb_array_elements_text(p_command->'programVersionIds') item
      join public.program_versions version on version.id=item::uuid
      where version.organization_id=p_organization_id and version.client_id=v_client_id
        and version.version_state in ('released','superseded')) then
    return private.command_rejected_result(v_operation,v_key,v_publication_id,
      'validation-failed','Uno o más programas no son versiones publicables de esta ficha.');
  end if;
  if (select count(*) from jsonb_array_elements_text(p_command->'recordRevisionIds')) <>
    (select count(*) from jsonb_array_elements_text(p_command->'recordRevisionIds') item
      join public.session_program_record_revisions_v2 revision on revision.id=item::uuid
      join public.session_program_records_v2 record on record.organization_id=revision.organization_id
        and record.client_id=revision.client_id and record.id=revision.record_id
      where revision.organization_id=p_organization_id and revision.client_id=v_client_id
        and record.state='submitted') then
    return private.command_rejected_result(v_operation,v_key,v_publication_id,
      'validation-failed','Uno o más resultados no son revisiones publicables de esta ficha.');
  end if;
  if (select count(*) from jsonb_array_elements_text(p_command->'attachmentVersionIds')) <>
    (select count(*) from jsonb_array_elements_text(p_command->'attachmentVersionIds') item
      join public.attachment_versions version on version.id=item::uuid and version.state='available'
      join public.attachment_records record on record.id=version.attachment_id
      where record.organization_id=p_organization_id and record.client_id=v_client_id
        and record.resource_kind='student' and record.purpose='student-document'
        and record.state='available') then
    return private.command_rejected_result(v_operation,v_key,v_publication_id,
      'validation-failed','Uno o más documentos no son versiones disponibles de esta ficha.');
  end if;
  if (select count(*) from jsonb_array_elements_text(p_command->'familyPersonIds')) <>
    (select count(*) from jsonb_array_elements_text(p_command->'familyPersonIds') item
      join public.client_people_v2 person on person.id=item::uuid
      where person.organization_id=p_organization_id and person.client_id=v_client_id
        and person.archived_at is null and 'family'=any(person.roles)
        and exists(select 1 from public.family_access_links_v2 link
          where link.organization_id=p_organization_id and link.client_id=v_client_id
            and link.family_person_id=person.id and link.status='active')) then
    return private.command_rejected_result(v_operation,v_key,v_publication_id,
      'validation-failed','Uno o más destinatarios no tienen acceso familiar activo.');
  end if;
  if v_predecessor_id is not null then
    update public.family_publications_v2 set superseded_at=now() where id=v_predecessor_id;
  end if;
  insert into public.family_publications_v2(id,organization_id,client_id,predecessor_id,
    version,introduction,published_by,test_run_id)
  values(v_publication_id,p_organization_id,v_client_id,v_predecessor_id,
    coalesce(v_predecessor.version,0)+1,p_command->>'introduction',v_actor,v_test)
  returning * into v_publication;
  insert into public.family_publication_recipients_v2(publication_id,family_person_id,organization_id,client_id)
  select v_publication_id,item::uuid,p_organization_id,v_client_id
  from jsonb_array_elements_text(p_command->'familyPersonIds') item;
  insert into public.family_publication_resources_v2(publication_id,resource_kind,resource_id,position)
  select v_publication_id,'program-version',item::uuid,ordinality-1
    from jsonb_array_elements_text(p_command->'programVersionIds') with ordinality as value(item,ordinality)
  union all select v_publication_id,'record-revision',item::uuid,ordinality-1
    from jsonb_array_elements_text(p_command->'recordRevisionIds') with ordinality as value(item,ordinality)
  union all select v_publication_id,'attachment-version',item::uuid,ordinality-1
    from jsonb_array_elements_text(p_command->'attachmentVersionIds') with ordinality as value(item,ordinality);
  return private.issue_command_receipt(p_organization_id,v_operation,v_key,v_publication_id,
    'family-publication-v2',p_command,v_publication.version,v_publication.test_run_id);
end;
$$;

create function public.aba_family_access_command_v2(p_organization_id uuid,p_command jsonb)
returns jsonb language sql volatile security definer set search_path = '' as $$
  select private.a4_family_access_command_impl(p_organization_id,p_command);
$$;

create function public.aba_family_publication_command_v2(p_organization_id uuid,p_command jsonb)
returns jsonb language sql volatile security definer set search_path = '' as $$
  select private.a4_family_publication_command_impl(p_organization_id,p_command);
$$;

create function public.aba_family_access_read_v2(p_organization_id uuid,p_client_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_actor uuid:=auth.uid(); v_email text; v_rows jsonb;
begin
  if v_actor is null then raise exception using errcode='42501',message='authenticated_identity_required'; end if;
  select lower(email) into v_email from auth.users where id=v_actor;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',link.id,'clinicId',link.organization_id,'studentId',link.client_id,
    'familyPersonId',link.family_person_id,'familyLabel',coalesce(person.full_name,person.initials),
    'recipientEmail',link.recipient_email,'recipientUserId',link.recipient_user_id,
    'message',link.message,'status',link.status,'version',link.version,
    'createdAt',link.created_at,'updatedAt',link.updated_at,
    'direction',case when link.recipient_user_id=v_actor or link.recipient_email=v_email
      then 'received' else 'sent' end
  ) order by link.updated_at desc),'[]'::jsonb) into v_rows
  from public.family_access_links_v2 link
  join public.client_people_v2 person on person.id=link.family_person_id
    and person.organization_id=link.organization_id and person.client_id=link.client_id
  where link.organization_id=p_organization_id and (p_client_id is null or link.client_id=p_client_id)
    and (private.has_internal_student_capability(link.client_id,'authorization.decide')
      or link.recipient_user_id=v_actor or link.recipient_email=v_email);
  return jsonb_build_object('clinicId',p_organization_id,'actorId',v_actor,'links',v_rows);
end;
$$;

create function public.aba_family_portal_read_v2(p_organization_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_actor uuid:=auth.uid(); v_publications jsonb;
begin
  if v_actor is null then raise exception using errcode='42501',message='authenticated_identity_required'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',publication.id,'clinicId',publication.organization_id,'studentId',publication.client_id,
    'studentLabel',coalesce(profile.full_name,client.initials),'version',publication.version,
    'introduction',publication.introduction,'publishedAt',publication.published_at,
    'programs',(select coalesce(jsonb_agg(jsonb_build_object(
      'id',version.id,'programId',version.program_id,'type',version.program_type,
      'version',version.version,'title',version.title,'design',version.design)
      order by resource.position),'[]'::jsonb)
      from public.family_publication_resources_v2 resource
      join public.program_versions version on version.id=resource.resource_id
      where resource.publication_id=publication.id and resource.resource_kind='program-version'),
    'results',(select coalesce(jsonb_agg(jsonb_build_object(
      'id',revision.id,'recordId',revision.record_id,'revision',revision.revision,
      'measurement',revision.replacement_measurement,'createdAt',revision.created_at)
      order by resource.position),'[]'::jsonb)
      from public.family_publication_resources_v2 resource
      join public.session_program_record_revisions_v2 revision on revision.id=resource.resource_id
      where resource.publication_id=publication.id and resource.resource_kind='record-revision'),
    'documents',(select coalesce(jsonb_agg(jsonb_build_object(
      'id',version.id,'attachmentId',version.attachment_id,'version',version.version,
      'name',version.original_name,'mimeType',version.mime_type,'byteLength',version.byte_length,
      'sha256',version.sha256,'createdAt',version.created_at)
      order by resource.position),'[]'::jsonb)
      from public.family_publication_resources_v2 resource
      join public.attachment_versions version on version.id=resource.resource_id
      where resource.publication_id=publication.id and resource.resource_kind='attachment-version')
  ) order by publication.published_at desc),'[]'::jsonb) into v_publications
  from public.family_publications_v2 publication
  join public.clients client on client.organization_id=publication.organization_id and client.id=publication.client_id
  left join public.client_profiles_v2 profile on profile.organization_id=client.organization_id and profile.client_id=client.id
  where publication.organization_id=p_organization_id and publication.superseded_at is null
    and exists(select 1 from public.family_publication_recipients_v2 recipient
      join public.family_access_links_v2 link on link.organization_id=recipient.organization_id
        and link.client_id=recipient.client_id and link.family_person_id=recipient.family_person_id
        and link.status='active' and link.recipient_user_id=v_actor
      where recipient.publication_id=publication.id);
  return jsonb_build_object('actorId',v_actor,'publications',v_publications);
end;
$$;

revoke all on function
  private.a4_family_access_command_valid(jsonb),
  private.a4_family_access_command_impl(uuid,jsonb),
  private.a4_family_publication_command_valid(jsonb),
  private.a4_family_publication_command_impl(uuid,jsonb),
  public.aba_family_access_command_v2(uuid,jsonb),
  public.aba_family_publication_command_v2(uuid,jsonb),
  public.aba_family_access_read_v2(uuid,uuid),
  public.aba_family_portal_read_v2(uuid)
from public,anon,authenticated,service_role;
grant execute on function
  public.aba_family_access_command_v2(uuid,jsonb),
  public.aba_family_publication_command_v2(uuid,jsonb),
  public.aba_family_access_read_v2(uuid,uuid),
  public.aba_family_portal_read_v2(uuid)
to authenticated;

comment on function public.aba_family_portal_read_v2(uuid) is
  'Dedicated family-only projection of explicitly selected immutable resources; grants no general clinical table access.';

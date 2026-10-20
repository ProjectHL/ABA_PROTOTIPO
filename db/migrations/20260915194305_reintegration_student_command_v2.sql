create function private.jsonb_has_exact_keys(p_value jsonb, p_keys text[])
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
  select jsonb_typeof(p_value) = 'object'
    and (select count(*) from jsonb_object_keys(p_value)) = cardinality(p_keys)
    and not exists (
      select 1 from unnest(p_keys) k where not p_value ? k
    );
$$;

create function private.is_uuid_text(p_value text)
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
  select p_value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
$$;

create function private.is_iso_date_text(p_value text)
returns boolean
language plpgsql
immutable
security invoker
set search_path = ''
as $$
begin
  if p_value is null or p_value !~ '^\d{4}-\d{2}-\d{2}$' then return false; end if;
  perform p_value::date;
  return true;
exception when invalid_datetime_format or datetime_field_overflow then
  return false;
end;
$$;

create function private.is_valid_normalized_rut(p_value text)
returns boolean
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  v_body text;
  v_digit text;
  v_sum integer := 0;
  v_factor integer := 2;
  v_result integer;
  v_index integer;
begin
  if p_value is null or p_value !~ '^[0-9]{1,8}-[0-9K]$' then return false; end if;
  v_body := split_part(p_value, '-', 1);
  v_digit := split_part(p_value, '-', 2);
  if v_body ~ '^0+$' or (char_length(v_body) > 1 and left(v_body, 1) = '0') then return false; end if;
  for v_index in reverse char_length(v_body)..1 loop
    v_sum := v_sum + substr(v_body, v_index, 1)::integer * v_factor;
    v_factor := case when v_factor = 7 then 2 else v_factor + 1 end;
  end loop;
  v_result := 11 - (v_sum % 11);
  return v_digit = case when v_result = 11 then '0' when v_result = 10 then 'K' else v_result::text end;
end;
$$;

create function private.is_iso_date_not_after(p_value text, p_latest date)
returns boolean
language plpgsql
immutable
security invoker
set search_path = ''
as $$
begin
  if p_latest is null or not private.is_iso_date_text(p_value) then return false; end if;
  return p_value::date <= p_latest;
exception when invalid_datetime_format or datetime_field_overflow then
  return false;
end;
$$;

create function private.student_input_v2_valid(p_value jsonb, p_today date)
returns boolean
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  v_item jsonb;
  v_roles text[];
  v_ids text[] := '{}'::text[];
  v_id text;
begin
  if p_today is null or not private.jsonb_has_exact_keys(p_value, array[
    'schemaVersion','clinicalId','fullName','initials','rut','photoAttachmentId','birthDate',
    'primaryLanguage','livingArrangement','reportedDiagnosis','consultationReason','context','people','siblings'
  ]) then return false; end if;
  if jsonb_typeof(p_value->'schemaVersion') <> 'number' or p_value->>'schemaVersion' <> '2'
    or jsonb_typeof(p_value->'clinicalId') <> 'string' or char_length(btrim(p_value->>'clinicalId')) not between 1 and 64
    or jsonb_typeof(p_value->'initials') <> 'string' or char_length(btrim(p_value->>'initials')) not between 1 and 12
    or jsonb_typeof(p_value->'birthDate') <> 'string' or not private.is_iso_date_not_after(p_value->>'birthDate', p_today)
    or jsonb_typeof(p_value->'primaryLanguage') <> 'string' or char_length(btrim(p_value->>'primaryLanguage')) not between 1 and 32
    or jsonb_typeof(p_value->'livingArrangement') <> 'string' or char_length(p_value->>'livingArrangement') > 500
    or jsonb_typeof(p_value->'reportedDiagnosis') <> 'string' or char_length(p_value->>'reportedDiagnosis') > 2000
    or jsonb_typeof(p_value->'consultationReason') <> 'string' or char_length(p_value->>'consultationReason') > 2000
  then return false; end if;
  if jsonb_typeof(p_value->'fullName') not in ('string','null')
    or (jsonb_typeof(p_value->'fullName') = 'string' and char_length(btrim(p_value->>'fullName')) not between 1 and 200)
    or jsonb_typeof(p_value->'rut') not in ('string','null')
    or (jsonb_typeof(p_value->'rut') = 'string' and not private.is_valid_normalized_rut(p_value->>'rut'))
    or jsonb_typeof(p_value->'photoAttachmentId') not in ('string','null')
    or (jsonb_typeof(p_value->'photoAttachmentId') = 'string' and not private.is_uuid_text(p_value->>'photoAttachmentId'))
  then return false; end if;
  if not private.jsonb_has_exact_keys(p_value->'context', array['home','school','adaptations'])
    or jsonb_typeof(p_value#>'{context,home}') <> 'string' or char_length(p_value#>>'{context,home}') > 2000
    or jsonb_typeof(p_value#>'{context,school}') <> 'string' or char_length(p_value#>>'{context,school}') > 500
    or jsonb_typeof(p_value#>'{context,adaptations}') <> 'string' or char_length(p_value#>>'{context,adaptations}') > 2000
    or jsonb_typeof(p_value->'people') <> 'array' or jsonb_array_length(p_value->'people') > 100
    or jsonb_typeof(p_value->'siblings') <> 'array' or jsonb_array_length(p_value->'siblings') > 30
  then return false; end if;
  if (select count(*) from jsonb_array_elements(p_value->'people') item where item->'isPrimaryContact' = 'true'::jsonb) > 1 then
    return false;
  end if;

  for v_item in select value from jsonb_array_elements(p_value->'people') loop
    if not private.jsonb_has_exact_keys(v_item, array['id','fullName','initials','birthDate','relationship','phone','email','roles','isPrimaryContact'])
      or jsonb_typeof(v_item->'id') <> 'string' or not private.is_uuid_text(v_item->>'id')
      or jsonb_typeof(v_item->'fullName') not in ('string','null')
      or (jsonb_typeof(v_item->'fullName') = 'string' and char_length(btrim(v_item->>'fullName')) not between 1 and 200)
      or jsonb_typeof(v_item->'initials') not in ('string','null')
      or (jsonb_typeof(v_item->'initials') = 'string' and char_length(btrim(v_item->>'initials')) not between 1 and 12)
      or (v_item->>'fullName' is null and v_item->>'initials' is null)
      or jsonb_typeof(v_item->'birthDate') not in ('string','null')
      or (jsonb_typeof(v_item->'birthDate') = 'string' and not private.is_iso_date_not_after(v_item->>'birthDate', p_today))
      or jsonb_typeof(v_item->'relationship') <> 'string' or char_length(v_item->>'relationship') > 80
      or jsonb_typeof(v_item->'phone') <> 'string' or char_length(v_item->>'phone') > 40
      or jsonb_typeof(v_item->'email') not in ('string','null')
      or (jsonb_typeof(v_item->'email') = 'string' and (char_length(v_item->>'email') > 254 or v_item->>'email' !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'))
      or jsonb_typeof(v_item->'roles') <> 'array' or jsonb_array_length(v_item->'roles') not between 1 and 2
      or jsonb_typeof(v_item->'isPrimaryContact') <> 'boolean'
    then return false; end if;
    select array_agg(value order by value) into v_roles from jsonb_array_elements_text(v_item->'roles');
    if v_roles is null or not (v_roles <@ array['contact','family']::text[])
      or cardinality(v_roles) <> (select count(distinct value) from unnest(v_roles) value)
      or ((v_item->>'isPrimaryContact')::boolean and not ('contact' = any(v_roles)))
    then return false; end if;
    v_id := v_item->>'id';
    if v_id = any(v_ids) then return false; end if;
    v_ids := array_append(v_ids, v_id);
  end loop;

  for v_item in select value from jsonb_array_elements(p_value->'siblings') loop
    if not private.jsonb_has_exact_keys(v_item, array['id','fullName','initials','birthDate','notes'])
      or jsonb_typeof(v_item->'id') <> 'string' or not private.is_uuid_text(v_item->>'id')
      or jsonb_typeof(v_item->'fullName') not in ('string','null')
      or (jsonb_typeof(v_item->'fullName') = 'string' and char_length(btrim(v_item->>'fullName')) not between 1 and 200)
      or jsonb_typeof(v_item->'initials') not in ('string','null')
      or (jsonb_typeof(v_item->'initials') = 'string' and char_length(btrim(v_item->>'initials')) not between 1 and 12)
      or (v_item->>'fullName' is null and v_item->>'initials' is null)
      or jsonb_typeof(v_item->'birthDate') not in ('string','null')
      or (jsonb_typeof(v_item->'birthDate') = 'string' and not private.is_iso_date_not_after(v_item->>'birthDate', p_today))
      or jsonb_typeof(v_item->'notes') <> 'string' or char_length(v_item->>'notes') > 2000
    then return false; end if;
    v_id := v_item->>'id';
    if v_id = any(v_ids) then return false; end if;
    v_ids := array_append(v_ids, v_id);
  end loop;
  return true;
end;
$$;

create function private.is_safe_nonnegative_integer_json(p_value jsonb)
returns boolean
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare v_number numeric;
begin
  if jsonb_typeof(p_value) <> 'number' or p_value::text !~ '^(0|[1-9][0-9]*)$' then return false; end if;
  v_number := (p_value::text)::numeric;
  return v_number between 0 and 9007199254740991;
exception when numeric_value_out_of_range or invalid_text_representation then
  return false;
end;
$$;

create function private.student_command_v2_valid(p_command jsonb, p_today date)
returns boolean
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  v_action text;
  v_expected bigint;
begin
  if not private.jsonb_has_exact_keys(p_command, array[
    'schemaVersion','operationId','idempotencyKey','studentId','expectedVersion','action','payload','statusConfirmation'
  ])
    or jsonb_typeof(p_command->'schemaVersion') <> 'number' or p_command->>'schemaVersion' <> '2'
    or jsonb_typeof(p_command->'operationId') <> 'string' or not private.is_uuid_text(p_command->>'operationId')
    or jsonb_typeof(p_command->'idempotencyKey') <> 'string' or not private.is_uuid_text(p_command->>'idempotencyKey')
    or jsonb_typeof(p_command->'studentId') <> 'string' or not private.is_uuid_text(p_command->>'studentId')
    or not private.is_safe_nonnegative_integer_json(p_command->'expectedVersion')
    or jsonb_typeof(p_command->'action') <> 'string'
    or jsonb_typeof(p_command->'statusConfirmation') <> 'boolean'
  then return false; end if;
  v_action := p_command->>'action';
  v_expected := (p_command->>'expectedVersion')::bigint;
  if v_action in ('create','initialize-v2','update') then
    if jsonb_typeof(p_command->'payload') <> 'object'
      or not private.student_input_v2_valid(p_command->'payload', p_today)
      or (p_command->>'statusConfirmation')::boolean
      or (v_action in ('create','initialize-v2') and v_expected <> 0)
      or (v_action = 'update' and v_expected = 0)
      or (v_action = 'create' and jsonb_typeof(p_command#>'{payload,fullName}') <> 'string')
    then return false; end if;
  elsif v_action in ('archive','reactivate') then
    if jsonb_typeof(p_command->'payload') <> 'null'
      or not (p_command->>'statusConfirmation')::boolean
      or v_expected = 0
    then return false; end if;
  else
    return false;
  end if;
  return true;
end;
$$;

create function private.sync_student_relations_v2(
  p_organization_id uuid,
  p_client_id uuid,
  p_actor uuid,
  p_test_run_id uuid,
  p_payload jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item jsonb;
  v_id uuid;
begin
  if exists (
    select 1 from public.client_people_v2 p
    join jsonb_array_elements(p_payload->'people') item on p.id = (item->>'id')::uuid
    where p.organization_id <> p_organization_id or p.client_id <> p_client_id
      or p.test_run_id is distinct from p_test_run_id
  ) or exists (
    select 1 from public.client_siblings_v2 s
    join jsonb_array_elements(p_payload->'siblings') item on s.id = (item->>'id')::uuid
    where s.organization_id <> p_organization_id or s.client_id <> p_client_id
      or s.test_run_id is distinct from p_test_run_id
  ) then
    raise exception using errcode = '23505', message = 'student_relation_identity_owned_elsewhere';
  end if;

  update public.client_people_v2
  set is_primary_contact = false
  where organization_id = p_organization_id and client_id = p_client_id
    and archived_at is null and is_primary_contact;

  for v_item in select value from jsonb_array_elements(p_payload->'people') loop
    v_id := (v_item->>'id')::uuid;
    insert into public.client_people_v2(
      id,client_id,organization_id,full_name,initials,birth_date,relationship,phone,email,
      roles,is_primary_contact,created_by,updated_by,test_run_id
    ) values (
      v_id,p_client_id,p_organization_id,nullif(btrim(v_item->>'fullName'),''),nullif(btrim(v_item->>'initials'),''),
      (v_item->>'birthDate')::date,v_item->>'relationship',v_item->>'phone',lower(v_item->>'email'),
      array(select value from jsonb_array_elements_text(v_item->'roles')),
      (v_item->>'isPrimaryContact')::boolean,p_actor,p_actor,p_test_run_id
    )
    on conflict (id) do update set
      full_name=excluded.full_name, initials=excluded.initials, birth_date=excluded.birth_date,
      relationship=excluded.relationship, phone=excluded.phone, email=excluded.email,
      roles=excluded.roles, is_primary_contact=excluded.is_primary_contact,
      version=public.client_people_v2.version+1, updated_at=now(), updated_by=p_actor,
      archived_at=null, archived_by=null
    where public.client_people_v2.organization_id=p_organization_id
      and public.client_people_v2.client_id=p_client_id
      and public.client_people_v2.test_run_id is not distinct from p_test_run_id;
    if not found then raise exception using errcode='23505',message='student_person_identity_conflict'; end if;
  end loop;

  update public.client_people_v2 p
  set archived_at=now(), archived_by=p_actor, is_primary_contact=false,
      version=p.version+1, updated_at=now(), updated_by=p_actor
  where p.organization_id=p_organization_id and p.client_id=p_client_id and p.archived_at is null
    and not exists(select 1 from jsonb_array_elements(p_payload->'people') item where (item->>'id')::uuid=p.id);

  for v_item in select value from jsonb_array_elements(p_payload->'siblings') loop
    v_id := (v_item->>'id')::uuid;
    insert into public.client_siblings_v2(
      id,client_id,organization_id,full_name,initials,birth_date,notes,
      created_by,updated_by,test_run_id
    ) values (
      v_id,p_client_id,p_organization_id,nullif(btrim(v_item->>'fullName'),''),nullif(btrim(v_item->>'initials'),''),
      (v_item->>'birthDate')::date,v_item->>'notes',p_actor,p_actor,p_test_run_id
    )
    on conflict (id) do update set
      full_name=excluded.full_name, initials=excluded.initials, birth_date=excluded.birth_date,
      notes=excluded.notes, version=public.client_siblings_v2.version+1,
      updated_at=now(), updated_by=p_actor, archived_at=null, archived_by=null
    where public.client_siblings_v2.organization_id=p_organization_id
      and public.client_siblings_v2.client_id=p_client_id
      and public.client_siblings_v2.test_run_id is not distinct from p_test_run_id;
    if not found then raise exception using errcode='23505',message='student_sibling_identity_conflict'; end if;
  end loop;

  update public.client_siblings_v2 s
  set archived_at=now(), archived_by=p_actor, version=s.version+1, updated_at=now(), updated_by=p_actor
  where s.organization_id=p_organization_id and s.client_id=p_client_id and s.archived_at is null
    and not exists(select 1 from jsonb_array_elements(p_payload->'siblings') item where (item->>'id')::uuid=s.id);
end;
$$;

create function public.aba_student_command_v2(
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
  v_action text;
  v_expected_version bigint;
  v_payload jsonb;
  v_replay jsonb;
  v_client public.clients%rowtype;
  v_current_version bigint := 0;
  v_has_profile boolean := false;
  v_next_version bigint;
  v_create_allowed boolean;
begin
  if p_organization_id is null or jsonb_typeof(p_command) <> 'object'
    or jsonb_typeof(p_command->'operationId') <> 'string' or not private.is_uuid_text(p_command->>'operationId')
    or jsonb_typeof(p_command->'idempotencyKey') <> 'string' or not private.is_uuid_text(p_command->>'idempotencyKey')
    or jsonb_typeof(p_command->'studentId') <> 'string' or not private.is_uuid_text(p_command->>'studentId')
  then
    raise exception using errcode = '22023', message = 'student_command_identity_invalid';
  end if;

  v_operation_id := (p_command->>'operationId')::uuid;
  v_idempotency_key := (p_command->>'idempotencyKey')::uuid;
  v_client_id := (p_command->>'studentId')::uuid;

  if v_actor is null then
    return private.command_rejected_result(v_operation_id,v_idempotency_key,v_client_id,
      'permission-denied','Se requiere una sesión autenticada.');
  end if;
  if not private.student_command_v2_valid(p_command, current_date) then
    return private.command_rejected_result(v_operation_id,v_idempotency_key,v_client_id,
      'validation-failed','El comando de ficha no cumple el contrato V2.');
  end if;

  v_action := p_command->>'action';
  v_expected_version := (p_command->>'expectedVersion')::bigint;
  v_payload := p_command->'payload';
  select exists(
    select 1 from public.organizations o
    join public.memberships m on m.organization_id=o.id
    where o.id=p_organization_id and o.status='active'
      and m.user_id=v_actor and m.status='active' and m.role in ('admin','supervisor')
  ) into v_create_allowed;

  if v_action='create' then
    if not v_create_allowed then
      return private.command_rejected_result(v_operation_id,v_idempotency_key,v_client_id,
        'permission-denied','No tienes permiso vigente para crear fichas en esta clínica.');
    end if;
  elsif not exists(select 1 from public.clients c where c.organization_id=p_organization_id and c.id=v_client_id)
    or not private.has_student_capability(v_client_id,'student.edit') then
    return private.command_rejected_result(v_operation_id,v_idempotency_key,v_client_id,
      'permission-denied','La ficha no está disponible con capacidad de edición vigente.');
  end if;

  if jsonb_typeof(v_payload)='object' and (
    exists(
      select 1 from public.client_people_v2 p
      join jsonb_array_elements(v_payload->'people') item on p.id=(item->>'id')::uuid
      where p.organization_id<>p_organization_id or p.client_id<>v_client_id
        or p.test_run_id is distinct from (select c.test_run_id from public.clients c where c.id=v_client_id)
    ) or exists(
      select 1 from public.client_siblings_v2 s
      join jsonb_array_elements(v_payload->'siblings') item on s.id=(item->>'id')::uuid
      where s.organization_id<>p_organization_id or s.client_id<>v_client_id
        or s.test_run_id is distinct from (select c.test_run_id from public.clients c where c.id=v_client_id)
    )
  ) then
    return private.command_rejected_result(v_operation_id,v_idempotency_key,v_client_id,
      'validation-failed','Una identidad de persona ya pertenece a otro recurso.');
  end if;

  v_replay := private.command_identity_or_replay_result(
    p_organization_id,v_operation_id,v_idempotency_key,v_client_id,'student-v2',p_command
  );
  if v_replay is not null then return v_replay; end if;

  if v_action='create' then
    perform 1 from public.organizations o
    where o.id=p_organization_id and o.status='active' for update;
    if not found then
      return private.command_rejected_result(v_operation_id,v_idempotency_key,v_client_id,
        'resource-unavailable','La clínica no está activa.');
    end if;
    select exists(
      select 1 from public.memberships m
      where m.organization_id=p_organization_id and m.user_id=v_actor
        and m.status='active' and m.role in ('admin','supervisor')
    ) into v_create_allowed;
    if not v_create_allowed then
      return private.command_rejected_result(v_operation_id,v_idempotency_key,v_client_id,
        'permission-denied','El permiso para crear la ficha dejó de estar vigente.');
    end if;
    if exists(select 1 from public.clients c where c.id=v_client_id)
      or exists(select 1 from public.clients c where c.organization_id=p_organization_id and c.clinical_id=btrim(v_payload->>'clinicalId')) then
      return private.command_rejected_result(v_operation_id,v_idempotency_key,v_client_id,
        'resource-unavailable','El identificador de la ficha ya está en uso.');
    end if;
    insert into public.clients(
      id,organization_id,clinical_id,initials,primary_language,birth_date,living_arrangement,status,test_run_id
    ) values (
      v_client_id,p_organization_id,btrim(v_payload->>'clinicalId'),btrim(v_payload->>'initials'),
      btrim(v_payload->>'primaryLanguage'),(v_payload->>'birthDate')::date,
      nullif(btrim(v_payload->>'livingArrangement'),''),'active',null
    ) returning * into v_client;
    insert into public.client_profiles_v2(
      client_id,organization_id,full_name,rut_normalized,photo_attachment_id,
      reported_diagnosis,consultation_reason,context_home,context_school,context_adaptations,
      version,created_by,updated_by,test_run_id
    ) values (
      v_client_id,p_organization_id,nullif(btrim(v_payload->>'fullName'),''),v_payload->>'rut',
      (v_payload->>'photoAttachmentId')::uuid,v_payload->>'reportedDiagnosis',v_payload->>'consultationReason',
      v_payload#>>'{context,home}',v_payload#>>'{context,school}',v_payload#>>'{context,adaptations}',
      1,v_actor,v_actor,null
    );
    v_next_version := 1;
  else
    select c.* into v_client from public.clients c
    where c.organization_id=p_organization_id and c.id=v_client_id for update;
    if not found then
      return private.command_rejected_result(v_operation_id,v_idempotency_key,v_client_id,
        'resource-unavailable','La ficha ya no está disponible.');
    end if;
    if not private.has_student_capability(v_client_id,'student.edit') then
      return private.command_rejected_result(v_operation_id,v_idempotency_key,v_client_id,
        'permission-denied','La capacidad de edición dejó de estar vigente.');
    end if;
    perform private.require_open_test_batch(p_organization_id,v_client.test_run_id);
    select p.version into v_current_version from public.client_profiles_v2 p
    where p.organization_id=p_organization_id and p.client_id=v_client_id for update;
    v_has_profile := found;
    v_current_version := coalesce(v_current_version,0);
    if v_current_version<>v_expected_version then
      return private.command_version_conflict_result(v_operation_id,v_idempotency_key,v_client_id,
        v_expected_version,v_current_version,'La versión de la ficha cambió.');
    end if;
    if v_action='initialize-v2' and v_has_profile then
      return private.command_rejected_result(v_operation_id,v_idempotency_key,v_client_id,
        'invalid-transition','La ficha ya tiene una versión V2.');
    elsif v_action<>'initialize-v2' and not v_has_profile then
      return private.command_rejected_result(v_operation_id,v_idempotency_key,v_client_id,
        'invalid-transition','Inicializa explícitamente la ficha V2 antes de modificarla.');
    end if;

    if v_action in ('initialize-v2','update') then
      if exists(select 1 from public.clients c where c.organization_id=p_organization_id
        and c.clinical_id=btrim(v_payload->>'clinicalId') and c.id<>v_client_id) then
        return private.command_rejected_result(v_operation_id,v_idempotency_key,v_client_id,
          'validation-failed','El identificador clínico ya está en uso.');
      end if;
      update public.clients set
        clinical_id=btrim(v_payload->>'clinicalId'), initials=btrim(v_payload->>'initials'),
        primary_language=btrim(v_payload->>'primaryLanguage'), birth_date=(v_payload->>'birthDate')::date,
        living_arrangement=nullif(btrim(v_payload->>'livingArrangement'),''), updated_at=now()
      where organization_id=p_organization_id and id=v_client_id;
      if v_action='initialize-v2' then
        insert into public.client_profiles_v2(
          client_id,organization_id,full_name,rut_normalized,photo_attachment_id,
          reported_diagnosis,consultation_reason,context_home,context_school,context_adaptations,
          version,created_by,updated_by,test_run_id
        ) values (
          v_client_id,p_organization_id,nullif(btrim(v_payload->>'fullName'),''),v_payload->>'rut',
          (v_payload->>'photoAttachmentId')::uuid,v_payload->>'reportedDiagnosis',v_payload->>'consultationReason',
          v_payload#>>'{context,home}',v_payload#>>'{context,school}',v_payload#>>'{context,adaptations}',
          1,v_actor,v_actor,v_client.test_run_id
        );
        v_next_version:=1;
      else
        update public.client_profiles_v2 set
          full_name=nullif(btrim(v_payload->>'fullName'),''), rut_normalized=v_payload->>'rut',
          photo_attachment_id=(v_payload->>'photoAttachmentId')::uuid,
          reported_diagnosis=v_payload->>'reportedDiagnosis', consultation_reason=v_payload->>'consultationReason',
          context_home=v_payload#>>'{context,home}', context_school=v_payload#>>'{context,school}',
          context_adaptations=v_payload#>>'{context,adaptations}', version=version+1,
          updated_at=now(),updated_by=v_actor
        where organization_id=p_organization_id and client_id=v_client_id
        returning version into v_next_version;
      end if;
    else
      if (v_action='archive' and v_client.status<>'active') or (v_action='reactivate' and v_client.status<>'archived') then
        return private.command_rejected_result(v_operation_id,v_idempotency_key,v_client_id,
          'invalid-transition','La ficha no admite ese cambio de estado.');
      end if;
      update public.clients set status=case when v_action='archive' then 'archived' else 'active' end,updated_at=now()
      where organization_id=p_organization_id and id=v_client_id;
      update public.client_profiles_v2 set version=version+1,updated_at=now(),updated_by=v_actor
      where organization_id=p_organization_id and client_id=v_client_id returning version into v_next_version;
    end if;
  end if;

  if v_action in ('create','initialize-v2','update') then
    perform private.sync_student_relations_v2(p_organization_id,v_client_id,v_actor,v_client.test_run_id,v_payload);
  end if;
  insert into public.audit_events(organization_id,actor_user_id,entity_type,entity_id,action,test_run_id)
  values(p_organization_id,v_actor,'client',v_client_id,
    case when v_action='create' then 'created' when v_action='archive' then 'archived' else 'updated' end,
    v_client.test_run_id);
  return private.issue_command_receipt(p_organization_id,v_operation_id,v_idempotency_key,v_client_id,
    'student-v2',p_command,v_next_version,v_client.test_run_id);
end;
$$;

revoke all on function
  private.jsonb_has_exact_keys(jsonb,text[]),
  private.is_uuid_text(text),
  private.is_iso_date_text(text),
  private.is_iso_date_not_after(text,date),
  private.is_valid_normalized_rut(text),
  private.student_input_v2_valid(jsonb,date),
  private.is_safe_nonnegative_integer_json(jsonb),
  private.student_command_v2_valid(jsonb,date),
  private.sync_student_relations_v2(uuid,uuid,uuid,uuid,jsonb)
from public, anon, authenticated, service_role;

revoke all on function public.aba_student_command_v2(uuid,jsonb)
from public, anon, service_role;
grant execute on function public.aba_student_command_v2(uuid,jsonb) to authenticated;

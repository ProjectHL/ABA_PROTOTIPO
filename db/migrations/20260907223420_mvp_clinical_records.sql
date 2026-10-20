-- Expanded record command: atomic base/family edit, optimistic concurrency.
alter table public.guardians add column relationship text check(length(relationship)<=80);
alter table public.guardians add column phone text check(length(phone)<=40);

create function public.mvp_save_student(p_organization_id uuid,p_client_id uuid,p_expected_updated_at timestamptz,p_payload jsonb,p_test_run_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_client public.clients; v_family jsonb; v_item jsonb; v_pos integer;
begin
  if auth.uid() is null or not exists(select 1 from public.memberships m join public.organizations o on o.id=m.organization_id
    where m.organization_id=p_organization_id and m.user_id=auth.uid() and m.status='active' and o.status='active') then
    raise exception using errcode='42501',message='active_membership_required';
  end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' or exists (
    select 1 from jsonb_object_keys(p_payload) k where k not in ('clinical_id','initials','birth_date','primary_language','living_arrangement','guardians','siblings')
  ) then raise exception using errcode='22023',message='invalid_student_payload'; end if;
  if p_client_id is null then
    if not exists(select 1 from public.memberships where organization_id=p_organization_id and user_id=auth.uid() and status='active' and role in ('admin','supervisor')) then
      raise exception using errcode='42501',message='student_create_required';
    end if;
    insert into public.clients(organization_id,clinical_id,initials,birth_date,primary_language,living_arrangement,test_run_id)
      values(p_organization_id,btrim(p_payload->>'clinical_id'),upper(btrim(p_payload->>'initials')),(p_payload->>'birth_date')::date,
        btrim(p_payload->>'primary_language'),nullif(btrim(p_payload->>'living_arrangement'),''),p_test_run_id) returning * into v_client;
    insert into public.student_assignments(organization_id,client_id,user_id,role,is_primary,created_by,test_run_id)
      values(p_organization_id,v_client.id,auth.uid(),'supervisor',true,auth.uid(),p_test_run_id);
  else
    if not private.has_student_capability(p_client_id,'student.edit') then
      raise exception using errcode='42501',message='student_edit_required';
    end if;
    select * into strict v_client from public.clients where id=p_client_id and organization_id=p_organization_id for update;
    if p_expected_updated_at is null or v_client.updated_at<>p_expected_updated_at then
      raise exception using errcode='40001',message='student_version_conflict';
    end if;
    update public.clients set clinical_id=btrim(p_payload->>'clinical_id'),initials=upper(btrim(p_payload->>'initials')),
      birth_date=(p_payload->>'birth_date')::date,primary_language=btrim(p_payload->>'primary_language'),
      living_arrangement=nullif(btrim(p_payload->>'living_arrangement'),'') where id=p_client_id returning * into v_client;
  end if;
  -- These are current contact snapshots, not the immutable clinical history.
  v_family:=coalesce(p_payload->'guardians','[]'::jsonb);
  if jsonb_typeof(v_family)<>'array' or jsonb_array_length(v_family)>20 then
    raise exception using errcode='22023',message='invalid_guardians'; end if;
  delete from public.guardians where client_id=v_client.id;
  v_pos:=0;
  for v_item in select value from jsonb_array_elements(v_family) loop
    insert into public.guardians(client_id,initials,birth_date,position,relationship,phone,test_run_id)
      values(v_client.id,upper(btrim(v_item->>'initials')),nullif(v_item->>'birth_date','')::date,v_pos,
        nullif(btrim(v_item->>'relationship'),''),nullif(btrim(v_item->>'phone'),''),v_client.test_run_id);
    v_pos:=v_pos+1;
  end loop;
  v_family:=coalesce(p_payload->'siblings','[]'::jsonb);
  if jsonb_typeof(v_family)<>'array' or jsonb_array_length(v_family)>30 then
    raise exception using errcode='22023',message='invalid_siblings'; end if;
  delete from public.siblings where client_id=v_client.id;
  insert into public.siblings(client_id,initials,birth_date,position,test_run_id)
    select v_client.id,upper(btrim(value->>'initials')),nullif(value->>'birth_date','')::date,ordinality-1,v_client.test_run_id
    from jsonb_array_elements(v_family) with ordinality;
  return to_jsonb(v_client);
end;
$$;
revoke all on function public.mvp_save_student(uuid,uuid,timestamptz,jsonb,uuid) from public,anon;
grant execute on function public.mvp_save_student(uuid,uuid,timestamptz,jsonb,uuid) to authenticated;

-- Program-version measurements complement the legacy goal/behavior-plan tables.
-- No legacy measurement is rewritten. JSON stores the dimension's explicit raw observations.
create table public.session_program_records (
  id uuid primary key, session_id uuid not null references public.clinical_sessions(id),
  client_id uuid not null references public.clients(id), program_version_id uuid not null references public.program_versions(id),
  actor_user_id uuid not null references auth.users(id), dimension text not null check(dimension in ('percentage','frequency','interval')),
  payload jsonb not null check(jsonb_typeof(payload)='object'), version integer not null default 1,
  submitted boolean not null default false, created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  test_run_id uuid, unique(session_id,program_version_id)
);
create index session_program_records_client_idx on public.session_program_records(client_id,created_at);
create index session_program_records_version_idx on public.session_program_records(program_version_id);
create index session_program_records_actor_idx on public.session_program_records(actor_user_id);
alter table public.session_program_records enable row level security;
grant select on public.session_program_records to authenticated;
create policy session_program_records_read on public.session_program_records for select to authenticated
  using ((select private.has_student_capability(client_id,'record.view')));

create function public.mvp_save_record(p_id uuid,p_session_id uuid,p_client_id uuid,p_program_version_id uuid,
  p_dimension text,p_payload jsonb,p_expected_version integer,p_submit boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_program public.programs; v_version public.program_versions; v_record public.session_program_records;
  v_session public.clinical_sessions; v_i jsonb; v_run uuid;
begin
  if p_id is null or p_session_id is null or p_submit is null or not private.has_student_capability(p_client_id,'record.capture')
    or (p_submit and not private.has_student_capability(p_client_id,'record.submit')) then
    raise exception using errcode='42501',message='record_capture_required'; end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' or p_dimension is null or p_dimension not in ('percentage','frequency','interval') then
    raise exception using errcode='22023',message='measurement_invalid'; end if;
  if p_dimension='percentage' then
    if jsonb_typeof(p_payload->'trials') is distinct from 'array' or jsonb_array_length(p_payload->'trials') not between 1 and 1000 then
      raise exception using errcode='22023',message='trials_required'; end if;
    for v_i in select value from jsonb_array_elements(p_payload->'trials') loop
      if jsonb_typeof(v_i) is distinct from 'boolean' then raise exception using errcode='22023',message='trial_invalid'; end if;
    end loop;
  elsif p_dimension='frequency' then
    if jsonb_typeof(p_payload->'count') is distinct from 'number' or jsonb_typeof(p_payload->'duration_seconds') is distinct from 'number'
      or (p_payload->>'count')::numeric<0 or (p_payload->>'count')::numeric<>trunc((p_payload->>'count')::numeric)
      or (p_payload->>'duration_seconds')::numeric<=0 then raise exception using errcode='22023',message='frequency_invalid'; end if;
  else
    if jsonb_typeof(p_payload->'intervals') is distinct from 'array' or jsonb_array_length(p_payload->'intervals') not between 1 and 1000
      or coalesce(p_payload->>'type','') not in ('whole','partial','momentary')
      or jsonb_typeof(p_payload->'duration_seconds') is distinct from 'number' or (p_payload->>'duration_seconds')::numeric<=0 then
      raise exception using errcode='22023',message='intervals_invalid'; end if;
    for v_i in select value from jsonb_array_elements(p_payload->'intervals') loop
      if jsonb_typeof(v_i) not in ('boolean','null') or (p_submit and v_i='null'::jsonb) then
        raise exception using errcode='22023',message='interval_missing'; end if;
    end loop;
  end if;
  -- Lock the stable id to make retries safe even before a row exists.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_id::text,0));
  select * into v_record from public.session_program_records where id=p_id for update;
  if found then
    if v_record.client_id<>p_client_id or v_record.session_id<>p_session_id or v_record.program_version_id<>p_program_version_id or v_record.actor_user_id<>auth.uid() then
      raise exception using errcode='42501',message='record_owner_required'; end if;
    if v_record.payload=p_payload and v_record.dimension=p_dimension and v_record.submitted=p_submit then return to_jsonb(v_record); end if;
    if v_record.submitted or p_expected_version is null or v_record.version<>p_expected_version then
      raise exception using errcode='40001',message='record_version_conflict'; end if;
  elsif p_expected_version is distinct from 0 then raise exception using errcode='40001',message='record_version_conflict';
  end if;
  select * into strict v_version from public.program_versions where id=p_program_version_id and client_id=p_client_id;
  select * into strict v_program from public.programs where id=v_version.program_id and client_id=p_client_id for share;
  if v_record.id is null and (v_program.status<>'active' or v_program.current_version_id<>v_version.id or v_version.version_state<>'released') then
    raise exception using errcode='22023',message='active_program_required'; end if;
  if (v_version.program_type='acquisition' and p_dimension<>'percentage') or
     (v_version.program_type='behavior' and p_dimension is distinct from v_version.design->>'measurementUnit') then
    raise exception using errcode='22023',message='program_dimension_mismatch'; end if;
  select test_run_id into v_run from public.clients where id=p_client_id;
  insert into public.clinical_sessions(id,client_id,test_run_id) values(p_session_id,p_client_id,v_run) on conflict(id) do nothing;
  select * into strict v_session from public.clinical_sessions where id=p_session_id for update;
  if v_session.client_id<>p_client_id or v_session.status<>'draft' then raise exception using errcode='42501',message='draft_session_required'; end if;
  if v_record.id is null then
    insert into public.session_program_records(id,session_id,client_id,program_version_id,actor_user_id,dimension,payload,submitted,test_run_id)
      values(p_id,p_session_id,p_client_id,p_program_version_id,auth.uid(),p_dimension,p_payload,p_submit,v_run) returning * into v_record;
  else
    update public.session_program_records set payload=p_payload,dimension=p_dimension,submitted=p_submit,version=version+1,updated_at=now()
      where id=p_id returning * into v_record;
  end if;
  return to_jsonb(v_record);
end;
$$;

create function public.mvp_finish_session(p_session_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_session public.clinical_sessions;
begin
  select * into strict v_session from public.clinical_sessions where id=p_session_id for update;
  if not private.has_student_capability(v_session.client_id,'record.submit') then raise exception using errcode='42501',message='record_submit_required'; end if;
  if v_session.status='completed' then return to_jsonb(v_session); end if;
  if v_session.status<>'draft' or not exists(select 1 from public.session_program_records where session_id=p_session_id)
    or exists(select 1 from public.session_program_records where session_id=p_session_id and not submitted) then
    raise exception using errcode='22023',message='submitted_records_required'; end if;
  update public.clinical_sessions set status='completed' where id=p_session_id returning * into v_session;
  return to_jsonb(v_session);
end;
$$;
revoke all on function public.mvp_save_record(uuid,uuid,uuid,uuid,text,jsonb,integer,boolean),public.mvp_finish_session(uuid) from public,anon;
grant execute on function public.mvp_save_record(uuid,uuid,uuid,uuid,text,jsonb,integer,boolean),public.mvp_finish_session(uuid) to authenticated;

-- All session writes now pass through commands; direct REST cannot bypass finalization.
revoke insert,update,delete on public.clinical_sessions,public.session_behavior_measurements,public.session_acquisition_trials from authenticated;
create table public.clinical_record_events (
  id uuid primary key default gen_random_uuid(),client_id uuid not null references public.clients(id),
  actor_user_id uuid not null references auth.users(id), entity_id uuid not null,
  action text not null,created_at timestamptz not null default now(),test_run_id uuid
);
create index clinical_record_events_client_idx on public.clinical_record_events(client_id,created_at);
alter table public.clinical_record_events enable row level security;
grant select on public.clinical_record_events to authenticated;
create policy clinical_record_events_read on public.clinical_record_events for select to authenticated
  using ((select private.has_student_capability(client_id,'student.edit')));
create function private.audit_clinical_record() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.clinical_record_events(client_id,actor_user_id,entity_id,action,test_run_id)
    values(new.client_id,auth.uid(),new.id,tg_table_name||':'||lower(tg_op),new.test_run_id);
  return new;
end;
$$;
create trigger clinical_sessions_audit after insert or update on public.clinical_sessions for each row execute function private.audit_clinical_record();
create trigger session_program_records_audit after insert or update on public.session_program_records for each row execute function private.audit_clinical_record();
create trigger clinical_history_entries_audit after insert or update on public.clinical_history_entries for each row execute function private.audit_clinical_record();
revoke all on function private.audit_clinical_record() from public,anon,authenticated;

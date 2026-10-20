begin;
create function public.aba_program_student_scope_v2(p_clinic_id uuid,p_student_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $function$
declare v_caps text[];v_result jsonb;
begin
 if auth.uid() is null or p_clinic_id is null or p_student_id is null then return null;end if;
 v_caps:=public.get_student_capabilities(p_student_id);
 if not ('program.view'=any(v_caps)) then return null;end if;
 select jsonb_build_object('id',client.id,'clinicId',client.organization_id,'initials',client.initials,'status',client.status,'capabilities',to_jsonb(v_caps)) into v_result
 from public.clients client where client.id=p_student_id and client.organization_id=p_clinic_id;
 return v_result;
end;$function$;
revoke all on function public.aba_program_student_scope_v2(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.aba_program_student_scope_v2(uuid,uuid) to authenticated;
comment on function public.aba_program_student_scope_v2(uuid,uuid) is 'Minimal program-authorized identity: initials only, canonical per-resource capabilities, no clinical detail.';
do $migration$
declare v_definition text;v_anchor text;
v_guard text:=$anchor$  if auth.uid() is null
    or not exists (select 1 from public.clients client
      where client.id = p_student_id and client.organization_id = p_clinic_id)
    or not private.has_student_capability(p_student_id, 'student.view') then
    raise exception using errcode = '42501', message = 'student_view_required';
  end if;$anchor$;
v_start text:=$anchor$  select coalesce(jsonb_agg(jsonb_build_object(
    'schemaVersion', 2, 'id', session.session_id$anchor$;
v_end text:=$anchor$  where session.organization_id = p_clinic_id and session.client_id = p_student_id
    and session.archived_at is null;$anchor$;
begin
 if not exists(select 1 from pg_proc where oid='public.read_program_session_v2(uuid,uuid)'::regprocedure and not prosecdef and provolatile='s') then raise exception 'program_session_read_security_changed';end if;
 select replace(pg_get_functiondef('public.read_program_session_v2(uuid,uuid)'::regprocedure),E'\r\n',E'\n') into v_definition;
 foreach v_anchor in array array[v_guard,v_start,v_end] loop
  if (length(v_definition)-length(replace(v_definition,v_anchor,'')))/length(v_anchor)<>1 then raise exception 'program_session_read_source_changed';end if;
 end loop;
 v_definition:=replace(v_definition,v_guard,$replacement$  if auth.uid() is null
    or public.aba_program_student_scope_v2(p_clinic_id,p_student_id) is null then
    raise exception using errcode='42501',message='program_view_required';
  end if;$replacement$);
 v_definition:=replace(v_definition,v_start,$replacement$  if private.has_student_capability(p_student_id, 'student.view') then
  select coalesce(jsonb_agg(jsonb_build_object(
    'schemaVersion', 2, 'id', session.session_id$replacement$);
 v_definition:=replace(v_definition,v_end,v_end||$replacement$
  else
    v_sessions:='[]'::jsonb;
  end if;$replacement$);
 execute v_definition;
end;$migration$;
do $migration$
declare v_item record;v_policy record;v_qual text;v_expected text;
begin
 for v_item in select * from(values('clinical_sessions','clinical_sessions_select_member'),('clinical_session_v2_state','clinical_session_v2_state_read'),('clinical_session_v2_events','clinical_session_v2_events_read'))item(table_name,policy_name) loop
  select policy.* into v_policy from pg_policy policy where policy.polrelid=format('public.%I',v_item.table_name)::regclass and policy.polname=v_item.policy_name;
  if not found then raise exception 'session_notes_policy_missing';end if;
  if v_policy.polcmd<>'r' or not v_policy.polpermissive or v_policy.polwithcheck is not null or v_policy.polroles<>array['authenticated'::regrole::oid] then raise exception 'session_notes_policy_contract_changed';end if;
  v_qual:=regexp_replace(pg_get_expr(v_policy.polqual,v_policy.polrelid),'[[:space:]()]','','g');
  v_expected:='SELECTprivate.has_student_capability'||v_item.table_name||'.client_id,''record.view''::textAShas_student_capability';
  if v_qual<>v_expected and v_qual<>'SELECTprivate.has_student_capabilityclient_id,''record.view''::textAShas_student_capability' then raise exception 'session_notes_policy_source_changed';end if;
  execute format('alter policy %I on public.%I using((select private.has_student_capability(client_id,''record.view'')) and (select private.has_student_capability(client_id,''student.view'')))',v_item.policy_name,v_item.table_name);
 end loop;
end;$migration$;
revoke all on function public.read_program_session_v2(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.read_program_session_v2(uuid,uuid) to authenticated;
commit;

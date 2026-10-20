-- Controlled clinical test-data cleanup. Accounts, memberships and clinics are preserved.
create table public.test_data_cleanup_log (
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),
  test_run_id uuid not null,actor_user_id uuid not null references auth.users(id),deleted_clients integer not null,
  summary jsonb not null,created_at timestamptz not null default now()
);
alter table public.test_data_cleanup_log enable row level security;
grant select on public.test_data_cleanup_log to authenticated;
create policy test_data_cleanup_log_read on public.test_data_cleanup_log for select to authenticated
  using ((select private.is_clinic_admin(organization_id)));

create function public.mvp_cleanup_test_run(p_organization_id uuid,p_test_run_id uuid,p_confirm text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_clients uuid[]; v_count integer; v_summary jsonb;
begin
  if not private.is_clinic_admin(p_organization_id) or p_test_run_id is null then
    raise exception using errcode='42501',message='clinic_admin_required'; end if;
  select coalesce(array_agg(id),'{}'::uuid[]) into v_clients from public.clients
    where organization_id=p_organization_id and test_run_id=p_test_run_id;
  v_count:=cardinality(v_clients);
  v_summary:=jsonb_build_object('test_run_id',p_test_run_id,'clients',v_count,
    'sessions',(select count(*) from public.clinical_sessions where client_id=any(v_clients)),
    'records',(select count(*) from public.session_program_records where client_id=any(v_clients)),
    'programs',(select count(*) from public.programs where client_id=any(v_clients)),
    'history',(select count(*) from public.clinical_history_entries where client_id=any(v_clients)));
  if p_confirm is distinct from 'DELETE TEST DATA '||p_test_run_id::text then
    return v_summary||jsonb_build_object('executed',false,'required_confirmation','DELETE TEST DATA '||p_test_run_id::text);
  end if;
  -- Children before parents; all predicates are tied to the clinic-scoped client set.
  delete from public.clinical_record_events where client_id=any(v_clients);
  delete from public.session_program_records where client_id=any(v_clients);
  delete from public.session_acquisition_trials where client_id=any(v_clients);
  delete from public.session_behavior_measurements where client_id=any(v_clients);
  delete from public.clinical_sessions where client_id=any(v_clients);
  delete from public.program_lifecycle_events where client_id=any(v_clients);
  update public.programs set current_version_id=null where client_id=any(v_clients);
  delete from public.program_versions where client_id=any(v_clients);
  delete from public.programs where client_id=any(v_clients);
  delete from public.consent_events where client_id=any(v_clients);
  delete from public.consent_records where client_id=any(v_clients);
  delete from public.clinical_history_entries where client_id=any(v_clients);
  delete from public.client_context_profiles where client_id=any(v_clients);
  delete from public.student_access_audit_events where client_id=any(v_clients);
  delete from public.student_authorization_decisions where client_id=any(v_clients);
  delete from public.student_authorization_requests where client_id=any(v_clients);
  delete from public.student_assignments where client_id=any(v_clients);
  delete from public.acquisition_goals where client_id=any(v_clients);
  delete from public.acquisition_programs where client_id=any(v_clients);
  delete from public.behavior_plans where client_id=any(v_clients);
  delete from public.assessments where client_id=any(v_clients);
  delete from public.guardians where client_id=any(v_clients);
  delete from public.siblings where client_id=any(v_clients);
  delete from public.clinical_audit_events
    where organization_id=p_organization_id
      and (client_id=any(v_clients) or test_run_id=p_test_run_id);
  delete from public.audit_events
    where organization_id=p_organization_id
      and (entity_id=any(v_clients) or test_run_id=p_test_run_id);
  delete from public.clients where id=any(v_clients) and organization_id=p_organization_id and test_run_id=p_test_run_id;
  insert into public.test_data_cleanup_log(organization_id,test_run_id,actor_user_id,deleted_clients,summary)
    values(p_organization_id,p_test_run_id,auth.uid(),v_count,v_summary);
  return v_summary||jsonb_build_object('executed',true);
end;
$$;
revoke all on function public.mvp_cleanup_test_run(uuid,uuid,text) from public,anon;
grant execute on function public.mvp_cleanup_test_run(uuid,uuid,text) to authenticated;

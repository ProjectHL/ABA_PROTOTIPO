-- Fase 2 of the simplification plan: drop dormant modules.
--
-- Chat has no route, navigation or UI since the V1 cleanup, and the clinical
-- foundation tables (assessments, acquisition programs/goals and behavior
-- plans with their session measurements) only appear in the untouched
-- foundation migration and the V1 cleanup RPC. Policies, indexes and audit
-- triggers go away with their tables.
--
-- `mvp_cleanup_test_run` keeps its test-batch contract; only the counters and
-- deletes for the removed foundation tables are dropped from it.

-- Chat: children before parents. Policies on these tables depend on
-- private.can_participate_chat_v2, so tables go first and functions after.
drop table if exists public.chat_message_attachments_v2;
drop table if exists public.chat_read_states_v2;
drop table if exists public.chat_messages_v2;
drop table if exists public.chat_participants_v2;
drop table if exists public.chat_conversations_v2;

drop function if exists public.aba_chat_messages_read_v2(uuid, uuid, bigint, integer);
drop function if exists public.aba_chat_read_v2(uuid);
drop function if exists public.aba_chat_command_v2(uuid, jsonb);
drop function if exists public.aba_chat_eligible_participants_v2(uuid, uuid);
drop function if exists private.a4_chat_command_impl(uuid, jsonb);
drop function if exists private.a4_chat_participant_kind_v2(uuid, uuid, uuid);
drop function if exists private.a4_chat_command_valid(jsonb);
drop function if exists private.can_participate_chat_v2(uuid);

-- Clinical foundation: the only remaining writer is create_clinical_session.
drop function if exists public.create_clinical_session(uuid, date, text, jsonb, jsonb, uuid);

drop table if exists public.session_acquisition_trials;
drop table if exists public.session_behavior_measurements;
drop table if exists public.acquisition_goals;
drop table if exists public.acquisition_programs;
drop table if exists public.behavior_plans;
drop table if exists public.assessments;

create or replace function public.mvp_cleanup_test_run(
  p_organization_id uuid,
  p_test_run_id uuid,
  p_confirm text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_batch public.test_data_batches;
  v_clients uuid[];
  v_count integer;
  v_summary jsonb;
begin
  if p_test_run_id is null or not private.is_clinic_admin(p_organization_id) then
    raise exception using errcode = '42501', message = 'clinic_admin_required';
  end if;

  select * into v_batch
  from public.test_data_batches b
  where b.organization_id = p_organization_id and b.id = p_test_run_id
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'test_batch_not_found';
  end if;
  if v_batch.status = 'cleaned' then
    return jsonb_build_object(
      'test_run_id', p_test_run_id,
      'status', 'cleaned',
      'executed', false,
      'already_cleaned', true
    );
  end if;

  select coalesce(array_agg(id),'{}'::uuid[]) into v_clients
  from public.clients
  where organization_id = p_organization_id and test_run_id = p_test_run_id;

  v_count := cardinality(v_clients);
  v_summary := jsonb_build_object(
    'test_run_id', p_test_run_id,
    'status', v_batch.status,
    'clients', v_count,
    'guardians', (select count(*) from public.guardians where client_id = any(v_clients)),
    'siblings', (select count(*) from public.siblings where client_id = any(v_clients)),
    'assignments', (select count(*) from public.student_assignments where client_id = any(v_clients)),
    'authorization_requests', (select count(*) from public.student_authorization_requests where client_id = any(v_clients)),
    'authorization_decisions', (select count(*) from public.student_authorization_decisions where client_id = any(v_clients)),
    'access_audit_events', (select count(*) from public.student_access_audit_events where client_id = any(v_clients)),
    'context_profiles', (select count(*) from public.client_context_profiles where client_id = any(v_clients)),
    'history', (select count(*) from public.clinical_history_entries where client_id = any(v_clients)),
    'consent_records', (select count(*) from public.consent_records where client_id = any(v_clients)),
    'consent_events', (select count(*) from public.consent_events where client_id = any(v_clients)),
    'programs', (select count(*) from public.programs where client_id = any(v_clients)),
    'program_versions', (select count(*) from public.program_versions where client_id = any(v_clients)),
    'program_lifecycle_events', (select count(*) from public.program_lifecycle_events where client_id = any(v_clients)),
    'sessions', (select count(*) from public.clinical_sessions where client_id = any(v_clients)),
    'records', (select count(*) from public.session_program_records where client_id = any(v_clients)),
    'record_events', (select count(*) from public.clinical_record_events where client_id = any(v_clients)),
    'clinical_audit_events', (
      select count(*) from public.clinical_audit_events
      where organization_id = p_organization_id
        and (client_id = any(v_clients) or test_run_id = p_test_run_id)
    ),
    'audit_events', (
      select count(*) from public.audit_events
      where organization_id = p_organization_id
        and (entity_id = any(v_clients) or test_run_id = p_test_run_id)
    )
  );

  if p_confirm is distinct from 'DELETE TEST DATA ' || p_test_run_id::text then
    return v_summary || jsonb_build_object(
      'executed', false,
      'required_confirmation', 'DELETE TEST DATA ' || p_test_run_id::text
    );
  end if;

  if v_batch.status <> 'frozen' then
    raise exception using errcode = '22023', message = 'test_batch_must_be_frozen';
  end if;

  delete from public.clinical_record_events where client_id = any(v_clients);
  delete from public.session_program_records where client_id = any(v_clients);
  delete from public.clinical_sessions where client_id = any(v_clients);
  delete from public.program_lifecycle_events where client_id = any(v_clients);
  update public.programs set current_version_id = null where client_id = any(v_clients);
  delete from public.program_versions where client_id = any(v_clients);
  delete from public.programs where client_id = any(v_clients);
  delete from public.consent_events where client_id = any(v_clients);
  delete from public.consent_records where client_id = any(v_clients);
  delete from public.clinical_history_entries where client_id = any(v_clients);
  delete from public.client_context_profiles where client_id = any(v_clients);
  delete from public.student_access_audit_events where client_id = any(v_clients);
  delete from public.student_authorization_decisions where client_id = any(v_clients);
  delete from public.student_authorization_requests where client_id = any(v_clients);
  delete from public.student_assignments where client_id = any(v_clients);
  delete from public.guardians where client_id = any(v_clients);
  delete from public.siblings where client_id = any(v_clients);
  delete from public.clinical_audit_events
  where organization_id = p_organization_id
    and (client_id = any(v_clients) or test_run_id = p_test_run_id);
  delete from public.audit_events
  where organization_id = p_organization_id
    and (entity_id = any(v_clients) or test_run_id = p_test_run_id);
  delete from public.clients
  where id = any(v_clients)
    and organization_id = p_organization_id
    and test_run_id = p_test_run_id;

  update public.test_data_batches
  set status = 'cleaned', cleaned_at = now()
  where organization_id = p_organization_id and id = p_test_run_id;

  insert into public.test_data_cleanup_log(
    organization_id, test_run_id, actor_user_id, deleted_clients, summary
  ) values (
    p_organization_id, p_test_run_id, (select auth.uid()), v_count, v_summary
  );

  return v_summary || jsonb_build_object('status', 'cleaned', 'executed', true);
end;
$$;

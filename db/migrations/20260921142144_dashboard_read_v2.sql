-- A6/R3: one policy-aware dashboard projection. Achievement is sourced only
-- from the explicit program lifecycle, never inferred from measurement trends.
create function public.aba_dashboard_read_v2(p_organization_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
  with visible_clients as materialized(
    select client.id,client.organization_id,client.clinical_id,client.initials,
      coalesce(nullif(btrim(profile.full_name),''),client.initials) display_name,client.status
    from public.clients client
    left join public.client_profiles_v2 profile on profile.organization_id=client.organization_id and profile.client_id=client.id
    where client.organization_id=p_organization_id
      and private.has_student_capability(client.id,'student.view')
  ), visible_programs as materialized(
    select program.*,version.title current_title
    from public.programs program join visible_clients client on client.id=program.client_id
    left join public.program_versions version on version.id=program.current_version_id
    where private.has_student_capability(program.client_id,'program.view')
  ), visible_sessions as materialized(
    select session.*,client.display_name,client.clinical_id
    from public.clinical_session_v2_state session join visible_clients client on client.id=session.client_id
    where private.has_student_capability(session.client_id,'record.view')
  ), session_items as(
    select session.*,coalesce((select jsonb_agg(jsonb_build_object('id',program.id,'title',coalesce(program.current_title,'Programa sin título')) order by program.current_title)
      from jsonb_array_elements(session.selected_programs) reference
      join visible_programs program on program.id=(reference->>'programId')::uuid
      where jsonb_typeof(reference)='object' and (reference->>'programId')~*'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),'[]'::jsonb) programs
    from visible_sessions session
  ), achievements as(
    select event.id,event.client_id,event.program_id,event.created_at,client.display_name,client.clinical_id,
      coalesce(version.title,program.current_title,'Programa sin título') title
    from public.program_lifecycle_events event
    join visible_clients client on client.id=event.client_id
    join visible_programs program on program.id=event.program_id
    left join public.program_versions version on version.id=event.program_version_id
    where event.organization_id=p_organization_id and event.action='achieved'
  ), activity as(
    select activity_date,sum(finished)::integer finished_sessions,sum(submitted)::integer submitted_records from(
      select date_trunc('day',session.updated_at)::date as activity_date,count(*) filter(where session.status='finished') finished,0 submitted
      from visible_sessions session where session.updated_at>=current_date-89 group by 1
      union all
      select date_trunc('day',record.submitted_at)::date as activity_date,0,count(*) filter(where record.state='submitted') submitted
      from public.session_program_records_v2 record join visible_clients client on client.id=record.client_id
      where record.organization_id=p_organization_id and private.has_student_capability(record.client_id,'record.view')
        and record.submitted_at>=current_date-89 group by 1
    ) source group by activity_date
  )
  select jsonb_build_object(
    'actorId',auth.uid(),'generatedAt',now(),
    'counts',jsonb_build_object(
      'activeStudents',(select count(*) from visible_clients where status='active'),
      'activePrograms',(select count(*) from visible_programs where status='active'),
      'activeSessions',(select count(*) from visible_sessions where status in ('active','paused')),
      'finishedSessions',(select count(*) from visible_sessions where status='finished'),
      'achievements',(select count(*) from achievements)
    ),
    'activeSessions',coalesce((select jsonb_agg(jsonb_build_object('id',session.session_id,'studentId',session.client_id,'studentName',session.display_name,'clinicalId',session.clinical_id,'status',session.status,'capturedAt',session.captured_at,'updatedAt',session.updated_at,'programs',session.programs) order by session.updated_at desc) from session_items session where session.status in ('active','paused')),'[]'::jsonb),
    'finishedSessions',coalesce((select jsonb_agg(item order by item->>'updatedAt' desc) from(select jsonb_build_object('id',session.session_id,'studentId',session.client_id,'studentName',session.display_name,'clinicalId',session.clinical_id,'status',session.status,'capturedAt',session.captured_at,'updatedAt',session.updated_at,'programs',session.programs) item from session_items session where session.status='finished' order by session.updated_at desc limit 20) recent),'[]'::jsonb),
    'achievements',coalesce((select jsonb_agg(jsonb_build_object('id',achievement.id,'studentId',achievement.client_id,'studentName',achievement.display_name,'clinicalId',achievement.clinical_id,'programId',achievement.program_id,'programTitle',achievement.title,'achievedAt',achievement.created_at) order by achievement.created_at desc) from achievements achievement),'[]'::jsonb),
    'activity',coalesce((select jsonb_agg(jsonb_build_object('date',activity.activity_date,'finishedSessions',activity.finished_sessions,'submittedRecords',activity.submitted_records) order by activity.activity_date) from activity),'[]'::jsonb)
  )
  where auth.uid() is not null and p_organization_id is not null
    and exists(select 1 from public.memberships membership where membership.organization_id=p_organization_id and membership.user_id=auth.uid() and membership.status='active');
$$;
revoke all on function public.aba_dashboard_read_v2(uuid) from public,anon,authenticated,service_role;
grant execute on function public.aba_dashboard_read_v2(uuid) to authenticated;
comment on function public.aba_dashboard_read_v2(uuid) is 'A6 authorized persisted dashboard. Explicit lifecycle achievements only; no inferred clinical improvement.';

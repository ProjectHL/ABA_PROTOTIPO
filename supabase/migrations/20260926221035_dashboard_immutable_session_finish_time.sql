-- R4: a soft archive must not move a performed session to the archive date.
-- Use the persisted finished event; never synthesize a missing close timestamp.
-- R4: preserve invoker dashboard policies and durable per-recipient reminders.
create or replace function public.aba_dashboard_read_v2(p_organization_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
  with visible_clients as materialized(
    select client.id,client.organization_id,client.clinical_id,client.initials,
      coalesce(nullif(btrim(profile.full_name),''),client.initials) display_name,client.status
    from public.clients client left join public.client_profiles_v2 profile
      on profile.organization_id=client.organization_id and profile.client_id=client.id
    where client.organization_id=p_organization_id and 'student.view'=any(public.get_student_capabilities(client.id))
  ), visible_programs as materialized(
    select program.*,version.title current_title from public.programs program
    join visible_clients client on client.id=program.client_id
    left join public.program_versions version on version.id=program.current_version_id
    where 'program.view'=any(public.get_student_capabilities(program.client_id))
  ), visible_sessions as materialized(
    select session.*,client.display_name,client.clinical_id,
      (select max(event.occurred_at) from public.clinical_session_v2_events event
        where event.organization_id=session.organization_id and event.client_id=session.client_id
          and event.session_id=session.session_id and event.event_type='finished') finished_at from public.clinical_session_v2_state session
    join visible_clients client on client.id=session.client_id
    where 'record.view'=any(public.get_student_capabilities(session.client_id))
  ), session_items as(
    select session.*,coalesce((select jsonb_agg(jsonb_build_object('id',program.id,'title',coalesce(program.current_title,'Programa sin título')) order by program.current_title)
      from jsonb_array_elements(session.selected_programs) reference join visible_programs program on program.id=(reference->>'programId')::uuid
      where jsonb_typeof(reference)='object' and (reference->>'programId')~*'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),'[]'::jsonb) programs
    from visible_sessions session
  ), achievements as(
    select event.id,event.client_id,event.program_id,event.created_at,client.display_name,client.clinical_id,
      coalesce(version.title,program.current_title,'Programa sin título') title
    from public.program_lifecycle_events event join visible_clients client on client.id=event.client_id
    join visible_programs program on program.id=event.program_id left join public.program_versions version on version.id=event.program_version_id
    where event.organization_id=p_organization_id and event.action='achieved'
  ), activity_by_student as(
    select client_id,activity_date,sum(finished)::integer finished_sessions,sum(submitted)::integer submitted_records from(
      select session.client_id,(session.finished_at at time zone 'UTC')::date activity_date,
        count(*) finished,0 submitted
      from visible_sessions session
      where session.status='finished' and session.finished_at>=least(date_trunc('year',now() at time zone 'UTC') at time zone 'UTC',
        ((now() at time zone 'UTC')::date-89)::timestamp at time zone 'UTC') group by 1,2
      union all
      select record.client_id,(record.submitted_at at time zone 'UTC')::date activity_date,
        0,count(*) filter(where record.state='submitted') submitted
      from public.session_program_records_v2 record join visible_clients client on client.id=record.client_id
      where record.organization_id=p_organization_id and 'record.view'=any(public.get_student_capabilities(record.client_id))
        and record.submitted_at>=least(date_trunc('year',now() at time zone 'UTC') at time zone 'UTC',
          ((now() at time zone 'UTC')::date-89)::timestamp at time zone 'UTC') group by 1,2
    ) source group by client_id,activity_date
  ), activity as(
    select activity_date,sum(finished_sessions)::integer finished_sessions,
      sum(submitted_records)::integer submitted_records from activity_by_student group by activity_date
  )
  select jsonb_build_object('actorId',auth.uid(),'clinicId',p_organization_id,'generatedAt',now(),
    'students',coalesce((select jsonb_agg(jsonb_build_object('id',id,'displayName',display_name) order by display_name,id) from visible_clients),'[]'::jsonb),
    'activityByStudent',coalesce((select jsonb_agg(jsonb_build_object('studentId',client_id,'date',activity_date,'finishedSessions',finished_sessions,'submittedRecords',submitted_records) order by activity_date,client_id) from activity_by_student),'[]'::jsonb),'counts',jsonb_build_object(
    'activeStudents',(select count(*) from visible_clients where status='active'),'activePrograms',(select count(*) from visible_programs where status='active'),
    'activeSessions',(select count(*) from visible_sessions where status in ('active','paused')),'finishedSessions',(select count(*) from visible_sessions where status='finished'),'achievements',(select count(*) from achievements)),
    'activeSessions',coalesce((select jsonb_agg(jsonb_build_object('id',s.session_id,'studentId',s.client_id,'studentName',s.display_name,'clinicalId',s.clinical_id,'status',s.status,'capturedAt',s.captured_at,'updatedAt',s.updated_at,'finishedAt',s.finished_at,'programs',s.programs) order by s.updated_at desc) from session_items s where s.status in ('active','paused')),'[]'::jsonb),
    'finishedSessions',coalesce((select jsonb_agg(item order by item->>'finishedAt' desc nulls last) from(select jsonb_build_object('id',s.session_id,'studentId',s.client_id,'studentName',s.display_name,'clinicalId',s.clinical_id,'status',s.status,'capturedAt',s.captured_at,'updatedAt',s.updated_at,'finishedAt',s.finished_at,'programs',s.programs) item from session_items s where s.status='finished' order by s.finished_at desc nulls last,s.session_id limit 20) recent),'[]'::jsonb),
    'achievements',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'studentId',a.client_id,'studentName',a.display_name,'clinicalId',a.clinical_id,'programId',a.program_id,'programTitle',a.title,'achievedAt',a.created_at) order by a.created_at desc) from achievements a),'[]'::jsonb),
    'activity',coalesce((select jsonb_agg(jsonb_build_object('date',a.activity_date,'finishedSessions',a.finished_sessions,'submittedRecords',a.submitted_records) order by a.activity_date) from activity a),'[]'::jsonb))
  where auth.uid() is not null and p_organization_id is not null and exists(select 1 from public.memberships m where m.organization_id=p_organization_id and m.user_id=auth.uid() and m.status='active');
$$;
revoke all on function public.aba_dashboard_read_v2(uuid) from public,anon,authenticated,service_role;
grant execute on function public.aba_dashboard_read_v2(uuid) to authenticated;

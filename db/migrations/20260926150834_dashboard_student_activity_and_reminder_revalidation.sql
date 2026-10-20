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
    select session.*,client.display_name,client.clinical_id from public.clinical_session_v2_state session
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
      select session.client_id,(session.updated_at at time zone 'UTC')::date activity_date,
        count(*) filter(where session.status='finished') finished,0 submitted
      from visible_sessions session
      where session.updated_at>=least(date_trunc('year',now() at time zone 'UTC') at time zone 'UTC',
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
    'activeSessions',coalesce((select jsonb_agg(jsonb_build_object('id',s.session_id,'studentId',s.client_id,'studentName',s.display_name,'clinicalId',s.clinical_id,'status',s.status,'capturedAt',s.captured_at,'updatedAt',s.updated_at,'programs',s.programs) order by s.updated_at desc) from session_items s where s.status in ('active','paused')),'[]'::jsonb),
    'finishedSessions',coalesce((select jsonb_agg(item order by item->>'updatedAt' desc) from(select jsonb_build_object('id',s.session_id,'studentId',s.client_id,'studentName',s.display_name,'clinicalId',s.clinical_id,'status',s.status,'capturedAt',s.captured_at,'updatedAt',s.updated_at,'programs',s.programs) item from session_items s where s.status='finished' order by s.updated_at desc limit 20) recent),'[]'::jsonb),
    'achievements',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'studentId',a.client_id,'studentName',a.display_name,'clinicalId',a.clinical_id,'programId',a.program_id,'programTitle',a.title,'achievedAt',a.created_at) order by a.created_at desc) from achievements a),'[]'::jsonb),
    'activity',coalesce((select jsonb_agg(jsonb_build_object('date',a.activity_date,'finishedSessions',a.finished_sessions,'submittedRecords',a.submitted_records) order by a.activity_date) from activity a),'[]'::jsonb))
  where auth.uid() is not null and p_organization_id is not null and exists(select 1 from public.memberships m where m.organization_id=p_organization_id and m.user_id=auth.uid() and m.status='active');
$$;
revoke all on function public.aba_dashboard_read_v2(uuid) from public,anon,authenticated,service_role;
grant execute on function public.aba_dashboard_read_v2(uuid) to authenticated;

-- Eligibility must be read under live resource/identity locks, not only in candidate selection.
create or replace function public.aba_due_reminders_dispatch_v2(p_limit integer default 100)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_actor uuid:=auth.uid();v_reminder public.appointment_reminders_v2;
  v_appointment public.appointments_v2;v_notification_id uuid;v_count integer:=0;
  v_path text;v_is_family boolean;v_recipient_count integer;v_missing_count integer;
begin
  if v_actor is null then raise exception using errcode='42501',message='authenticated_identity_required'; end if;
  if p_limit is null or p_limit not between 1 and 500 then
    raise exception using errcode='22023',message='reminder_dispatch_limit_invalid';
  end if;
  for v_reminder in
    select reminder.* from public.appointment_reminders_v2 reminder
    join public.appointments_v2 appointment on appointment.organization_id=reminder.organization_id
      and appointment.client_id=reminder.client_id and appointment.id=reminder.appointment_id
    where reminder.state='scheduled' and reminder.archived_at is null
      and reminder.due_at is not null and reminder.due_at<=now() and appointment.status='scheduled'
      and (
        exists(select 1 from public.appointment_participants_v2 participant
          join public.memberships membership on membership.organization_id=participant.organization_id
            and membership.user_id=participant.professional_user_id and membership.status='active'
          where participant.appointment_id=appointment.id and participant.archived_at is null
            and participant.participant_kind='professional' and participant.professional_user_id=v_actor)
        or exists(select 1 from public.appointment_participants_v2 participant
          join public.family_access_links_v2 access on access.organization_id=participant.organization_id
            and access.client_id=participant.client_id and access.family_person_id=participant.family_person_id
            and access.status='active' and access.recipient_user_id=v_actor
          where participant.appointment_id=appointment.id and participant.archived_at is null
            and participant.participant_kind='family')
      )
    order by reminder.organization_id,reminder.due_at,reminder.id limit p_limit
  loop
    -- Same clinic calendar lock as mutation; clinics are acquired in UUID order.
    -- Cancellation/replanning cannot change appointment/participants/reminders here.
    perform pg_advisory_xact_lock(hashtextextended('calendar:'||v_reminder.organization_id::text,0));
    perform 1 from public.organizations
      where id=v_reminder.organization_id and status='active' for share;
    if not found then continue; end if;
    perform 1 from public.clients where organization_id=v_reminder.organization_id
      and id=v_reminder.client_id and status='active' for share;
    if not found then continue; end if;
    select * into v_appointment from public.appointments_v2
      where id=v_reminder.appointment_id and organization_id=v_reminder.organization_id
        and client_id=v_reminder.client_id for update;
    if not found or v_appointment.status<>'scheduled' then continue; end if;
    select * into v_reminder from public.appointment_reminders_v2
      where id=v_reminder.id and appointment_id=v_appointment.id for update;
    if not found or v_reminder.state<>'scheduled' or v_reminder.archived_at is not null
      or v_reminder.due_at is null or v_reminder.due_at>now() then continue; end if;
    if exists(select 1 from private.appointment_reminder_deliveries_v2 delivery
      where delivery.reminder_id=v_reminder.id and delivery.user_id=v_actor) then continue; end if;

    perform 1 from public.appointment_participants_v2 participant
      where participant.appointment_id=v_appointment.id order by participant.id for share;
    perform 1 from public.memberships membership
      where membership.organization_id=v_appointment.organization_id
        and membership.user_id in(select professional_user_id from public.appointment_participants_v2
          where appointment_id=v_appointment.id and participant_kind='professional')
      order by membership.user_id for share;
    perform 1 from public.client_people_v2 person
      where person.organization_id=v_appointment.organization_id and person.client_id=v_appointment.client_id
        and person.id in(select family_person_id from public.appointment_participants_v2
          where appointment_id=v_appointment.id and participant_kind='family')
      order by person.id for share;
    -- Lock all states: a concurrent accept/revoke must finish before eligibility is read.
    perform 1 from public.family_access_links_v2 access
      where access.organization_id=v_appointment.organization_id and access.client_id=v_appointment.client_id
        and access.family_person_id in(select family_person_id from public.appointment_participants_v2
          where appointment_id=v_appointment.id and participant_kind='family')
      order by access.id for share;

    select exists(select 1 from public.appointment_participants_v2 participant
      join public.family_access_links_v2 access on access.organization_id=participant.organization_id
        and access.client_id=participant.client_id and access.family_person_id=participant.family_person_id
        and access.status='active' and access.recipient_user_id=v_actor
      join public.client_people_v2 person on person.id=participant.family_person_id
        and person.organization_id=participant.organization_id and person.client_id=participant.client_id
        and person.archived_at is null and 'family'=any(person.roles)
      where participant.appointment_id=v_appointment.id and participant.archived_at is null
        and participant.participant_kind='family') into v_is_family;
    if not v_is_family and not exists(
      select 1 from public.appointment_participants_v2 participant
      join public.memberships membership on membership.organization_id=participant.organization_id
        and membership.user_id=participant.professional_user_id and membership.status='active'
      where participant.appointment_id=v_appointment.id and participant.archived_at is null
        and participant.participant_kind='professional' and participant.professional_user_id=v_actor
    ) then continue; end if;
    v_path:=case when v_is_family then '/family' else '/calendar' end;
    v_notification_id:=gen_random_uuid();
    insert into public.user_notifications_v2(id,user_id,organization_id,kind,title,body,resource_path,test_run_id)
    values(v_notification_id,v_actor,v_reminder.organization_id,'reminder','Recordatorio de cita',
      v_appointment.title||' · '||to_char(v_appointment.starts_at at time zone v_appointment.time_zone,'DD-MM-YYYY HH24:MI'),
      v_path,v_reminder.test_run_id);
    insert into private.appointment_reminder_deliveries_v2(
      reminder_id,user_id,organization_id,notification_id,test_run_id)
    values(v_reminder.id,v_actor,v_reminder.organization_id,v_notification_id,v_reminder.test_run_id);
    v_count:=v_count+1;
    with recipients as(
      select participant.professional_user_id user_id
      from public.appointment_participants_v2 participant
      join public.memberships membership on membership.organization_id=participant.organization_id
        and membership.user_id=participant.professional_user_id and membership.status='active'
      where participant.appointment_id=v_appointment.id and participant.archived_at is null
        and participant.participant_kind='professional'
      union
      select access.recipient_user_id
      from public.appointment_participants_v2 participant
      join public.family_access_links_v2 access on access.organization_id=participant.organization_id
        and access.client_id=participant.client_id and access.family_person_id=participant.family_person_id
        and access.status='active' and access.recipient_user_id is not null
      join public.client_people_v2 person on person.id=participant.family_person_id
        and person.organization_id=participant.organization_id and person.client_id=participant.client_id
        and person.archived_at is null and 'family'=any(person.roles)
      where participant.appointment_id=v_appointment.id and participant.archived_at is null
        and participant.participant_kind='family'
    )
    select count(*),count(*) filter(where delivery.user_id is null)
      into v_recipient_count,v_missing_count from recipients
      left join private.appointment_reminder_deliveries_v2 delivery
        on delivery.reminder_id=v_reminder.id and delivery.user_id=recipients.user_id;
    if v_recipient_count>0 and v_missing_count=0 then
      update public.appointment_reminders_v2 set state='sent',sent_at=now()
        where id=v_reminder.id and state='scheduled';
    end if;
  end loop;
  return jsonb_build_object('actorId',v_actor,'dispatchedCount',v_count,'dispatchedAt',now());
end;
$$;

revoke all on function public.aba_due_reminders_dispatch_v2(integer)
from public,anon,authenticated,service_role;
grant execute on function public.aba_due_reminders_dispatch_v2(integer) to authenticated;

comment on table private.appointment_reminder_deliveries_v2 is
  'Durable per-recipient local reminder receipts. A scheduled reminder becomes sent only after every current eligible participant has a receipt.';
comment on function public.aba_due_reminders_dispatch_v2(integer) is
  'Idempotently materializes due reminders only for the authenticated eligible appointment participant.';

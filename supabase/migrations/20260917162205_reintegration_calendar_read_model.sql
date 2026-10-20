-- Read model for the existing calendar adapter. Labels never infer missing names.
create function public.aba_calendar_read_v2(p_organization_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_students jsonb; v_professionals jsonb; v_appointments jsonb;
begin
  if v_actor is null or not exists(
    select 1 from public.memberships m join public.organizations o on o.id=m.organization_id
    where m.organization_id=p_organization_id and m.user_id=v_actor
      and m.status='active' and o.status='active'
  ) then raise exception using errcode='42501',message='active_membership_required'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',c.id,'displayName',coalesce(p.full_name,c.initials),'initials',c.initials,
    'familyParticipants',(select coalesce(jsonb_agg(jsonb_build_object(
      'kind','family','personId',f.id,'label',coalesce(f.full_name,f.initials)) order by f.id),'[]'::jsonb)
      from public.client_people_v2 f where f.organization_id=c.organization_id and f.client_id=c.id
        and f.archived_at is null and 'family'=any(f.roles))
    ) order by c.initials,c.id),'[]'::jsonb) into v_students
    from public.clients c left join public.client_profiles_v2 p on p.organization_id=c.organization_id and p.client_id=c.id
    where c.organization_id=p_organization_id and c.status='active' and private.has_student_capability(c.id,'student.view');
  select coalesce(jsonb_agg(jsonb_build_object(
    'kind','professional','userId',m.user_id,'label',coalesce(nullif(btrim(p.name),''),'Profesional '||m.user_id::text))
    order by m.user_id),'[]'::jsonb) into v_professionals
    from public.memberships m left join public.professional_profiles p on p.user_id=m.user_id
    where m.organization_id=p_organization_id and m.status='active';
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',a.id,'clinicId',a.organization_id,'studentId',a.client_id,'version',a.version,
    'title',a.title,'notes',a.notes,'startsAt',a.starts_at,'endsAt',a.ends_at,'timeZone',a.time_zone,
    'recurrence',s.weekly_rule,'seriesId',a.series_id,'seriesVersion',s.version,
    'originalLocalDate',a.original_local_date,'linkedSessionId',a.linked_session_id,
    'status',a.status,'cancelledAt',a.cancelled_at,'cancellationReason',a.cancellation_reason,
    'participants',(select coalesce(jsonb_agg(
      case when ap.participant_kind='professional' then jsonb_build_object(
        'kind','professional','userId',ap.professional_user_id,
        'label',coalesce(nullif(btrim(pp.name),''),'Profesional '||ap.professional_user_id::text))
      else jsonb_build_object('kind','family','personId',ap.family_person_id,'label',coalesce(fp.full_name,fp.initials))
      end order by ap.id),'[]'::jsonb)
      from public.appointment_participants_v2 ap
      left join public.professional_profiles pp on pp.user_id=ap.professional_user_id
      left join public.client_people_v2 fp on fp.organization_id=ap.organization_id
        and fp.client_id=ap.client_id and fp.id=ap.family_person_id
      where ap.appointment_id=a.id and ap.organization_id=a.organization_id and ap.archived_at is null),
    'reminders',(select coalesce(jsonb_agg(jsonb_build_object(
      'id',r.id,'minutesBefore',r.minutes_before,'state',r.state,'dueAt',r.due_at)
      order by r.minutes_before),'[]'::jsonb)
      from public.appointment_reminders_v2 r where r.appointment_id=a.id
        and r.organization_id=a.organization_id and r.archived_at is null)
    ) order by a.starts_at,a.id),'[]'::jsonb) into v_appointments
    from public.appointments_v2 a left join public.appointment_series_v2 s
      on s.organization_id=a.organization_id and s.client_id=a.client_id and s.id=a.series_id
    where a.organization_id=p_organization_id and private.has_student_capability(a.client_id,'student.view');
  return jsonb_build_object('clinicId',p_organization_id,'actorId',v_actor,
    'timeZone','America/Santiago','students',v_students,'professionals',v_professionals,'appointments',v_appointments);
end;
$$;
revoke all on function public.aba_calendar_read_v2(uuid) from public,anon,authenticated,service_role;
grant execute on function public.aba_calendar_read_v2(uuid) to authenticated;

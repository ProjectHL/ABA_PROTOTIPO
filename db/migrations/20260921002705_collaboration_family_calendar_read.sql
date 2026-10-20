-- Read-only family agenda. Visibility requires both an active family access link
-- and explicit participation of that same family person in the appointment.
create function public.aba_family_calendar_read_v2(p_organization_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_actor uuid:=auth.uid();v_rows jsonb;
begin
  if v_actor is null then raise exception using errcode='42501',message='authenticated_identity_required'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',appointment.id,'clinicId',appointment.organization_id,'studentId',appointment.client_id,
    'studentLabel',coalesce(profile.full_name,client.initials),
    'familyPersonId',participant.family_person_id,'familyPersonLabel',coalesce(person.full_name,person.initials),
    'title',appointment.title,'startsAt',appointment.starts_at,'endsAt',appointment.ends_at,
    'timeZone',appointment.time_zone,'status',appointment.status,
    'cancelledAt',appointment.cancelled_at,'cancellationReason',appointment.cancellation_reason
  ) order by appointment.starts_at,appointment.id),'[]'::jsonb) into v_rows
  from public.appointments_v2 appointment
  join public.appointment_participants_v2 participant on participant.appointment_id=appointment.id
    and participant.organization_id=appointment.organization_id and participant.client_id=appointment.client_id
    and participant.participant_kind='family' and participant.archived_at is null
  join public.family_access_links_v2 access on access.organization_id=appointment.organization_id
    and access.client_id=appointment.client_id and access.family_person_id=participant.family_person_id
    and access.status='active' and access.recipient_user_id=v_actor
  join public.client_people_v2 person on person.organization_id=participant.organization_id
    and person.client_id=participant.client_id and person.id=participant.family_person_id
    and person.archived_at is null
  join public.clients client on client.organization_id=appointment.organization_id
    and client.id=appointment.client_id and client.status='active'
  left join public.client_profiles_v2 profile on profile.organization_id=client.organization_id
    and profile.client_id=client.id
  where appointment.organization_id=p_organization_id
    and (appointment.test_run_id is null or exists(select 1 from public.test_data_batches batch
      where batch.organization_id=appointment.organization_id and batch.id=appointment.test_run_id
        and batch.status='open'));
  return jsonb_build_object('clinicId',p_organization_id,'actorId',v_actor,'appointments',v_rows);
end;
$$;

revoke all on function public.aba_family_calendar_read_v2(uuid)
from public,anon,authenticated,service_role;
grant execute on function public.aba_family_calendar_read_v2(uuid) to authenticated;

comment on function public.aba_family_calendar_read_v2(uuid) is
  'Family-only agenda projection: exact active family identity plus explicit appointment participation; no general calendar or clinical read.';

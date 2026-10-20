-- Do not let already-delivered rows consume p_limit and starve new pending receipts.
-- Preserve all live revalidation/locks from the preceding migration.
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
      and not exists(select 1 from private.appointment_reminder_deliveries_v2 delivery
        where delivery.reminder_id=reminder.id and delivery.user_id=v_actor)
      and exists(select 1 from public.organizations where id=reminder.organization_id and status='active')
      and exists(select 1 from public.clients where id=reminder.client_id
        and organization_id=reminder.organization_id and status='active')
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
          join public.client_people_v2 person on person.id=participant.family_person_id
            and person.organization_id=participant.organization_id and person.client_id=participant.client_id
            and person.archived_at is null and 'family'=any(person.roles)
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

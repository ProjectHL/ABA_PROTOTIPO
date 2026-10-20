create table private.appointment_reminder_deliveries_v2(
  reminder_id uuid not null references public.appointment_reminders_v2(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  notification_id uuid not null references public.user_notifications_v2(id) on delete restrict,
  delivered_at timestamptz not null default now(),
  test_run_id uuid,
  primary key(reminder_id,user_id),unique(notification_id),
  foreign key(organization_id,test_run_id) references public.test_data_batches(organization_id,id) on delete restrict
);
create index appointment_reminder_deliveries_user_idx
  on private.appointment_reminder_deliveries_v2(user_id,delivered_at desc);
alter table private.appointment_reminder_deliveries_v2 enable row level security;
revoke all on table private.appointment_reminder_deliveries_v2 from public,anon,authenticated,service_role;

create function public.aba_due_reminders_dispatch_v2(p_limit integer default 100)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_actor uuid:=auth.uid();v_reminder public.appointment_reminders_v2;
  v_appointment public.appointments_v2;v_notification_id uuid;v_count integer:=0;
  v_path text;v_recipient_count integer;v_missing_count integer;
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
    order by reminder.due_at,reminder.id limit p_limit
  loop
    perform pg_advisory_xact_lock(hashtextextended('reminder-delivery:'||v_reminder.id::text||':'||v_actor::text,0));
    if exists(select 1 from private.appointment_reminder_deliveries_v2 delivery
      where delivery.reminder_id=v_reminder.id and delivery.user_id=v_actor) then continue; end if;
    select * into strict v_appointment from public.appointments_v2 appointment
      where appointment.id=v_reminder.appointment_id and appointment.organization_id=v_reminder.organization_id;
    v_path:=case when exists(select 1 from public.appointment_participants_v2 participant
      join public.family_access_links_v2 access on access.organization_id=participant.organization_id
        and access.client_id=participant.client_id and access.family_person_id=participant.family_person_id
        and access.status='active' and access.recipient_user_id=v_actor
      where participant.appointment_id=v_appointment.id and participant.archived_at is null
        and participant.participant_kind='family') then '/family' else '/calendar' end;
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

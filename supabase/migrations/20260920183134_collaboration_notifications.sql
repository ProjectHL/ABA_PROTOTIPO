create table public.user_notifications_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  kind text not null check(kind in ('share-invited','share-accepted','share-rejected','share-level-changed','share-revoked','reminder')),
  title text not null check(char_length(btrim(title)) between 1 and 200),
  body text not null check(char_length(body)<=2000),
  resource_path text not null check(resource_path ~ '^/[a-z0-9/_?-]+$' and char_length(resource_path)<=500),
  share_event_id uuid references public.student_share_events_v2(id) on delete restrict,
  read_at timestamptz,
  version bigint not null default 1 check(version between 1 and 9007199254740991),
  created_at timestamptz not null default now(),
  test_run_id uuid,
  foreign key(organization_id,test_run_id) references public.test_data_batches(organization_id,id) on delete restrict,
  unique(share_event_id,user_id)
);
create index user_notifications_user_created_idx on public.user_notifications_v2(user_id,created_at desc);
create index user_notifications_user_unread_idx on public.user_notifications_v2(user_id,created_at desc) where read_at is null;
create index user_notifications_test_run_idx on public.user_notifications_v2(organization_id,test_run_id) where test_run_id is not null;
alter table public.user_notifications_v2 enable row level security;
revoke all on table public.user_notifications_v2 from public,anon,authenticated,service_role;
grant select on table public.user_notifications_v2 to authenticated;
create policy user_notifications_select_v2 on public.user_notifications_v2 for select to authenticated
using(user_id=(select auth.uid()));

create function private.a4_notify_share_event_v2()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_invitation public.student_share_invitations_v2;v_target uuid;v_kind text;v_title text;v_body text;
begin
  select * into strict v_invitation from public.student_share_invitations_v2 where id=new.invitation_id;
  if new.event_type='invited' then v_target:=v_invitation.recipient_user_id;v_kind:='share-invited';v_title:='Nueva invitación';v_body:='Recibiste acceso a una ficha.';
  elsif new.event_type='accepted' then v_target:=v_invitation.invited_by;v_kind:='share-accepted';v_title:='Invitación aceptada';v_body:='El profesional aceptó el acceso compartido.';
  elsif new.event_type='rejected' then v_target:=v_invitation.invited_by;v_kind:='share-rejected';v_title:='Invitación rechazada';v_body:='El profesional rechazó el acceso compartido.';
  elsif new.event_type='level-changed' then v_target:=v_invitation.accepted_by;v_kind:='share-level-changed';v_title:='Nivel de acceso actualizado';v_body:='Cambió tu nivel de acceso a una ficha.';
  elsif new.event_type='revoked' then v_target:=v_invitation.accepted_by;v_kind:='share-revoked';v_title:='Acceso revocado';v_body:='Tu acceso a una ficha fue revocado.';
  else return new;end if;
  if v_target is not null then
    insert into public.user_notifications_v2(user_id,organization_id,kind,title,body,resource_path,share_event_id,test_run_id)
    values(v_target,new.organization_id,v_kind,v_title,v_body,'/invitations',new.id,new.test_run_id)
    on conflict(share_event_id,user_id) do nothing;
  end if;
  return new;
end;
$$;
create trigger student_share_event_notification_v2 after insert on public.student_share_events_v2
for each row execute function private.a4_notify_share_event_v2();

create function public.aba_notifications_read_v2(p_limit integer default 50)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('actorId',auth.uid(),'notifications',coalesce(jsonb_agg(item order by created_at desc),'[]'::jsonb))
  from(select n.created_at,jsonb_build_object('id',n.id,'clinicId',n.organization_id,'kind',n.kind,
    'title',n.title,'body',n.body,'resourcePath',n.resource_path,'readAt',n.read_at,
    'version',n.version,'createdAt',n.created_at) item
    from public.user_notifications_v2 n where auth.uid() is not null and n.user_id=auth.uid()
    order by n.created_at desc limit greatest(1,least(coalesce(p_limit,50),100))) q;
$$;

create function public.aba_notification_read_state_v2(
  p_notification_id uuid,p_read boolean,p_expected_version bigint,p_operation_id uuid,p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_row public.user_notifications_v2;v_payload jsonb;v_replay jsonb;
begin
  if v_actor is null or p_notification_id is null or p_read is null or p_expected_version is null
    or p_operation_id is null or p_idempotency_key is null then
    raise exception using errcode='22023',message='notification_command_invalid';
  end if;
  select * into v_row from public.user_notifications_v2 where id=p_notification_id;
  if not found or v_row.user_id<>v_actor then
    return private.command_rejected_result(p_operation_id,p_idempotency_key,p_notification_id,'permission-denied','Notificación no disponible.');
  end if;
  v_payload:=jsonb_build_object('notificationId',p_notification_id,'read',p_read,
    'expectedVersion',p_expected_version,'operationId',p_operation_id,'idempotencyKey',p_idempotency_key);
  v_replay:=private.command_identity_or_replay_result(v_row.organization_id,p_operation_id,p_idempotency_key,
    p_notification_id,'notification-read-v2',v_payload);
  if v_replay is not null then
    if not exists(select 1 from public.user_notifications_v2 where id=p_notification_id and user_id=v_actor) then
      return private.command_rejected_result(p_operation_id,p_idempotency_key,p_notification_id,'permission-denied','Notificación no disponible.');
    end if;
    return v_replay;
  end if;
  select * into v_row from public.user_notifications_v2 where id=p_notification_id and user_id=v_actor for update;
  if not found then return private.command_rejected_result(p_operation_id,p_idempotency_key,p_notification_id,'permission-denied','Notificación no disponible.');end if;
  if v_row.version<>p_expected_version then
    return private.command_version_conflict_result(p_operation_id,p_idempotency_key,p_notification_id,p_expected_version,v_row.version,'La notificación cambió.');
  end if;
  update public.user_notifications_v2 set read_at=case when p_read then now() else null end,version=version+1
    where id=p_notification_id returning * into v_row;
  return private.issue_command_receipt(v_row.organization_id,p_operation_id,p_idempotency_key,p_notification_id,
    'notification-read-v2',v_payload,v_row.version,v_row.test_run_id);
end;
$$;

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='user_notifications_v2') then
    alter publication supabase_realtime add table public.user_notifications_v2;
  end if;
end $$;

revoke all on function private.a4_notify_share_event_v2(),public.aba_notifications_read_v2(integer),
  public.aba_notification_read_state_v2(uuid,boolean,bigint,uuid,uuid)
from public,anon,authenticated,service_role;
grant execute on function public.aba_notifications_read_v2(integer),
  public.aba_notification_read_state_v2(uuid,boolean,bigint,uuid,uuid) to authenticated;

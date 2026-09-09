-- Clinic-scoped MVP authorization. Keep EXECUTE needed by RLS in private.
alter table public.memberships drop constraint memberships_role_check;
alter table public.memberships add constraint memberships_role_check
  check (role in ('admin', 'supervisor', 'therapist', 'clinician', 'viewer'));

create function private.is_clinic_admin(p_organization_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.memberships m join public.organizations o on o.id=m.organization_id
    where m.organization_id=p_organization_id and m.user_id=(select auth.uid())
      and m.role='admin' and m.status='active' and o.status='active');
$$;
revoke all on function private.is_clinic_admin(uuid) from public, anon;
grant execute on function private.is_clinic_admin(uuid) to authenticated;

create or replace function private.is_primary_student_supervisor(p_client_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.clients c join public.organizations o on o.id=c.organization_id
    where c.id=p_client_id and o.status='active' and (
      private.is_clinic_admin(c.organization_id) or exists (
        select 1 from public.student_assignments sa join public.memberships m
          on m.organization_id=sa.organization_id and m.user_id=sa.user_id
        where sa.client_id=c.id and sa.organization_id=c.organization_id
          and sa.user_id=(select auth.uid()) and sa.role='supervisor' and sa.is_primary
          and sa.status='active' and m.status='active' and sa.effective_at<=now()
          and (sa.ended_at is null or sa.ended_at>now())
      )));
$$;

create or replace function private.has_student_capability(p_client_id uuid, p_capability text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(p_capability = any(array[
    'student.view','student.edit','program.view','program.create','program.edit',
    'record_config.view','record_config.create','record_config.edit','record.view',
    'record.capture','record.submit','chart.view','chart.configure','result.download',
    'authorization.request','authorization.decide','authorization.revoke'
  ]) and exists (
    select 1 from public.clients c join public.organizations o on o.id=c.organization_id
    where c.id=p_client_id and o.status='active' and (
      private.is_clinic_admin(c.organization_id) or exists (
        select 1 from public.student_assignments sa join public.memberships m
          on m.organization_id=sa.organization_id and m.user_id=sa.user_id
        where sa.client_id=c.id and sa.organization_id=c.organization_id
          and sa.user_id=(select auth.uid()) and m.status='active' and sa.status='active'
          and sa.effective_at<=now() and (sa.ended_at is null or sa.ended_at>now())
          and (
            (sa.role='supervisor' and (p_capability not in ('authorization.decide','authorization.revoke') or sa.is_primary))
            or (sa.role in ('coordinator','therapist') and p_capability in (
              'student.view','program.view','record_config.view','record.view','record.capture','record.submit','chart.view','result.download'))
            or (sa.role='coordinator' and p_capability='authorization.request')
            or (sa.role='coordinator' and exists (
              select 1 from public.student_authorization_requests r
              join public.student_authorization_decisions d on d.request_id=r.id
              where r.client_id=c.id and r.requester_user_id=sa.user_id and r.status='approved'
                and d.decision='approved' and p_capability=any(d.granted_actions)
                and d.effective_at<=now() and d.expires_at>now()
                and not exists(select 1 from public.student_authorization_decisions x
                  where x.supersedes_decision_id=d.id and x.decision='revoked')
            ))
          )
      )
    )
  ), false);
$$;

-- Admins can enumerate their own clinic team; self policy still allows context selection.
create policy memberships_select_clinic_admin on public.memberships for select to authenticated
  using ((select private.is_clinic_admin(organization_id)));

alter policy consent_records_select_professional on public.consent_records
  using ((select private.has_student_capability(client_id,'student.edit')));
alter policy consent_events_select_professional on public.consent_events
  using ((select private.has_student_capability(client_id,'student.edit')));

create function public.mvp_team(p_organization_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not private.is_clinic_admin(p_organization_id) then
    raise exception using errcode='42501', message='clinic_admin_required';
  end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('user_id',m.user_id,'email',u.email,'role',m.role,'status',m.status) order by u.email),'[]'::jsonb)
    from public.memberships m join auth.users u on u.id=m.user_id where m.organization_id=p_organization_id);
end;
$$;

create table public.clinic_admin_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  actor_user_id uuid not null references auth.users(id), subject_user_id uuid not null references auth.users(id),
  action text not null, created_at timestamptz not null default now()
);
create index clinic_admin_events_organization_idx on public.clinic_admin_events(organization_id,created_at);
alter table public.clinic_admin_events enable row level security;
grant select on public.clinic_admin_events to authenticated;
create policy clinic_admin_events_read on public.clinic_admin_events for select to authenticated
  using ((select private.is_clinic_admin(organization_id)));

create function public.mvp_set_member(p_organization_id uuid,p_user_id uuid,p_role text,p_status text)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  -- Serialize admin changes; do not permit removing the last active administrator.
  perform 1 from public.organizations where id=p_organization_id for update;
  if not private.is_clinic_admin(p_organization_id) then
    raise exception using errcode='42501',message='clinic_admin_required';
  end if;
  if p_role is null or p_status is null or p_role not in ('admin','supervisor','therapist') or p_status not in ('active','inactive') then
    raise exception using errcode='22023',message='invalid_membership';
  end if;
  if not exists(select 1 from public.memberships where organization_id=p_organization_id and user_id=p_user_id) then
    raise exception using errcode='22023',message='member_not_found';
  end if;
  if (p_role<>'admin' or p_status<>'active') and exists (
    select 1 from public.memberships where organization_id=p_organization_id and user_id=p_user_id and role='admin' and status='active'
  ) and (select count(*) from public.memberships where organization_id=p_organization_id and role='admin' and status='active')<=1 then
    raise exception using errcode='22023',message='last_admin_required';
  end if;
  update public.memberships set role=p_role,status=p_status where organization_id=p_organization_id and user_id=p_user_id;
  insert into public.clinic_admin_events(organization_id,actor_user_id,subject_user_id,action)
    values(p_organization_id,auth.uid(),p_user_id,'membership:'||p_role||':'||p_status);
  return jsonb_build_object('user_id',p_user_id,'role',p_role,'status',p_status);
end;
$$;

-- Deny reassignment of a clinical row into a different tenant via direct UPDATE.
create function private.keep_client_organization() returns trigger language plpgsql set search_path='' as $$
begin
  if new.organization_id is distinct from old.organization_id or new.id is distinct from old.id then
    raise exception using errcode='42501',message='client_identity_immutable';
  end if;
  return new;
end;
$$;
create trigger clients_keep_organization before update on public.clients for each row execute function private.keep_client_organization();

revoke all on function public.mvp_team(uuid) from public,anon;
revoke all on function public.mvp_set_member(uuid,uuid,text,text) from public,anon;
grant execute on function public.mvp_team(uuid), public.mvp_set_member(uuid,uuid,text,text) to authenticated;
revoke all on function private.keep_client_organization() from public,anon,authenticated;

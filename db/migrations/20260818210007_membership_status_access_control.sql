-- Recovered from ABA_staging migration history; schema only.
-- Slice 05: reversible user access without deleting identities or memberships.

alter table public.memberships
  add column status text not null default 'active'
  constraint memberships_status_check check (status in ('active', 'inactive'));

alter table public.audit_events
  drop constraint audit_events_entity_type_check,
  add constraint audit_events_entity_type_check check (entity_type in ('client', 'membership')),
  drop constraint audit_events_action_check,
  add constraint audit_events_action_check check (
    action in ('created', 'updated', 'archived', 'membership_activated', 'membership_deactivated')
  );

drop policy organizations_select_member on public.organizations;
create policy organizations_select_member
on public.organizations for select to authenticated
using (
  exists (
    select 1 from public.memberships m
    where m.organization_id = organizations.id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
);

drop policy clients_select_member on public.clients;
create policy clients_select_member
on public.clients for select to authenticated
using (
  exists (
    select 1 from public.memberships m
    where m.organization_id = clients.organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
);

drop policy clients_insert_writer on public.clients;
create policy clients_insert_writer
on public.clients for insert to authenticated
with check (
  exists (
    select 1 from public.memberships m
    where m.organization_id = clients.organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role in ('admin', 'clinician')
  )
);

drop policy clients_update_writer on public.clients;
create policy clients_update_writer
on public.clients for update to authenticated
using (
  exists (
    select 1 from public.memberships m
    where m.organization_id = clients.organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role in ('admin', 'clinician')
  )
)
with check (
  exists (
    select 1 from public.memberships m
    where m.organization_id = clients.organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role in ('admin', 'clinician')
  )
);

drop policy guardians_select_member on public.guardians;
create policy guardians_select_member
on public.guardians for select to authenticated
using (
  exists (
    select 1
    from public.clients c
    join public.memberships m on m.organization_id = c.organization_id
    where c.id = guardians.client_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
);

drop policy guardians_insert_writer on public.guardians;
create policy guardians_insert_writer
on public.guardians for insert to authenticated
with check (
  exists (
    select 1
    from public.clients c
    join public.memberships m on m.organization_id = c.organization_id
    where c.id = guardians.client_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role in ('admin', 'clinician')
  )
);

drop policy guardians_update_writer on public.guardians;
create policy guardians_update_writer
on public.guardians for update to authenticated
using (
  exists (
    select 1
    from public.clients c
    join public.memberships m on m.organization_id = c.organization_id
    where c.id = guardians.client_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role in ('admin', 'clinician')
  )
)
with check (
  exists (
    select 1
    from public.clients c
    join public.memberships m on m.organization_id = c.organization_id
    where c.id = guardians.client_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role in ('admin', 'clinician')
  )
);

drop policy siblings_select_member on public.siblings;
create policy siblings_select_member
on public.siblings for select to authenticated
using (
  exists (
    select 1
    from public.clients c
    join public.memberships m on m.organization_id = c.organization_id
    where c.id = siblings.client_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
);

drop policy siblings_insert_writer on public.siblings;
create policy siblings_insert_writer
on public.siblings for insert to authenticated
with check (
  exists (
    select 1
    from public.clients c
    join public.memberships m on m.organization_id = c.organization_id
    where c.id = siblings.client_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role in ('admin', 'clinician')
  )
);

drop policy siblings_update_writer on public.siblings;
create policy siblings_update_writer
on public.siblings for update to authenticated
using (
  exists (
    select 1
    from public.clients c
    join public.memberships m on m.organization_id = c.organization_id
    where c.id = siblings.client_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role in ('admin', 'clinician')
  )
)
with check (
  exists (
    select 1
    from public.clients c
    join public.memberships m on m.organization_id = c.organization_id
    where c.id = siblings.client_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role in ('admin', 'clinician')
  )
);

create or replace function public.create_client(
  p_clinical_id text,
  p_initials text,
  p_primary_language text,
  p_birth_date date,
  p_living_arrangement text default null,
  p_guardians jsonb default '[]'::jsonb,
  p_siblings jsonb default '[]'::jsonb,
  p_test_run_id uuid default null
)
returns public.clients
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_membership_count integer;
  v_client public.clients;
begin
  select count(*), min(m.organization_id::text)::uuid
    into v_membership_count, v_organization_id
  from public.memberships m
  where m.user_id = (select auth.uid())
    and m.status = 'active'
    and m.role in ('admin', 'clinician');

  if v_membership_count <> 1 then
    raise exception using errcode = '42501', message = 'single_writable_membership_required';
  end if;

  if jsonb_typeof(p_guardians) <> 'array' or jsonb_typeof(p_siblings) <> 'array' then
    raise exception using errcode = '22023', message = 'family_payload_must_be_arrays';
  end if;

  insert into public.clients (
    organization_id, clinical_id, initials, primary_language,
    birth_date, living_arrangement, test_run_id
  ) values (
    v_organization_id, btrim(p_clinical_id), upper(btrim(p_initials)),
    btrim(p_primary_language), p_birth_date,
    nullif(btrim(p_living_arrangement), ''), p_test_run_id
  ) returning * into v_client;

  insert into public.guardians (client_id, initials, birth_date, position, test_run_id)
  select v_client.id, upper(btrim(item.value ->> 'initials')),
    nullif(item.value ->> 'birth_date', '')::date, item.ordinality - 1, p_test_run_id
  from jsonb_array_elements(p_guardians) with ordinality as item(value, ordinality);

  insert into public.siblings (client_id, initials, birth_date, position, test_run_id)
  select v_client.id, upper(btrim(item.value ->> 'initials')),
    nullif(item.value ->> 'birth_date', '')::date, item.ordinality - 1, p_test_run_id
  from jsonb_array_elements(p_siblings) with ordinality as item(value, ordinality);

  return v_client;
end;
$$;

revoke all on function public.create_client(text, text, text, date, text, jsonb, jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.create_client(text, text, text, date, text, jsonb, jsonb, uuid)
  to authenticated;

create function private.audit_membership_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  insert into public.audit_events (
    organization_id, actor_user_id, entity_type, entity_id, action, test_run_id
  ) values (
    new.organization_id,
    (select auth.uid()),
    'membership',
    new.user_id,
    case new.status
      when 'active' then 'membership_activated'
      else 'membership_deactivated'
    end,
    new.test_run_id
  );

  return new;
end;
$$;

revoke all on function private.audit_membership_status_change() from public, anon, authenticated;

create trigger audit_membership_status_change
after update of status on public.memberships
for each row execute function private.audit_membership_status_change();

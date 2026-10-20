-- Family access is a selectable organization context without creating a clinic
-- membership or granting any general student capability.
create or replace function private.aba_identity_context_impl(p_organization_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_choices jsonb; v_active jsonb; v_email text;
begin
  if v_actor is null then raise exception using errcode='42501',message='authenticated_identity_required'; end if;
  select email into strict v_email from auth.users where id=v_actor;
  with candidate as (
    select o.id,o.name,m.role,0 as priority
    from public.memberships m join public.organizations o on o.id=m.organization_id
    where m.user_id=v_actor and m.status='active' and o.status='active'
      and m.role in('admin','supervisor','therapist')
    union all
    select distinct o.id,o.name,'external'::text,1
    from public.student_external_access_v2 access
    join public.organizations o on o.id=access.organization_id
    join public.clients client on client.id=access.client_id and client.organization_id=access.organization_id
    where access.user_id=v_actor and access.status='active'
      and o.status='active' and client.status='active'
      and not exists(select 1 from public.memberships membership
        where membership.organization_id=o.id and membership.user_id=v_actor
          and membership.status='active' and membership.role in('admin','supervisor','therapist'))
    union all
    select distinct o.id,o.name,'family'::text,2
    from public.family_access_links_v2 access
    join public.organizations o on o.id=access.organization_id
    join public.clients client on client.id=access.client_id and client.organization_id=access.organization_id
    where access.recipient_user_id=v_actor and access.status='active'
      and o.status='active' and client.status='active'
      and not exists(select 1 from public.memberships membership
        where membership.organization_id=o.id and membership.user_id=v_actor
          and membership.status='active' and membership.role in('admin','supervisor','therapist'))
      and not exists(select 1 from public.student_external_access_v2 external_access
        where external_access.organization_id=o.id and external_access.user_id=v_actor
          and external_access.status='active')
  ), choices as (
    select distinct on(id) id,name,role from candidate order by id,priority
  )
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'role',role) order by name,id),'[]'::jsonb)
    into v_choices from choices;
  select choice into v_active from jsonb_array_elements(v_choices) choice
    where choice->>'id'=p_organization_id::text;
  if v_active is null and p_organization_id is null and jsonb_array_length(v_choices)=1 then
    v_active:=v_choices->0;
  end if;
  return jsonb_build_object('userId',v_actor,'email',v_email,
    'profile',private.professional_profile_json(v_actor),'choices',v_choices,'active',v_active);
end;
$$;

comment on function private.aba_identity_context_impl(uuid) is
  'Identity choices prioritize clinic membership, then external access, then family access; no synthetic membership is created.';

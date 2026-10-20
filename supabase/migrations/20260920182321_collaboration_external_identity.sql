-- A4 forward integration: an accepted per-student access becomes a selectable
-- clinic context without manufacturing a public.memberships row.

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

create or replace function public.aba_student_share_read_v2(p_organization_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_actor uuid:=auth.uid(); v_email text; v_rows jsonb;
begin
  if v_actor is null then raise exception using errcode='42501',message='authenticated_identity_required'; end if;
  select lower(email) into v_email from auth.users where id=v_actor;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',invitation.id,'clinicId',invitation.organization_id,'studentId',invitation.client_id,
    'studentName',case when private.has_internal_student_capability(invitation.client_id,'authorization.decide')
      then coalesce(profile.full_name,client.initials) else client.initials end,
    'invitedBy',invitation.invited_by,'recipientEmail',invitation.recipient_email,
    'acceptedBy',invitation.accepted_by,'level',invitation.access_level,
    'message',invitation.message,'status',invitation.status,'version',invitation.version,
    'createdAt',invitation.created_at,'updatedAt',invitation.updated_at,
    'direction',case when invitation.recipient_user_id=v_actor or invitation.recipient_email=v_email
      then 'received' else 'sent' end
  ) order by invitation.updated_at desc),'[]'::jsonb) into v_rows
  from public.student_share_invitations_v2 invitation
  join public.clients client on client.id=invitation.client_id and client.organization_id=invitation.organization_id
  left join public.client_profiles_v2 profile on profile.client_id=client.id and profile.organization_id=client.organization_id
  where (
      p_organization_id is not null
      and invitation.organization_id=p_organization_id
      and private.has_internal_student_capability(invitation.client_id,'authorization.decide')
    ) or (
      (p_organization_id is null or invitation.organization_id=p_organization_id)
      and (invitation.recipient_user_id=v_actor or invitation.recipient_email=v_email)
    );
  return jsonb_build_object('clinicId',p_organization_id,'actorId',v_actor,'invitations',v_rows);
end;
$$;

revoke all on function public.aba_student_share_read_v2(uuid) from public,anon,service_role;
grant execute on function public.aba_student_share_read_v2(uuid) to authenticated;

comment on function private.aba_identity_context_impl(uuid) is
  'Identity choices include active per-student external access as role external, never as clinic membership.';

create function public.aba_chat_eligible_participants_v2(p_organization_id uuid,p_client_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_rows jsonb;
begin
  if v_actor is null or not private.has_internal_student_capability(p_client_id,'student.view')
    or not exists(select 1 from public.clients where id=p_client_id and organization_id=p_organization_id and status='active') then
    raise exception using errcode='42501',message='chat_participant_selection_denied';
  end if;
  with eligible as(
    select membership.user_id,'professional'::text kind
      from public.memberships membership where membership.organization_id=p_organization_id and membership.status='active' and membership.role in('admin','supervisor','therapist')
    union
    select access.user_id,'external'::text from public.student_external_access_v2 access
      where access.organization_id=p_organization_id and access.client_id=p_client_id and access.status='active'
  )
  select coalesce(jsonb_agg(jsonb_build_object('userId',eligible.user_id,'kind',eligible.kind,
    'email',users.email,'name',coalesce(profile.name,'')) order by coalesce(profile.name,users.email),eligible.user_id),'[]'::jsonb)
    into v_rows from eligible join auth.users users on users.id=eligible.user_id
    left join public.professional_profiles profile on profile.user_id=eligible.user_id
    where eligible.user_id<>v_actor;
  return v_rows;
end;$$;
revoke all on function public.aba_chat_eligible_participants_v2(uuid,uuid) from public,anon,service_role;
grant execute on function public.aba_chat_eligible_participants_v2(uuid,uuid) to authenticated;

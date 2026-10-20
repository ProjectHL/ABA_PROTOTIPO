-- Pending family invitations must be readable and actionable before the recipient
-- has a family organization context. Only rows matching Auth user/email are exposed.
create or replace function public.aba_family_access_read_v2(
  p_organization_id uuid default null,p_client_id uuid default null
)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_actor uuid:=auth.uid(); v_email text; v_rows jsonb;
begin
  if v_actor is null then raise exception using errcode='42501',message='authenticated_identity_required'; end if;
  select lower(email) into v_email from auth.users where id=v_actor;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',link.id,'clinicId',link.organization_id,'studentId',link.client_id,
    'familyPersonId',link.family_person_id,'familyLabel',coalesce(person.full_name,person.initials),
    'recipientEmail',link.recipient_email,'recipientUserId',link.recipient_user_id,
    'message',link.message,'status',link.status,'version',link.version,
    'createdAt',link.created_at,'updatedAt',link.updated_at,
    'direction',case when link.recipient_user_id=v_actor or link.recipient_email=v_email
      then 'received' else 'sent' end
  ) order by link.updated_at desc),'[]'::jsonb) into v_rows
  from public.family_access_links_v2 link
  join public.client_people_v2 person on person.id=link.family_person_id
    and person.organization_id=link.organization_id and person.client_id=link.client_id
  where (p_client_id is null or link.client_id=p_client_id) and (
    (p_organization_id is not null and link.organization_id=p_organization_id
      and private.has_internal_student_capability(link.client_id,'authorization.decide'))
    or ((p_organization_id is null or link.organization_id=p_organization_id)
      and (link.recipient_user_id=v_actor or link.recipient_email=v_email))
  );
  return jsonb_build_object('clinicId',p_organization_id,'actorId',v_actor,'links',v_rows);
end;
$$;

revoke all on function public.aba_family_access_read_v2(uuid,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.aba_family_access_read_v2(uuid,uuid) to authenticated;

comment on function public.aba_family_access_read_v2(uuid,uuid) is
  'Family inbox supports pre-context received invitations by exact Auth identity; sent rows require internal authorization in an explicit organization.';

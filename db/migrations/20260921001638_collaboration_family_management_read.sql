-- Authorized clinic-side source for composing immutable family publications.
-- It exposes only selectable resource versions for one student and never grants
-- direct table writes to API roles.
create function public.aba_family_publication_manage_read_v2(
  p_organization_id uuid,p_client_id uuid
)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_actor uuid:=auth.uid(); v_current public.family_publications_v2; v_result jsonb;
begin
  if v_actor is null then raise exception using errcode='42501',message='authenticated_identity_required'; end if;
  if not private.has_internal_student_capability(p_client_id,'authorization.decide')
    or not exists(select 1 from public.clients client where client.organization_id=p_organization_id
      and client.id=p_client_id and client.status='active') then
    raise exception using errcode='42501',message='family_publication_manage_denied';
  end if;
  select * into v_current from public.family_publications_v2 publication
    where publication.organization_id=p_organization_id and publication.client_id=p_client_id
      and publication.superseded_at is null;
  select jsonb_build_object(
    'clinicId',p_organization_id,'studentId',p_client_id,'actorId',v_actor,
    'currentPublication',case when v_current.id is null then null else jsonb_build_object(
      'id',v_current.id,'version',v_current.version,'introduction',v_current.introduction,
      'publishedAt',v_current.published_at,
      'familyPersonIds',(select coalesce(jsonb_agg(recipient.family_person_id order by recipient.family_person_id),'[]'::jsonb)
        from public.family_publication_recipients_v2 recipient where recipient.publication_id=v_current.id),
      'programVersionIds',(select coalesce(jsonb_agg(resource.resource_id order by resource.position),'[]'::jsonb)
        from public.family_publication_resources_v2 resource where resource.publication_id=v_current.id and resource.resource_kind='program-version'),
      'recordRevisionIds',(select coalesce(jsonb_agg(resource.resource_id order by resource.position),'[]'::jsonb)
        from public.family_publication_resources_v2 resource where resource.publication_id=v_current.id and resource.resource_kind='record-revision'),
      'attachmentVersionIds',(select coalesce(jsonb_agg(resource.resource_id order by resource.position),'[]'::jsonb)
        from public.family_publication_resources_v2 resource where resource.publication_id=v_current.id and resource.resource_kind='attachment-version')
    ) end,
    'familyPeople',(select coalesce(jsonb_agg(jsonb_build_object(
      'id',person.id,'label',coalesce(person.full_name,person.initials),'email',person.email,
      'accessLinkId',link.id,'accessStatus',link.status,'accessVersion',link.version
    ) order by coalesce(person.full_name,person.initials),person.id),'[]'::jsonb)
      from public.client_people_v2 person
      left join lateral(select access.id,access.status,access.version
        from public.family_access_links_v2 access
        where access.organization_id=person.organization_id and access.client_id=person.client_id
          and access.family_person_id=person.id
        order by case access.status when 'active' then 0 when 'pending' then 1 else 2 end,
          access.updated_at desc limit 1) link on true
      where person.organization_id=p_organization_id and person.client_id=p_client_id
        and person.archived_at is null and 'family'=any(person.roles)),
    'programVersions',(select coalesce(jsonb_agg(jsonb_build_object(
      'id',version.id,'title',version.title,'type',version.program_type,
      'version',version.version,'state',version.version_state
    ) order by version.title,version.version desc),'[]'::jsonb)
      from public.program_versions version where version.organization_id=p_organization_id
        and version.client_id=p_client_id and version.version_state in ('released','superseded')),
    'recordRevisions',(select coalesce(jsonb_agg(jsonb_build_object(
      'id',revision.id,'recordId',revision.record_id,'revision',revision.revision,
      'measurement',revision.replacement_measurement,'createdAt',revision.created_at
    ) order by revision.created_at desc),'[]'::jsonb)
      from public.session_program_record_revisions_v2 revision
      join public.session_program_records_v2 record on record.organization_id=revision.organization_id
        and record.client_id=revision.client_id and record.id=revision.record_id
      where revision.organization_id=p_organization_id and revision.client_id=p_client_id
        and record.state='submitted'),
    'attachmentVersions',(select coalesce(jsonb_agg(jsonb_build_object(
      'id',version.id,'attachmentId',version.attachment_id,'name',version.original_name,
      'mimeType',version.mime_type,'byteLength',version.byte_length,'createdAt',version.created_at
    ) order by version.created_at desc),'[]'::jsonb)
      from public.attachment_versions version
      join public.attachment_records record on record.id=version.attachment_id
      where record.organization_id=p_organization_id and record.client_id=p_client_id
        and record.resource_kind='student' and record.purpose='student-document'
        and record.state='available' and version.state='available')
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.aba_family_publication_manage_read_v2(uuid,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.aba_family_publication_manage_read_v2(uuid,uuid) to authenticated;

comment on function public.aba_family_publication_manage_read_v2(uuid,uuid) is
  'Authorized clinic-side composition source: active family identities and immutable selectable versions for one student.';

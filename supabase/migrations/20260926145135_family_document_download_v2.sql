-- Family access is exact, live and read-only. No family signing/listing policy.
create function private.family_document_authorized_v2(p_publication_id uuid,p_version_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(
    select 1 from public.family_publications_v2 p
    join public.family_publication_resources_v2 resource
      on resource.publication_id=p.id and resource.resource_kind='attachment-version'
    join public.attachment_versions v on v.id=resource.resource_id and v.state='available'
    join public.attachment_records a on a.id=v.attachment_id
      and a.organization_id=p.organization_id and a.client_id=p.client_id
      and a.resource_kind='student' and a.purpose='student-document' and a.state='available'
    join public.family_publication_recipients_v2 recipient on recipient.publication_id=p.id
    join public.family_access_links_v2 link on link.organization_id=recipient.organization_id
      and link.client_id=recipient.client_id and link.family_person_id=recipient.family_person_id
      and link.status='active' and link.recipient_user_id=auth.uid()
    where p.id=p_publication_id and p.superseded_at is null and v.id=p_version_id
  );
$$;

create function private.can_read_family_document_object_v2(p_bucket text,p_key text)
returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(
    select 1 from public.attachment_versions v
    join public.family_publication_resources_v2 resource
      on resource.resource_id=v.id and resource.resource_kind='attachment-version'
    where v.bucket_id=p_bucket and v.object_key=p_key
      and private.family_document_authorized_v2(resource.publication_id,v.id)
  );
$$;

create function public.aba_family_document_read_v2(p_organization_id uuid,p_publication_id uuid,p_version_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not private.family_document_authorized_v2(p_publication_id,p_version_id)
    or not exists(select 1 from public.family_publications_v2
      where id=p_publication_id and organization_id=p_organization_id) then
    raise exception using errcode='42501',message='family_document_unavailable';
  end if;
  return (select jsonb_build_object('actorId',auth.uid(),'clinicId',p_organization_id,
    'publicationId',p_publication_id,'versionId',v.id,'bucket',v.bucket_id,
    'objectKey',v.object_key,'name',v.original_name,'mimeType',v.mime_type,
    'byteLength',v.byte_length,'sha256',v.sha256)
    from public.attachment_versions v where v.id=p_version_id);
end;
$$;

revoke all on function private.family_document_authorized_v2(uuid,uuid),
  private.can_read_family_document_object_v2(text,text),
  public.aba_family_document_read_v2(uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.aba_family_document_read_v2(uuid,uuid,uuid) to authenticated;
grant execute on function private.can_read_family_document_object_v2(text,text) to authenticated;

create policy family_document_authenticated_download_v2 on storage.objects
for select to authenticated using(
  bucket_id='clinical-attachments'
  and storage.allow_only_operation('object.get_authenticated')
  and private.can_read_family_document_object_v2(bucket_id,name)
);
comment on function public.aba_family_document_read_v2(uuid,uuid,uuid) is
  'Exact current published student-document version for an active family recipient; no general student capability.';

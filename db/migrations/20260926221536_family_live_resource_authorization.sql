-- Family resource authorization is enforced by the database, not only the shell.
-- Preserve tables, published version references, operation restrictions and API ACLs.
begin;
create function private.family_recipient_active_v2(p_organization_id uuid,p_client_id uuid,p_person_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(
    select 1 from public.family_access_links_v2 access
    join public.organizations organization on organization.id=access.organization_id and organization.status='active'
    join public.clients client on client.organization_id=access.organization_id and client.id=access.client_id and client.status='active'
    join public.client_people_v2 person on person.organization_id=access.organization_id
      and person.client_id=access.client_id and person.id=access.family_person_id
      and person.archived_at is null and 'family'=any(person.roles)
    where access.organization_id=p_organization_id and access.client_id=p_client_id
      and access.family_person_id=p_person_id and access.status='active' and access.recipient_user_id=auth.uid()
      and (client.test_run_id is null or exists(select 1 from public.test_data_batches batch
        where batch.organization_id=client.organization_id and batch.id=client.test_run_id and batch.status='open'))
      and (access.test_run_id is null or exists(select 1 from public.test_data_batches batch
        where batch.organization_id=access.organization_id and batch.id=access.test_run_id and batch.status='open'))
  );
$$;
revoke all on function private.family_recipient_active_v2(uuid,uuid,uuid) from public,anon,authenticated,service_role;

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
      and private.family_recipient_active_v2(access.organization_id,access.client_id,access.family_person_id)
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

create or replace function public.aba_family_portal_read_v2(p_organization_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_actor uuid:=auth.uid(); v_publications jsonb;
begin
  if v_actor is null then raise exception using errcode='42501',message='authenticated_identity_required'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',publication.id,'clinicId',publication.organization_id,'studentId',publication.client_id,
    'studentLabel',coalesce(profile.full_name,client.initials),'version',publication.version,
    'introduction',publication.introduction,'publishedAt',publication.published_at,
    'programs',(select coalesce(jsonb_agg(jsonb_build_object(
      'id',version.id,'programId',version.program_id,'type',version.program_type,
      'version',version.version,'title',version.title,'design',version.design)
      order by resource.position),'[]'::jsonb)
      from public.family_publication_resources_v2 resource
      join public.program_versions version on version.id=resource.resource_id
      where resource.publication_id=publication.id and resource.resource_kind='program-version'),
    'results',(select coalesce(jsonb_agg(jsonb_build_object(
      'id',revision.id,'recordId',revision.record_id,'revision',revision.revision,
      'measurement',revision.replacement_measurement,'createdAt',revision.created_at)
      order by resource.position),'[]'::jsonb)
      from public.family_publication_resources_v2 resource
      join public.session_program_record_revisions_v2 revision on revision.id=resource.resource_id
      where resource.publication_id=publication.id and resource.resource_kind='record-revision'),
    'documents',(select coalesce(jsonb_agg(jsonb_build_object(
      'id',version.id,'attachmentId',version.attachment_id,'version',version.version,
      'name',version.original_name,'mimeType',version.mime_type,'byteLength',version.byte_length,
      'sha256',version.sha256,'createdAt',version.created_at)
      order by resource.position),'[]'::jsonb)
      from public.family_publication_resources_v2 resource
      join public.attachment_versions version on version.id=resource.resource_id
      where resource.publication_id=publication.id and resource.resource_kind='attachment-version')
  ) order by publication.published_at desc),'[]'::jsonb) into v_publications
  from public.family_publications_v2 publication
  join public.clients client on client.organization_id=publication.organization_id and client.id=publication.client_id
  left join public.client_profiles_v2 profile on profile.organization_id=client.organization_id and profile.client_id=client.id
  where publication.organization_id=p_organization_id and publication.superseded_at is null
    and (publication.test_run_id is null or exists(select 1 from public.test_data_batches batch
      where batch.organization_id=publication.organization_id and batch.id=publication.test_run_id and batch.status='open'))
    and exists(select 1 from public.family_publication_recipients_v2 recipient
      join public.family_access_links_v2 link on link.organization_id=recipient.organization_id
        and link.client_id=recipient.client_id and link.family_person_id=recipient.family_person_id
        and link.status='active' and link.recipient_user_id=v_actor
      where recipient.publication_id=publication.id
        and private.family_recipient_active_v2(recipient.organization_id,recipient.client_id,recipient.family_person_id));
  return jsonb_build_object('actorId',v_actor,'publications',v_publications);
end;
$$;

create or replace function private.family_document_authorized_v2(p_publication_id uuid,p_version_id uuid)
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
      and private.family_recipient_active_v2(recipient.organization_id,recipient.client_id,recipient.family_person_id)
      and (p.test_run_id is null or exists(select 1 from public.test_data_batches batch
        where batch.organization_id=p.organization_id and batch.id=p.test_run_id and batch.status='open'))
      and (a.test_run_id is null or exists(select 1 from public.test_data_batches batch
        where batch.organization_id=a.organization_id and batch.id=a.test_run_id and batch.status='open'))
  );
$$;

-- Read-only family agenda. Visibility requires both an active family access link
-- and explicit participation of that same family person in the appointment.
create or replace function public.aba_family_calendar_read_v2(p_organization_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_actor uuid:=auth.uid();v_rows jsonb;
begin
  if v_actor is null then raise exception using errcode='42501',message='authenticated_identity_required'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',appointment.id,'clinicId',appointment.organization_id,'studentId',appointment.client_id,
    'studentLabel',coalesce(profile.full_name,client.initials),
    'familyPersonId',participant.family_person_id,'familyPersonLabel',coalesce(person.full_name,person.initials),
    'title',appointment.title,'startsAt',appointment.starts_at,'endsAt',appointment.ends_at,
    'timeZone',appointment.time_zone,'status',appointment.status,
    'cancelledAt',appointment.cancelled_at,'cancellationReason',appointment.cancellation_reason
  ) order by appointment.starts_at,appointment.id),'[]'::jsonb) into v_rows
  from public.appointments_v2 appointment
  join public.appointment_participants_v2 participant on participant.appointment_id=appointment.id
    and participant.organization_id=appointment.organization_id and participant.client_id=appointment.client_id
    and participant.participant_kind='family' and participant.archived_at is null
  join public.family_access_links_v2 access on access.organization_id=appointment.organization_id
    and access.client_id=appointment.client_id and access.family_person_id=participant.family_person_id
    and access.status='active' and access.recipient_user_id=v_actor
  join public.client_people_v2 person on person.organization_id=participant.organization_id
    and person.client_id=participant.client_id and person.id=participant.family_person_id
    and person.archived_at is null
  join public.clients client on client.organization_id=appointment.organization_id
    and client.id=appointment.client_id and client.status='active'
  left join public.client_profiles_v2 profile on profile.organization_id=client.organization_id
    and profile.client_id=client.id
  where appointment.organization_id=p_organization_id
    and private.family_recipient_active_v2(appointment.organization_id,appointment.client_id,participant.family_person_id)
    and (appointment.test_run_id is null or exists(select 1 from public.test_data_batches batch
      where batch.organization_id=appointment.organization_id and batch.id=appointment.test_run_id
        and batch.status='open'));
  return jsonb_build_object('clinicId',p_organization_id,'actorId',v_actor,'appointments',v_rows);
end;
$$;

revoke all on function public.aba_family_calendar_read_v2(uuid)
from public,anon,authenticated,service_role;
grant execute on function public.aba_family_calendar_read_v2(uuid) to authenticated;

comment on function public.aba_family_calendar_read_v2(uuid) is
  'Family-only agenda projection: exact active family identity plus explicit appointment participation; no general calendar or clinical read.';

-- No new general clinical capability or family table grant.
revoke all on function private.family_document_authorized_v2(uuid,uuid),
  private.aba_identity_context_impl(uuid),
  public.aba_family_portal_read_v2(uuid) from public,anon,authenticated,service_role;
grant execute on function public.aba_family_portal_read_v2(uuid) to authenticated;
commit;

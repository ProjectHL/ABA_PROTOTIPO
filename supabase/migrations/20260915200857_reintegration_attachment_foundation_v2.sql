-- Private attachment metadata. Physical objects are never public and are never
-- deleted as a request side effect; archive is a recoverable metadata transition.

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('clinical-attachments','clinical-attachments',false,20971520,
  array['application/pdf','image/jpeg','image/png'])
on conflict(id) do nothing;

do $$
declare v_bucket storage.buckets%rowtype;
begin
  select * into strict v_bucket from storage.buckets where id='clinical-attachments' for share;
  if v_bucket.public is distinct from false
    or v_bucket.file_size_limit is distinct from 20971520
    or v_bucket.allowed_mime_types is distinct from array['application/pdf','image/jpeg','image/png']::text[] then
    raise exception using errcode='55000',message='clinical_attachments_bucket_incompatible';
  end if;
end;
$$;

create table public.attachment_records(
  id uuid primary key,
  organization_id uuid references public.organizations(id) on delete restrict,
  resource_kind text not null check(resource_kind in ('professional','student','chat','commercial')),
  professional_user_id uuid references auth.users(id) on delete restrict,
  client_id uuid references public.clients(id) on delete restrict,
  conversation_id uuid,
  commercial_document_id uuid,
  purpose text not null check(purpose in ('professional-avatar','student-photo','student-document','chat-attachment','commercial-document')),
  state text not null default 'pending-upload' check(state in ('pending-upload','available','archived','failed')),
  current_version_id uuid,
  version integer not null default 0 check(version>=0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  test_run_id uuid,
  unique(id,organization_id),
  foreign key(organization_id,client_id) references public.clients(organization_id,id) on delete restrict,
  foreign key(organization_id,test_run_id) references public.test_data_batches(organization_id,id) on delete restrict,
  check(
    (resource_kind='professional' and organization_id is null and professional_user_id is not null
      and client_id is null and conversation_id is null and commercial_document_id is null)
    or (resource_kind='student' and organization_id is not null and client_id is not null
      and professional_user_id is null and conversation_id is null and commercial_document_id is null)
    or (resource_kind='chat' and organization_id is not null and client_id is not null
      and conversation_id is not null and professional_user_id is null and commercial_document_id is null)
    or (resource_kind='commercial' and organization_id is not null and commercial_document_id is not null
      and professional_user_id is null and client_id is null and conversation_id is null)
  ),
  check(
    (resource_kind='professional' and purpose='professional-avatar')
    or (resource_kind='student' and purpose in ('student-photo','student-document'))
    or (resource_kind='chat' and purpose='chat-attachment')
    or (resource_kind='commercial' and purpose='commercial-document')
  ),
  check((state='archived')=(archived_at is not null))
);

create table public.attachment_versions(
  id uuid primary key,
  attachment_id uuid not null references public.attachment_records(id) on delete restrict,
  version integer not null check(version>0),
  supersedes_version_id uuid,
  state text not null check(state in ('pending-upload','available','archived','failed')),
  bucket_id text not null check(bucket_id='clinical-attachments'),
  object_key text not null check(char_length(object_key) between 1 and 1000),
  original_name text not null check(char_length(btrim(original_name)) between 1 and 240),
  mime_type text not null check(mime_type in ('application/pdf','image/jpeg','image/png')),
  byte_length bigint not null check(byte_length between 1 and 20971520),
  sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  archived_at timestamptz,
  unique(attachment_id,version),
  unique(id,attachment_id),
  unique(bucket_id,object_key),
  foreign key(supersedes_version_id,attachment_id)
    references public.attachment_versions(id,attachment_id) on delete restrict,
  check((state='available')=(confirmed_at is not null)),
  check((state='archived')=(archived_at is not null))
);

alter table public.attachment_records
  add constraint attachment_records_current_version_fkey
  foreign key(current_version_id,id) references public.attachment_versions(id,attachment_id) on delete restrict;
alter table public.client_profiles_v2
  add constraint client_profiles_v2_photo_attachment_fkey
  foreign key(photo_attachment_id) references public.attachment_records(id) on delete restrict;
alter table public.consent_records
  add constraint consent_records_evidence_attachment_fkey
  foreign key(evidence_attachment_id) references public.attachment_records(id) on delete restrict;

create index attachment_records_student_idx
  on public.attachment_records(organization_id,client_id,created_at desc)
  where resource_kind in ('student','chat');
create index attachment_records_professional_idx
  on public.attachment_records(professional_user_id,created_at desc)
  where resource_kind='professional';
create index attachment_records_commercial_idx
  on public.attachment_records(organization_id,commercial_document_id,created_at desc)
  where resource_kind='commercial';
create index attachment_versions_attachment_idx
  on public.attachment_versions(attachment_id,version desc);
create index attachment_versions_cleanup_idx
  on public.attachment_versions(bucket_id,object_key)
  where state in ('archived','failed');

create function private.attachment_resource_v2_valid(p_resource jsonb)
returns boolean language sql immutable security invoker set search_path='' as $$
  select case p_resource->>'kind'
    when 'professional' then private.jsonb_has_exact_keys(p_resource,array['kind','userId'])
      and jsonb_typeof(p_resource->'userId')='string' and private.is_uuid_text(p_resource->>'userId')
    when 'student' then private.jsonb_has_exact_keys(p_resource,array['kind','clinicId','studentId'])
      and jsonb_typeof(p_resource->'clinicId')='string' and private.is_uuid_text(p_resource->>'clinicId')
      and jsonb_typeof(p_resource->'studentId')='string' and private.is_uuid_text(p_resource->>'studentId')
    when 'chat' then private.jsonb_has_exact_keys(p_resource,array['kind','clinicId','studentId','conversationId'])
      and jsonb_typeof(p_resource->'clinicId')='string' and private.is_uuid_text(p_resource->>'clinicId')
      and jsonb_typeof(p_resource->'studentId')='string' and private.is_uuid_text(p_resource->>'studentId')
      and jsonb_typeof(p_resource->'conversationId')='string' and private.is_uuid_text(p_resource->>'conversationId')
    when 'commercial' then private.jsonb_has_exact_keys(p_resource,array['kind','clinicId','documentId'])
      and jsonb_typeof(p_resource->'clinicId')='string' and private.is_uuid_text(p_resource->>'clinicId')
      and jsonb_typeof(p_resource->'documentId')='string' and private.is_uuid_text(p_resource->>'documentId')
    else false end;
$$;

create function private.attachment_resource_authorized_v2(
  p_organization_id uuid,p_resource jsonb,p_capability text
)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_kind text; v_target uuid;
begin
  if v_actor is null or p_organization_id is null
    or p_capability not in ('student.view','student.edit')
    or not private.attachment_resource_v2_valid(p_resource) then return false; end if;
  v_kind:=p_resource->>'kind';
  if v_kind='professional' then
    v_target:=(p_resource->>'userId')::uuid;
    return exists(select 1 from public.memberships actor
      join public.memberships target on target.organization_id=actor.organization_id and target.user_id=v_target
      where actor.organization_id=p_organization_id and actor.user_id=v_actor and actor.status='active'
        and target.status='active' and (v_target=v_actor or actor.role='admin'));
  elsif v_kind='student' then
    return (p_resource->>'clinicId')::uuid=p_organization_id
      and exists(select 1 from public.clients c where c.organization_id=p_organization_id and c.id=(p_resource->>'studentId')::uuid)
      and private.has_student_capability((p_resource->>'studentId')::uuid,p_capability);
  end if;
  -- A4/A5 must add exact chat/commercial ownership predicates. Until then they
  -- remain unavailable instead of inheriting student or admin scope by guesswork.
  return false;
end;
$$;

create function private.attachment_record_resource_v2(p_record public.attachment_records)
returns jsonb language sql immutable security invoker set search_path='' as $$
  select case p_record.resource_kind
    when 'professional' then jsonb_build_object('kind','professional','userId',p_record.professional_user_id)
    when 'student' then jsonb_build_object('kind','student','clinicId',p_record.organization_id,'studentId',p_record.client_id)
    when 'chat' then jsonb_build_object('kind','chat','clinicId',p_record.organization_id,'studentId',p_record.client_id,'conversationId',p_record.conversation_id)
    when 'commercial' then jsonb_build_object('kind','commercial','clinicId',p_record.organization_id,'documentId',p_record.commercial_document_id)
  end;
$$;

create function private.attachment_record_authorized_v2(p_attachment_id uuid,p_capability text)
returns boolean language sql stable security definer set search_path='' as $$
  select coalesce((select private.attachment_resource_authorized_v2(
    coalesce(r.organization_id,(select m.organization_id from public.memberships m
      where m.user_id=auth.uid() and m.status='active' order by m.created_at limit 1)),
    private.attachment_record_resource_v2(r),p_capability)
    from public.attachment_records r where r.id=p_attachment_id),false);
$$;

create function private.can_upload_reserved_attachment(p_bucket text,p_key text,p_actor uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and auth.uid()=p_actor and exists(
    select 1 from public.attachment_versions v
    join public.attachment_records r on r.id=v.attachment_id
    where v.bucket_id=p_bucket and v.object_key=p_key and v.state='pending-upload'
      and v.created_by=p_actor and r.current_version_id=v.id and r.state='pending-upload'
      and private.attachment_record_authorized_v2(r.id,'student.edit'));
$$;

create function private.can_read_attachment_object(p_bucket text,p_key text,p_actor uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and auth.uid()=p_actor and exists(
    select 1 from public.attachment_versions v
    where v.bucket_id=p_bucket and v.object_key=p_key and v.state='available'
      and private.attachment_record_authorized_v2(v.attachment_id,'student.view'));
$$;

create function public.aba_attachment_resource_authorized_v2(
  p_organization_id uuid,p_resource jsonb,p_capability text
)
returns boolean language sql stable security definer set search_path='' as $$
  select private.attachment_resource_authorized_v2(p_organization_id,p_resource,p_capability);
$$;

alter table public.attachment_records enable row level security;
alter table public.attachment_versions enable row level security;
revoke all on table public.attachment_records,public.attachment_versions
  from public,anon,authenticated,service_role;
grant select on table public.attachment_records,public.attachment_versions to authenticated;

create policy attachment_records_read on public.attachment_records for select to authenticated
using((select private.attachment_record_authorized_v2(id,'student.view')));
create policy attachment_versions_read on public.attachment_versions for select to authenticated
using((select private.attachment_record_authorized_v2(attachment_id,'student.view')));
create policy clinical_attachment_upload_reserved on storage.objects for insert to authenticated
with check(bucket_id='clinical-attachments'
  and private.can_upload_reserved_attachment(bucket_id,name,(select auth.uid())));
create policy clinical_attachment_read_authorized on storage.objects for select to authenticated
using(bucket_id='clinical-attachments'
  and private.can_read_attachment_object(bucket_id,name,(select auth.uid())));

revoke all on function
  private.attachment_resource_v2_valid(jsonb),
  private.attachment_resource_authorized_v2(uuid,jsonb,text),
  private.attachment_record_resource_v2(public.attachment_records),
  private.attachment_record_authorized_v2(uuid,text),
  private.can_upload_reserved_attachment(text,text,uuid),
  private.can_read_attachment_object(text,text,uuid)
from public,anon,authenticated,service_role;
revoke all on function public.aba_attachment_resource_authorized_v2(uuid,jsonb,text)
  from public,anon,service_role;
grant execute on function public.aba_attachment_resource_authorized_v2(uuid,jsonb,text)
  to authenticated;

comment on table public.attachment_records is
  'Private logical attachment identities; chat/commercial authorization remains fail-closed until their owning modules integrate.';
comment on table public.attachment_versions is
  'Immutable object metadata; available means a constrained verifier confirmed actual size, signature and SHA-256.';

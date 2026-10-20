-- A2 PROPOSAL ONLY — root owns canonical migration/CLI/apply/types.
-- Target: common private attachment service for student photos/documents, profile
-- avatars, chat, family publications and commercial documents. Do not execute.

begin;

-- Private bucket is separate from existing `profile-avatars`: do NOT rename, make
-- public, or migrate existing avatar paths during this change. Existing avatar
-- references can later be represented as attachment records by an explicit batch.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('clinical-attachments', 'clinical-attachments', false, 20971520, array['application/pdf','image/jpeg','image/png'])
on conflict (id) do nothing;
do $$
declare actual storage.buckets%rowtype;
begin
  select * into actual from storage.buckets where id='clinical-attachments' for share;
  if actual.public is distinct from false or actual.file_size_limit is distinct from 20971520
     or actual.allowed_mime_types is distinct from array['application/pdf','image/jpeg','image/png']::text[] then
    raise exception 'clinical-attachments bucket exists with incompatible privacy, limit or MIME policy';
  end if;
end $$;

create table public.attachment_records (
  id uuid primary key, organization_id uuid null references public.organizations(id) on delete restrict,
  resource_kind text not null check(resource_kind in ('professional','student','chat','commercial')),
  professional_user_id uuid null references auth.users(id) on delete restrict,
  client_id uuid null references public.clients(id) on delete restrict,
  conversation_id uuid null, commercial_document_id uuid null,
  purpose text not null check(purpose in ('professional-avatar','student-photo','student-document','chat-attachment','commercial-document')),
  state text not null check(state in ('pending-upload','available','archived','failed')) default 'pending-upload',
  current_version_id uuid null, version integer not null default 0 check(version >= 0),
  created_by uuid not null references auth.users(id) on delete restrict, created_at timestamptz not null default now(), archived_at timestamptz null,
  test_run_id uuid null,
  foreign key (organization_id, test_run_id) references public.test_data_batches(organization_id, id) on delete restrict,
  foreign key (organization_id, client_id) references public.clients(organization_id, id) on delete restrict,
  check ((resource_kind='professional' and organization_id is null and professional_user_id is not null and client_id is null and conversation_id is null and commercial_document_id is null)
      or (resource_kind='student' and organization_id is not null and client_id is not null and professional_user_id is null and conversation_id is null and commercial_document_id is null)
      or (resource_kind='chat' and organization_id is not null and client_id is not null and conversation_id is not null and professional_user_id is null and commercial_document_id is null)
      or (resource_kind='commercial' and organization_id is not null and commercial_document_id is not null and professional_user_id is null and client_id is null and conversation_id is null)),
  check((resource_kind='professional' and purpose='professional-avatar')
      or (resource_kind='student' and purpose in ('student-photo','student-document'))
      or (resource_kind='chat' and purpose='chat-attachment')
      or (resource_kind='commercial' and purpose='commercial-document'))
);
create index attachment_records_student_idx on public.attachment_records(organization_id, client_id, created_at desc) where resource_kind in ('student','chat');
create index attachment_records_professional_idx on public.attachment_records(professional_user_id, created_at desc) where resource_kind='professional';
create index attachment_records_commercial_idx on public.attachment_records(organization_id, commercial_document_id, created_at desc) where resource_kind='commercial';

create table public.attachment_versions (
  id uuid primary key, attachment_id uuid not null references public.attachment_records(id) on delete restrict,
  version integer not null check(version > 0), supersedes_version_id uuid null references public.attachment_versions(id) on delete restrict,
  state text not null check(state in ('pending-upload','available','archived','failed')),
  bucket_id text not null check(bucket_id in ('clinical-attachments','profile-avatars')),
  object_key text not null check(char_length(object_key) between 1 and 1000),
  original_name text not null check(char_length(original_name) between 1 and 240),
  mime_type text not null check(mime_type in ('application/pdf','image/jpeg','image/png')),
  byte_length bigint not null check(byte_length > 0 and byte_length <= 20971520),
  sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'), created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(), confirmed_at timestamptz null, archived_at timestamptz null,
  unique(attachment_id, version), unique(id, attachment_id), unique(bucket_id, object_key),
  foreign key (supersedes_version_id, attachment_id) references public.attachment_versions(id, attachment_id) on delete restrict,
  check((bucket_id='profile-avatars' and mime_type in ('image/jpeg','image/png') and byte_length <= 5242880) or bucket_id='clinical-attachments')
);
alter table public.attachment_records add constraint attachment_records_current_version_fkey foreign key (current_version_id, id) references public.attachment_versions(id, attachment_id) on delete restrict;
create index attachment_versions_attachment_idx on public.attachment_versions(attachment_id, version desc);
create index attachment_versions_pending_cleanup_idx on public.attachment_versions(bucket_id, object_key) where state in ('archived','failed');

-- Only after both tables exist, root may add the two typed links proposed by A2:
-- alter table public.client_profiles_v2 add constraint client_profiles_v2_photo_attachment_fkey foreign key (photo_attachment_id) references public.attachment_records(id) on delete restrict;
-- alter table public.consent_records add constraint consent_records_evidence_attachment_fkey foreign key (evidence_attachment_id) references public.attachment_records(id) on delete restrict;

alter table public.attachment_records enable row level security;
alter table public.attachment_versions enable row level security;
revoke all on public.attachment_records, public.attachment_versions from public, anon, authenticated, service_role;
grant select on public.attachment_records, public.attachment_versions to authenticated;
-- These helpers are created BEFORE the Storage policies. They deliberately bypass
-- RLS only after checking auth.uid(), exact pending metadata and an empty search
-- path. Their EXECUTE grant remains absent for PUBLIC/anon/authenticated.
create function private.can_upload_reserved_attachment(p_bucket text, p_key text, p_actor uuid)
returns boolean language sql security definer set search_path = '' as $$
  select auth.uid() is not null and auth.uid()=p_actor and exists(
    select 1 from public.attachment_versions v join public.attachment_records r on r.id=v.attachment_id
    where v.bucket_id=p_bucket and v.object_key=p_key and v.state='pending-upload' and v.created_by=p_actor
      and r.state='pending-upload' and r.created_by=p_actor
  );
$$;
create function private.can_read_attachment_object(p_bucket text, p_key text, p_actor uuid)
returns boolean language sql security definer set search_path = '' as $$
  select auth.uid() is not null and auth.uid()=p_actor and exists(
    select 1 from public.attachment_versions v join public.attachment_records r on r.id=v.attachment_id
    where v.bucket_id=p_bucket and v.object_key=p_key and v.state='available' and (
      (r.resource_kind='student' and (select private.has_student_capability(r.client_id,'student.view')))
      or (r.resource_kind='professional' and r.professional_user_id=p_actor)
    )
  );
$$;
revoke all on function private.can_upload_reserved_attachment(text,text,uuid), private.can_read_attachment_object(text,text,uuid) from public, anon, authenticated, service_role;
-- Direct reads use only checked resource predicates.  Chat/commercial predicates are
-- delegated to their module functions, never inferred from an untrusted resource id.
create policy attachment_records_student_read on public.attachment_records for select to authenticated using (
  (resource_kind='student' and (select private.has_student_capability(client_id, 'student.view')))
  or (resource_kind='professional' and professional_user_id=(select auth.uid()))
  -- A4/A5 must replace these fail-closed branches with their reviewed participant/
  -- commercial-document predicates in their own migration, not a guessed student scope.
  or false
);
create policy attachment_versions_read on public.attachment_versions for select to authenticated using (
  exists(select 1 from public.attachment_records r where r.id=attachment_id and (
    (r.resource_kind='student' and (select private.has_student_capability(r.client_id, 'student.view')))
    or (r.resource_kind='professional' and r.professional_user_id=(select auth.uid()))))
);
-- No direct table mutation. Do not grant INSERT/UPDATE/DELETE to browser roles.

-- Storage policies: all buckets remain private. The object key must be pre-reserved
-- by attachment_versions; reserve != upload and object metadata does not confirm it.
-- root must adapt bucket/key parsing to current Storage schema. The helper must be
-- private SECURITY DEFINER (not callable by PUBLIC), empty search_path, check
-- auth.uid() itself, and inspect the exact reserved metadata/actor; SECURITY INVOKER
-- may not see rows intentionally denied by RLS. Grant no direct EXECUTE to clients.
create policy clinical_attachment_upload_reserved on storage.objects for insert to authenticated with check (
  bucket_id='clinical-attachments' and private.can_upload_reserved_attachment(bucket_id, name, (select auth.uid()))
);
create policy clinical_attachment_read_authorized on storage.objects for select to authenticated using (
  bucket_id='clinical-attachments' and private.can_read_attachment_object(bucket_id, name, (select auth.uid()))
);
-- Do not grant UPDATE/DELETE to browsers. Replacement creates a new object/version;
-- physical deletion belongs to a reviewed batch cleanup after archive retention.

-- RPC contracts required by src/modules/attachments/attachment.server.ts:
-- public.aba_attachment_reserve_v2(p_organization_id uuid, p_command jsonb)
-- public.aba_attachment_confirm_v2(p_organization_id uuid, p_command jsonb)
-- public.aba_attachment_archive_v2(p_organization_id uuid, p_command jsonb)
-- public.aba_attachment_read_v2(p_organization_id uuid, p_resource jsonb, p_version_id uuid)
-- public.aba_attachment_resource_authorized_v2(p_organization_id uuid, p_resource jsonb, p_capability text)
-- Mutators return {result: CommandResult, version: AttachmentVersion|null}; result
-- resourceId equals attachmentId; version is non-null only for acknowledged. Reserve
-- and confirm require distinct operation/key pairs. Each function validates the
-- complete resource association in SQL, validates active membership/capability both
-- before and after locks, calls private.lock_command_replay then locks attachment,
-- does NOT claim that SQL can inspect object bytes. Confirmation is accepted only
-- from a constrained verifier boundary: a local Edge/worker validates user JWT,
-- loads the exact pending object with a restricted service credential, checks size,
-- magic header and SHA-256, then invokes a private confirm routine. The credential
-- is never browser-visible and the worker may confirm only its pre-reserved key.
-- The user RPC creates/queries pending work and returns unknown on verifier timeout;
-- it cannot mark a version available. Audit/receipt issue atomically in private DB.
-- Professional-avatar records intentionally have organization_id NULL because they
-- identify a user rather than a clinic resource. Their command receipt is still
-- scoped to the non-null p_organization_id of the currently active clinic: the RPC
-- must prove an active membership for professional_user_id in that exact clinic
-- (and admin authority for a different target) before calling the clinic-scoped
-- ledger. The attachment is not thereby readable across clinics; direct RLS permits
-- only its owner and any clinic-admin read must remain inside the reviewed RPC.
-- No service_role in browser; no public URL; signed URLs are short-lived after read RPC.

-- Compatibility/rollout:
-- * `profile-avatars` remains usable by A1. A2 may reference its private object only
--   after an explicit metadata backfill; no automatic copy/delete.
-- * V1 evidence_reference text remains until a validated typed attachment link exists.
-- * Chat/family/commercial consumers start fail-closed; A4/A5 later add their own
--   exact participant/publication/document policies and capability functions.
-- * Archive changes DB state only; cleanup is a separate explicit, batched procedure
--   that inventories references and never runs as a request side effect.

-- Rollback / forward-fix: before real reserve receipts, remove policies then additive
-- tables/bucket only if empty. After any receipt or object exists, keep records and
-- objects; use a forward migration and a separately approved cleanup inventory.
rollback;

-- A2 PROPOSAL ONLY — root owns migration creation, ordering, review and apply.
-- Target: durable Student V2/person IDs/history revisions/consents over 38 applied migrations.
-- Do not run this file directly. No reset/seed/fixture mutation is authorized.

begin;

-- Composite references below make a cross-clinic client/resource impossible even
-- when a UUID is guessed. The existing single-column primary key remains intact.
alter table public.clients add constraint clients_organization_id_id_key unique (organization_id, id);

-- 1. V2 profile is additive. `clients` remains the canonical V1 row and clinical_id
-- until every reader has been migrated. No existing initials/name is transformed.
create table public.client_profiles_v2 (
  client_id uuid primary key references public.clients(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  full_name text null check (full_name is null or char_length(btrim(full_name)) between 1 and 200),
  rut_normalized text null check (rut_normalized is null or rut_normalized ~ '^[0-9]{1,8}-[0-9K]$'),
  photo_attachment_id uuid null, -- FK added after attachment_versions exists; avoids migration cycle.
  reported_diagnosis text not null default '' check (char_length(reported_diagnosis) <= 2000),
  consultation_reason text not null default '' check (char_length(consultation_reason) <= 2000),
  context_home text not null default '' check (char_length(context_home) <= 2000),
  context_school text not null default '' check (char_length(context_school) <= 500),
  context_adaptations text not null default '' check (char_length(context_adaptations) <= 2000),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  test_run_id uuid null,
  foreign key (organization_id, test_run_id) references public.test_data_batches(organization_id, id) on delete restrict
  ,foreign key (organization_id, client_id) references public.clients(organization_id, id) on delete restrict
);
create index client_profiles_v2_org_idx on public.client_profiles_v2(organization_id, updated_at desc);

-- Stable identities replace neither guardians nor siblings V1. A person may have
-- family and contact roles simultaneously; do not copy that person into two rows.
create table public.client_people_v2 (
  id uuid primary key, client_id uuid not null references public.clients(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  full_name text null check (full_name is null or char_length(btrim(full_name)) between 1 and 200),
  initials text null check (initials is null or char_length(btrim(initials)) between 1 and 12),
  birth_date date null check(birth_date <= current_date), relationship text not null default '' check (char_length(relationship) <= 80),
  phone text not null default '' check (char_length(phone) <= 40), email text null check (email is null or (char_length(email) <= 254 and email=lower(email))),
  roles text[] not null check (cardinality(roles) between 1 and 2 and roles <@ array['family','contact']::text[] and (cardinality(roles)=1 or roles[1] <> roles[2])),
  is_primary_contact boolean not null default false check (not is_primary_contact or 'contact' = any(roles)),
  version integer not null default 1 check(version > 0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete restrict, updated_by uuid not null references auth.users(id) on delete restrict,
  archived_at timestamptz null, archived_by uuid null references auth.users(id) on delete restrict,
  test_run_id uuid null, foreign key (organization_id, test_run_id) references public.test_data_batches(organization_id, id) on delete restrict,
  foreign key (organization_id, client_id) references public.clients(organization_id, id) on delete restrict,
  unique (organization_id, client_id, id),
  check ((archived_at is null and archived_by is null) or (archived_at is not null and archived_by is not null)),
  check (full_name is not null or initials is not null)
);
create index client_people_v2_client_idx on public.client_people_v2(client_id, updated_at desc);
create unique index client_people_v2_primary_contact_idx on public.client_people_v2(client_id) where is_primary_contact and archived_at is null;

create table public.client_siblings_v2 (
  id uuid primary key, client_id uuid not null references public.clients(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  full_name text null check (full_name is null or char_length(btrim(full_name)) between 1 and 200),
  initials text null check (initials is null or char_length(btrim(initials)) between 1 and 12), birth_date date null check(birth_date <= current_date),
  notes text not null default '' check (char_length(notes) <= 2000), version integer not null default 1 check(version > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete restrict, updated_by uuid not null references auth.users(id) on delete restrict,
  archived_at timestamptz null, archived_by uuid null references auth.users(id) on delete restrict,
  test_run_id uuid null, foreign key (organization_id, test_run_id) references public.test_data_batches(organization_id, id) on delete restrict,
  foreign key (organization_id, client_id) references public.clients(organization_id, id) on delete restrict,
  unique (organization_id, client_id, id),
  check ((archived_at is null and archived_by is null) or (archived_at is not null and archived_by is not null)),
  check (full_name is not null or initials is not null)
);
create index client_siblings_v2_client_idx on public.client_siblings_v2(client_id, updated_at desc);

-- Preserve V1 clinical_history_entries byte-for-byte. The new revision stream has
-- stable treatment IDs and separates frequency/notes from dose/prescriber/dates.
create table public.clinical_history_versions_v2 (
  id uuid primary key, history_id uuid not null, client_id uuid not null references public.clients(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  kind text not null check(kind in ('reported_diagnosis','assessment','procedure','medication')),
  action text not null check(action in ('create','correct','update-treatment','finish-treatment','reactivate-treatment')),
  descriptor text not null check(char_length(btrim(descriptor)) between 1 and 200), dose text null check(char_length(dose) <= 120),
  frequency text null check(char_length(frequency) <= 120), prescriber_descriptor text null check(char_length(prescriber_descriptor) <= 120),
  started_on date null, ended_on date null check(ended_on is null or started_on is null or ended_on >= started_on), notes text null check(char_length(notes) <= 2000),
  status text not null check(status in ('active','inactive','superseded','entered_in_error')),
  supersedes_version_id uuid null,
  version integer not null check(version > 0), created_at timestamptz not null default now(), created_by uuid not null references auth.users(id) on delete restrict,
  test_run_id uuid null, foreign key (organization_id, test_run_id) references public.test_data_batches(organization_id, id) on delete restrict,
  foreign key (organization_id, client_id) references public.clients(organization_id, id) on delete restrict,
  unique(history_id, version), unique(id, history_id, client_id, organization_id),
  foreign key (supersedes_version_id, history_id, client_id, organization_id) references public.clinical_history_versions_v2(id, history_id, client_id, organization_id) on delete restrict
);
create index clinical_history_versions_v2_current_idx on public.clinical_history_versions_v2(client_id, history_id, version desc);
create index clinical_history_versions_v2_org_status_idx on public.clinical_history_versions_v2(organization_id, status, created_at desc);
create unique index clinical_history_versions_v2_one_active_idx on public.clinical_history_versions_v2(history_id) where status='active';

-- Consent keeps its immutable chain and stores a typed attachment link instead of
-- overloading evidence_reference text. The existing `superseded` state is retained.
alter table public.consent_records add column evidence_attachment_id uuid null;
alter table public.consent_records add column version integer not null default 1 check(version > 0);
create index consent_records_client_current_idx on public.consent_records(client_id, created_at desc);
create unique index consent_records_one_current_purpose_idx on public.consent_records(client_id, purpose_code) where status in ('pending_review','valid');

-- 2. Exposure/RLS. API grants must be explicit and RLS remains enabled even for
-- private-access helpers. Do not use user_metadata or role-only policies.
alter table public.client_profiles_v2 enable row level security;
alter table public.client_people_v2 enable row level security;
alter table public.client_siblings_v2 enable row level security;
alter table public.clinical_history_versions_v2 enable row level security;
revoke all on public.client_profiles_v2, public.client_people_v2, public.client_siblings_v2, public.clinical_history_versions_v2 from public, anon, authenticated, service_role;
grant select on public.client_profiles_v2, public.client_people_v2, public.client_siblings_v2, public.clinical_history_versions_v2 to authenticated;
create policy client_profiles_v2_read on public.client_profiles_v2 for select to authenticated using ((select private.has_student_capability(client_id, 'student.view')));
create policy client_people_v2_read on public.client_people_v2 for select to authenticated using ((select private.has_student_capability(client_id, 'student.view')));
create policy client_siblings_v2_read on public.client_siblings_v2 for select to authenticated using ((select private.has_student_capability(client_id, 'student.view')));
create policy clinical_history_versions_v2_read on public.clinical_history_versions_v2 for select to authenticated using ((select private.has_student_capability(client_id, 'student.view')));
-- No direct insert/update/delete policies: only reviewed domain RPC writes rows.

-- 3. Required reviewed RPC boundary (implementation belongs to root). Each wrapper
-- accepts p_organization_id + full command JSONB, canonicalizes email to lower case,
-- validates dates against the clinic-local date and schema/version/clinic,
-- locks `private.lock_command_replay` before the resource, revalidates
-- private.has_student_capability before and after the lock, mutates/audits/issues
-- private.issue_command_receipt in ONE transaction and returns CommandResult.
-- public.aba_student_command_v2(uuid,jsonb)
-- public.aba_clinical_history_command_v2(uuid,jsonb)
-- public.aba_consent_command_v2(uuid,jsonb)
-- Security: wrappers must have an empty search_path, EXECUTE revoked from PUBLIC,
-- explicit GRANT EXECUTE only to authenticated; any SECURITY DEFINER wrapper must
-- authenticate auth.uid(), verify resource/org, and never accept actor/clinic from body.

-- Compatibility/backfill plan (run separately, idempotently, and reviewed):
-- * Do not fill full_name, rut, email, frequency or notes from V1.
-- * Old guardians/siblings remain readable as V1 fallback with their existing UUIDs;
--   create V2 identities only when explicitly edited, preserving those IDs if migrated.
-- * Map V1 `clinical_history_entries.status` exactly, including entered_in_error.
-- * Copy consent evidence_reference only if it validates as a known attachment ID; otherwise retain text untouched.
-- * Add FK client_profiles_v2.photo_attachment_id and consent_records.evidence_attachment_id
--   to attachment_records AFTER the attachment migration exists.

-- Rollback / forward-fix: before any V2 receipt is issued, additive tables/policies
-- can be dropped in reverse dependency order. After use, do not drop data or ledger
-- receipts; ship a forward migration that corrects policy/function behavior.
rollback;

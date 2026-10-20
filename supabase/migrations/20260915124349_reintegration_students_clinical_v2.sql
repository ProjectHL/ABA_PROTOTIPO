-- Additive V2 clinical identity. V1 rows remain byte-for-byte authoritative for
-- fields that have not been explicitly edited; no name, RUT or notes are inferred.

alter table public.clients
  add constraint clients_organization_id_id_key unique (organization_id, id);

create table public.client_profiles_v2 (
  client_id uuid primary key references public.clients(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  full_name text check (full_name is null or char_length(btrim(full_name)) between 1 and 200),
  rut_normalized text check (rut_normalized is null or rut_normalized ~ '^[0-9]{1,8}-[0-9K]$'),
  photo_attachment_id uuid,
  reported_diagnosis text not null default '' check (char_length(reported_diagnosis) <= 2000),
  consultation_reason text not null default '' check (char_length(consultation_reason) <= 2000),
  context_home text not null default '' check (char_length(context_home) <= 2000),
  context_school text not null default '' check (char_length(context_school) <= 500),
  context_adaptations text not null default '' check (char_length(context_adaptations) <= 2000),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  test_run_id uuid,
  foreign key (organization_id, client_id)
    references public.clients(organization_id, id) on delete restrict,
  foreign key (organization_id, test_run_id)
    references public.test_data_batches(organization_id, id) on delete restrict
);

create index client_profiles_v2_org_updated_idx
  on public.client_profiles_v2(organization_id, updated_at desc);

create table public.client_people_v2 (
  id uuid primary key,
  client_id uuid not null references public.clients(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  full_name text check (full_name is null or char_length(btrim(full_name)) between 1 and 200),
  initials text check (initials is null or char_length(btrim(initials)) between 1 and 12),
  birth_date date check (birth_date is null or birth_date <= current_date),
  relationship text not null default '' check (char_length(relationship) <= 80),
  phone text not null default '' check (char_length(phone) <= 40),
  email text check (email is null or (char_length(email) <= 254 and email = lower(email))),
  roles text[] not null check (
    cardinality(roles) between 1 and 2
    and roles <@ array['family','contact']::text[]
    and (cardinality(roles) = 1 or roles[1] <> roles[2])
  ),
  is_primary_contact boolean not null default false
    check (not is_primary_contact or 'contact' = any(roles)),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete restrict,
  test_run_id uuid,
  unique (organization_id, client_id, id),
  foreign key (organization_id, client_id)
    references public.clients(organization_id, id) on delete restrict,
  foreign key (organization_id, test_run_id)
    references public.test_data_batches(organization_id, id) on delete restrict,
  check (full_name is not null or initials is not null),
  check ((archived_at is null and archived_by is null)
    or (archived_at is not null and archived_by is not null))
);

create index client_people_v2_client_updated_idx
  on public.client_people_v2(organization_id, client_id, updated_at desc);
create unique index client_people_v2_primary_contact_idx
  on public.client_people_v2(organization_id, client_id)
  where is_primary_contact and archived_at is null;

create table public.client_siblings_v2 (
  id uuid primary key,
  client_id uuid not null references public.clients(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  full_name text check (full_name is null or char_length(btrim(full_name)) between 1 and 200),
  initials text check (initials is null or char_length(btrim(initials)) between 1 and 12),
  birth_date date check (birth_date is null or birth_date <= current_date),
  notes text not null default '' check (char_length(notes) <= 2000),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete restrict,
  test_run_id uuid,
  unique (organization_id, client_id, id),
  foreign key (organization_id, client_id)
    references public.clients(organization_id, id) on delete restrict,
  foreign key (organization_id, test_run_id)
    references public.test_data_batches(organization_id, id) on delete restrict,
  check (full_name is not null or initials is not null),
  check ((archived_at is null and archived_by is null)
    or (archived_at is not null and archived_by is not null))
);

create index client_siblings_v2_client_updated_idx
  on public.client_siblings_v2(organization_id, client_id, updated_at desc);

create table public.clinical_history_versions_v2 (
  id uuid primary key,
  history_id uuid not null,
  client_id uuid not null references public.clients(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  kind text not null check (kind in ('reported_diagnosis','assessment','procedure','medication')),
  action text not null check (action in ('create','correct','update-treatment','finish-treatment','reactivate-treatment')),
  descriptor text not null check (char_length(btrim(descriptor)) between 1 and 200),
  dose text check (dose is null or char_length(dose) <= 120),
  frequency text check (frequency is null or char_length(frequency) <= 120),
  prescriber_descriptor text check (prescriber_descriptor is null or char_length(prescriber_descriptor) <= 120),
  started_on date,
  ended_on date,
  notes text check (notes is null or char_length(notes) <= 2000),
  status text not null check (status in ('active','inactive','superseded','entered_in_error')),
  supersedes_version_id uuid,
  version integer not null check (version > 0),
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete restrict,
  test_run_id uuid,
  unique (history_id, version),
  unique (id, history_id, client_id, organization_id),
  foreign key (organization_id, client_id)
    references public.clients(organization_id, id) on delete restrict,
  foreign key (organization_id, test_run_id)
    references public.test_data_batches(organization_id, id) on delete restrict,
  foreign key (supersedes_version_id, history_id, client_id, organization_id)
    references public.clinical_history_versions_v2(id, history_id, client_id, organization_id)
    on delete restrict,
  check (ended_on is null or started_on is null or ended_on >= started_on)
);

create index clinical_history_versions_v2_current_idx
  on public.clinical_history_versions_v2(organization_id, client_id, history_id, version desc);
create index clinical_history_versions_v2_status_idx
  on public.clinical_history_versions_v2(organization_id, status, created_at desc);
create unique index clinical_history_versions_v2_one_active_idx
  on public.clinical_history_versions_v2(organization_id, history_id)
  where status = 'active';

-- Preserve the existing consent chain. Version numbers are derived only from the
-- explicit supersedes relation; no evidence_reference is reinterpreted as a file.
alter table public.consent_records
  add column evidence_attachment_id uuid,
  add column version integer;

with recursive consent_chain as (
  select c.id, 1 as version, array[c.id]::uuid[] as path
  from public.consent_records c
  where c.supersedes_id is null
  union all
  select c.id, p.version + 1, p.path || c.id
  from public.consent_records c
  join consent_chain p on p.id = c.supersedes_id
  where not c.id = any(p.path)
)
update public.consent_records c
set version = chain.version
from consent_chain chain
where chain.id = c.id;

do $$
begin
  if exists (select 1 from public.consent_records where version is null) then
    raise exception using errcode = '23514', message = 'consent_supersedes_cycle_or_orphan';
  end if;
end;
$$;

alter table public.consent_records
  alter column version set not null,
  alter column version set default 1,
  add constraint consent_records_version_check check (version > 0),
  add constraint consent_records_org_client_id_key unique (organization_id, client_id, id),
  add constraint consent_records_org_client_fkey
    foreign key (organization_id, client_id)
    references public.clients(organization_id, id) on delete restrict,
  add constraint consent_records_org_test_batch_fkey
    foreign key (organization_id, test_run_id)
    references public.test_data_batches(organization_id, id) on delete restrict,
  add constraint consent_records_supersedes_same_student_fkey
    foreign key (organization_id, client_id, supersedes_id)
    references public.consent_records(organization_id, client_id, id) on delete restrict;

create unique index consent_records_one_pending_purpose_idx
  on public.consent_records(organization_id, client_id, purpose_code)
  where status = 'pending_review';

alter table public.client_profiles_v2 enable row level security;
alter table public.client_people_v2 enable row level security;
alter table public.client_siblings_v2 enable row level security;
alter table public.clinical_history_versions_v2 enable row level security;

revoke all on table
  public.client_profiles_v2,
  public.client_people_v2,
  public.client_siblings_v2,
  public.clinical_history_versions_v2
from public, anon, authenticated, service_role;

grant select on table
  public.client_profiles_v2,
  public.client_people_v2,
  public.client_siblings_v2,
  public.clinical_history_versions_v2
to authenticated;

create policy client_profiles_v2_read
on public.client_profiles_v2 for select to authenticated
using ((select private.has_student_capability(client_id, 'student.view')));

create policy client_people_v2_read
on public.client_people_v2 for select to authenticated
using ((select private.has_student_capability(client_id, 'student.view')));

create policy client_siblings_v2_read
on public.client_siblings_v2 for select to authenticated
using ((select private.has_student_capability(client_id, 'student.view')));

create policy clinical_history_versions_v2_read
on public.clinical_history_versions_v2 for select to authenticated
using ((select private.has_student_capability(client_id, 'student.view')));

comment on table public.client_profiles_v2 is
  'Explicitly edited Student V2 profile fields; absent rows never authorize inferred identity data.';
comment on table public.client_people_v2 is
  'Stable family/contact identities. Missing payload members are archived by reviewed commands, never deleted.';
comment on table public.client_siblings_v2 is
  'Stable sibling identities kept separately from invitation-capable people.';
comment on table public.clinical_history_versions_v2 is
  'Immutable clinical history revisions; V1 history remains readable without fabricated V2 detail.';

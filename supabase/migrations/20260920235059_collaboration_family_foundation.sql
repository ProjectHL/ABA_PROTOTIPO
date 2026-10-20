create table public.family_access_links_v2(
  id uuid primary key,organization_id uuid not null references public.organizations(id),client_id uuid not null,
  family_person_id uuid not null,recipient_email text not null,recipient_user_id uuid references auth.users(id),
  invited_by uuid not null references auth.users(id),status text not null check(status in('pending','active','revoked','rejected','cancelled')),
  version bigint not null default 1 check(version>0),message text not null default '' check(char_length(message)<=5000),
  accepted_at timestamptz,revoked_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),test_run_id uuid,
  foreign key(organization_id,client_id,family_person_id) references public.client_people_v2(organization_id,client_id,id) on delete restrict,
  foreign key(organization_id,test_run_id) references public.test_data_batches(organization_id,id) on delete restrict,
  check(recipient_email=lower(btrim(recipient_email))),check((status in('active','revoked'))=(accepted_at is not null and recipient_user_id is not null)),
  check((status='revoked')=(revoked_at is not null))
);
create unique index family_access_pending_email_idx on public.family_access_links_v2(client_id,recipient_email) where status='pending';
create unique index family_access_active_person_idx on public.family_access_links_v2(family_person_id) where status='active';
create index family_access_user_idx on public.family_access_links_v2(recipient_user_id,status) where recipient_user_id is not null;

create table public.family_publications_v2(
  id uuid primary key,organization_id uuid not null references public.organizations(id),client_id uuid not null,
  predecessor_id uuid references public.family_publications_v2(id) on delete restrict,version bigint not null check(version>0),
  introduction text not null check(char_length(introduction)<=10000),published_by uuid not null references auth.users(id),
  published_at timestamptz not null default now(),superseded_at timestamptz,test_run_id uuid,
  unique(organization_id,client_id,id),foreign key(organization_id,client_id) references public.clients(organization_id,id) on delete restrict,
  foreign key(organization_id,test_run_id) references public.test_data_batches(organization_id,id) on delete restrict
);
create unique index family_publication_current_idx on public.family_publications_v2(client_id) where superseded_at is null;
create table public.family_publication_recipients_v2(
  publication_id uuid not null references public.family_publications_v2(id) on delete restrict,family_person_id uuid not null,
  organization_id uuid not null,client_id uuid not null,primary key(publication_id,family_person_id),
  foreign key(organization_id,client_id,publication_id) references public.family_publications_v2(organization_id,client_id,id) on delete restrict,
  foreign key(organization_id,client_id,family_person_id) references public.client_people_v2(organization_id,client_id,id) on delete restrict
);
create table public.family_publication_resources_v2(
  publication_id uuid not null references public.family_publications_v2(id) on delete restrict,
  resource_kind text not null check(resource_kind in('program-version','record-revision','attachment-version')),resource_id uuid not null,position integer not null check(position>=0),
  primary key(publication_id,resource_kind,resource_id),unique(publication_id,resource_kind,position)
);
create index family_publication_student_version_idx on public.family_publications_v2(client_id,version desc);
create index family_publication_test_run_idx on public.family_publications_v2(organization_id,test_run_id) where test_run_id is not null;
alter table public.family_access_links_v2 enable row level security;
alter table public.family_publications_v2 enable row level security;
alter table public.family_publication_recipients_v2 enable row level security;
alter table public.family_publication_resources_v2 enable row level security;
revoke all on table public.family_access_links_v2,public.family_publications_v2,public.family_publication_recipients_v2,public.family_publication_resources_v2 from public,anon,authenticated,service_role;
comment on table public.family_publications_v2 is 'Immutable family manifests; family reads only selected version references through a dedicated projection.';

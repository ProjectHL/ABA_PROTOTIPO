-- R3/A4 foundation. Pending invitations grant no access; accepted access is
-- student-specific and never creates a clinic membership.

create table public.student_share_invitations_v2 (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id),
  client_id uuid not null,
  invited_by uuid not null references auth.users(id),
  recipient_email text not null,
  recipient_user_id uuid references auth.users(id),
  accepted_by uuid references auth.users(id),
  access_level text not null check (access_level in ('full-read','program-results','clinical-edit')),
  message text not null default '' check (char_length(message) <= 5000),
  status text not null check (status in ('pending','accepted','rejected','cancelled','revoked','expired')),
  version integer not null default 1 check (version > 0),
  expires_at timestamptz,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  test_run_id uuid,
  foreign key (organization_id, client_id) references public.clients(organization_id,id),
  foreign key (organization_id, test_run_id)
    references public.test_data_batches(organization_id,id) on delete restrict,
  check (recipient_email = lower(btrim(recipient_email))),
  check ((status = 'accepted') = (accepted_by is not null and accepted_at is not null)),
  check ((status = 'revoked') = (revoked_at is not null))
);

create unique index student_share_pending_recipient_idx
  on public.student_share_invitations_v2(client_id, recipient_email)
  where status = 'pending';
create index student_share_sent_idx
  on public.student_share_invitations_v2(organization_id, client_id, created_at desc);
create index student_share_received_idx
  on public.student_share_invitations_v2(recipient_user_id, status, created_at desc)
  where recipient_user_id is not null;
create index student_share_test_run_idx
  on public.student_share_invitations_v2(test_run_id) where test_run_id is not null;

create table public.student_external_access_v2 (
  id uuid primary key,
  invitation_id uuid not null unique references public.student_share_invitations_v2(id),
  organization_id uuid not null references public.organizations(id),
  client_id uuid not null,
  user_id uuid not null references auth.users(id),
  access_level text not null check (access_level in ('full-read','program-results','clinical-edit')),
  status text not null check (status in ('active','revoked')),
  version integer not null default 1 check (version > 0),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  updated_at timestamptz not null default now(),
  test_run_id uuid,
  foreign key (organization_id, client_id) references public.clients(organization_id,id),
  foreign key (organization_id, test_run_id)
    references public.test_data_batches(organization_id,id) on delete restrict,
  check ((status = 'revoked') = (revoked_at is not null))
);

create unique index student_external_access_active_user_idx
  on public.student_external_access_v2(client_id, user_id)
  where status = 'active';
create index student_external_access_user_idx
  on public.student_external_access_v2(user_id, status, client_id);
create index student_external_access_test_run_idx
  on public.student_external_access_v2(test_run_id) where test_run_id is not null;

create table public.student_share_events_v2 (
  id uuid primary key,
  invitation_id uuid not null references public.student_share_invitations_v2(id),
  organization_id uuid not null references public.organizations(id),
  client_id uuid not null,
  sequence integer not null check (sequence > 0),
  event_type text not null check (event_type in ('invited','resent','accepted','rejected','cancelled','level-changed','revoked','expired')),
  actor_user_id uuid not null references auth.users(id),
  reason text not null default '' check (char_length(reason) <= 5000),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  occurred_at timestamptz not null default now(),
  test_run_id uuid,
  foreign key (organization_id, client_id) references public.clients(organization_id,id),
  foreign key (organization_id, test_run_id)
    references public.test_data_batches(organization_id,id) on delete restrict,
  unique (invitation_id, sequence)
);
create index student_share_events_test_run_idx
  on public.student_share_events_v2(test_run_id) where test_run_id is not null;

alter table public.student_share_invitations_v2 enable row level security;
alter table public.student_external_access_v2 enable row level security;
alter table public.student_share_events_v2 enable row level security;

revoke all on table public.student_share_invitations_v2,
  public.student_external_access_v2, public.student_share_events_v2
from public, anon, authenticated, service_role;

comment on table public.student_share_invitations_v2 is
  'A4 invitation state. Pending rows grant nothing and acceptance never creates memberships.';
comment on table public.student_external_access_v2 is
  'Student-specific external authorization source; levels are mapped by the existing capability engine.';
comment on table public.student_share_events_v2 is
  'Immutable invitation/access lifecycle evidence ordered per invitation.';

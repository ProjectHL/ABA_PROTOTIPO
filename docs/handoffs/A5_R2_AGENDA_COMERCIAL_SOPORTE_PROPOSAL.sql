-- A5 R2 PROPOSAL ONLY. Root must create/order/apply a CLI migration after reconciling A2/A3 identifiers.
-- No test query, reset, seed, Postman, or QA is authorized by this artifact.
-- Preconditions: command_receipts, private.has_student_capability, private.is_clinic_admin,
-- public.clients(id, organization_id), public.memberships and public.clinical_sessions exist.
-- Forward-fix only after use: do not drop appointments, subscriptions, tickets, documents, inquiries or receipts.

-- ---------------------------------------------------------------------------
-- Agenda. Series retain wall-clock rule; occurrences preserve the exact resolved
-- instant and the original local date. UTC + 7 days is never used for recurrence.
create table public.appointment_series_v2 (
  id uuid primary key, organization_id uuid not null references public.organizations(id) on delete restrict,
  client_id uuid not null, version bigint not null default 1 check(version>0),
  weekly_rule jsonb not null, status text not null default 'active' check(status in('active','cancelled')),
  created_by uuid not null references auth.users(id) on delete restrict, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), cancelled_at timestamptz,
  test_run_id uuid, unique(id,organization_id), unique(id,client_id),
  foreign key(client_id,organization_id) references public.clients(id,organization_id) on delete restrict,
  foreign key(organization_id,test_run_id) references public.test_data_batches(organization_id,id) on delete restrict
);
create table public.appointments_v2 (
  id uuid primary key, organization_id uuid not null references public.organizations(id) on delete restrict,
  client_id uuid not null, version bigint not null default 1 check(version>0), title text not null check(char_length(title) between 1 and 300),
  notes text not null default '' check(char_length(notes)<=10000), starts_at timestamptz not null, ends_at timestamptz not null,
  time_zone text not null check(char_length(time_zone) between 1 and 100), series_id uuid, original_local_date date,
  linked_session_id uuid, status text not null default 'scheduled' check(status in('scheduled','cancelled')),
  cancelled_at timestamptz, cancellation_reason text, created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), test_run_id uuid,
  unique(id,organization_id), unique(id,client_id), unique(series_id,original_local_date),
  foreign key(client_id,organization_id) references public.clients(id,organization_id) on delete restrict,
  foreign key(series_id,organization_id) references public.appointment_series_v2(id,organization_id) on delete restrict,
  foreign key(linked_session_id,client_id) references public.clinical_sessions(id,client_id) on delete restrict,
  foreign key(organization_id,test_run_id) references public.test_data_batches(organization_id,id) on delete restrict,
  check(ends_at>starts_at), check((status='cancelled')=(cancelled_at is not null)),
  check((status='cancelled')=(cancellation_reason is not null)), check((series_id is null)=(original_local_date is null))
);
create table public.appointment_participants_v2 (
  id uuid primary key default gen_random_uuid(), appointment_id uuid not null, organization_id uuid not null, participant_kind text not null check(participant_kind in('professional','family')),
  professional_user_id uuid, family_person_id uuid, created_at timestamptz not null default now(),
  foreign key(appointment_id,organization_id) references public.appointments_v2(id,organization_id) on delete restrict,
  check((participant_kind='professional')=(professional_user_id is not null)), check((participant_kind='family')=(family_person_id is not null))
);
create table public.appointment_reminders_v2 (
  id uuid primary key default gen_random_uuid(), appointment_id uuid not null, organization_id uuid not null,
  minutes_before integer not null check(minutes_before between 0 and 43200), due_at timestamptz,
  state text not null default 'scheduled' check(state in('scheduled','sent','cancelled','failed')),
  created_at timestamptz not null default now(), sent_at timestamptz,
  unique(appointment_id,minutes_before), foreign key(appointment_id,organization_id) references public.appointments_v2(id,organization_id) on delete restrict
);
create table public.appointment_events_v2 (
  id uuid primary key default gen_random_uuid(), appointment_id uuid not null, organization_id uuid not null,
  actor_user_id uuid not null references auth.users(id) on delete restrict, action text not null check(action in('created','edited','rescheduled','cancelled','series-created','session-linked')),
  payload jsonb not null, created_at timestamptz not null default now(),
  foreign key(appointment_id,organization_id) references public.appointments_v2(id,organization_id) on delete restrict
);
create index appointments_v2_calendar_idx on public.appointments_v2(organization_id,starts_at) where status='scheduled';
create index appointments_v2_client_idx on public.appointments_v2(client_id,starts_at desc);
create index appointment_participants_v2_professional_idx on public.appointment_participants_v2(organization_id,professional_user_id) where professional_user_id is not null;
create index appointment_reminders_v2_due_idx on public.appointment_reminders_v2(due_at) where state='scheduled' and due_at is not null;

-- ---------------------------------------------------------------------------
-- Commercial information is explicitly internal demonstration data. No payment
-- provider/token/folio/tax document can be modeled by these tables.
create table public.commercial_plans_v2 (
  id uuid primary key, code text not null unique check(code ~ '^[a-z0-9-]{2,80}$'), active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.commercial_plan_versions_v2 (
  id uuid primary key, plan_id uuid not null references public.commercial_plans_v2(id) on delete restrict,
  version_number integer not null check(version_number>0), name text not null check(char_length(name) between 1 and 200),
  description text not null default '' check(char_length(description)<=10000), amount_minor bigint not null check(amount_minor>=0),
  currency char(3) not null check(currency ~ '^[A-Z]{3}$'), minor_unit_digits smallint not null check(minor_unit_digits between 0 and 3),
  period text not null check(period in('monthly','yearly')), included_seats integer not null check(included_seats>0), maximum_seats integer,
  features jsonb not null default '[]'::jsonb, active boolean not null default true, demonstration boolean not null default true,
  created_at timestamptz not null default now(), unique(plan_id,version_number), check(maximum_seats is null or maximum_seats>=included_seats),
  check(jsonb_typeof(features)='array')
);
create table public.clinic_subscriptions_v2 (
  id uuid primary key, organization_id uuid not null unique references public.organizations(id) on delete restrict,
  plan_version_id uuid not null references public.commercial_plan_versions_v2(id) on delete restrict,
  version bigint not null default 1 check(version>0), seats integer not null check(seats>0), occupied_seats integer not null default 0 check(occupied_seats>=0),
  status text not null default 'active' check(status in('active','cancelled')), effective_at timestamptz not null, cancelled_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict, updated_at timestamptz not null default now(), test_run_id uuid,
  foreign key(organization_id,test_run_id) references public.test_data_batches(organization_id,id) on delete restrict,
  check((status='cancelled')=(cancelled_at is not null)), check(cancelled_at is null or cancelled_at>=effective_at), check(occupied_seats<=seats)
);
create table public.commercial_documents_v2 (
  id uuid primary key, organization_id uuid not null references public.organizations(id) on delete restrict,
  subscription_id uuid references public.clinic_subscriptions_v2(id) on delete restrict, version bigint not null default 1 check(version>0),
  kind text not null check(kind in('internal-summary','internal-proposal','internal-agreement')), title text not null check(char_length(title) between 1 and 300),
  issued_at timestamptz not null, lines jsonb not null default '[]'::jsonb, currency char(3) not null check(currency ~ '^[A-Z]{3}$'),
  minor_unit_digits smallint not null check(minor_unit_digits between 0 and 3), attachment_version_id uuid, predecessor_id uuid,
  archived boolean not null default false, demonstration boolean not null default true, tax_document boolean not null default false, payment_requested boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), test_run_id uuid,
  unique(id,organization_id), foreign key(predecessor_id,organization_id) references public.commercial_documents_v2(id,organization_id) on delete restrict,
  foreign key(organization_id,test_run_id) references public.test_data_batches(organization_id,id) on delete restrict,
  check(demonstration and not tax_document and not payment_requested), check(jsonb_typeof(lines)='array')
);
create index commercial_documents_v2_org_idx on public.commercial_documents_v2(organization_id,issued_at desc) where not archived;

-- ---------------------------------------------------------------------------
-- Support is durable and local. A requester can only read their own tickets;
-- active clinic admins may manage their clinic. Public inquiries have no clinic,
-- no clinical data and no implicit access to any other table.
create table public.support_tickets_v2 (
  id uuid primary key, organization_id uuid not null references public.organizations(id) on delete restrict,
  requester_user_id uuid not null references auth.users(id) on delete restrict, version bigint not null default 1 check(version>0),
  title text not null check(char_length(title) between 1 and 300), category text not null check(category in('technical','account','commercial','other')),
  status text not null default 'open' check(status in('open','in-progress','waiting-requester','resolved','closed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), test_run_id uuid,
  unique(id,organization_id), foreign key(organization_id,test_run_id) references public.test_data_batches(organization_id,id) on delete restrict
);
create table public.support_ticket_messages_v2 (
  id uuid primary key, ticket_id uuid not null, organization_id uuid not null, author_user_id uuid not null references auth.users(id) on delete restrict,
  sequence integer not null check(sequence>0), body text not null check(char_length(btrim(body)) between 1 and 10000), created_at timestamptz not null default now(),
  unique(ticket_id,sequence), foreign key(ticket_id,organization_id) references public.support_tickets_v2(id,organization_id) on delete restrict
);
create table public.support_ticket_events_v2 (
  id uuid primary key default gen_random_uuid(), ticket_id uuid not null, organization_id uuid not null, actor_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null check(action in('created','replied','status-changed')), from_status text, to_status text, reason text, created_at timestamptz not null default now(),
  foreign key(ticket_id,organization_id) references public.support_tickets_v2(id,organization_id) on delete restrict
);
create table public.commercial_inquiries_v2 (
  id uuid primary key, operation_id uuid not null unique, idempotency_key uuid not null unique, payload_sha256 text not null check(payload_sha256 ~ '^[0-9a-f]{64}$'),
  name text not null check(char_length(name) between 1 and 200), email text not null check(char_length(email)<=254), organization text not null default '' check(char_length(organization)<=300),
  message text not null check(char_length(btrim(message)) between 1 and 10000), contact_permission boolean not null check(contact_permission),
  source_fingerprint text not null check(char_length(source_fingerprint) between 1 and 128), created_at timestamptz not null default now()
);
create index support_tickets_v2_requester_idx on public.support_tickets_v2(organization_id,requester_user_id,updated_at desc);
create index support_ticket_messages_v2_ticket_idx on public.support_ticket_messages_v2(ticket_id,sequence);
create index commercial_inquiries_v2_rate_idx on public.commercial_inquiries_v2(source_fingerprint,created_at desc);

-- RLS/grants: no direct write by API roles; data must move only through reviewed,
-- narrow RPCs. Explicit read policies make audit/read models useful without a
-- broad service_role exception.
alter table public.appointment_series_v2 enable row level security;
alter table public.appointments_v2 enable row level security;
alter table public.appointment_participants_v2 enable row level security;
alter table public.appointment_reminders_v2 enable row level security;
alter table public.appointment_events_v2 enable row level security;
alter table public.commercial_plans_v2 enable row level security;
alter table public.commercial_plan_versions_v2 enable row level security;
alter table public.clinic_subscriptions_v2 enable row level security;
alter table public.commercial_documents_v2 enable row level security;
alter table public.support_tickets_v2 enable row level security;
alter table public.support_ticket_messages_v2 enable row level security;
alter table public.support_ticket_events_v2 enable row level security;
alter table public.commercial_inquiries_v2 enable row level security;
revoke all on public.appointment_series_v2,public.appointments_v2,public.appointment_participants_v2,public.appointment_reminders_v2,public.appointment_events_v2,public.commercial_plans_v2,public.commercial_plan_versions_v2,public.clinic_subscriptions_v2,public.commercial_documents_v2,public.support_tickets_v2,public.support_ticket_messages_v2,public.support_ticket_events_v2,public.commercial_inquiries_v2 from anon;
revoke insert,update,delete on public.appointment_series_v2,public.appointments_v2,public.appointment_participants_v2,public.appointment_reminders_v2,public.appointment_events_v2,public.clinic_subscriptions_v2,public.commercial_documents_v2,public.support_tickets_v2,public.support_ticket_messages_v2,public.support_ticket_events_v2,public.commercial_inquiries_v2 from authenticated;
grant select on public.appointment_series_v2,public.appointments_v2,public.appointment_participants_v2,public.appointment_reminders_v2,public.appointment_events_v2,public.commercial_plans_v2,public.commercial_plan_versions_v2,public.clinic_subscriptions_v2,public.commercial_documents_v2,public.support_tickets_v2,public.support_ticket_messages_v2,public.support_ticket_events_v2 to authenticated;
create policy a5_plan_read on public.commercial_plans_v2 for select to authenticated using(true);
create policy a5_plan_version_read on public.commercial_plan_versions_v2 for select to authenticated using(active);
create policy a5_appointment_read on public.appointments_v2 for select to authenticated using((select private.has_student_capability(client_id,'student.view')));
create policy a5_series_read on public.appointment_series_v2 for select to authenticated using((select private.has_student_capability(client_id,'student.view')));
create policy a5_participants_read on public.appointment_participants_v2 for select to authenticated using(exists(select 1 from public.appointments_v2 a where a.id=appointment_id and (select private.has_student_capability(a.client_id,'student.view'))));
create policy a5_reminders_read on public.appointment_reminders_v2 for select to authenticated using(exists(select 1 from public.appointments_v2 a where a.id=appointment_id and (select private.has_student_capability(a.client_id,'student.view'))));
create policy a5_events_read on public.appointment_events_v2 for select to authenticated using(exists(select 1 from public.appointments_v2 a where a.id=appointment_id and (select private.has_student_capability(a.client_id,'student.view'))));
create policy a5_subscription_read on public.clinic_subscriptions_v2 for select to authenticated using(exists(select 1 from public.memberships m where m.organization_id=clinic_subscriptions_v2.organization_id and m.user_id=(select auth.uid()) and m.status='active'));
create policy a5_document_read on public.commercial_documents_v2 for select to authenticated using((select private.is_clinic_admin(organization_id)));
create policy a5_ticket_read on public.support_tickets_v2 for select to authenticated using(requester_user_id=(select auth.uid()) or (select private.is_clinic_admin(organization_id)));
create policy a5_ticket_message_read on public.support_ticket_messages_v2 for select to authenticated using(exists(select 1 from public.support_tickets_v2 t where t.id=ticket_id and (t.requester_user_id=(select auth.uid()) or (select private.is_clinic_admin(t.organization_id)))));
create policy a5_ticket_event_read on public.support_ticket_events_v2 for select to authenticated using(exists(select 1 from public.support_tickets_v2 t where t.id=ticket_id and (t.requester_user_id=(select auth.uid()) or (select private.is_clinic_admin(t.organization_id)))));
-- commercial_inquiries_v2 has no client-facing select policy/grant.

-- RPC implementation requirements for root integration (names consumed by A5):
-- * aba_calendar_command_v2(org, command) validates all JSON key/type/range rules,
--   calls lock_command_replay after active-member + student.edit check, locks organization,
--   client and appointment/series in that order, rechecks authorization, compares versions,
--   resolves IANA local recurrence (reject gap/ambiguous when requested), validates family
--   person and professional membership in this exact clinic, then writes event/reminders and
--   issue_command_receipt in the same transaction. replay is authorized again before return.
-- * aba_calendar_read_v2(org) returns only DTOs in src/modules/calendar/contracts.ts.
-- * aba_subscription_command_v2 and aba_commercial_document_command_v2 require active clinic
--   admin before and after locks, calculate occupied seats from active memberships atomically,
--   reject any non-demo/tax/payment payload, use ledger+version+event/receipt transaction.
-- * aba_support_ticket_command_v2 permits create to an active member, reply only requester or
--   active admin, status only active admin; validates legal transition and writes message/event
--   sequence while holding ticket row; it issues the ledger receipt atomically.
-- * aba_commercial_inquiry_v2 accepts an exact inquiry JSON object with server-derived request
--   fingerprint, rate limits before insert, checks operation/key/payload collisions and NEVER
--   accepts organization/client/session identifiers. It returns CommandResult but does not use
--   the authenticated clinical ledger because an anonymous sender has no actor identity.
-- All public wrappers must be SECURITY INVOKER, revoke PUBLIC/anon execute and grant only the
-- exact authenticated wrapper(s); the inquiry wrapper is the sole reviewed anon exception.

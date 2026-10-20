-- A5/R2 canonical additive foundation. Every tenant/resource relationship is
-- composite; API roles have no direct write path. Business mutations follow in
-- reviewed receipt-bearing RPC migrations.

create table public.appointment_series_v2 (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  client_id uuid not null,
  version integer not null default 1 check (version > 0),
  weekly_rule jsonb not null check (jsonb_typeof(weekly_rule) = 'object'),
  status text not null default 'active' check (status in ('active','cancelled')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  test_run_id uuid,
  unique (organization_id, id),
  unique (organization_id, client_id, id),
  foreign key (organization_id, client_id)
    references public.clients(organization_id, id) on delete restrict,
  foreign key (organization_id, test_run_id)
    references public.test_data_batches(organization_id, id) on delete restrict,
  check ((status = 'cancelled') = (cancelled_at is not null))
);

create table public.appointments_v2 (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  client_id uuid not null,
  version integer not null default 1 check (version > 0),
  title text not null check (char_length(btrim(title)) between 1 and 300),
  notes text not null default '' check (char_length(notes) <= 10000),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  time_zone text not null check (char_length(time_zone) between 1 and 100),
  series_id uuid,
  original_local_date date,
  linked_session_id uuid,
  status text not null default 'scheduled' check (status in ('scheduled','cancelled')),
  cancelled_at timestamptz,
  cancellation_reason text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  test_run_id uuid,
  unique (organization_id, id),
  unique (organization_id, client_id, id),
  unique (series_id, original_local_date),
  foreign key (organization_id, client_id)
    references public.clients(organization_id, id) on delete restrict,
  foreign key (organization_id, client_id, series_id)
    references public.appointment_series_v2(organization_id, client_id, id) on delete restrict,
  foreign key (organization_id, client_id, linked_session_id)
    references public.clinical_session_v2_state(organization_id, client_id, session_id) on delete restrict,
  foreign key (organization_id, test_run_id)
    references public.test_data_batches(organization_id, id) on delete restrict,
  check (ends_at > starts_at),
  check ((status = 'cancelled') = (cancelled_at is not null)),
  check ((status = 'cancelled') = (cancellation_reason is not null)),
  check (cancellation_reason is null or char_length(btrim(cancellation_reason)) between 1 and 10000),
  check ((series_id is null) = (original_local_date is null))
);

create table public.appointment_participants_v2 (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null,
  organization_id uuid not null,
  client_id uuid not null,
  participant_kind text not null check (participant_kind in ('professional','family')),
  professional_user_id uuid,
  family_person_id uuid,
  created_at timestamptz not null default now(),
  test_run_id uuid,
  unique (appointment_id, participant_kind, professional_user_id),
  unique (appointment_id, participant_kind, family_person_id),
  foreign key (organization_id, client_id, appointment_id)
    references public.appointments_v2(organization_id, client_id, id) on delete restrict,
  foreign key (organization_id, professional_user_id)
    references public.memberships(organization_id, user_id) on delete restrict,
  foreign key (organization_id, client_id, family_person_id)
    references public.client_people_v2(organization_id, client_id, id) on delete restrict,
  foreign key (organization_id, test_run_id)
    references public.test_data_batches(organization_id, id) on delete restrict,
  check (
    (participant_kind = 'professional' and professional_user_id is not null and family_person_id is null)
    or (participant_kind = 'family' and family_person_id is not null and professional_user_id is null)
  )
);

create table public.appointment_reminders_v2 (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null,
  organization_id uuid not null,
  client_id uuid not null,
  minutes_before integer not null check (minutes_before between 0 and 43200),
  due_at timestamptz,
  state text not null default 'scheduled' check (state in ('scheduled','sent','cancelled','failed')),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  test_run_id uuid,
  unique (appointment_id, minutes_before),
  foreign key (organization_id, client_id, appointment_id)
    references public.appointments_v2(organization_id, client_id, id) on delete restrict,
  foreign key (organization_id, test_run_id)
    references public.test_data_batches(organization_id, id) on delete restrict,
  check ((state = 'sent') = (sent_at is not null))
);

create table public.appointment_events_v2 (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null,
  organization_id uuid not null,
  client_id uuid not null,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (action in
    ('created','edited','rescheduled','cancelled','series-created','series-edited','session-linked')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  test_run_id uuid,
  foreign key (organization_id, client_id, appointment_id)
    references public.appointments_v2(organization_id, client_id, id) on delete restrict,
  foreign key (organization_id, test_run_id)
    references public.test_data_batches(organization_id, id) on delete restrict
);

create index appointments_v2_calendar_idx
  on public.appointments_v2(organization_id, starts_at) where status = 'scheduled';
create index appointments_v2_client_idx
  on public.appointments_v2(organization_id, client_id, starts_at desc);
create index appointment_participants_v2_professional_idx
  on public.appointment_participants_v2(organization_id, professional_user_id)
  where professional_user_id is not null;
create index appointment_reminders_v2_due_idx
  on public.appointment_reminders_v2(due_at) where state = 'scheduled' and due_at is not null;

create table public.commercial_plans_v2 (
  id uuid primary key,
  code text not null unique check (code ~ '^[a-z0-9-]{2,80}$'),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.commercial_plan_versions_v2 (
  id uuid primary key,
  plan_id uuid not null references public.commercial_plans_v2(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  name text not null check (char_length(btrim(name)) between 1 and 200),
  description text not null default '' check (char_length(description) <= 10000),
  amount_minor bigint not null check (amount_minor between 0 and 9007199254740991),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  minor_unit_digits smallint not null check (minor_unit_digits between 0 and 3),
  period text not null check (period in ('monthly','yearly')),
  included_seats integer not null check (included_seats > 0),
  maximum_seats integer,
  features jsonb not null default '[]'::jsonb check (jsonb_typeof(features) = 'array'),
  active boolean not null default true,
  demonstration boolean not null default true check (demonstration),
  created_at timestamptz not null default now(),
  unique (plan_id, version_number),
  check (maximum_seats is null or maximum_seats >= included_seats)
);

create table public.clinic_subscriptions_v2 (
  id uuid primary key,
  organization_id uuid not null unique references public.organizations(id) on delete restrict,
  plan_version_id uuid not null references public.commercial_plan_versions_v2(id) on delete restrict,
  version integer not null default 1 check (version > 0),
  seats integer not null check (seats > 0),
  occupied_seats integer not null default 0 check (occupied_seats >= 0),
  status text not null default 'active' check (status in ('active','cancelled')),
  effective_at timestamptz not null,
  cancelled_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  test_run_id uuid,
  unique (organization_id, id),
  foreign key (organization_id, test_run_id)
    references public.test_data_batches(organization_id, id) on delete restrict,
  check ((status = 'cancelled') = (cancelled_at is not null)),
  check (cancelled_at is null or cancelled_at >= effective_at),
  check (occupied_seats <= seats)
);

create table public.clinic_subscription_events_v2 (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  subscription_id uuid not null,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (action in ('selected','plan-changed','cancelled')),
  prior_version integer,
  next_version integer not null check (next_version > 0),
  reason text,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  test_run_id uuid,
  foreign key (organization_id, subscription_id)
    references public.clinic_subscriptions_v2(organization_id, id) on delete restrict,
  foreign key (organization_id, test_run_id)
    references public.test_data_batches(organization_id, id) on delete restrict,
  check (reason is null or char_length(btrim(reason)) between 1 and 10000)
);

create table public.commercial_documents_v2 (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  subscription_id uuid,
  version integer not null default 1 check (version > 0),
  kind text not null check (kind in ('internal-summary','internal-proposal','internal-agreement')),
  title text not null check (char_length(btrim(title)) between 1 and 300),
  issued_at timestamptz not null,
  lines jsonb not null default '[]'::jsonb check (jsonb_typeof(lines) = 'array'),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  minor_unit_digits smallint not null check (minor_unit_digits between 0 and 3),
  attachment_record_id uuid,
  attachment_version_id uuid,
  predecessor_id uuid,
  archived boolean not null default false,
  demonstration boolean not null default true check (demonstration),
  tax_document boolean not null default false check (not tax_document),
  payment_requested boolean not null default false check (not payment_requested),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  test_run_id uuid,
  unique (organization_id, id),
  foreign key (organization_id, subscription_id)
    references public.clinic_subscriptions_v2(organization_id, id) on delete restrict,
  foreign key (organization_id, predecessor_id)
    references public.commercial_documents_v2(organization_id, id) on delete restrict,
  foreign key (attachment_version_id, attachment_record_id)
    references public.attachment_versions(id, attachment_id) on delete restrict,
  foreign key (organization_id, test_run_id)
    references public.test_data_batches(organization_id, id) on delete restrict,
  check ((attachment_record_id is null) = (attachment_version_id is null))
);

alter table public.attachment_records
  add constraint attachment_records_commercial_scope_key
    unique (id, organization_id, commercial_document_id),
  add constraint attachment_records_commercial_document_fkey
    foreign key (organization_id, commercial_document_id)
    references public.commercial_documents_v2(organization_id, id) on delete restrict;
alter table public.commercial_documents_v2
  add constraint commercial_documents_attachment_scope_fkey
  foreign key (attachment_record_id, organization_id, id)
  references public.attachment_records(id, organization_id, commercial_document_id) on delete restrict;

create table public.commercial_document_events_v2 (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  document_id uuid not null,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (action in ('created','replaced','archived')),
  prior_version integer,
  next_version integer not null check (next_version > 0),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  test_run_id uuid,
  foreign key (organization_id, document_id)
    references public.commercial_documents_v2(organization_id, id) on delete restrict,
  foreign key (organization_id, test_run_id)
    references public.test_data_batches(organization_id, id) on delete restrict
);
create index commercial_documents_v2_org_idx
  on public.commercial_documents_v2(organization_id, issued_at desc) where not archived;

create table public.support_tickets_v2 (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  requester_user_id uuid not null,
  version integer not null default 1 check (version > 0),
  title text not null check (char_length(btrim(title)) between 1 and 300),
  category text not null check (category in ('technical','account','commercial','other')),
  status text not null default 'open'
    check (status in ('open','in-progress','waiting-requester','resolved','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  test_run_id uuid,
  unique (organization_id, id),
  foreign key (organization_id, requester_user_id)
    references public.memberships(organization_id, user_id) on delete restrict,
  foreign key (organization_id, test_run_id)
    references public.test_data_batches(organization_id, id) on delete restrict
);

create table public.support_ticket_messages_v2 (
  id uuid primary key,
  ticket_id uuid not null,
  organization_id uuid not null,
  author_user_id uuid not null,
  sequence integer not null check (sequence > 0),
  body text not null check (char_length(btrim(body)) between 1 and 10000),
  created_at timestamptz not null default now(),
  test_run_id uuid,
  unique (ticket_id, sequence),
  foreign key (organization_id, ticket_id)
    references public.support_tickets_v2(organization_id, id) on delete restrict,
  foreign key (organization_id, author_user_id)
    references public.memberships(organization_id, user_id) on delete restrict,
  foreign key (organization_id, test_run_id)
    references public.test_data_batches(organization_id, id) on delete restrict
);

create table public.support_ticket_events_v2 (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null,
  organization_id uuid not null,
  actor_user_id uuid not null,
  action text not null check (action in ('created','replied','status-changed')),
  from_status text,
  to_status text,
  reason text,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  test_run_id uuid,
  foreign key (organization_id, ticket_id)
    references public.support_tickets_v2(organization_id, id) on delete restrict,
  foreign key (organization_id, actor_user_id)
    references public.memberships(organization_id, user_id) on delete restrict,
  foreign key (organization_id, test_run_id)
    references public.test_data_batches(organization_id, id) on delete restrict,
  check (
    (action in ('created','replied') and from_status is null and to_status is null and reason is null)
    or (action = 'status-changed' and from_status is not null and to_status is not null
      and from_status <> to_status and char_length(btrim(reason)) between 1 and 10000)
  )
);

create table private.commercial_inquiries_v2 (
  id uuid primary key,
  operation_id uuid not null unique,
  idempotency_key uuid not null unique,
  receipt_id uuid not null unique default gen_random_uuid(),
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  name text not null check (char_length(btrim(name)) between 1 and 200),
  email text not null check (char_length(email) <= 254 and email = lower(email)),
  organization text not null default '' check (char_length(organization) <= 300),
  message text not null check (char_length(btrim(message)) between 1 and 10000),
  contact_permission boolean not null check (contact_permission),
  source_fingerprint text not null check (source_fingerprint ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

create index support_tickets_v2_requester_idx
  on public.support_tickets_v2(organization_id, requester_user_id, updated_at desc);
create index support_ticket_messages_v2_ticket_idx
  on public.support_ticket_messages_v2(organization_id, ticket_id, sequence);
create index commercial_inquiries_v2_rate_idx
  on private.commercial_inquiries_v2(source_fingerprint, created_at desc);

insert into public.commercial_plans_v2(id, code, active) values
  ('10000000-0000-4000-8000-000000000001', 'clinica-base', true),
  ('10000000-0000-4000-8000-000000000002', 'clinica-equipo', true);
insert into public.commercial_plan_versions_v2(
  id, plan_id, version_number, name, description, amount_minor, currency,
  minor_unit_digits, period, included_seats, maximum_seats, features, active, demonstration)
values
  ('11000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',1,
    'Clínica Base','Catálogo interno de demostración.',0,'CLP',0,'monthly',1,5,
    '["Fichas clínicas","Programas ABA","Agenda local"]'::jsonb,true,true),
  ('11000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002',1,
    'Clínica Equipo','Catálogo interno de demostración.',0,'CLP',0,'monthly',5,100,
    '["Equipo clínico","Programas y sesiones","Soporte por tickets locales"]'::jsonb,true,true);

alter table public.appointment_series_v2 enable row level security;
alter table public.appointments_v2 enable row level security;
alter table public.appointment_participants_v2 enable row level security;
alter table public.appointment_reminders_v2 enable row level security;
alter table public.appointment_events_v2 enable row level security;
alter table public.commercial_plans_v2 enable row level security;
alter table public.commercial_plan_versions_v2 enable row level security;
alter table public.clinic_subscriptions_v2 enable row level security;
alter table public.clinic_subscription_events_v2 enable row level security;
alter table public.commercial_documents_v2 enable row level security;
alter table public.commercial_document_events_v2 enable row level security;
alter table public.support_tickets_v2 enable row level security;
alter table public.support_ticket_messages_v2 enable row level security;
alter table public.support_ticket_events_v2 enable row level security;

create policy a5_series_read on public.appointment_series_v2 for select to authenticated
  using ((select private.has_student_capability(client_id, 'student.view')));
create policy a5_appointment_read on public.appointments_v2 for select to authenticated
  using ((select private.has_student_capability(client_id, 'student.view')));
create policy a5_participants_read on public.appointment_participants_v2 for select to authenticated
  using (exists (select 1 from public.appointments_v2 appointment
    where appointment.organization_id = appointment_participants_v2.organization_id
      and appointment.client_id = appointment_participants_v2.client_id
      and appointment.id = appointment_participants_v2.appointment_id
      and (select private.has_student_capability(appointment.client_id, 'student.view'))));
create policy a5_reminders_read on public.appointment_reminders_v2 for select to authenticated
  using (exists (select 1 from public.appointments_v2 appointment
    where appointment.organization_id = appointment_reminders_v2.organization_id
      and appointment.client_id = appointment_reminders_v2.client_id
      and appointment.id = appointment_reminders_v2.appointment_id
      and (select private.has_student_capability(appointment.client_id, 'student.view'))));
create policy a5_appointment_events_read on public.appointment_events_v2 for select to authenticated
  using (exists (select 1 from public.appointments_v2 appointment
    where appointment.organization_id = appointment_events_v2.organization_id
      and appointment.client_id = appointment_events_v2.client_id
      and appointment.id = appointment_events_v2.appointment_id
      and (select private.has_student_capability(appointment.client_id, 'student.view'))));
create policy a5_plan_read on public.commercial_plans_v2 for select to authenticated using (active);
create policy a5_plan_version_read on public.commercial_plan_versions_v2 for select to authenticated using (active);
create policy a5_subscription_read on public.clinic_subscriptions_v2 for select to authenticated
  using (exists (select 1 from public.memberships membership
    where membership.organization_id = clinic_subscriptions_v2.organization_id
      and membership.user_id = (select auth.uid()) and membership.status = 'active'));
create policy a5_subscription_event_read on public.clinic_subscription_events_v2 for select to authenticated
  using ((select private.is_clinic_admin(organization_id)));
create policy a5_document_read on public.commercial_documents_v2 for select to authenticated
  using ((select private.is_clinic_admin(organization_id)));
create policy a5_document_event_read on public.commercial_document_events_v2 for select to authenticated
  using ((select private.is_clinic_admin(organization_id)));
create policy a5_ticket_read on public.support_tickets_v2 for select to authenticated
  using (requester_user_id = (select auth.uid()) or (select private.is_clinic_admin(organization_id)));
create policy a5_ticket_message_read on public.support_ticket_messages_v2 for select to authenticated
  using (exists (select 1 from public.support_tickets_v2 ticket
    where ticket.organization_id = support_ticket_messages_v2.organization_id
      and ticket.id = support_ticket_messages_v2.ticket_id
      and (ticket.requester_user_id = (select auth.uid())
        or (select private.is_clinic_admin(ticket.organization_id)))));
create policy a5_ticket_event_read on public.support_ticket_events_v2 for select to authenticated
  using (exists (select 1 from public.support_tickets_v2 ticket
    where ticket.organization_id = support_ticket_events_v2.organization_id
      and ticket.id = support_ticket_events_v2.ticket_id
      and (ticket.requester_user_id = (select auth.uid())
        or (select private.is_clinic_admin(ticket.organization_id)))));

revoke all on public.appointment_series_v2, public.appointments_v2,
  public.appointment_participants_v2, public.appointment_reminders_v2,
  public.appointment_events_v2, public.commercial_plans_v2,
  public.commercial_plan_versions_v2, public.clinic_subscriptions_v2,
  public.clinic_subscription_events_v2, public.commercial_documents_v2,
  public.commercial_document_events_v2, public.support_tickets_v2,
  public.support_ticket_messages_v2, public.support_ticket_events_v2
from public, anon, authenticated, service_role;
grant select on public.appointment_series_v2, public.appointments_v2,
  public.appointment_participants_v2, public.appointment_reminders_v2,
  public.appointment_events_v2, public.commercial_plans_v2,
  public.commercial_plan_versions_v2, public.clinic_subscriptions_v2,
  public.clinic_subscription_events_v2, public.commercial_documents_v2,
  public.commercial_document_events_v2, public.support_tickets_v2,
  public.support_ticket_messages_v2, public.support_ticket_events_v2
to authenticated;
revoke all on private.commercial_inquiries_v2 from public, anon, authenticated, service_role;

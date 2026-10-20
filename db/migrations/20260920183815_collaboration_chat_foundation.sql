-- A4 chat source of truth. Realtime is only a refresh signal; ordered rows and
-- monotonic read cursors remain authoritative after reconnect.
create table public.chat_conversations_v2(
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  client_id uuid not null,
  title text not null check(char_length(btrim(title)) between 1 and 300),
  audience text not null check(audience in('professionals','family')),
  version bigint not null default 1 check(version between 1 and 9007199254740991),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  test_run_id uuid,
  unique(organization_id,client_id,id),
  foreign key(organization_id,client_id) references public.clients(organization_id,id) on delete restrict,
  foreign key(organization_id,test_run_id) references public.test_data_batches(organization_id,id) on delete restrict
);
create table public.chat_participants_v2(
  conversation_id uuid not null references public.chat_conversations_v2(id) on delete restrict,
  organization_id uuid not null,client_id uuid not null,user_id uuid not null references auth.users(id) on delete restrict,
  participant_kind text not null check(participant_kind in('professional','external','family')),
  status text not null default 'active' check(status in('active','revoked')),
  joined_at timestamptz not null default now(),revoked_at timestamptz,test_run_id uuid,
  primary key(conversation_id,user_id),
  foreign key(organization_id,client_id,conversation_id) references public.chat_conversations_v2(organization_id,client_id,id) on delete restrict,
  foreign key(organization_id,test_run_id) references public.test_data_batches(organization_id,id) on delete restrict,
  check((status='revoked')=(revoked_at is not null))
);
create table public.chat_messages_v2(
  id uuid primary key,conversation_id uuid not null,organization_id uuid not null,client_id uuid not null,
  author_user_id uuid not null references auth.users(id) on delete restrict,
  sequence bigint not null check(sequence>0),body text not null check(char_length(body)<=10000),
  created_at timestamptz not null default now(),test_run_id uuid,
  unique(conversation_id,sequence),unique(conversation_id,id),
  foreign key(organization_id,client_id,conversation_id) references public.chat_conversations_v2(organization_id,client_id,id) on delete restrict,
  foreign key(conversation_id,author_user_id) references public.chat_participants_v2(conversation_id,user_id) on delete restrict,
  foreign key(organization_id,test_run_id) references public.test_data_batches(organization_id,id) on delete restrict
);
create table public.chat_message_attachments_v2(
  conversation_id uuid not null,message_id uuid not null,attachment_version_id uuid not null,
  attachment_id uuid not null,position smallint not null check(position between 0 and 9),
  primary key(message_id,attachment_version_id),unique(message_id,position),
  foreign key(conversation_id,message_id) references public.chat_messages_v2(conversation_id,id) on delete restrict,
  foreign key(attachment_version_id,attachment_id) references public.attachment_versions(id,attachment_id) on delete restrict
);
create table public.chat_read_states_v2(
  conversation_id uuid not null,organization_id uuid not null,client_id uuid not null,user_id uuid not null,
  through_sequence bigint not null default 0 check(through_sequence>=0),version bigint not null default 1 check(version>0),
  read_at timestamptz not null default now(),test_run_id uuid,
  primary key(conversation_id,user_id),
  foreign key(organization_id,client_id,conversation_id) references public.chat_conversations_v2(organization_id,client_id,id) on delete restrict,
  foreign key(conversation_id,user_id) references public.chat_participants_v2(conversation_id,user_id) on delete restrict,
  foreign key(organization_id,test_run_id) references public.test_data_batches(organization_id,id) on delete restrict
);
create index chat_conversations_student_updated_idx on public.chat_conversations_v2(client_id,updated_at desc);
create index chat_participants_user_status_idx on public.chat_participants_v2(user_id,status,conversation_id);
create index chat_messages_conversation_sequence_idx on public.chat_messages_v2(conversation_id,sequence);
create index chat_conversations_test_run_idx on public.chat_conversations_v2(organization_id,test_run_id) where test_run_id is not null;
create index chat_messages_test_run_idx on public.chat_messages_v2(organization_id,test_run_id) where test_run_id is not null;
alter table public.chat_conversations_v2 enable row level security;
alter table public.chat_participants_v2 enable row level security;
alter table public.chat_messages_v2 enable row level security;
alter table public.chat_message_attachments_v2 enable row level security;
alter table public.chat_read_states_v2 enable row level security;
revoke all on table public.chat_conversations_v2,public.chat_participants_v2,public.chat_messages_v2,
  public.chat_message_attachments_v2,public.chat_read_states_v2 from public,anon,authenticated,service_role;
comment on table public.chat_messages_v2 is 'Durable ordered A4 chat source; Realtime never replaces gap recovery by sequence.';

-- Plain PostgreSQL bootstrap for ABA.
-- Applied once before the versioned migrations. It recreates the small slice of
-- the Supabase platform that the schema contracts depend on (roles, the auth
-- schema, Storage metadata tables and the Realtime publication), so every
-- migration and RLS policy keeps working unchanged.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
  -- Some migrations alter default privileges for the platform owner role that
  -- Supabase used. It only needs to exist; objects stay owned by the deploy user.
  if not exists (select 1 from pg_roles where rolname = 'postgres') then
    create role postgres nologin;
  end if;
  execute format('grant anon, authenticated, service_role to %I', current_user);
end
$$;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  encrypted_password text,
  email_confirmed_at timestamptz,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  banned_until timestamptz,
  deleted_at timestamptz
);

create unique index if not exists users_email_lower_key on auth.users (lower(email));

create table if not exists auth.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  user_agent text,
  ip inet
);

create index if not exists sessions_user_idx on auth.sessions (user_id);

create table if not exists auth.one_time_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  purpose text not null check (purpose in ('recovery', 'invite', 'email_change')),
  token_hash text not null unique,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create index if not exists one_time_tokens_user_purpose_idx
  on auth.one_time_tokens (user_id, purpose);

-- JWT claim shims: the application sets these per transaction with SET LOCAL.
create or replace function auth.uid() returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create or replace function auth.jwt() returns jsonb
language sql stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant execute on function auth.jwt() to anon, authenticated, service_role;

-- Storage metadata shim. Bytes live on a private volume managed by the app;
-- these tables exist so the migration contracts and RLS policies apply.
create schema if not exists storage;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null references storage.buckets(id),
  name text not null,
  owner uuid,
  metadata jsonb,
  created_at timestamptz not null default now(),
  unique (bucket_id, name)
);

alter table storage.objects enable row level security;

create or replace function storage.foldername(p_name text) returns text[]
language sql immutable
as $$
  select case
    when strpos(p_name, '/') = 0 then array[]::text[]
    else string_to_array(regexp_replace(p_name, '/[^/]*$', ''), '/')
  end
$$;

create or replace function storage.allow_only_operation(p_operation text) returns boolean
language sql stable
as $$
  select false
$$;

grant usage on schema storage to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects to authenticated, service_role;
grant select, insert, update, delete on storage.buckets to authenticated, service_role;

-- The migrations register tables for Realtime. The application replaces
-- Realtime with polling, so the publication only needs to exist.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end
$$;

grant usage on schema public to anon, authenticated, service_role;

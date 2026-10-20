#!/bin/sh
# Applies the platform bootstrap and pending versioned migrations in order.
# Safe to run on every deploy: applied versions are recorded in schema_migrations.
set -eu

: "${DATABASE_URL:?DATABASE_URL is required}"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q --single-transaction -f /db/bootstrap.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c \
  "create table if not exists public.schema_migrations (version text primary key, applied_at timestamptz not null default now())"

for file in /db/migrations/*.sql; do
  name=$(basename "$file")
  applied=$(psql "$DATABASE_URL" -tAX -c "select 1 from public.schema_migrations where version = '$name'")
  if [ "$applied" = "1" ]; then
    continue
  fi
  echo "applying $name"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q --single-transaction \
    -f "$file" \
    -c "insert into public.schema_migrations (version) values ('$name')"
done

echo "database is up to date"

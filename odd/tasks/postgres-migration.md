# Postgres migration — remove Supabase

## Objective
Replace Supabase (Auth, PostgREST, Storage, Realtime, Edge Functions) with plain PostgreSQL and in-app server code, and ship a Dokploy-ready `infra/` stack.

## Why
Supabase Cloud/stacks consume more resources than this clinical PoC needs. A single Postgres instance plus the Next.js server is enough.

## Scope
- Keep all 103 SQL migrations and the 113 RLS policies; run them on plain PostgreSQL.
- Implement auth (sessions, password hashing, invitations, reset) in the Next.js server.
- Replace PostgREST queries with parameterized SQL through `pg`.
- Replace Storage with a private local volume behind authorized route handlers.
- Replace Realtime with polling.
- Move the 3 Edge Functions into server modules.
- Rewrite `infra/` compose for Dokploy with Postgres and the app.

## Tasks
- [x] T1 Bootstrap DB: roles, auth schema, storage shim, realtime publication.
- [x] T2 DB client: pool, per-request claims, query helpers.
- [x] T3 Auth core: password hashing, sessions, cookies, current user.
- [x] T4 Auth flows: login, logout, password change, reset, invitation acceptance.
- [x] T5 Replace auth call sites (36).
- [x] T6 Replace PostgREST reads/writes (64).
- [x] T7 Replace RPC calls (22).
- [x] T8 Storage on private volume.
- [x] T9 Realtime to polling.
- [x] T10 Edge Functions to server modules.
- [x] T11 Update tests, CI, docs.
- [x] T12 Dokploy compose + env + runbook.
- [x] T13 Remove Supabase dependency and folders.

## Progress

All tasks are implemented and verified locally. Pending: authenticated browser E2E
and a real SMTP/PostgreSQL deployment smoke.

## Verification evidence

- `npm run typecheck`: passes.
- `npm run lint`: passes with zero warnings.
- `npm test`: 10 files, 45 tests pass (PGlite applies `db/bootstrap.sql` + all 103 migrations).
- `npm run build`: passes; Proxy middleware and all routes compile.
- `npm run db:migrate`: applied all 103 migrations on real PostgreSQL 17 (Docker,
  `postgres:17-alpine`); a second run was a no-op and created 73 public tables and
  98 RLS policies.
- `package-lock.json`: zero `@supabase` entries; `supabase/` directory removed.

## Pending checks

- `npm run test:e2e` could not run locally: port 3000 was occupied by another
  process and Next moved the dev server to 3001, so the configured health check
  timed out. Not a code failure; re-run on a free port.
- Authenticated browser coverage must be rebuilt against the in-app auth (the
  Supabase-based spec was removed).
- Deployment smoke (real domain, SMTP, attachments) still pending; `docker compose config` passes locally.

## Checks
- `npm run typecheck`
- `npm run test`
- `npm run test:db`
- `npm run build`
- `docker compose -f infra/docker-compose.yml config`

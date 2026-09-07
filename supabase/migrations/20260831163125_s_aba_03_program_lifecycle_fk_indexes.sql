-- Recovered from ABA_staging migration history; schema only.
-- S-ABA-03 follow-up: cover every lifecycle foreign key used by PostgreSQL
-- referential checks. Additive only; no row is modified or removed.
create index programs_organization_idx
  on public.programs (organization_id);
create index programs_current_version_idx
  on public.programs (current_version_id)
  where current_version_id is not null;
create index programs_created_by_idx
  on public.programs (created_by);

create index program_versions_organization_idx
  on public.program_versions (organization_id);
create index program_versions_program_client_type_idx
  on public.program_versions (program_id, client_id, program_type);
create index program_versions_created_by_idx
  on public.program_versions (created_by);

create index program_lifecycle_events_organization_idx
  on public.program_lifecycle_events (organization_id);
create index program_lifecycle_events_version_idx
  on public.program_lifecycle_events (program_version_id)
  where program_version_id is not null;
create index program_lifecycle_events_actor_idx
  on public.program_lifecycle_events (actor_user_id);

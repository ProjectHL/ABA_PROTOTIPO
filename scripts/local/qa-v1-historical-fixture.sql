-- R5 / QA-012: one idempotent, explicitly synthetic V1 aggregate.
-- Run only against aba-reintegration-local after checking the batch and IDs.
-- No reset, cleanup, grants, or production schema change.
begin;
select set_config('request.jwt.claim.sub', '1984eae1-6987-45c9-a032-245af18e732a', true);

insert into public.session_program_records (
  id, session_id, client_id, program_version_id, actor_user_id,
  dimension, payload, version, submitted, test_run_id
)
select
  'c38dbfa7-5f55-40c2-a2c6-1b506374a011'::uuid,
  session.id, session.client_id, version.id,
  '1984eae1-6987-45c9-a032-245af18e732a'::uuid,
  'frequency',
  jsonb_build_object('count', 3, 'notes', 'QA R5 V1 AGREGADO SINTETICO 2155e99e'),
  1, true, '2155e99e-bda4-4c68-95cf-b74cacd84ecd'::uuid
from public.clinical_sessions session
join public.program_versions version
  on version.client_id = session.client_id
  and version.organization_id = '3e8aa653-8cce-46d0-aa4d-2316d1e5d1b1'::uuid
  and version.id = '3d10856f-4f33-48e3-a922-b0e3af232e07'::uuid
where session.id = '97a8e135-1fb0-4397-910f-f4fe5f099ad1'::uuid
  and session.client_id = 'b347646e-ff29-450b-aedf-9f9c015fb41a'::uuid
  and exists (
    select 1 from public.memberships membership
    where membership.organization_id = version.organization_id
      and membership.user_id = '1984eae1-6987-45c9-a032-245af18e732a'::uuid
      and membership.role = 'admin' and membership.status = 'active'
  )
on conflict do nothing;

do $$
begin
  if not exists (
    select 1 from public.session_program_records record
    where record.id = 'c38dbfa7-5f55-40c2-a2c6-1b506374a011'::uuid
      and record.session_id = '97a8e135-1fb0-4397-910f-f4fe5f099ad1'::uuid
      and record.client_id = 'b347646e-ff29-450b-aedf-9f9c015fb41a'::uuid
      and record.program_version_id = '3d10856f-4f33-48e3-a922-b0e3af232e07'::uuid
      and record.dimension = 'frequency' and record.submitted
      and record.payload = '{"count":3,"notes":"QA R5 V1 AGREGADO SINTETICO 2155e99e"}'::jsonb
      and record.test_run_id = '2155e99e-bda4-4c68-95cf-b74cacd84ecd'::uuid
  ) then
    raise exception 'QA-012 V1 fixture missing or mismatched';
  end if;
end $$;
commit;

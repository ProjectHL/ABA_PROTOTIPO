-- Local-only synthetic reference data. These Auth rows intentionally have no
-- password or identity; login-capable accounts are created through the local Auth
-- admin API in integration tests. Never push this seed to a clinical environment.

insert into auth.users (id, email, raw_user_meta_data)
values
  ('20000000-0000-4000-8000-000000000001', 'admin@aba.local', '{}'),
  ('20000000-0000-4000-8000-000000000002', 'supervisor@aba.local', '{}'),
  ('20000000-0000-4000-8000-000000000003', 'tecnico@aba.local', '{}'),
  ('20000000-0000-4000-8000-000000000004', 'externo@aba.local', '{}')
on conflict (id) do nothing;

insert into public.organizations (id, name, status)
values
  ('10000000-0000-4000-8000-000000000001', 'Clínica sintética A', 'active'),
  ('10000000-0000-4000-8000-000000000002', 'Clínica sintética B', 'active')
on conflict (id) do nothing;

insert into public.memberships (organization_id, user_id, role, status)
values
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'admin', 'active'),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'supervisor', 'active'),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', 'therapist', 'active'),
  ('10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000004', 'admin', 'active')
on conflict (organization_id, user_id) do update
set role = excluded.role,
    status = excluded.status;

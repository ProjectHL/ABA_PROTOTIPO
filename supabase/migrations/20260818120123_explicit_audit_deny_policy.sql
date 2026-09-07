-- Recovered from ABA_staging migration history; schema only.
-- Keep audit data explicitly inaccessible through client roles.
-- Table grants remain revoked; this policy also makes the RLS intent auditable.

create policy audit_events_deny_client_roles
on public.audit_events
for all
to anon, authenticated
using (false)
with check (false);

-- Keep a single permissive SELECT policy while preserving self-service context
-- and clinic-admin team visibility.
drop policy memberships_select_self on public.memberships;
drop policy memberships_select_clinic_admin on public.memberships;
create policy memberships_select_self_or_clinic_admin
on public.memberships for select to authenticated
using (
  user_id=(select auth.uid())
  or (select private.is_clinic_admin(organization_id))
);

-- This append-only ledger is intentionally unavailable through the browser.
-- The explicit deny documents that contract while REVOKE keeps table access closed.
create policy student_access_audit_events_deny_authenticated
on public.student_access_audit_events for all to authenticated
using (false) with check (false);

create index clinic_admin_events_actor_idx on public.clinic_admin_events(actor_user_id);
create index clinic_admin_events_subject_idx on public.clinic_admin_events(subject_user_id);
create index clinical_record_events_actor_idx on public.clinical_record_events(actor_user_id);
create index test_data_cleanup_log_actor_idx on public.test_data_cleanup_log(actor_user_id);
create index test_data_cleanup_log_organization_idx on public.test_data_cleanup_log(organization_id,created_at desc);

-- Recovered from ABA_staging migration history; schema only.
-- S-ABA-01/S-ABA-02: cover foreign-key lookups used for joins and referential checks.
create index client_context_profiles_updated_by_idx on public.client_context_profiles (updated_by);
create index clinical_history_entries_created_by_idx on public.clinical_history_entries (created_by);
create index clinical_history_entries_organization_idx on public.clinical_history_entries (organization_id);
create index consent_events_actor_idx on public.consent_events (actor_user_id);
create index consent_events_organization_idx on public.consent_events (organization_id);
create index consent_records_created_by_idx on public.consent_records (created_by);
create index consent_records_organization_idx on public.consent_records (organization_id);
create index student_access_audit_organization_idx on public.student_access_audit_events (organization_id);
create index student_assignments_created_by_idx on public.student_assignments (created_by);
create index student_authorization_decisions_decider_idx on public.student_authorization_decisions (decider_user_id);
create index student_authorization_decisions_organization_idx on public.student_authorization_decisions (organization_id);
create index student_authorization_requests_organization_idx on public.student_authorization_requests (organization_id);

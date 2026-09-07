-- Recovered from ABA_staging migration history; schema only.
-- S-ABA-01: RLS policies invoke these SECURITY DEFINER helpers as authenticated users.
-- The private schema remains outside the exposed API schemas; only exact execution is granted.
grant execute on function private.has_active_student_assignment(uuid) to authenticated;
grant execute on function private.student_assignment_role(uuid) to authenticated;
grant execute on function private.is_primary_student_supervisor(uuid) to authenticated;
grant execute on function private.has_student_capability(uuid, text) to authenticated;

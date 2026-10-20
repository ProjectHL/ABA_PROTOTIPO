-- QA R5: admin can assign a member but cannot reread assignments without a
-- personal student assignment. Add only the clinic-admin SELECT path.
-- Existing assigned-team policy, writes, RPCs and capabilities are unchanged.
-- Active clinic/admin membership and student.view remain required; the latter
-- preserves the existing resource/frozen-batch authorization checks.
create policy student_assignments_select_clinic_admin
on public.student_assignments
for select to authenticated
using (
  (select private.is_clinic_admin(organization_id))
  and (select private.has_student_capability(client_id, 'student.view'))
);

-- Operational rollback, if ever needed: create a NEW forward migration with
-- DROP POLICY student_assignments_select_clinic_admin ON public.student_assignments;
-- Do not edit this migration after application. No data is created or deleted.

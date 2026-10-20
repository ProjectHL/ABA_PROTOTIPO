-- R5: minimum dependencies required by existing invoker RPCs and RLS policies.
-- No new public RPC, write privilege, or family clinical capability.
begin;

-- Existing private implementation checks auth.uid() and live identity scope.
grant execute on function private.aba_identity_context_impl(uuid) to authenticated;

-- Existing auth-bound helpers required by attachment and Storage RLS policies.
grant execute on function private.attachment_record_authorized_v2(uuid,text),
  private.can_read_attachment_object(text,text,uuid),
  private.can_upload_reserved_attachment(text,text,uuid) to authenticated;

-- Explicit canonical capability plus exact resource scope, not authentication
-- alone. Program SELECT also retains its existing capability-based RLS.
alter table public.program_lifecycle_events enable row level security;
create policy program_lifecycle_events_select_visible_program
on public.program_lifecycle_events for select to authenticated
using (
  (select private.has_student_capability(client_id, 'program.view'))
  and exists (
    select 1 from public.programs program
    where program.id = program_lifecycle_events.program_id
      and program.client_id = program_lifecycle_events.client_id
      and program.organization_id = program_lifecycle_events.organization_id
  )
);
grant select on table public.program_lifecycle_events to authenticated;

commit;

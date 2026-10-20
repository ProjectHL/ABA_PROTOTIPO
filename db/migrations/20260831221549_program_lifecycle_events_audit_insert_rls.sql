-- Recovered from ABA_staging migration history; schema only.
create policy program_lifecycle_events_insert_granted
on public.program_lifecycle_events
for insert
to authenticated
with check ((select private.has_student_capability(client_id, 'program.edit')));

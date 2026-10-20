-- Recovered from ABA_staging migration history; schema only.
-- Audit every client update without copying clinical payloads into the audit log.
create or replace function private.audit_client_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_events (
    organization_id,
    actor_user_id,
    entity_type,
    entity_id,
    action,
    test_run_id
  ) values (
    new.organization_id,
    auth.uid(),
    'client',
    new.id,
    case
      when old.status is distinct from new.status and new.status = 'archived' then 'archived'
      else 'updated'
    end,
    new.test_run_id
  );

  return new;
end;
$$;

revoke all on function private.audit_client_update() from public, anon, authenticated;

create trigger clients_audit_update
after update on public.clients
for each row execute function private.audit_client_update();

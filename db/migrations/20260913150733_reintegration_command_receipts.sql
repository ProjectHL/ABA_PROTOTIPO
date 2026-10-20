-- Proposed V2 foundation. Not applied or QA-approved.
-- Insert only AFTER authorization, optimistic-version check and domain mutation,
-- in the SAME transaction. Rollback must undo both mutation and receipt.
-- No pending row is persisted: an ambiguous timeout is resolved by exact retry.
create table private.command_receipts (
  organization_id uuid not null references public.organizations(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  operation_id uuid not null,
  idempotency_key uuid not null,
  resource_id uuid not null,
  command_type text not null check (char_length(command_type) between 1 and 100),
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  receipt_id uuid not null default gen_random_uuid(),
  server_version bigint not null check (server_version between 0 and 9007199254740991),
  committed_at timestamptz not null default now(),
  test_run_id uuid,
  foreign key (organization_id, test_run_id)
    references public.test_data_batches(organization_id, id) on delete restrict,
  primary key (organization_id, actor_user_id, operation_id),
  unique (organization_id, actor_user_id, idempotency_key),
  unique (receipt_id)
);

-- PK covers organization FK; these cover actor and batch FK and resource history.
create index command_receipts_actor_idx on private.command_receipts(actor_user_id);
create index command_receipts_test_run_idx on private.command_receipts(organization_id, test_run_id)
  where test_run_id is not null;
create index command_receipts_resource_idx
  on private.command_receipts(organization_id, resource_id, committed_at);

alter table private.command_receipts enable row level security;
revoke all on table private.command_receipts from public, anon, authenticated, service_role;
comment on table private.command_receipts is
  'Private durable V2 receipts. Domain commands recheck current authorization before replay; clients never write or read this table directly.';

-- Command implementations must serialize concurrent keys/operations, then compare
-- BOTH IDs, command type, resource and canonical server-computed SHA256 before replay.
-- A unique collision with different payload is a conflict, not successful replay.
-- The ledger is not a permission engine and contains no clinical payload/snapshot.
-- Never expose a generic SECURITY DEFINER receipt creator: it could fabricate success.
-- Existing clinic_invitation_operations remains for its Auth/DB two-stage handoff.
-- Cleanup is explicit per validated synthetic batch; receipts are not pruned on logout.
-- Forward-fix preferred after use; rollback may remove this table ONLY when empty
-- and no V2 command depends on it. No DROP/reset is included in normal operation.

create function private.command_receipt_result(
  p_receipt private.command_receipts, p_replayed boolean
) returns jsonb language sql immutable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'status', 'acknowledged', 'operationId', p_receipt.operation_id,
    'idempotencyKey', p_receipt.idempotency_key, 'resourceId', p_receipt.resource_id,
    'receiptId', p_receipt.receipt_id, 'serverVersion', p_receipt.server_version,
    'committedAt', p_receipt.committed_at, 'replayed', p_replayed
  );
$$;

-- Called by authorized domain RPC BEFORE locking/mutating the resource. All RPCs
-- must use this order. One transaction-scoped mutex per clinic/actor avoids lock
-- ordering cycles between operation/key collisions; hash collisions only serialize.
create function private.lock_command_replay(
  p_organization_id uuid, p_operation_id uuid, p_idempotency_key uuid,
  p_resource_id uuid, p_command_type text, p_payload jsonb
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_hash text;
  v_receipt private.command_receipts;
begin
  if v_actor is null then
    raise exception using errcode = '42501', message = 'authenticated_identity_required';
  end if;
  if p_organization_id is null or p_operation_id is null or p_idempotency_key is null
    or p_resource_id is null or p_command_type is null
    or char_length(p_command_type) not between 1 and 100
    or p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'command_identity_invalid';
  end if;
  v_hash := encode(sha256(convert_to(p_payload::text, 'UTF8')), 'hex');
  perform pg_advisory_xact_lock(hashtextextended(
    'aba-command:' || p_organization_id::text || ':' || v_actor::text, 0
  ));
  for v_receipt in
    select r.* from private.command_receipts r
    where r.organization_id = p_organization_id and r.actor_user_id = v_actor
      and (r.operation_id = p_operation_id or r.idempotency_key = p_idempotency_key)
  loop
    if v_receipt.operation_id <> p_operation_id then
      raise exception using errcode = '40001', message = 'idempotency_key_reused';
    end if;
    if v_receipt.idempotency_key <> p_idempotency_key then
      raise exception using errcode = '40001', message = 'operation_id_reused';
    end if;
    if v_receipt.resource_id <> p_resource_id or v_receipt.command_type <> p_command_type
      or v_receipt.payload_sha256 <> v_hash then
      raise exception using errcode = '40001', message = 'idempotency_payload_conflict';
    end if;
    return private.command_receipt_result(v_receipt, true);
  end loop;
  return null;
end;
$$;

-- Internal only. Domain mutation and this insert share a transaction. A late
-- duplicate is an error, not replay, so accidental repeated domain work rolls back.
create function private.issue_command_receipt(
  p_organization_id uuid, p_operation_id uuid, p_idempotency_key uuid,
  p_resource_id uuid, p_command_type text, p_payload jsonb,
  p_server_version bigint, p_test_run_id uuid default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_receipt private.command_receipts;
begin
  if p_server_version is null or p_server_version not between 0 and 9007199254740991 then
    raise exception using errcode = '22023', message = 'server_version_invalid';
  end if;
  if private.lock_command_replay(p_organization_id, p_operation_id, p_idempotency_key,
    p_resource_id, p_command_type, p_payload) is not null then
    raise exception using errcode = '40001', message = 'receipt_already_issued_before_mutation';
  end if;
  insert into private.command_receipts(
    organization_id, actor_user_id, operation_id, idempotency_key,
    resource_id, command_type, payload_sha256, server_version, test_run_id
  ) values (
    p_organization_id, auth.uid(), p_operation_id, p_idempotency_key,
    p_resource_id, p_command_type, encode(sha256(convert_to(p_payload::text, 'UTF8')), 'hex'),
    p_server_version, p_test_run_id
  ) returning * into v_receipt;
  return private.command_receipt_result(v_receipt, false);
end;
$$;

revoke all on function
  private.command_receipt_result(private.command_receipts, boolean),
  private.lock_command_replay(uuid, uuid, uuid, uuid, text, jsonb),
  private.issue_command_receipt(uuid, uuid, uuid, uuid, text, jsonb, bigint, uuid)
from public, anon, authenticated, service_role;

-- These SECURITY INVOKER helpers do not elevate privileges. Only owned, reviewed
-- domain functions can access them. They verify identity, not resource authority:
-- each caller MUST check existing capabilities/clinic/family scope BEFORE replay,
-- recheck authorization after lock where concurrent revocation can matter, lock
-- the resource, compare expectedVersion, mutate and issue the receipt atomically.
-- No grant to API roles; no new policy or second authorization engine is created.

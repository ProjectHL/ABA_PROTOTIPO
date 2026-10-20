create function private.command_identity_or_replay_result(
  p_organization_id uuid,
  p_operation_id uuid,
  p_idempotency_key uuid,
  p_resource_id uuid,
  p_command_type text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_result jsonb;
  v_message text;
  v_code text;
begin
  begin
    v_result := private.lock_command_replay(
      p_organization_id, p_operation_id, p_idempotency_key,
      p_resource_id, p_command_type, p_payload
    );
  exception when sqlstate '40001' then
    get stacked diagnostics v_message = message_text;
    v_code := case v_message
      when 'idempotency_key_reused' then 'idempotency-key-reused'
      when 'operation_id_reused' then 'operation-id-reused'
      when 'idempotency_payload_conflict' then 'idempotency-payload-conflict'
      else null
    end;
    if v_code is null then
      raise;
    end if;
    return jsonb_build_object(
      'status', 'conflict',
      'operationId', p_operation_id,
      'idempotencyKey', p_idempotency_key,
      'resourceId', p_resource_id,
      'code', v_code,
      'message', case v_code
        when 'idempotency-key-reused' then 'La clave idempotente ya identifica otra operación.'
        when 'operation-id-reused' then 'El identificador de operación ya usa otra clave.'
        else 'La identidad del comando ya está asociada a otro recurso, tipo o payload.'
      end
    );
  end;
  return v_result;
end;
$$;

create function private.command_version_conflict_result(
  p_operation_id uuid,
  p_idempotency_key uuid,
  p_resource_id uuid,
  p_expected_version bigint,
  p_current_version bigint,
  p_message text default 'El recurso cambió desde la última lectura.'
)
returns jsonb
language plpgsql
immutable
security invoker
set search_path = ''
as $$
begin
  if p_operation_id is null or p_idempotency_key is null or p_resource_id is null
    or p_expected_version is null or p_current_version is null
    or p_expected_version < 0 or p_current_version < 0
    or p_expected_version > 9007199254740991 or p_current_version > 9007199254740991
    or p_expected_version = p_current_version
    or p_message is null or char_length(p_message) not between 1 and 10000 then
    raise exception using errcode = '22023', message = 'version_conflict_result_invalid';
  end if;
  return jsonb_build_object(
    'status', 'conflict',
    'operationId', p_operation_id,
    'idempotencyKey', p_idempotency_key,
    'resourceId', p_resource_id,
    'code', 'version-conflict',
    'expectedVersion', p_expected_version,
    'currentVersion', p_current_version,
    'message', p_message
  );
end;
$$;

create function private.command_rejected_result(
  p_operation_id uuid,
  p_idempotency_key uuid,
  p_resource_id uuid,
  p_code text,
  p_message text,
  p_issues jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
immutable
security invoker
set search_path = ''
as $$
begin
  if p_operation_id is null or p_idempotency_key is null or p_resource_id is null
    or p_code not in ('permission-denied','validation-failed','resource-unavailable','invalid-transition')
    or p_message is null or char_length(p_message) not between 1 and 10000
    or p_issues is null or jsonb_typeof(p_issues) <> 'array'
    or jsonb_array_length(p_issues) > 1000 then
    raise exception using errcode = '22023', message = 'rejected_result_invalid';
  end if;
  return jsonb_build_object(
    'status', 'rejected',
    'operationId', p_operation_id,
    'idempotencyKey', p_idempotency_key,
    'resourceId', p_resource_id,
    'code', p_code,
    'message', p_message,
    'issues', p_issues
  );
end;
$$;

revoke all on function
  private.command_identity_or_replay_result(uuid,uuid,uuid,uuid,text,jsonb),
  private.command_version_conflict_result(uuid,uuid,uuid,bigint,bigint,text),
  private.command_rejected_result(uuid,uuid,uuid,text,text,jsonb)
from public, anon, authenticated, service_role;

comment on function private.command_identity_or_replay_result(uuid,uuid,uuid,uuid,text,jsonb) is
  'Internal command boundary: returns authorized replay or only the three known ledger identity conflicts; rethrows real serialization failures.';

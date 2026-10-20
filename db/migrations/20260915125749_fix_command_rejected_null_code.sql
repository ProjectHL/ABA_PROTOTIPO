create or replace function private.command_rejected_result(
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
    or p_code is null
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

revoke all on function private.command_rejected_result(uuid,uuid,uuid,text,text,jsonb)
from public, anon, authenticated, service_role;

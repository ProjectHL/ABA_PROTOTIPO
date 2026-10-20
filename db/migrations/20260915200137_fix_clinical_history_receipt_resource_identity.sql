-- Forward-only correction: the command mutates one logical history chain, so
-- every result and durable receipt must expose historyId rather than studentId.
-- The guarded rewrite preserves the already-reviewed transaction body from the
-- immediately preceding migration and aborts if its expected call sites differ.
do $migration$
declare
  v_definition text;
  v_rejected_pattern text := '(private\.command_rejected_result\(v_operation_id,\s*v_idempotency_key,\s*)v_client_id(,)';
  v_conflict_pattern text := '(private\.command_version_conflict_result\(v_operation_id,\s*v_idempotency_key,\s*)v_client_id(,)';
  v_replay_pattern text := '(private\.command_identity_or_replay_result\(\s*p_organization_id,\s*v_operation_id,\s*v_idempotency_key,\s*)v_client_id(,\s*''clinical-history-v2'')';
  v_receipt_pattern text := '(private\.issue_command_receipt\(\s*p_organization_id,\s*v_operation_id,\s*v_idempotency_key,\s*)v_client_id(,\s*''clinical-history-v2'')';
begin
  select pg_get_functiondef('public.aba_clinical_history_command_v2(uuid,jsonb)'::regprocedure)
    into strict v_definition;
  if v_definition !~ v_rejected_pattern or v_definition !~ v_conflict_pattern
    or v_definition !~ v_replay_pattern or v_definition !~ v_receipt_pattern then
    raise exception using errcode='55000', message='clinical_history_forward_fix_shape_changed';
  end if;

  v_definition := regexp_replace(v_definition,v_rejected_pattern,E'\\1v_history_id\\2','g');
  v_definition := regexp_replace(v_definition,v_conflict_pattern,E'\\1v_history_id\\2','g');
  v_definition := regexp_replace(v_definition,v_replay_pattern,E'\\1v_history_id\\2','g');
  v_definition := regexp_replace(v_definition,v_receipt_pattern,E'\\1v_history_id\\2','g');

  if v_definition ~ v_rejected_pattern or v_definition ~ v_conflict_pattern
    or v_definition ~ v_replay_pattern or v_definition ~ v_receipt_pattern then
    raise exception using errcode='55000', message='clinical_history_forward_fix_incomplete';
  end if;
  execute v_definition;
end;
$migration$;

comment on function public.aba_clinical_history_command_v2(uuid,jsonb) is
  'Authorized immutable clinical-history command; result resourceId is the logical historyId.';

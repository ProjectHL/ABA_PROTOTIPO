-- Extend the existing resource boundary, never a parallel permission engine.
create or replace function private.attachment_resource_authorized_v2(
  p_organization_id uuid,p_resource jsonb,p_capability text
) returns boolean language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_kind text;v_target uuid;
begin
  if v_actor is null or p_organization_id is null or p_capability is null
    or p_capability not in ('student.view','student.edit')
    or not coalesce(private.attachment_resource_v2_valid(p_resource),false) then return false;end if;
  v_kind:=p_resource->>'kind';
  if v_kind='professional' then
    v_target:=(p_resource->>'userId')::uuid;
    return exists(select 1 from public.memberships actor
      join public.memberships target on target.organization_id=actor.organization_id and target.user_id=v_target
      where actor.organization_id=p_organization_id and actor.user_id=v_actor and actor.status='active'
        and target.status='active' and (v_target=v_actor or actor.role='admin'));
  elsif v_kind='student' then
    return (p_resource->>'clinicId')::uuid=p_organization_id
      and exists(select 1 from public.clients c where c.organization_id=p_organization_id and c.id=(p_resource->>'studentId')::uuid)
      and private.has_student_capability((p_resource->>'studentId')::uuid,p_capability);
  elsif v_kind='commercial' then
    return (p_resource->>'clinicId')::uuid=p_organization_id
      and private.is_clinic_admin(p_organization_id)
      and exists(select 1 from public.commercial_documents_v2 d
        join public.organizations o on o.id=d.organization_id
        where d.organization_id=p_organization_id and d.id=(p_resource->>'documentId')::uuid
          and o.status='active' and (p_capability='student.view' or not d.archived));
  end if;
  -- Chat remains fail-closed until its exact A4 resource boundary is integrated.
  return false;
end;
$$;

-- Forward fixes fail closed if the reviewed source shape has changed.
do $migration$
declare definition text; old_text text; new_text text;
begin
  select pg_get_functiondef('private.attachment_command_v2_valid(jsonb)'::regprocedure) into strict definition;
  old_text:=$old$(v_upload->>'purpose'='student-photo')<>(v_resource->>'kind'='student')$old$;
  new_text:=$new$(v_upload->>'purpose' in ('student-photo','student-document'))<>(v_resource->>'kind'='student')$new$;
  if strpos(definition,old_text)=0 then raise exception 'attachment_purpose_guard_shape_changed';end if;
  execute replace(definition,old_text,new_text);

  select pg_get_functiondef('public.aba_attachment_reserve_v2(uuid,jsonb)'::regprocedure) into strict definition;
  old_text:=$old$  else
    perform 1 from public.organizations o where o.id=p_organization_id and o.status='active' for update;$old$;
  new_text:=$new$  elsif v_kind='commercial' then
    select d.test_run_id into v_test_run from public.commercial_documents_v2 d
      where d.organization_id=p_organization_id and d.id=(v_resource->>'documentId')::uuid
        and not d.archived for update;
    if not found then return private.attachment_envelope_v2(private.command_rejected_result(
      v_operation,v_key,v_attachment,'resource-unavailable','Documento comercial no disponible.'));end if;
    perform private.require_open_test_batch(p_organization_id,v_test_run);
  else
    perform 1 from public.organizations o where o.id=p_organization_id and o.status='active' for update;$new$;
  if strpos(definition,old_text)=0 then raise exception 'attachment_batch_guard_shape_changed';end if;
  execute replace(definition,old_text,new_text);

  select pg_get_functiondef('public.aba_attachment_archive_v2(uuid,jsonb)'::regprocedure) into strict definition;
  old_text:=$old$or exists(select 1 from public.consent_records c where c.evidence_attachment_id=v_attachment and c.status<>'superseded') then$old$;
  new_text:=$new$or exists(select 1 from public.consent_records c where c.evidence_attachment_id=v_attachment and c.status<>'superseded')
    or exists(select 1 from public.commercial_documents_v2 d where d.attachment_record_id=v_attachment and not d.archived) then$new$;
  if strpos(definition,old_text)=0 then raise exception 'attachment_reference_guard_shape_changed';end if;
  execute replace(definition,old_text,new_text);

  select pg_get_functiondef('public.aba_attachment_verification_target_v2(uuid,jsonb,jsonb)'::regprocedure) into strict definition;
  old_text:=$old$or v_record.current_version_id<>v_version.id or v_record.state<>'pending-upload'
    or v_version.state<>'pending-upload' or v_version.created_by<>v_actor$old$;
  new_text:=$new$or v_record.current_version_id<>v_version.id or v_record.state not in ('pending-upload','available')
    or v_version.state not in ('pending-upload','available') or v_version.created_by<>v_actor$new$;
  if strpos(definition,old_text)=0 then raise exception 'attachment_replay_guard_shape_changed';end if;
  execute replace(definition,old_text,new_text);
end;
$migration$;
-- The verifier still hashes the exact bytes, reauthorizes and returns the original
-- confirmation receipt. A different confirmation cannot transition available again.

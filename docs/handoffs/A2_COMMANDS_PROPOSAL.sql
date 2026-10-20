-- A2 COMMAND PROPOSAL ONLY. Root must create/order/review via CLI; never run direct.
-- Prerequisites: A2_STUDENTS_CLINICAL_PROPOSAL.sql, attachment metadata proposal,
-- and the applied private command ledger. All names are deliberate integration APIs.

begin;

create function private.aba_assert_student_scope(p_org uuid, p_client uuid, p_capability text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if not exists(select 1 from public.clients c where c.id=p_client and c.organization_id=p_org) then
    raise exception 'resource_unavailable' using errcode='P0002';
  end if;
  if not private.has_student_capability(p_client,p_capability) then raise exception 'permission_denied' using errcode='42501'; end if;
end $$;
revoke all on function private.aba_assert_student_scope(uuid,uuid,text) from public, anon, authenticated, service_role;

-- Every wrapper below follows this non-negotiable sequence:
-- validate auth/JSON/org → assert scope → private.command_identity_or_replay_result
-- → row lock → assert
-- scope again → expectedVersion → mutation+audit → issue_command_receipt → result.
-- Errors expected by client use the applied private.command_rejected_result(...),
-- private.command_identity_or_replay_result(...) and
-- private.command_version_conflict_result(...). Transport/timeout has no fabricated
-- result; never catch an unknown 40001 or reimplement a result mapper.

create function public.aba_student_command_v2(p_organization_id uuid, p_command jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_id uuid:=(p_command->>'studentId')::uuid;
  v_op uuid:=(p_command->>'operationId')::uuid; v_key uuid:=(p_command->>'idempotencyKey')::uuid;
  v_action text:=p_command->>'action'; v_expected integer:=(p_command->>'expectedVersion')::integer;
  v_payload jsonb:=p_command->'payload'; v_current integer; v_replay jsonb;
begin
  if v_actor is null or p_command->>'schemaVersion'<>'2' or v_action not in ('create','update','archive','reactivate') then raise exception 'validation_failed' using errcode='22023'; end if;
  if v_action='create' then
    if v_expected<>0 or coalesce(nullif(btrim(v_payload->>'fullName'),''),'')='' or not exists(select 1 from public.memberships m where m.organization_id=p_organization_id and m.user_id=v_actor and m.status='active' and m.role in ('admin','supervisor')) then raise exception 'permission_denied' using errcode='42501'; end if;
  else perform private.aba_assert_student_scope(p_organization_id,v_id,'student.edit'); end if;
  select private.command_identity_or_replay_result(p_organization_id,v_op,v_key,v_id,'student-v2',p_command) into v_replay;
  if v_replay is not null then return v_replay; end if;
  if v_action='create' then
    if exists(select 1 from public.clients where id=v_id) then return jsonb_build_object('status','rejected','operationId',v_op,'idempotencyKey',v_key,'resourceId',v_id,'code','resource-unavailable','message','student id already exists','issues','[]'::jsonb); end if;
    insert into public.clients(id,organization_id,clinical_id,initials,birth_date,primary_language,living_arrangement,status) values(v_id,p_organization_id,v_payload->>'clinicalId',v_payload->>'initials',(v_payload->>'birthDate')::date,v_payload->>'primaryLanguage',v_payload->>'livingArrangement','active');
    insert into public.client_profiles_v2(client_id,organization_id,full_name,rut_normalized,reported_diagnosis,consultation_reason,context_home,context_school,context_adaptations,created_by,updated_by) values(v_id,p_organization_id,nullif(btrim(v_payload->>'fullName'),''),nullif(v_payload->>'rut',''),coalesce(v_payload->>'reportedDiagnosis',''),coalesce(v_payload->>'consultationReason',''),coalesce(v_payload#>>'{context,home}',''),coalesce(v_payload#>>'{context,school}',''),coalesce(v_payload#>>'{context,adaptations}',''),v_actor,v_actor);
  else
    select version into v_current from public.client_profiles_v2 where client_id=v_id and organization_id=p_organization_id for update;
    perform private.aba_assert_student_scope(p_organization_id,v_id,'student.edit');
    if v_current is distinct from v_expected then return jsonb_build_object('status','conflict','operationId',v_op,'idempotencyKey',v_key,'resourceId',v_id,'expectedVersion',v_expected,'currentVersion',v_current,'code','version-conflict','message','current version changed'); end if;
    if v_action='update' then update public.client_profiles_v2 set full_name=nullif(btrim(v_payload->>'fullName'),''),rut_normalized=nullif(v_payload->>'rut',''),reported_diagnosis=coalesce(v_payload->>'reportedDiagnosis',''),consultation_reason=coalesce(v_payload->>'consultationReason',''),context_home=coalesce(v_payload#>>'{context,home}',''),context_school=coalesce(v_payload#>>'{context,school}',''),context_adaptations=coalesce(v_payload#>>'{context,adaptations}',''),version=version+1,updated_by=v_actor,updated_at=now() where client_id=v_id; else update public.clients set status=case when v_action='archive' then 'archived' else 'active' end where id=v_id and organization_id=p_organization_id; update public.client_profiles_v2 set version=version+1,updated_by=v_actor,updated_at=now() where client_id=v_id; end if;
  end if;
  -- Root implementation must upsert people/siblings by their supplied stable IDs and
  -- archive absent IDs (archived_at/by), never DELETE rows with invitations/files.
  insert into public.clinical_audit_events(organization_id,client_id,actor_user_id,entity_type,entity_id,action) values(p_organization_id,v_id,v_actor,'student',v_id,v_action);
  return private.issue_command_receipt(p_organization_id,v_op,v_key,v_id,'student-v2',p_command,(select version from public.client_profiles_v2 where client_id=v_id),null);
end $$;

-- History/consent wrappers use the same exact ledger sequence and return CommandResult.
-- `historyId` locks the logical chain; correction/update inserts version+1 and marks
-- prior active version superseded; finish/reactivate is an explicit new revision.
-- Consent locks consentId; replace/revoke creates a versioned chain and never erases
-- evidence. Both use p_command.studentId to call aba_assert_student_scope twice.
-- Root must implement the final body against its canonical audit/receipt signature;
-- do not expose generic ledger RPCs or direct table writes.
revoke all on function public.aba_student_command_v2(uuid,jsonb) from public, anon, service_role;
grant execute on function public.aba_student_command_v2(uuid,jsonb) to authenticated;

-- Attachment reservation creates a pending version/objectKey in the same receipt TX.
-- Archive has no physical delete. `confirm` is PRIVATE ONLY and callable solely by
-- verify-attachment-upload Edge after it has fetched/hash-verified bytes. Public
-- read verifies exact resource associations and returns AttachmentVersion; chat and
-- commercial are fail-closed until A4/A5 add their dedicated helpers.
-- public.aba_attachment_reserve_v2(uuid,jsonb) → {result,version}
-- private.aba_attachment_confirm_verified_v2(uuid,jsonb,bytea_hash_verified boolean) → {result,version}
-- public.aba_attachment_archive_v2(uuid,jsonb) → {result,version}
-- public.aba_attachment_read_v2(uuid,jsonb,uuid) → AttachmentVersion
-- public.aba_attachment_list_v2(uuid,jsonb,boolean) → AttachmentVersion[]; ordered
--   newest-first and restricted to exact resource; archived history is returned only
--   when requested by an authorized viewer.
-- public.aba_attachment_resource_authorized_v2(uuid,jsonb,text) → boolean
-- public.aba_list_students_v2(uuid) → AuthorizedStudentSummary[] with authorized
--   displayName, clinicalId, nullable rut/photoAttachmentId, status/capabilities and
--   actual V2 version; it never returns contacts/history to list consumers.
-- public.aba_student_detail_v2(uuid,uuid) → StudentDetailDto; it overlays the V2
--   profile/version on V1 only where values truly exist, keeps missing historical
--   name/RUT/frequency/notes null, and returns null for an unauthorized resource.
rollback;

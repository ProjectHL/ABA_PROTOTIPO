create function private.enforce_student_photo_attachment_v2()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.photo_attachment_id is not null and not exists(
    select 1 from public.attachment_records a
    where a.id=new.photo_attachment_id and a.organization_id=new.organization_id
      and a.client_id=new.client_id and a.resource_kind='student'
      and a.purpose='student-photo' and a.state='available') then
    raise exception using errcode='23514',message='student_photo_attachment_unavailable';
  end if;
  return new;
end;
$$;

create function private.enforce_consent_evidence_attachment_v2()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.evidence_attachment_id is not null and not exists(
    select 1 from public.attachment_records a
    where a.id=new.evidence_attachment_id and a.organization_id=new.organization_id
      and a.client_id=new.client_id and a.resource_kind='student'
      and a.purpose='student-document' and a.state='available') then
    raise exception using errcode='23514',message='consent_evidence_attachment_unavailable';
  end if;
  return new;
end;
$$;

create trigger client_profiles_v2_photo_attachment_guard
before insert or update of photo_attachment_id on public.client_profiles_v2
for each row execute function private.enforce_student_photo_attachment_v2();
create trigger consent_records_evidence_attachment_guard
before insert or update of evidence_attachment_id on public.consent_records
for each row execute function private.enforce_consent_evidence_attachment_v2();

-- Forward-only replacement of the previously explicit fail-closed branch. The
-- command now accepts evidence only after the attachment service has confirmed it;
-- the trigger above remains the final invariant for every write path.
do $migration$
declare
  v_definition text;
  v_old_guard text := $old$  -- No dangling UUID is accepted before the attachment registry can prove the
  -- resource, tenant, student, confirmed bytes and non-archived version.
  if v_payload->>'evidenceAttachmentId' is not null then
    return private.command_rejected_result(v_operation_id,v_idempotency_key,v_consent_id,
      'resource-unavailable','Confirma primero el adjunto de evidencia en el servicio privado de archivos.');
  end if;$old$;
  v_new_guard text := $new$  if v_payload->>'evidenceAttachmentId' is not null and not exists(
    select 1 from public.attachment_records a
    where a.id=(v_payload->>'evidenceAttachmentId')::uuid
      and a.organization_id=p_organization_id and a.client_id=v_client_id
      and a.resource_kind='student' and a.purpose='student-document' and a.state='available'
  ) then
    return private.command_rejected_result(v_operation_id,v_idempotency_key,v_consent_id,
      'resource-unavailable','El adjunto de evidencia no está confirmado para esta ficha.');
  end if;$new$;
  v_old_insert text := $old$    null,null,(v_payload->>'status'),case when v_payload->>'status'='valid' then now() else null end,$old$;
  v_new_insert text := $new$    null,(v_payload->>'evidenceAttachmentId')::uuid,(v_payload->>'status'),case when v_payload->>'status'='valid' then now() else null end,$new$;
begin
  select pg_get_functiondef('public.aba_consent_command_v2(uuid,jsonb)'::regprocedure)
    into strict v_definition;
  if strpos(v_definition,v_old_guard)=0 or strpos(v_definition,v_old_insert)=0 then
    raise exception using errcode='55000',message='consent_attachment_forward_fix_shape_changed';
  end if;
  v_definition:=replace(v_definition,v_old_guard,v_new_guard);
  v_definition:=replace(v_definition,v_old_insert,v_new_insert);
  if strpos(v_definition,v_old_guard)>0 or strpos(v_definition,v_old_insert)>0 then
    raise exception using errcode='55000',message='consent_attachment_forward_fix_incomplete';
  end if;
  execute v_definition;
end;
$migration$;

revoke all on function
  private.enforce_student_photo_attachment_v2(),
  private.enforce_consent_evidence_attachment_v2()
from public,anon,authenticated,service_role;

comment on function public.aba_consent_command_v2(uuid,jsonb) is
  'Authorized linear consent command; evidenceAttachmentId must identify an available confirmed student-document for the same clinic and student.';

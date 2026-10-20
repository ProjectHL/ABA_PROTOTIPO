-- R5 reproduced detail DTO mismatch after a real UI create.
-- Add only the three persisted card fields already required by the shared DTO.
-- Retain SECURITY INVOKER, canonical student.view, RLS and existing ACL.
begin;
create or replace function public.aba_student_detail_v2(
  p_organization_id uuid,
  p_client_id uuid
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_client public.clients%rowtype;
  v_profile public.client_profiles_v2%rowtype;
  v_context public.client_context_profiles%rowtype;
  v_capabilities text[];
  v_has_profile boolean := false;
  v_people jsonb := '[]'::jsonb;
  v_siblings jsonb := '[]'::jsonb;
  v_history jsonb := '[]'::jsonb;
  v_consents jsonb := '[]'::jsonb;
begin
  if p_organization_id is null or p_client_id is null then
    return null;
  end if;

  select c.* into v_client
  from public.clients c
  where c.organization_id = p_organization_id and c.id = p_client_id;
  if not found then
    return null;
  end if;

  v_capabilities := public.get_student_capabilities(p_client_id);
  if not ('student.view' = any(v_capabilities)) then
    return null;
  end if;

  select p.* into v_profile
  from public.client_profiles_v2 p
  where p.organization_id = p_organization_id and p.client_id = p_client_id;
  v_has_profile := found;

  select cp.* into v_context
  from public.client_context_profiles cp
  where cp.organization_id = p_organization_id and cp.client_id = p_client_id;

  if exists (
    select 1 from public.client_people_v2 p
    where p.organization_id = p_organization_id and p.client_id = p_client_id
  ) then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id,
      'fullName', p.full_name,
      'initials', p.initials,
      'birthDate', p.birth_date,
      'relationship', p.relationship,
      'phone', nullif(p.phone, ''),
      'email', p.email,
      'roles', to_jsonb(p.roles),
      'isPrimaryContact', p.is_primary_contact
    ) order by p.created_at, p.id), '[]'::jsonb)
    into v_people
    from public.client_people_v2 p
    where p.organization_id = p_organization_id
      and p.client_id = p_client_id
      and p.archived_at is null;
  else
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', g.id,
      'fullName', null,
      'initials', g.initials,
      'birthDate', g.birth_date,
      'relationship', coalesce(g.relationship, ''),
      'phone', nullif(g.phone, ''),
      'email', null,
      'roles', jsonb_build_array('family'),
      'isPrimaryContact', false
    ) order by g.position, g.id), '[]'::jsonb)
    into v_people
    from public.guardians g
    where g.client_id = p_client_id;
  end if;

  if exists (
    select 1 from public.client_siblings_v2 s
    where s.organization_id = p_organization_id and s.client_id = p_client_id
  ) then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', s.id,
      'fullName', s.full_name,
      'initials', s.initials,
      'birthDate', s.birth_date,
      'notes', nullif(s.notes, '')
    ) order by s.created_at, s.id), '[]'::jsonb)
    into v_siblings
    from public.client_siblings_v2 s
    where s.organization_id = p_organization_id
      and s.client_id = p_client_id
      and s.archived_at is null;
  else
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', s.id,
      'fullName', null,
      'initials', s.initials,
      'birthDate', s.birth_date,
      'notes', null
    ) order by s.position, s.id), '[]'::jsonb)
    into v_siblings
    from public.siblings s
    where s.client_id = p_client_id;
  end if;

  select coalesce(jsonb_agg(h.item order by h.created_at desc, h.version_order desc), '[]'::jsonb)
  into v_history
  from (
    select hv.created_at, hv.version as version_order, jsonb_build_object(
      'historyId', hv.history_id,
      'versionId', hv.id,
      'kind', hv.kind,
      'descriptor', hv.descriptor,
      'dose', hv.dose,
      'frequency', hv.frequency,
      'prescriber', hv.prescriber_descriptor,
      'startedOn', hv.started_on,
      'endedOn', hv.ended_on,
      'notes', hv.notes,
      'status', hv.status,
      'supersedesVersionId', hv.supersedes_version_id,
      'version', hv.version,
      'createdAt', hv.created_at
    ) as item
    from public.clinical_history_versions_v2 hv
    where hv.organization_id = p_organization_id and hv.client_id = p_client_id
    union all
    select h1.created_at, 0, jsonb_build_object(
      'historyId', h1.id,
      'versionId', h1.id,
      'kind', h1.kind,
      'descriptor', h1.descriptor,
      'dose', h1.dose,
      'frequency', null,
      'prescriber', h1.prescriber_descriptor,
      'startedOn', h1.started_on,
      'endedOn', h1.ended_on,
      'notes', null,
      'status', h1.status,
      'supersedesVersionId', h1.supersedes_id,
      'version', null,
      'createdAt', h1.created_at
    )
    from public.clinical_history_entries h1
    where h1.organization_id = p_organization_id and h1.client_id = p_client_id
      and not exists (
        select 1 from public.clinical_history_versions_v2 hv
        where hv.organization_id = h1.organization_id
          and hv.client_id = h1.client_id
          and hv.history_id = h1.id
      )
  ) h;

  with recursive consent_roots as (
    select c.id, c.id as root_id, array[c.id]::uuid[] as path
    from public.consent_records c
    where c.organization_id = p_organization_id
      and c.client_id = p_client_id
      and c.supersedes_id is null
    union all
    select c.id, parent.root_id, parent.path || c.id
    from public.consent_records c
    join consent_roots parent on parent.id = c.supersedes_id
    where c.organization_id = p_organization_id
      and c.client_id = p_client_id
      and not c.id = any(parent.path)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'consentId', roots.root_id,
    'versionId', c.id,
    'version', c.version,
    'id', c.id,
    'purposeCode', c.purpose_code,
    'noticeVersion', c.notice_version,
    'grantor', c.grantor_descriptor,
    'channel', c.channel,
    'status', c.status,
    'evidenceAttachmentId', c.evidence_attachment_id,
    'supersedesVersionId', c.supersedes_id,
    'createdAt', c.created_at
  ) order by c.created_at desc, c.version desc), '[]'::jsonb)
  into v_consents
  from public.consent_records c
  join consent_roots roots on roots.id = c.id
  where c.organization_id = p_organization_id and c.client_id = p_client_id;

  return jsonb_build_object(
    'id', v_client.id,
    'clinicId', v_client.organization_id,
    'displayName', coalesce(v_profile.full_name, v_client.initials),
    'hasActiveSession', exists(
      select 1 from public.clinical_session_v2_state session
      where session.organization_id = v_client.organization_id
        and session.client_id = v_client.id
        and session.status in ('active', 'paused')
    ),
    'familyAccessEnabled', exists(
      select 1 from public.student_assignments assignment
      where assignment.organization_id = v_client.organization_id
        and assignment.client_id = v_client.id
        and assignment.role = 'family' and assignment.status = 'active'
    ),
    'assignedProfessional', (
      select coalesce(nullif(btrim(profile.name), ''), nullif(btrim(profile.title), ''), 'Profesional asignado')
      from public.student_assignments assignment
      left join public.professional_profiles profile on profile.user_id = assignment.user_id
      where assignment.organization_id = v_client.organization_id
        and assignment.client_id = v_client.id
        and assignment.role in ('supervisor', 'coordinator', 'therapist')
        and assignment.status = 'active'
      order by assignment.is_primary desc,
        case assignment.role when 'supervisor' then 0 when 'coordinator' then 1 else 2 end,
        assignment.effective_at, assignment.id
      limit 1
    ),
    'initials', v_client.initials,
    'rut', v_profile.rut_normalized,
    'photoAttachmentId', v_profile.photo_attachment_id,
    'status', v_client.status,
    'capabilities', to_jsonb(v_capabilities),
    'version', case when v_has_profile then v_profile.version else null end,
    'clinicalId', v_client.clinical_id,
    'fullName', v_profile.full_name,
    'birthDate', v_client.birth_date,
    'primaryLanguage', v_client.primary_language,
    'livingArrangement', v_client.living_arrangement,
    'reportedDiagnosis', case when v_has_profile then v_profile.reported_diagnosis else null end,
    'consultationReason', case when v_has_profile then v_profile.consultation_reason else null end,
    'context', jsonb_build_object(
      'home', case when v_has_profile then v_profile.context_home else coalesce(v_context.home_adaptations, '') end,
      'school', case when v_has_profile then v_profile.context_school else coalesce(v_context.schooling, '') end,
      'adaptations', case when v_has_profile then v_profile.context_adaptations else coalesce(v_context.school_adaptations, '') end
    ),
    'people', v_people,
    'siblings', v_siblings,
    'history', v_history,
    'consents', v_consents,
    'createdAt', v_client.created_at,
    'updatedAt', greatest(v_client.updated_at, v_profile.updated_at)
  );
end;
$$;
commit;

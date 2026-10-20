create or replace function public.aba_list_students_v2(p_organization_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(jsonb_agg(q.item order by q.created_at desc), '[]'::jsonb)
  from (
    select c.created_at, jsonb_build_object(
      'id', c.id,
      'clinicId', c.organization_id,
      'displayName', coalesce(p.full_name, c.initials),
      'initials', c.initials,
      'clinicalId', c.clinical_id,
      'rut', p.rut_normalized,
      'photoAttachmentId', p.photo_attachment_id,
      'reportedDiagnosis', nullif(btrim(p.reported_diagnosis), ''),
      'hasActiveSession', exists(
        select 1 from public.clinical_session_v2_state session
        where session.organization_id = c.organization_id
          and session.client_id = c.id
          and session.status in ('active', 'paused')
      ),
      'familyAccessEnabled', exists(
        select 1 from public.student_assignments family_assignment
        where family_assignment.organization_id = c.organization_id
          and family_assignment.client_id = c.id
          and family_assignment.role = 'family'
          and family_assignment.status = 'active'
      ),
      'assignedProfessional', (
        select coalesce(
          nullif(btrim(profile.name), ''),
          nullif(btrim(profile.title), ''),
          'Profesional asignado'
        )
        from public.student_assignments assignment
        left join public.professional_profiles profile on profile.user_id = assignment.user_id
        where assignment.organization_id = c.organization_id
          and assignment.client_id = c.id
          and assignment.role in ('supervisor', 'coordinator', 'therapist')
          and assignment.status = 'active'
        order by assignment.is_primary desc,
          case assignment.role when 'supervisor' then 0 when 'coordinator' then 1 else 2 end,
          assignment.effective_at,
          assignment.id
        limit 1
      ),
      'status', c.status,
      'capabilities', to_jsonb(public.get_student_capabilities(c.id)),
      'version', p.version
    ) as item
    from public.clients c
    left join public.client_profiles_v2 p
      on p.organization_id = c.organization_id and p.client_id = c.id
    where p_organization_id is not null
      and c.organization_id = p_organization_id
      and 'student.view' = any(public.get_student_capabilities(c.id))
  ) q;
$$;

comment on function public.aba_list_students_v2(uuid) is
  'Authorized card projection: persisted identity/diagnosis, canonical active session, active family assignment and policy-visible assigned professional.';

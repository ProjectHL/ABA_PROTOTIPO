create function public.aba_calendar_linkable_sessions_v2(p_organization_id uuid,p_student_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not private.a5_calendar_authorized(p_organization_id,p_student_id) then
    raise exception using errcode='42501',message='calendar_not_authorized';
  end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id',s.session_id,'capturedAt',s.captured_at)
    order by s.captured_at desc),'[]'::jsonb) from public.clinical_session_v2_state s
    where s.organization_id=p_organization_id and s.client_id=p_student_id and s.status='finished');
end;
$$;
revoke all on function public.aba_calendar_linkable_sessions_v2(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.aba_calendar_linkable_sessions_v2(uuid,uuid) to authenticated;

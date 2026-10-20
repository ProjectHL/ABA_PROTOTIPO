-- A6/R3: policy-aware shell search. SECURITY INVOKER intentionally preserves
-- each source table's RLS; returned paths contain only IDs already visible.
create function public.aba_authorized_search_v2(p_organization_id uuid,p_query text,p_limit integer default 30)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare v_query text;v_limit integer;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='authenticated_identity_required';end if;
  if p_organization_id is null or not exists(select 1 from public.memberships m where m.organization_id=p_organization_id and m.user_id=auth.uid() and m.status='active') then
    raise exception using errcode='42501',message='active_membership_required';
  end if;
  v_query:=lower(btrim(coalesce(p_query,'')));v_limit:=least(greatest(coalesce(p_limit,30),1),50);
  if char_length(v_query) not between 2 and 80 or v_query~'[[:cntrl:]]' then raise exception using errcode='22023',message='search_query_invalid';end if;
  return coalesce((select jsonb_agg(item order by rank,kind_order,title,id) from(select * from(
    select 0 kind_order,case when lower(coalesce(nullif(btrim(profile.full_name),''),client.initials))=v_query then 0 when strpos(lower(coalesce(nullif(btrim(profile.full_name),''),client.initials)),v_query)=1 then 1 else 2 end rank,
      client.id,coalesce(nullif(btrim(profile.full_name),''),client.initials) title,
      'student' kind,jsonb_build_object('kind','student','id',client.id,'studentId',client.id,'title',coalesce(nullif(btrim(profile.full_name),''),client.initials),'subtitle','ID clínico: '||client.clinical_id,'path','/students/'||client.id::text) item
    from public.clients client left join public.client_profiles_v2 profile on profile.organization_id=client.organization_id and profile.client_id=client.id
    where client.organization_id=p_organization_id and (strpos(lower(coalesce(profile.full_name,'')),v_query)>0 or strpos(lower(client.initials),v_query)>0 or strpos(lower(client.clinical_id),v_query)>0 or strpos(lower(coalesce(profile.rut_normalized,'')),v_query)>0)
    union all
    select 1,case when lower(version.title)=v_query then 0 when strpos(lower(version.title),v_query)=1 then 1 else 2 end,
      program.id,version.title,'program',jsonb_build_object('kind','program','id',program.id,'studentId',program.client_id,'programId',program.id,'title',version.title,'subtitle',coalesce(nullif(btrim(profile.full_name),''),client.initials),'path','/students/'||program.client_id::text||'/programs/'||program.id::text||'/chart')
    from public.programs program join public.program_versions version on version.id=program.current_version_id
    join public.clients client on client.id=program.client_id and client.organization_id=program.organization_id
    left join public.client_profiles_v2 profile on profile.organization_id=client.organization_id and profile.client_id=client.id
    where program.organization_id=p_organization_id and strpos(lower(version.title),v_query)>0
    union all
    select 2,case when lower(version.original_name)=v_query then 0 when strpos(lower(version.original_name),v_query)=1 then 1 else 2 end,
      attachment.id,version.original_name,'document',jsonb_build_object('kind','document','id',attachment.id,'studentId',attachment.client_id,'attachmentId',attachment.id,'title',version.original_name,'subtitle',coalesce(nullif(btrim(profile.full_name),''),client.initials),'path','/students/'||attachment.client_id::text)
    from public.attachment_records attachment join public.attachment_versions version on version.id=attachment.current_version_id and version.attachment_id=attachment.id
    join public.clients client on client.id=attachment.client_id and client.organization_id=attachment.organization_id
    left join public.client_profiles_v2 profile on profile.organization_id=client.organization_id and profile.client_id=client.id
    where attachment.organization_id=p_organization_id and attachment.resource_kind='student' and attachment.purpose='student-document'
      and attachment.state='available' and version.state='available' and strpos(lower(version.original_name),v_query)>0
  ) candidates order by rank,kind_order,title,id limit v_limit) results),'[]'::jsonb);
end;$$;
revoke all on function public.aba_authorized_search_v2(uuid,text,integer) from public,anon,authenticated,service_role;
grant execute on function public.aba_authorized_search_v2(uuid,text,integer) to authenticated;
comment on function public.aba_authorized_search_v2(uuid,text,integer) is 'A6 SECURITY INVOKER search over RLS-visible students, current programs and available student documents.';

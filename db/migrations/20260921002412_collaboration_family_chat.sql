-- Family participants derive exclusively from active family links for the same
-- student. They receive chat participation, never general clinical capabilities.
create or replace function private.a4_chat_participant_kind_v2(
  p_organization_id uuid,p_client_id uuid,p_user_id uuid
) returns text language sql stable security definer set search_path='' as $$
  select case
    when exists(select 1 from public.memberships membership
      where membership.organization_id=p_organization_id and membership.user_id=p_user_id
        and membership.status='active' and membership.role in('admin','supervisor','therapist'))
      then 'professional'
    when exists(select 1 from public.student_external_access_v2 access
      where access.organization_id=p_organization_id and access.client_id=p_client_id
        and access.user_id=p_user_id and access.status='active')
      then 'external'
    when exists(select 1 from public.family_access_links_v2 access
      where access.organization_id=p_organization_id and access.client_id=p_client_id
        and access.recipient_user_id=p_user_id and access.status='active')
      then 'family'
    else null end;
$$;

create or replace function private.can_participate_chat_v2(p_conversation_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select (select auth.uid()) is not null and exists(
    select 1 from public.chat_participants_v2 participant
    join public.chat_conversations_v2 conversation on conversation.id=participant.conversation_id
    where participant.conversation_id=p_conversation_id
      and participant.user_id=(select auth.uid()) and participant.status='active'
      and (
        (participant.participant_kind in('professional','external')
          and private.has_student_capability(conversation.client_id,'program.view'))
        or (participant.participant_kind='family' and conversation.audience='family'
          and exists(select 1 from public.family_access_links_v2 access
            where access.organization_id=conversation.organization_id
              and access.client_id=conversation.client_id
              and access.recipient_user_id=(select auth.uid()) and access.status='active'))
      )
  );
$$;

-- Patch the already-reviewed command implementation at two closed extension
-- points while preserving its receipt, lock, message and attachment semantics.
do $migration$
declare v_definition text;v_original text;
begin
  select pg_get_functiondef('private.a4_chat_command_impl(uuid,jsonb)'::regprocedure) into v_definition;
  v_original:=v_definition;
  v_definition:=replace(v_definition,
    $$    if p_command->>'audience'='family' then return private.command_rejected_result(v_operation,v_key,v_conversation_id,'invalid-transition','Vincula primero identidades familiares vigentes.');end if;
$$,$$$$);
  v_definition:=replace(v_definition,
    $$      if v_kind is null then return private.command_rejected_result(v_operation,v_key,v_conversation_id,'validation-failed','Un participante no tiene vínculo vigente con la ficha.');end if;
$$,
    $$      if v_kind is null or (p_command->>'audience'='family' and v_kind<>'family')
        or (p_command->>'audience'='professionals' and v_kind='family') then
        return private.command_rejected_result(v_operation,v_key,v_conversation_id,'validation-failed','Un participante no corresponde a la audiencia o perdió su vínculo vigente.');
      end if;
$$);
  if v_definition=v_original
    or v_definition like '%Vincula primero identidades familiares vigentes.%'
    or v_definition not like '%no corresponde a la audiencia%' then
    raise exception using errcode='55000',message='family_chat_patch_anchor_missing';
  end if;
  execute v_definition;
end;
$migration$;

create or replace function public.aba_chat_eligible_participants_v2(p_organization_id uuid,p_client_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_rows jsonb;
begin
  if v_actor is null or not private.has_internal_student_capability(p_client_id,'student.view')
    or not exists(select 1 from public.clients where id=p_client_id and organization_id=p_organization_id and status='active') then
    raise exception using errcode='42501',message='chat_participant_selection_denied';
  end if;
  with candidates as(
    select membership.user_id,'professional'::text kind,users.email,
      coalesce(profile.name,'') name,0 priority
    from public.memberships membership join auth.users users on users.id=membership.user_id
    left join public.professional_profiles profile on profile.user_id=membership.user_id
    where membership.organization_id=p_organization_id and membership.status='active'
      and membership.role in('admin','supervisor','therapist')
    union all
    select access.user_id,'external'::text,users.email,coalesce(profile.name,''),1
    from public.student_external_access_v2 access join auth.users users on users.id=access.user_id
    left join public.professional_profiles profile on profile.user_id=access.user_id
    where access.organization_id=p_organization_id and access.client_id=p_client_id and access.status='active'
    union all
    select access.recipient_user_id,'family'::text,users.email,
      coalesce(person.full_name,person.initials,''),2
    from public.family_access_links_v2 access join auth.users users on users.id=access.recipient_user_id
    join public.client_people_v2 person on person.organization_id=access.organization_id
      and person.client_id=access.client_id and person.id=access.family_person_id
    where access.organization_id=p_organization_id and access.client_id=p_client_id
      and access.status='active' and person.archived_at is null
  ),eligible as(select distinct on(user_id) user_id,kind,email,name from candidates order by user_id,priority)
  select coalesce(jsonb_agg(jsonb_build_object('userId',eligible.user_id,'kind',eligible.kind,
    'email',eligible.email,'name',eligible.name) order by coalesce(nullif(eligible.name,''),eligible.email),eligible.user_id),'[]'::jsonb)
    into v_rows from eligible where eligible.user_id<>v_actor;
  return v_rows;
end;$$;

revoke all on function
  private.a4_chat_participant_kind_v2(uuid,uuid,uuid),
  private.can_participate_chat_v2(uuid),
  private.a4_chat_command_impl(uuid,jsonb),
  public.aba_chat_eligible_participants_v2(uuid,uuid)
from public,anon,authenticated,service_role;
grant execute on function private.can_participate_chat_v2(uuid),
  public.aba_chat_eligible_participants_v2(uuid,uuid) to authenticated;

comment on function private.can_participate_chat_v2(uuid) is
  'A4 chat boundary: professionals/external users require current student capability; family users require an active same-student family link and family audience.';

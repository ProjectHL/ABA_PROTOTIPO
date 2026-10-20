create function private.a4_chat_participant_kind_v2(
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
    else null end;
$$;
revoke all on function private.a4_chat_participant_kind_v2(uuid,uuid,uuid)
from public,anon,authenticated,service_role;

create function private.a4_chat_command_impl(p_organization_id uuid,p_command jsonb)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
  v_actor uuid:=auth.uid();v_operation uuid;v_key uuid;v_conversation_id uuid;v_client_id uuid;
  v_expected bigint;v_action text;v_replay jsonb;v_conversation public.chat_conversations_v2;
  v_test uuid;v_user uuid;v_kind text;v_message_id uuid;v_sequence bigint;v_through bigint;
  v_version_id uuid;v_attachment_id uuid;v_position smallint:=0;v_current_read bigint;
begin
  if not private.a4_chat_command_valid(p_command) then raise exception using errcode='22023',message='chat_command_invalid';end if;
  v_operation:=(p_command->>'operationId')::uuid;v_key:=(p_command->>'idempotencyKey')::uuid;
  v_conversation_id:=(p_command->>'conversationId')::uuid;v_client_id:=(p_command->>'studentId')::uuid;
  v_expected:=(p_command->>'expectedVersion')::bigint;v_action:=p_command->>'action';
  if v_actor is null then return private.command_rejected_result(v_operation,v_key,v_conversation_id,'permission-denied','Se requiere una sesión autenticada.');end if;
  if v_action='create-conversation' then
    if not private.has_internal_student_capability(v_client_id,'student.view') then
      return private.command_rejected_result(v_operation,v_key,v_conversation_id,'permission-denied','No tienes permiso vigente para crear el chat.');
    end if;
  elsif not private.can_participate_chat_v2(v_conversation_id) then
    return private.command_rejected_result(v_operation,v_key,v_conversation_id,'permission-denied','No eres participante autorizado de esta conversación.');
  end if;
  v_replay:=private.command_identity_or_replay_result(p_organization_id,v_operation,v_key,v_conversation_id,'chat-v2',p_command);
  if v_replay is not null then
    if (v_action='create-conversation' and not private.has_internal_student_capability(v_client_id,'student.view'))
      or (v_action<>'create-conversation' and not private.can_participate_chat_v2(v_conversation_id)) then
      return private.command_rejected_result(v_operation,v_key,v_conversation_id,'permission-denied','El permiso del chat fue revocado.');
    end if;
    return v_replay;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_conversation_id::text,0));
  select * into v_conversation from public.chat_conversations_v2 where id=v_conversation_id for update;
  if v_action='create-conversation' then
    if found then return private.command_version_conflict_result(v_operation,v_key,v_conversation_id,0,v_conversation.version,'La conversación ya existe.');end if;
    if p_command->>'audience'='family' then return private.command_rejected_result(v_operation,v_key,v_conversation_id,'invalid-transition','Vincula primero identidades familiares vigentes.');end if;
    select client.test_run_id into v_test from public.clients client where client.id=v_client_id and client.organization_id=p_organization_id and client.status='active';
    if not found then return private.command_rejected_result(v_operation,v_key,v_conversation_id,'resource-unavailable','La ficha no está disponible.');end if;
    perform private.require_open_test_batch(p_organization_id,v_test);
    for v_user in select value::uuid from jsonb_array_elements_text(p_command->'participantUserIds') value loop
      v_kind:=private.a4_chat_participant_kind_v2(p_organization_id,v_client_id,v_user);
      if v_kind is null then return private.command_rejected_result(v_operation,v_key,v_conversation_id,'validation-failed','Un participante no tiene vínculo vigente con la ficha.');end if;
    end loop;
    insert into public.chat_conversations_v2(id,organization_id,client_id,title,audience,version,created_by,test_run_id)
      values(v_conversation_id,p_organization_id,v_client_id,btrim(p_command->>'title'),p_command->>'audience',1,v_actor,v_test) returning * into v_conversation;
    insert into public.chat_participants_v2(conversation_id,organization_id,client_id,user_id,participant_kind,test_run_id)
      values(v_conversation_id,p_organization_id,v_client_id,v_actor,'professional',v_test);
    insert into public.chat_read_states_v2(conversation_id,organization_id,client_id,user_id,through_sequence,version,test_run_id)
      values(v_conversation_id,p_organization_id,v_client_id,v_actor,0,1,v_test);
    for v_user in select value::uuid from jsonb_array_elements_text(p_command->'participantUserIds') value where value::uuid<>v_actor loop
      v_kind:=private.a4_chat_participant_kind_v2(p_organization_id,v_client_id,v_user);
      insert into public.chat_participants_v2(conversation_id,organization_id,client_id,user_id,participant_kind,test_run_id)
        values(v_conversation_id,p_organization_id,v_client_id,v_user,v_kind,v_test);
      insert into public.chat_read_states_v2(conversation_id,organization_id,client_id,user_id,through_sequence,version,test_run_id)
        values(v_conversation_id,p_organization_id,v_client_id,v_user,0,1,v_test);
    end loop;
  else
    if not found or v_conversation.organization_id<>p_organization_id or v_conversation.client_id<>v_client_id then
      return private.command_rejected_result(v_operation,v_key,v_conversation_id,'resource-unavailable','La conversación no está disponible.');
    end if;
    if not private.can_participate_chat_v2(v_conversation_id) then return private.command_rejected_result(v_operation,v_key,v_conversation_id,'permission-denied','El acceso a la conversación fue revocado.');end if;
    if v_conversation.version<>v_expected then return private.command_version_conflict_result(v_operation,v_key,v_conversation_id,v_expected,v_conversation.version,'La conversación cambió.');end if;
    if v_action='send-message' then
      v_message_id:=(p_command->>'messageId')::uuid;
      if exists(select 1 from public.chat_messages_v2 where id=v_message_id) then return private.command_rejected_result(v_operation,v_key,v_conversation_id,'resource-unavailable','El identificador de mensaje ya está en uso.');end if;
      if (select count(*) from jsonb_array_elements_text(p_command->'attachmentVersionIds'))<>(select count(*) from jsonb_array_elements_text(p_command->'attachmentVersionIds') item join public.attachment_versions version on version.id=item::uuid and version.state='available' join public.attachment_records record on record.id=version.attachment_id and record.state='available' and record.resource_kind='chat' and record.purpose='chat-attachment' and record.organization_id=p_organization_id and record.client_id=v_client_id and record.conversation_id=v_conversation_id) then
        return private.command_rejected_result(v_operation,v_key,v_conversation_id,'validation-failed','Un adjunto no pertenece a esta conversación o no está disponible.');
      end if;
      select coalesce(max(sequence),0)+1 into v_sequence from public.chat_messages_v2 where conversation_id=v_conversation_id;
      insert into public.chat_messages_v2(id,conversation_id,organization_id,client_id,author_user_id,sequence,body,test_run_id)
        values(v_message_id,v_conversation_id,p_organization_id,v_client_id,v_actor,v_sequence,btrim(p_command->>'body'),v_conversation.test_run_id);
      v_position:=0;
      for v_version_id in select value::uuid from jsonb_array_elements_text(p_command->'attachmentVersionIds') value loop
        select attachment_id into strict v_attachment_id from public.attachment_versions where id=v_version_id;
        insert into public.chat_message_attachments_v2(conversation_id,message_id,attachment_version_id,attachment_id,position)
          values(v_conversation_id,v_message_id,v_version_id,v_attachment_id,v_position);v_position:=v_position+1;
      end loop;
      update public.chat_conversations_v2 set version=version+1,updated_at=now() where id=v_conversation_id returning * into v_conversation;
    else
      v_through:=(p_command->>'throughSequence')::bigint;
      if v_through>coalesce((select max(sequence) from public.chat_messages_v2 where conversation_id=v_conversation_id),0) then return private.command_rejected_result(v_operation,v_key,v_conversation_id,'validation-failed','La lectura supera el último mensaje visible.');end if;
      select through_sequence into v_current_read from public.chat_read_states_v2 where conversation_id=v_conversation_id and user_id=v_actor for update;
      if v_through<v_current_read then return private.command_rejected_result(v_operation,v_key,v_conversation_id,'invalid-transition','El cursor de lectura no puede retroceder.');end if;
      update public.chat_read_states_v2 set through_sequence=v_through,version=version+1,read_at=now() where conversation_id=v_conversation_id and user_id=v_actor;
    end if;
  end if;
  return private.issue_command_receipt(p_organization_id,v_operation,v_key,v_conversation_id,'chat-v2',p_command,v_conversation.version,v_conversation.test_run_id);
end;$$;

create function public.aba_chat_command_v2(p_organization_id uuid,p_command jsonb)
returns jsonb language sql volatile security definer set search_path='' as $$select private.a4_chat_command_impl(p_organization_id,p_command);$$;

create function public.aba_chat_read_v2(p_organization_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('actorId',auth.uid(),'clinicId',p_organization_id,'conversations',coalesce(jsonb_agg(item order by updated_at desc),'[]'::jsonb)) from(
  select conversation.updated_at,jsonb_build_object('id',conversation.id,'clinicId',conversation.organization_id,'studentId',conversation.client_id,'title',conversation.title,'audience',conversation.audience,'version',conversation.version,'updatedAt',conversation.updated_at,
   'participants',(select coalesce(jsonb_agg(jsonb_build_object('userId',participant.user_id,'kind',participant.participant_kind,'status',participant.status)),'[]'::jsonb) from public.chat_participants_v2 participant where participant.conversation_id=conversation.id),
   'lastSequence',coalesce((select max(message.sequence) from public.chat_messages_v2 message where message.conversation_id=conversation.id),0),
   'unreadCount',(select count(*) from public.chat_messages_v2 message where message.conversation_id=conversation.id and message.sequence>coalesce((select state.through_sequence from public.chat_read_states_v2 state where state.conversation_id=conversation.id and state.user_id=auth.uid()),0))) item
  from public.chat_conversations_v2 conversation where conversation.organization_id=p_organization_id and private.can_participate_chat_v2(conversation.id)) q;
$$;

create function public.aba_chat_messages_read_v2(p_organization_id uuid,p_conversation_id uuid,p_after_sequence bigint default 0,p_limit integer default 100)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_conversation public.chat_conversations_v2;v_messages jsonb;v_limit integer:=greatest(1,least(coalesce(p_limit,100),500));v_last bigint;v_read jsonb;
begin
 select * into v_conversation from public.chat_conversations_v2 where id=p_conversation_id and organization_id=p_organization_id;
 if not found or not private.can_participate_chat_v2(p_conversation_id) then raise exception using errcode='42501',message='chat_unavailable';end if;
 select coalesce(jsonb_agg(item order by sequence),'[]'::jsonb),coalesce(max(sequence),p_after_sequence) into v_messages,v_last from(
  select message.sequence,jsonb_build_object('id',message.id,'conversationId',message.conversation_id,'studentId',message.client_id,'authorUserId',message.author_user_id,'sequence',message.sequence,'createdAt',message.created_at,'body',message.body,
   'attachmentVersionIds',(select coalesce(jsonb_agg(link.attachment_version_id order by link.position),'[]'::jsonb) from public.chat_message_attachments_v2 link where link.message_id=message.id)) item
  from public.chat_messages_v2 message where message.conversation_id=p_conversation_id and message.sequence>p_after_sequence order by message.sequence limit v_limit) q;
 select jsonb_build_object('conversationId',state.conversation_id,'userId',state.user_id,'throughSequence',state.through_sequence,'readAt',state.read_at,'version',state.version) into v_read from public.chat_read_states_v2 state where state.conversation_id=p_conversation_id and state.user_id=auth.uid();
 return jsonb_build_object('conversationId',p_conversation_id,'studentId',v_conversation.client_id,'afterSequence',p_after_sequence,'messages',v_messages,'readState',v_read,'hasMore',exists(select 1 from public.chat_messages_v2 where conversation_id=p_conversation_id and sequence>v_last));
end;$$;

revoke all on function private.a4_chat_command_impl(uuid,jsonb),public.aba_chat_command_v2(uuid,jsonb),public.aba_chat_read_v2(uuid),public.aba_chat_messages_read_v2(uuid,uuid,bigint,integer) from public,anon,authenticated,service_role;
grant execute on function public.aba_chat_command_v2(uuid,jsonb),public.aba_chat_read_v2(uuid),public.aba_chat_messages_read_v2(uuid,uuid,bigint,integer) to authenticated;

create function private.can_participate_chat_v2(p_conversation_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(
    select 1 from public.chat_participants_v2 participant
    join public.chat_conversations_v2 conversation on conversation.id=participant.conversation_id
    where participant.conversation_id=p_conversation_id
      and participant.user_id=auth.uid() and participant.status='active'
      and private.has_student_capability(conversation.client_id,'program.view')
  );
$$;
revoke all on function private.can_participate_chat_v2(uuid) from public,anon,service_role;
grant execute on function private.can_participate_chat_v2(uuid) to authenticated;

grant select on table public.chat_conversations_v2,public.chat_participants_v2,public.chat_messages_v2,
  public.chat_message_attachments_v2,public.chat_read_states_v2 to authenticated;
create policy chat_conversations_select_v2 on public.chat_conversations_v2 for select to authenticated
using(private.can_participate_chat_v2(id));
create policy chat_participants_select_v2 on public.chat_participants_v2 for select to authenticated
using(private.can_participate_chat_v2(conversation_id));
create policy chat_messages_select_v2 on public.chat_messages_v2 for select to authenticated
using(private.can_participate_chat_v2(conversation_id));
create policy chat_message_attachments_select_v2 on public.chat_message_attachments_v2 for select to authenticated
using(private.can_participate_chat_v2(conversation_id));
create policy chat_read_states_select_v2 on public.chat_read_states_v2 for select to authenticated
using(user_id=auth.uid() and private.can_participate_chat_v2(conversation_id));

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='chat_messages_v2') then
    alter publication supabase_realtime add table public.chat_messages_v2;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='chat_conversations_v2') then
    alter publication supabase_realtime add table public.chat_conversations_v2;
  end if;
end $$;

comment on function private.can_participate_chat_v2(uuid) is
  'A4 chat boundary: active participant plus current per-student capability; revocation blocks reads and Realtime delivery.';

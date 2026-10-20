drop policy chat_read_states_select_v2 on public.chat_read_states_v2;
create policy chat_read_states_select_v2 on public.chat_read_states_v2 for select to authenticated
using(user_id=(select auth.uid()) and private.can_participate_chat_v2(conversation_id));

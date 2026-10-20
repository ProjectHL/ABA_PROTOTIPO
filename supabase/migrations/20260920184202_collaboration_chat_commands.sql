create function private.a4_chat_command_valid(p_command jsonb)
returns boolean language sql immutable security invoker set search_path='' as $$
  select coalesce(
    jsonb_typeof(p_command)='object'
    and p_command->'schemaVersion'='2'::jsonb
    and jsonb_typeof(p_command->'operationId')='string' and private.is_uuid_text(p_command->>'operationId')
    and jsonb_typeof(p_command->'idempotencyKey')='string' and private.is_uuid_text(p_command->>'idempotencyKey')
    and jsonb_typeof(p_command->'conversationId')='string' and private.is_uuid_text(p_command->>'conversationId')
    and jsonb_typeof(p_command->'studentId')='string' and private.is_uuid_text(p_command->>'studentId')
    and jsonb_typeof(p_command->'expectedVersion')='number'
    and (p_command->>'expectedVersion')::numeric between 0 and 9007199254740991
    and (p_command->>'expectedVersion')::numeric=trunc((p_command->>'expectedVersion')::numeric)
    and p_command->>'action' in('create-conversation','send-message','mark-read')
    and not exists(select 1 from jsonb_object_keys(p_command) key where key not in
      ('schemaVersion','operationId','idempotencyKey','conversationId','studentId','expectedVersion','action',
       'title','participantUserIds','audience','messageId','body','attachmentVersionIds','throughSequence'))
    and case p_command->>'action'
      when 'create-conversation' then
        (select count(*) from jsonb_object_keys(p_command))=10 and (p_command->>'expectedVersion')::numeric=0
        and jsonb_typeof(p_command->'title')='string' and char_length(btrim(p_command->>'title')) between 1 and 300
        and p_command->>'audience' in('professionals','family')
        and jsonb_typeof(p_command->'participantUserIds')='array'
        and jsonb_array_length(p_command->'participantUserIds') between 1 and 100
        and not exists(select 1 from jsonb_array_elements(p_command->'participantUserIds') value
          where jsonb_typeof(value)<>'string' or not private.is_uuid_text(value#>>'{}'))
        and (select count(*)=count(distinct value) from jsonb_array_elements_text(p_command->'participantUserIds') value)
      when 'send-message' then
        (select count(*) from jsonb_object_keys(p_command))=10 and (p_command->>'expectedVersion')::numeric>0
        and jsonb_typeof(p_command->'messageId')='string' and private.is_uuid_text(p_command->>'messageId')
        and jsonb_typeof(p_command->'body')='string' and char_length(btrim(p_command->>'body'))<=10000
        and jsonb_typeof(p_command->'attachmentVersionIds')='array' and jsonb_array_length(p_command->'attachmentVersionIds')<=10
        and (char_length(btrim(p_command->>'body'))>0 or jsonb_array_length(p_command->'attachmentVersionIds')>0)
        and not exists(select 1 from jsonb_array_elements(p_command->'attachmentVersionIds') value
          where jsonb_typeof(value)<>'string' or not private.is_uuid_text(value#>>'{}'))
        and (select count(*)=count(distinct value) from jsonb_array_elements_text(p_command->'attachmentVersionIds') value)
      else
        (select count(*) from jsonb_object_keys(p_command))=8 and (p_command->>'expectedVersion')::numeric>0
        and jsonb_typeof(p_command->'throughSequence')='number'
        and (p_command->>'throughSequence')::numeric between 0 and 9007199254740991
        and (p_command->>'throughSequence')::numeric=trunc((p_command->>'throughSequence')::numeric)
      end,false);
$$;
revoke all on function private.a4_chat_command_valid(jsonb) from public,anon,authenticated,service_role;

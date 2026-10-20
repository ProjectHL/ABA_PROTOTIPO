-- Exact command shapes before casts. These functions confer no authority.
create function private.a5_exact_keys(p_value jsonb, p_keys text[])
returns boolean language plpgsql immutable security invoker set search_path = '' as $$
begin
  if jsonb_typeof(p_value) is distinct from 'object' then return false; end if;
  return p_value ?& p_keys and (select count(*) from jsonb_object_keys(p_value)) = cardinality(p_keys);
end;
$$;

create function private.a5_appointment_input_valid(p_value jsonb)
returns boolean language plpgsql stable security invoker set search_path = '' as $$
declare v_item jsonb;
begin
  if not private.a5_exact_keys(p_value, array['studentId','title','notes','startsAt','endsAt',
    'timeZone','participants','reminderMinutesBefore','recurrence']) then return false; end if;
  if jsonb_typeof(p_value -> 'studentId') is distinct from 'string'
    or not private.is_uuid_text(p_value ->> 'studentId')
    or jsonb_typeof(p_value -> 'title') is distinct from 'string'
    or char_length(btrim(p_value ->> 'title')) not between 1 and 300
    or jsonb_typeof(p_value -> 'notes') is distinct from 'string'
    or char_length(p_value ->> 'notes') > 10000
    or not coalesce(private.a3_iso_timestamp_valid(p_value -> 'startsAt'),false)
    or not coalesce(private.a3_iso_timestamp_valid(p_value -> 'endsAt'),false)
    or jsonb_typeof(p_value -> 'timeZone') is distinct from 'string'
    or char_length(p_value ->> 'timeZone') not between 1 and 100
    or not exists(select 1 from pg_catalog.pg_timezone_names z where z.name = p_value ->> 'timeZone')
    or jsonb_typeof(p_value -> 'participants') is distinct from 'array'
    or jsonb_typeof(p_value -> 'reminderMinutesBefore') is distinct from 'array' then return false; end if;
  if (p_value ->> 'endsAt')::timestamptz <= (p_value ->> 'startsAt')::timestamptz
    or jsonb_array_length(p_value -> 'participants') not between 1 and 100
    or jsonb_array_length(p_value -> 'reminderMinutesBefore') > 10 then return false; end if;
  for v_item in select value from jsonb_array_elements(p_value -> 'participants') loop
    if v_item ->> 'kind' = 'professional' then
      if not private.a5_exact_keys(v_item,array['kind','userId'])
        or jsonb_typeof(v_item -> 'userId') is distinct from 'string'
        or not private.is_uuid_text(v_item ->> 'userId') then return false; end if;
    elsif v_item ->> 'kind' = 'family' then
      if not private.a5_exact_keys(v_item,array['kind','personId'])
        or jsonb_typeof(v_item -> 'personId') is distinct from 'string'
        or not private.is_uuid_text(v_item ->> 'personId') then return false; end if;
    else return false;
    end if;
  end loop;
  if (select count(*) <> count(distinct (value ->> 'kind',
      coalesce(value ->> 'userId',value ->> 'personId')::uuid))
    from jsonb_array_elements(p_value -> 'participants')) then return false; end if;
  for v_item in select value from jsonb_array_elements(p_value -> 'reminderMinutesBefore') loop
    if jsonb_typeof(v_item) is distinct from 'number' or (v_item #>> '{}') !~ '^[0-9]+$'
      or (v_item #>> '{}')::numeric > 43200 then return false; end if;
  end loop;
  if (select count(*) <> count(distinct value) from jsonb_array_elements(p_value -> 'reminderMinutesBefore')) then return false; end if;
  if p_value -> 'recurrence' <> 'null'::jsonb then
    if not private.a5_weekly_rule_valid(p_value -> 'recurrence')
      or p_value #>> '{recurrence,timeZone}' <> p_value ->> 'timeZone' then return false; end if;
  end if;
  return true;
exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow
  or numeric_value_out_of_range then return false;
end;
$$;

create function private.a5_appointment_command_valid(p_value jsonb)
returns boolean language plpgsql stable security invoker set search_path = '' as $$
declare
  v_base text[] := array['schemaVersion','operationId','idempotencyKey','appointmentId','studentId','expectedVersion','action'];
  v_action text := p_value ->> 'action'; v_scope jsonb := p_value -> 'scope'; v_keys text[];
begin
  if not private.a5_command_envelope_valid(p_value,'appointmentId','studentId') then return false; end if;
  if v_action = 'create' then v_keys := v_base || array['input'];
  elsif v_action in ('edit','reschedule') then v_keys := v_base || array['scope','input'];
  elsif v_action = 'cancel' then v_keys := v_base || array['scope','reason','confirmation'];
  elsif v_action = 'link-session' then v_keys := v_base || array['sessionId'];
  else return false;
  end if;
  if not private.a5_exact_keys(p_value,v_keys) then return false; end if;
  if (v_action = 'create' and (p_value ->> 'expectedVersion')::integer <> 0)
    or (v_action <> 'create' and (p_value ->> 'expectedVersion')::integer = 0) then return false; end if;
  if v_action in ('create','edit','reschedule') then
    if not private.a5_appointment_input_valid(p_value -> 'input')
      or (p_value #>> '{input,studentId}')::uuid <> (p_value ->> 'studentId')::uuid then return false; end if;
  end if;
  if v_action = 'cancel' and (
    jsonb_typeof(p_value -> 'reason') is distinct from 'string'
    or char_length(btrim(p_value ->> 'reason')) not between 1 and 10000
    or p_value -> 'confirmation' is distinct from 'true'::jsonb) then return false; end if;
  if v_action = 'link-session' and (
    jsonb_typeof(p_value -> 'sessionId') is distinct from 'string'
    or not private.is_uuid_text(p_value ->> 'sessionId')) then return false; end if;
  if v_action in ('edit','reschedule','cancel') then
    if v_scope ->> 'kind' = 'single' then
      return private.a5_exact_keys(v_scope,array['kind']);
    elsif v_scope ->> 'kind' in ('occurrence','series') then
      if jsonb_typeof(v_scope -> 'seriesId') is distinct from 'string'
        or not private.is_uuid_text(v_scope ->> 'seriesId') then return false; end if;
      if v_scope ->> 'kind' = 'series' then
        return private.a5_exact_keys(v_scope,array['kind','seriesId','expectedSeriesVersion'])
          and jsonb_typeof(v_scope -> 'expectedSeriesVersion') = 'number'
          and (v_scope ->> 'expectedSeriesVersion') ~ '^[1-9][0-9]*$'
          and (v_scope ->> 'expectedSeriesVersion')::numeric <= 2147483647;
      end if;
      if not private.a5_exact_keys(v_scope,array['kind','seriesId','originalLocalDate'])
        or jsonb_typeof(v_scope -> 'originalLocalDate') is distinct from 'string'
        or (v_scope ->> 'originalLocalDate') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then return false; end if;
      return to_char((v_scope ->> 'originalLocalDate')::date,'YYYY-MM-DD') = v_scope ->> 'originalLocalDate';
    else return false;
    end if;
  end if;
  return true;
exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow
  or numeric_value_out_of_range then return false;
end;
$$;

revoke all on function private.a5_exact_keys(jsonb,text[]),
  private.a5_appointment_input_valid(jsonb), private.a5_appointment_command_valid(jsonb)
from public, anon, authenticated, service_role;

-- Private calendar primitives. Advance civil dates before timezone conversion.
create function private.a5_weekly_rule_valid(p_rule jsonb)
returns boolean language plpgsql stable security invoker set search_path = '' as $$
declare v_start date; v_until date; v_day jsonb;
begin
  if jsonb_typeof(p_rule) is distinct from 'object' then return false; end if;
  if not (p_rule ?& array['frequency','intervalWeeks','weekdays','startsOn','until',
    'localTime','timeZone','ambiguousTimePolicy','nonexistentTimePolicy'])
    or (select count(*) from jsonb_object_keys(p_rule)) <> 9 then return false; end if;
  if p_rule -> 'frequency' is distinct from '"weekly"'::jsonb
    or p_rule -> 'nonexistentTimePolicy' is distinct from '"reject"'::jsonb
    or jsonb_typeof(p_rule -> 'intervalWeeks') is distinct from 'number'
    or (p_rule ->> 'intervalWeeks') !~ '^[1-9][0-9]*$'
    or (p_rule ->> 'intervalWeeks')::numeric not between 1 and 52
    or jsonb_typeof(p_rule -> 'startsOn') is distinct from 'string'
    or jsonb_typeof(p_rule -> 'until') is distinct from 'string'
    or (p_rule ->> 'startsOn') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    or (p_rule ->> 'until') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    or jsonb_typeof(p_rule -> 'localTime') is distinct from 'string'
    or (p_rule ->> 'localTime') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    or jsonb_typeof(p_rule -> 'timeZone') is distinct from 'string'
    or char_length(p_rule ->> 'timeZone') not between 1 and 100
    or not exists (select 1 from pg_catalog.pg_timezone_names z where z.name = p_rule ->> 'timeZone')
    or jsonb_typeof(p_rule -> 'ambiguousTimePolicy') is distinct from 'string'
    or p_rule ->> 'ambiguousTimePolicy' not in ('earlier','later','reject')
    or jsonb_typeof(p_rule -> 'weekdays') is distinct from 'array' then return false; end if;
  if jsonb_array_length(p_rule -> 'weekdays') not between 1 and 7 then return false; end if;
  for v_day in select value from jsonb_array_elements(p_rule -> 'weekdays') loop
    if jsonb_typeof(v_day) is distinct from 'number' or (v_day #>> '{}') !~ '^[1-7]$' then return false; end if;
  end loop;
  if (select count(*) <> count(distinct value) from jsonb_array_elements(p_rule -> 'weekdays')) then return false; end if;
  v_start := (p_rule ->> 'startsOn')::date; v_until := (p_rule ->> 'until')::date;
  return v_until >= v_start and to_char(v_start, 'YYYY-MM-DD') = p_rule ->> 'startsOn'
    and to_char(v_until, 'YYYY-MM-DD') = p_rule ->> 'until';
exception when invalid_text_representation or invalid_datetime_format
  or datetime_field_overflow or numeric_value_out_of_range then return false;
end;
$$;

create function private.a5_resolve_local_instant(p_date date, p_time time without time zone, p_zone text, p_ambiguity text)
returns timestamptz language plpgsql stable security invoker set search_path = '' as $$
declare v_wall timestamp; v_anchor timestamptz; v_candidates timestamptz[];
begin
  if p_date is null or not isfinite(p_date) or p_time is null or p_zone is null
    or p_ambiguity is null or p_ambiguity not in ('earlier','later','reject')
    or not exists (select 1 from pg_catalog.pg_timezone_names z where z.name = p_zone) then
    raise exception using errcode = '22023', message = 'calendar_local_time_invalid';
  end if;
  v_wall := p_date + p_time; v_anchor := v_wall at time zone 'UTC';
  -- Sample offsets on both sides of transitions, including half-hour changes,
  -- historical second offsets and date-line shifts. Round-trip rejects gaps.
  with offsets as (
    select distinct (probe at time zone p_zone) - (probe at time zone 'UTC') as delta
    from generate_series(v_anchor - interval '72 hours', v_anchor + interval '72 hours', interval '1 hour') probe
  ), candidates as (
    select distinct (v_wall - delta) at time zone 'UTC' as instant from offsets
  ) select array_agg(instant order by instant) into v_candidates from candidates
    where instant at time zone p_zone = v_wall;
  if coalesce(cardinality(v_candidates), 0) = 0 then
    raise exception using errcode = '22023', message = 'calendar_nonexistent_local_time';
  end if;
  if cardinality(v_candidates) > 1 and p_ambiguity = 'reject' then
    raise exception using errcode = '22023', message = 'calendar_ambiguous_local_time';
  end if;
  return case when p_ambiguity = 'later' then v_candidates[cardinality(v_candidates)] else v_candidates[1] end;
end;
$$;

create function private.a5_weekly_occurrences(p_rule jsonb)
returns table(original_local_date date, starts_at timestamptz)
language plpgsql stable security invoker set search_path = '' as $$
declare v_start date; v_until date; v_monday date; v_date date; v_interval integer;
begin
  if not private.a5_weekly_rule_valid(p_rule) then
    raise exception using errcode = '22023', message = 'calendar_weekly_rule_invalid';
  end if;
  v_start := (p_rule ->> 'startsOn')::date; v_until := (p_rule ->> 'until')::date;
  v_interval := (p_rule ->> 'intervalWeeks')::integer;
  v_monday := v_start - (extract(isodow from v_start)::integer - 1);
  for v_date in select v_start + day_number from generate_series(0, v_until - v_start) day_number
    where ((v_start + day_number - v_monday) / 7) % v_interval = 0
      and (p_rule -> 'weekdays') @> jsonb_build_array(extract(isodow from v_start + day_number)::integer)
    order by day_number
  loop
    original_local_date := v_date;
    starts_at := private.a5_resolve_local_instant(v_date, (p_rule ->> 'localTime')::time,
      p_rule ->> 'timeZone', p_rule ->> 'ambiguousTimePolicy');
    return next;
  end loop;
end;
$$;

revoke all on function private.a5_weekly_rule_valid(jsonb),
  private.a5_resolve_local_instant(date,time without time zone,text,text), private.a5_weekly_occurrences(jsonb)
from public, anon, authenticated, service_role;

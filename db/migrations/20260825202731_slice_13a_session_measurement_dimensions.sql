-- Recovered from ABA_staging migration history; schema only.
-- Slice 13A: preserve the clinical measurement dimension at session time.
-- Additive and staging-first. Historical rows intentionally keep a null snapshot.

alter table public.session_behavior_measurements
  add column if not exists measurement_unit text,
  add column if not exists interval_observed integer,
  add column if not exists interval_total integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.session_behavior_measurements'::regclass
      and conname = 'session_behavior_measurements_shape_check'
  ) then
    alter table public.session_behavior_measurements
      add constraint session_behavior_measurements_shape_check check (
        (
          measurement_unit is null
          and interval_observed is null
          and interval_total is null
        )
        or (
          measurement_unit = 'frequency'
          and value = trunc(value)
          and interval_observed is null
          and interval_total is null
        )
        or (
          measurement_unit in ('duration', 'latency')
          and interval_observed is null
          and interval_total is null
        )
        or (
          measurement_unit = 'interval'
          and interval_observed is not null
          and interval_total is not null
          and interval_observed >= 0
          and interval_total >= 0
          and interval_observed <= interval_total
          and value = case
            when interval_total = 0 then 0
            else round(interval_observed * 100.0 / interval_total, 2)
          end
        )
      );
  end if;
end;
$$;

create or replace function public.create_clinical_session(
  p_client_id uuid,
  p_occurred_on date,
  p_notes text,
  p_behavior_measurements jsonb,
  p_acquisition_trials jsonb,
  p_test_run_id uuid
)
returns public.clinical_sessions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session public.clinical_sessions;
  v_behavior_measurements jsonb := coalesce(p_behavior_measurements, '[]'::jsonb);
  v_acquisition_trials jsonb := coalesce(p_acquisition_trials, '[]'::jsonb);
begin
  if p_occurred_on is null or p_occurred_on > current_date then
    raise exception using errcode = '22023', message = 'invalid session date';
  end if;

  if jsonb_typeof(v_behavior_measurements) <> 'array'
     or jsonb_typeof(v_acquisition_trials) <> 'array' then
    raise exception using errcode = '22023', message = 'session collections must be arrays';
  end if;

  if jsonb_array_length(v_behavior_measurements) + jsonb_array_length(v_acquisition_trials) = 0 then
    raise exception using errcode = '22023', message = 'session requires at least one measurement or trial';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_behavior_measurements) as item
    where jsonb_typeof(item) <> 'object'
       or not (item ? 'behavior_plan_id')
       or not (item ? 'measurement_unit')
       or case item ->> 'measurement_unit'
            when 'interval' then not (item ? 'observed' and item ? 'total')
            when 'frequency' then not (item ? 'value')
            when 'duration' then not (item ? 'value' and item ->> 'unit' = 'seconds')
            when 'latency' then not (item ? 'value' and item ->> 'unit' = 'seconds')
            else true
          end
  ) or exists (
    select 1
    from jsonb_array_elements(v_acquisition_trials) as item
    where jsonb_typeof(item) <> 'object'
       or not (item ? 'goal_id')
       or not (item ? 'correct')
       or not (item ? 'incorrect')
  ) then
    raise exception using errcode = '22023', message = 'invalid session collection item';
  end if;

  if (
    select count(*) <> count(distinct item ->> 'behavior_plan_id')
    from jsonb_array_elements(v_behavior_measurements) as item
  ) or (
    select count(*) <> count(distinct item ->> 'goal_id')
    from jsonb_array_elements(v_acquisition_trials) as item
  ) then
    raise exception using errcode = '22023', message = 'duplicate session target';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(v_behavior_measurements) as item(
      behavior_plan_id uuid,
      measurement_unit text,
      value numeric,
      observed integer,
      total integer
    )
    left join public.behavior_plans plan
      on plan.id = item.behavior_plan_id
     and plan.client_id = p_client_id
    where plan.id is null
       or plan.measurement_unit <> item.measurement_unit
       or case item.measurement_unit
            when 'frequency' then item.value is null or item.value < 0 or item.value <> trunc(item.value)
            when 'duration' then item.value is null or item.value < 0 or item.value <> round(item.value, 2)
            when 'latency' then item.value is null or item.value < 0 or item.value <> round(item.value, 2)
            when 'interval' then item.observed is null or item.total is null
              or item.observed < 0 or item.total < 0 or item.observed > item.total
            else true
          end
  ) then
    raise exception using errcode = '22023', message = 'invalid behavior measurement';
  end if;

  insert into public.clinical_sessions (
    client_id, occurred_on, status, notes, test_run_id
  ) values (
    p_client_id,
    p_occurred_on,
    'completed',
    nullif(btrim(p_notes), ''),
    p_test_run_id
  )
  returning * into v_session;

  insert into public.session_behavior_measurements (
    session_id,
    client_id,
    behavior_plan_id,
    measurement_unit,
    value,
    interval_observed,
    interval_total,
    test_run_id
  )
  select
    v_session.id,
    p_client_id,
    item.behavior_plan_id,
    item.measurement_unit,
    case
      when item.measurement_unit = 'interval' and item.total = 0 then 0
      when item.measurement_unit = 'interval' then round(item.observed * 100.0 / item.total, 2)
      else item.value
    end,
    case when item.measurement_unit = 'interval' then item.observed end,
    case when item.measurement_unit = 'interval' then item.total end,
    p_test_run_id
  from jsonb_to_recordset(v_behavior_measurements) as item(
    behavior_plan_id uuid,
    measurement_unit text,
    value numeric,
    observed integer,
    total integer
  );

  insert into public.session_acquisition_trials (
    session_id, client_id, goal_id, correct, incorrect, test_run_id
  )
  select
    v_session.id,
    p_client_id,
    item.goal_id,
    item.correct,
    item.incorrect,
    p_test_run_id
  from jsonb_to_recordset(v_acquisition_trials)
    as item(goal_id uuid, correct integer, incorrect integer);

  return v_session;
end;
$$;

revoke execute on function public.create_clinical_session(uuid, date, text, jsonb, jsonb, uuid)
from public, anon, authenticated;

grant execute on function public.create_clinical_session(uuid, date, text, jsonb, jsonb, uuid)
to authenticated;

-- Association history is retained; changes archive rows instead of deleting them.
alter table public.appointments_v2 add column is_exception boolean not null default false;
alter table public.appointment_participants_v2 add column archived_at timestamptz;
alter table public.appointment_reminders_v2 add column archived_at timestamptz;
alter table public.appointment_reminders_v2
  drop constraint appointment_reminders_v2_appointment_id_minutes_before_key;
create unique index appointment_reminders_v2_current_key
  on public.appointment_reminders_v2(appointment_id,minutes_before) where archived_at is null;

create function private.a5_calendar_authorized(p_org uuid,p_student uuid)
returns boolean language sql stable security invoker set search_path='' as $$
  select auth.uid() is not null and exists(
    select 1 from public.clients c join public.organizations o on o.id=c.organization_id
    where c.id=p_student and c.organization_id=p_org and c.status='active' and o.status='active'
  ) and private.has_student_capability(p_student,'record.capture');
$$;

create function private.a5_calendar_participants_check(p_org uuid,p_student uuid,p_input jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare p jsonb;
begin
  for p in select value from jsonb_array_elements(p_input->'participants') order by value::text loop
    if p->>'kind'='professional' then
      perform 1 from public.memberships m where m.organization_id=p_org
        and m.user_id=(p->>'userId')::uuid and m.status='active' for share;
    else
      perform 1 from public.client_people_v2 person where person.organization_id=p_org
        and person.client_id=p_student and person.id=(p->>'personId')::uuid
        and person.archived_at is null and 'family'=any(person.roles) for share;
    end if;
    if not found then raise exception using errcode='22023',message='calendar_participant_unavailable'; end if;
  end loop;
end;
$$;

create function private.a5_calendar_associations(p_appointment public.appointments_v2,p_input jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare p jsonb; mins integer;
begin
  update public.appointment_participants_v2 set archived_at=now()
    where appointment_id=p_appointment.id and archived_at is null;
  for p in select value from jsonb_array_elements(p_input->'participants') loop
    if p->>'kind'='professional' then
      insert into public.appointment_participants_v2(appointment_id,organization_id,client_id,
        participant_kind,professional_user_id,test_run_id)
      values(p_appointment.id,p_appointment.organization_id,p_appointment.client_id,
        'professional',(p->>'userId')::uuid,p_appointment.test_run_id)
      on conflict(appointment_id,participant_kind,professional_user_id) do update set archived_at=null;
    else
      insert into public.appointment_participants_v2(appointment_id,organization_id,client_id,
        participant_kind,family_person_id,test_run_id)
      values(p_appointment.id,p_appointment.organization_id,p_appointment.client_id,
        'family',(p->>'personId')::uuid,p_appointment.test_run_id)
      on conflict(appointment_id,participant_kind,family_person_id) do update set archived_at=null;
    end if;
  end loop;
  update public.appointment_reminders_v2 set archived_at=now(),
    state=case when state='sent' then 'sent' else 'cancelled' end
    where appointment_id=p_appointment.id and archived_at is null;
  for mins in select value::integer from jsonb_array_elements_text(p_input->'reminderMinutesBefore') loop
    insert into public.appointment_reminders_v2(appointment_id,organization_id,client_id,
      minutes_before,due_at,test_run_id)
    values(p_appointment.id,p_appointment.organization_id,p_appointment.client_id,mins,
      p_appointment.starts_at-make_interval(mins=>mins),p_appointment.test_run_id);
  end loop;
end;
$$;

create function private.a5_calendar_event(p_appointment public.appointments_v2,p_action text,p_command jsonb,p_before jsonb)
returns void language sql security invoker set search_path='' as $$
  insert into public.appointment_events_v2(appointment_id,organization_id,client_id,
    actor_user_id,action,payload,test_run_id)
  values(p_appointment.id,p_appointment.organization_id,p_appointment.client_id,auth.uid(),
    p_action,jsonb_build_object('command',p_command,'before',p_before,'after',to_jsonb(p_appointment)),
    p_appointment.test_run_id);
$$;

create function private.a5_calendar_command_impl(p_organization_id uuid,p_command jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_id uuid; v_student uuid; v_op uuid; v_key uuid; v_action text; v_input jsonb;
  v_expected integer; v_replay jsonb; v_scope text; v_batch uuid; v_series_id uuid;
  v_appointment public.appointments_v2; v_target public.appointments_v2;
  v_series public.appointment_series_v2; v_exists boolean; v_before jsonb;
  v_rule jsonb; v_duration interval; v_date date; v_start timestamptz; v_row record;
  v_dates date[]; v_starts timestamptz[]; v_idx integer; v_new_id uuid; v_version integer;
begin
  if not coalesce(private.a5_appointment_command_valid(p_command),false) then
    raise exception using errcode='22023',message='calendar_command_invalid';
  end if;
  v_id:=(p_command->>'appointmentId')::uuid; v_student:=(p_command->>'studentId')::uuid;
  v_op:=(p_command->>'operationId')::uuid; v_key:=(p_command->>'idempotencyKey')::uuid;
  v_expected:=(p_command->>'expectedVersion')::integer; v_action:=p_command->>'action';
  v_input:=p_command->'input'; v_scope:=p_command#>>'{scope,kind}';
  if not private.a5_calendar_authorized(p_organization_id,v_student) then
    return private.command_rejected_result(v_op,v_key,v_id,'permission-denied','Agenda no autorizada.');
  end if;
  v_replay:=private.command_identity_or_replay_result(p_organization_id,v_op,v_key,v_id,'calendar-v2',p_command);
  -- Lock order: actor ledger, clinic calendar, student, series/appointment.
  perform pg_advisory_xact_lock(hashtextextended('calendar:'||p_organization_id::text,0));
  select c.test_run_id into v_batch from public.clients c
    where c.organization_id=p_organization_id and c.id=v_student for share;
  if not private.a5_calendar_authorized(p_organization_id,v_student) then
    return private.command_rejected_result(v_op,v_key,v_id,'permission-denied','Permiso revocado.');
  end if;
  if v_replay is not null then return v_replay; end if;
  select * into v_appointment from public.appointments_v2 where id=v_id for update;
  v_exists:=found;
  if v_exists and (v_appointment.organization_id<>p_organization_id or v_appointment.client_id<>v_student) then
    return private.command_rejected_result(v_op,v_key,v_id,'resource-unavailable','Cita no disponible.');
  end if;
  if v_action='create' then
    if v_exists then return private.command_version_conflict_result(v_op,v_key,v_id,0,v_appointment.version); end if;
  else
    if not v_exists then
      return private.command_rejected_result(v_op,v_key,v_id,'resource-unavailable','Cita no disponible.');
    end if;
    if v_appointment.version<>v_expected then
      return private.command_version_conflict_result(v_op,v_key,v_id,v_expected,v_appointment.version);
    end if;
    v_series_id:=v_appointment.series_id;
    if v_series_id is not null then
      select * into strict v_series from public.appointment_series_v2 where id=v_series_id for update;
    end if;
    if v_action<>'link-session' then
      if (v_scope='single' and v_series_id is not null)
        or (v_scope in ('occurrence','series') and
          (v_series_id is null or v_series_id<>(p_command#>>'{scope,seriesId}')::uuid))
        or (v_scope='occurrence' and v_appointment.original_local_date<>(p_command#>>'{scope,originalLocalDate}')::date) then
        return private.command_rejected_result(v_op,v_key,v_id,'validation-failed','Alcance de cita incorrecto.');
      end if;
      if v_scope='series' and v_series.version<>(p_command#>>'{scope,expectedSeriesVersion}')::integer then
        return private.command_version_conflict_result(v_op,v_key,v_id,
          (p_command#>>'{scope,expectedSeriesVersion}')::integer,v_series.version,'La serie cambió. Recarga antes de editarla.');
      end if;
    end if;
    if v_appointment.status='cancelled' or (v_series_id is not null and v_series.status='cancelled') then
      return private.command_rejected_result(v_op,v_key,v_id,'invalid-transition','La cita o serie está cancelada.');
    end if;
  end if;
  if v_action in ('create','edit','reschedule') then
    perform private.a5_calendar_participants_check(p_organization_id,v_student,v_input);
    v_rule:=v_input->'recurrence';
    v_duration:=(v_input->>'endsAt')::timestamptz-(v_input->>'startsAt')::timestamptz;
    if v_scope='occurrence' and v_rule is distinct from v_series.weekly_rule then
      return private.command_rejected_result(v_op,v_key,v_id,'validation-failed','Editar una ocurrencia no modifica la regla de serie.');
    end if;
    if v_scope='series' and v_rule='null'::jsonb then
      return private.command_rejected_result(v_op,v_key,v_id,'validation-failed','La serie requiere su regla semanal.');
    end if;
    if v_scope is distinct from 'occurrence' and v_rule<>'null'::jsonb then
      select array_agg(o.original_local_date order by o.original_local_date),
        array_agg(o.starts_at order by o.original_local_date) into v_dates,v_starts
        from private.a5_weekly_occurrences(v_rule) o;
      if coalesce(cardinality(v_dates),0)=0 or v_starts[1]<>(v_input->>'startsAt')::timestamptz then
        return private.command_rejected_result(v_op,v_key,v_id,'validation-failed','El inicio debe coincidir con la primera ocurrencia de la regla.');
      end if;
      if v_series_id is null then
        v_series_id:=v_op;
        if exists(select 1 from public.appointment_series_v2 where id=v_series_id) then
          return private.command_rejected_result(v_op,v_key,v_id,'resource-unavailable','Identidad de serie no disponible.');
        end if;
        insert into public.appointment_series_v2(id,organization_id,client_id,weekly_rule,created_by,test_run_id)
        values(v_series_id,p_organization_id,v_student,v_rule,auth.uid(),v_batch);
      end if;
    end if;
  end if;

  if v_action='link-session' then
    perform 1 from public.clinical_session_v2_state s where s.session_id=(p_command->>'sessionId')::uuid
      and s.organization_id=p_organization_id and s.client_id=v_student and s.status='finished' for share;
    if not found then
      return private.command_rejected_result(v_op,v_key,v_id,'resource-unavailable','Sesión finalizada no disponible para esta ficha.');
    end if;
    v_before:=to_jsonb(v_appointment);
    update public.appointments_v2 set linked_session_id=(p_command->>'sessionId')::uuid,
      is_exception=(series_id is not null),version=version+1,updated_at=now()
      where id=v_id returning * into v_target;
    perform private.a5_calendar_event(v_target,'session-linked',p_command,v_before);
  elsif v_action='cancel' then
    for v_target in select * from public.appointments_v2 a
      where (a.id=v_id or (v_scope='series' and a.series_id=v_series_id)) and a.status='scheduled'
      order by a.id for update loop
      v_before:=to_jsonb(v_target);
      update public.appointments_v2 set status='cancelled',cancelled_at=now(),
        cancellation_reason=btrim(p_command->>'reason'),version=version+1,updated_at=now(),
        is_exception=(series_id is not null) where id=v_target.id returning * into v_target;
      update public.appointment_reminders_v2 set state='cancelled'
        where appointment_id=v_target.id and archived_at is null and state<>'sent';
      perform private.a5_calendar_event(v_target,'cancelled',p_command,v_before);
    end loop;
    if v_scope='series' then
      update public.appointment_series_v2 set status='cancelled',cancelled_at=now() where id=v_series_id;
    end if;
  elsif v_dates is not null then
    -- Existing occurrence IDs and explicit exceptions survive changes to a rule.
    for v_idx in 1..cardinality(v_dates) loop
      v_date:=v_dates[v_idx]; v_start:=v_starts[v_idx];
      select * into v_target from public.appointments_v2
        where series_id=v_series_id and original_local_date=v_date for update;
      if found and (v_target.is_exception or v_target.linked_session_id is not null) then continue; end if;
      v_before:=case when v_target.id is null then null else to_jsonb(v_target) end;
      if v_target.id is null then
        v_new_id:=case when v_idx=1 and v_scope is distinct from 'series' then v_id else gen_random_uuid() end;
        if v_new_id=v_id and v_exists then
          v_before:=to_jsonb(v_appointment);
          update public.appointments_v2 set series_id=v_series_id,original_local_date=v_date,
            title=btrim(v_input->>'title'),notes=v_input->>'notes',starts_at=v_start,ends_at=v_start+v_duration,
            time_zone=v_input->>'timeZone',version=version+1,updated_at=now()
            where id=v_id returning * into v_target;
        else
          insert into public.appointments_v2(id,organization_id,client_id,title,notes,starts_at,ends_at,
            time_zone,series_id,original_local_date,created_by,test_run_id)
          values(v_new_id,p_organization_id,v_student,btrim(v_input->>'title'),v_input->>'notes',
            v_start,v_start+v_duration,v_input->>'timeZone',v_series_id,v_date,auth.uid(),v_batch)
          returning * into v_target;
        end if;
      else
        update public.appointments_v2 set title=btrim(v_input->>'title'),notes=v_input->>'notes',
          starts_at=v_start,ends_at=v_start+v_duration,time_zone=v_input->>'timeZone',
          status='scheduled',cancelled_at=null,cancellation_reason=null,version=version+1,updated_at=now()
          where id=v_target.id returning * into v_target;
      end if;
      perform private.a5_calendar_associations(v_target,v_input);
      perform private.a5_calendar_event(v_target,case when v_before is null then 'created' else 'series-edited' end,p_command,v_before);
    end loop;
    for v_target in select * from public.appointments_v2 a where a.series_id=v_series_id
      and not (a.original_local_date=any(v_dates)) and not a.is_exception
      and a.linked_session_id is null and a.status='scheduled' order by a.id for update loop
      v_before:=to_jsonb(v_target);
      update public.appointments_v2 set status='cancelled',cancelled_at=now(),
        cancellation_reason='Retirada por cambio de regla semanal.',version=version+1,updated_at=now()
        where id=v_target.id returning * into v_target;
      update public.appointment_reminders_v2 set state='cancelled'
        where appointment_id=v_target.id and archived_at is null and state<>'sent';
      perform private.a5_calendar_event(v_target,'cancelled',p_command,v_before);
    end loop;
    update public.appointment_series_v2 set weekly_rule=v_rule where id=v_series_id;
  else
    v_before:=case when v_exists then to_jsonb(v_appointment) else null end;
    if v_action='create' then
      insert into public.appointments_v2(id,organization_id,client_id,title,notes,starts_at,ends_at,
        time_zone,created_by,test_run_id)
      values(v_id,p_organization_id,v_student,btrim(v_input->>'title'),v_input->>'notes',
        (v_input->>'startsAt')::timestamptz,(v_input->>'endsAt')::timestamptz,
        v_input->>'timeZone',auth.uid(),v_batch) returning * into v_target;
    else
      update public.appointments_v2 set title=btrim(v_input->>'title'),notes=v_input->>'notes',
        starts_at=(v_input->>'startsAt')::timestamptz,ends_at=(v_input->>'endsAt')::timestamptz,
        time_zone=v_input->>'timeZone',version=version+1,updated_at=now(),
        is_exception=(series_id is not null) where id=v_id returning * into v_target;
    end if;
    perform private.a5_calendar_associations(v_target,v_input);
    perform private.a5_calendar_event(v_target,case v_action when 'create' then 'created'
      when 'edit' then 'edited' else 'rescheduled' end,p_command,v_before);
  end if;
  if v_exists and v_series_id is not null then
    update public.appointment_series_v2 set version=version+1,updated_at=now() where id=v_series_id;
  end if;
  if not private.a5_calendar_authorized(p_organization_id,v_student) then
    raise exception using errcode='42501',message='calendar_permission_revoked';
  end if;
  select version into strict v_version from public.appointments_v2 where id=v_id;
  return private.issue_command_receipt(p_organization_id,v_op,v_key,v_id,'calendar-v2',p_command,v_version,v_batch);
end;
$$;

create function public.aba_calendar_command_v2(p_organization_id uuid,p_command jsonb)
returns jsonb language sql volatile security definer set search_path='' as $$
  select private.a5_calendar_command_impl(p_organization_id,p_command);
$$;
revoke all on function private.a5_calendar_authorized(uuid,uuid),
  private.a5_calendar_participants_check(uuid,uuid,jsonb),
  private.a5_calendar_associations(public.appointments_v2,jsonb),
  private.a5_calendar_event(public.appointments_v2,text,jsonb,jsonb),
  private.a5_calendar_command_impl(uuid,jsonb), public.aba_calendar_command_v2(uuid,jsonb)
from public,anon,authenticated,service_role;
grant execute on function public.aba_calendar_command_v2(uuid,jsonb) to authenticated;

-- A6/R3: versioned chart goals. Direct writes stay closed; commands carry
-- optimistic version, exact replay identity and an immutable change ledger.
create table public.program_result_goals_v2(
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  client_id uuid not null,
  program_id uuid not null,
  dimension text not null check(dimension in ('percentage','frequency','interval','duration','latency')),
  comparator text not null check(comparator in ('at-least','at-most')),
  target_value double precision not null check(target_value not in ('NaN'::double precision,'Infinity'::double precision,'-Infinity'::double precision)),
  label text not null check(char_length(btrim(label)) between 1 and 160),
  version integer not null default 1 check(version>0),
  archived_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  test_run_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(organization_id,client_id) references public.clients(organization_id,id) on delete restrict,
  foreign key(organization_id,client_id,program_id) references public.programs(organization_id,client_id,id) on delete restrict,
  foreign key(organization_id,test_run_id) references public.test_data_batches(organization_id,id) on delete restrict,
  check(dimension not in ('percentage','interval') or target_value between 0 and 100),
  unique(organization_id,client_id,program_id,id)
);
create table public.program_result_goal_revisions_v2(
  id uuid primary key default gen_random_uuid(),goal_id uuid not null,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  client_id uuid not null,program_id uuid not null,revision integer not null check(revision>0),
  prior_value jsonb not null check(jsonb_typeof(prior_value)='object'),
  action text not null check(action in ('updated','archived')),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  test_run_id uuid,created_at timestamptz not null default now(),
  unique(goal_id,revision),
  foreign key(organization_id,client_id,program_id,goal_id)
    references public.program_result_goals_v2(organization_id,client_id,program_id,id) on delete restrict,
  foreign key(organization_id,test_run_id) references public.test_data_batches(organization_id,id) on delete restrict
);
create index program_result_goals_program_idx on public.program_result_goals_v2(program_id,archived_at,updated_at desc);
create index program_result_goal_revisions_goal_idx on public.program_result_goal_revisions_v2(goal_id,revision desc);
alter table public.program_result_goals_v2 enable row level security;
alter table public.program_result_goal_revisions_v2 enable row level security;
create policy program_result_goals_read on public.program_result_goals_v2 for select to authenticated
  using((select private.has_student_capability(client_id,'chart.view')));
create policy program_result_goal_revisions_read on public.program_result_goal_revisions_v2 for select to authenticated
  using((select private.has_student_capability(client_id,'chart.view')));
revoke all on public.program_result_goals_v2,public.program_result_goal_revisions_v2 from public,anon,authenticated,service_role;
grant select on public.program_result_goals_v2,public.program_result_goal_revisions_v2 to authenticated;

create function private.a6_result_goal_v2_impl(p_clinic_id uuid,p_command jsonb)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare v_student uuid;v_program uuid;v_goal_id uuid;v_expected integer;v_action text;
  v_goal public.program_result_goals_v2;v_replay jsonb;v_test uuid;
begin
  if not private.a3_command_envelope_valid(p_command,'goalId')
    or not ((p_command->>'programId')~*'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
    or (select count(*) from jsonb_object_keys(p_command))<>12
    or exists(select 1 from jsonb_object_keys(p_command) key where key not in
      ('schemaVersion','operationId','idempotencyKey','studentId','programId','goalId','expectedVersion','action','dimension','comparator','targetValue','label'))
    or p_command->>'schemaVersion'<>'2' or p_command->>'action' not in ('create','update','archive')
    or p_command->>'dimension' not in ('percentage','frequency','interval','duration','latency')
    or p_command->>'comparator' not in ('at-least','at-most')
    or jsonb_typeof(p_command->'targetValue')<>'number'
    or jsonb_typeof(p_command->'label')<>'string'
    or char_length(btrim(p_command->>'label')) not between 1 and 160 then
    raise exception using errcode='22023',message='result_goal_command_invalid';
  end if;
  v_student:=(p_command->>'studentId')::uuid;v_program:=(p_command->>'programId')::uuid;
  v_goal_id:=(p_command->>'goalId')::uuid;v_expected:=(p_command->>'expectedVersion')::integer;v_action:=p_command->>'action';
  if (p_command->>'targetValue')::double precision in ('Infinity'::double precision,'-Infinity'::double precision)
    or (p_command->>'targetValue')::double precision='NaN'::double precision
    or (p_command->>'dimension' in ('percentage','interval') and (p_command->>'targetValue')::double precision not between 0 and 100) then
    raise exception using errcode='22023',message='result_goal_target_invalid';
  end if;
  if auth.uid() is null or not exists(select 1 from public.programs p where p.id=v_program and p.client_id=v_student and p.organization_id=p_clinic_id)
    or not private.has_student_capability(v_student,'chart.configure') then
    return private.command_rejected_result((p_command->>'operationId')::uuid,(p_command->>'idempotencyKey')::uuid,v_goal_id,'permission-denied','Meta no autorizada.','[]'::jsonb);
  end if;
  v_replay:=private.command_identity_or_replay_result(p_clinic_id,(p_command->>'operationId')::uuid,(p_command->>'idempotencyKey')::uuid,v_goal_id,'result-goal-v2',p_command);
  if v_replay is not null then
    if not private.has_student_capability(v_student,'chart.configure') then return private.command_rejected_result((p_command->>'operationId')::uuid,(p_command->>'idempotencyKey')::uuid,v_goal_id,'permission-denied','Permiso revocado.','[]'::jsonb);end if;
    return v_replay;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('result-goal:'||v_goal_id::text,0));
  if not private.has_student_capability(v_student,'chart.configure') then return private.command_rejected_result((p_command->>'operationId')::uuid,(p_command->>'idempotencyKey')::uuid,v_goal_id,'permission-denied','Permiso revocado.','[]'::jsonb);end if;
  select * into v_goal from public.program_result_goals_v2 where id=v_goal_id for update;
  if v_action='create' then
    if found or v_expected<>0 then return private.command_version_conflict_result((p_command->>'operationId')::uuid,(p_command->>'idempotencyKey')::uuid,v_goal_id,v_expected,case when found then v_goal.version else 0 end,'La meta ya existe o cambió.');end if;
    select test_run_id into v_test from public.clients where id=v_student and organization_id=p_clinic_id;
    insert into public.program_result_goals_v2(id,organization_id,client_id,program_id,dimension,comparator,target_value,label,created_by,updated_by,test_run_id)
      values(v_goal_id,p_clinic_id,v_student,v_program,p_command->>'dimension',p_command->>'comparator',(p_command->>'targetValue')::double precision,btrim(p_command->>'label'),auth.uid(),auth.uid(),v_test) returning * into v_goal;
  else
    if not found or v_goal.organization_id<>p_clinic_id or v_goal.client_id<>v_student or v_goal.program_id<>v_program or v_goal.archived_at is not null then
      return private.command_rejected_result((p_command->>'operationId')::uuid,(p_command->>'idempotencyKey')::uuid,v_goal_id,'resource-unavailable','Meta no disponible.','[]'::jsonb);
    end if;
    if v_goal.version<>v_expected then return private.command_version_conflict_result((p_command->>'operationId')::uuid,(p_command->>'idempotencyKey')::uuid,v_goal_id,v_expected,v_goal.version,'La meta cambió; revisa la versión actual.');end if;
    insert into public.program_result_goal_revisions_v2(goal_id,organization_id,client_id,program_id,revision,prior_value,action,actor_user_id,test_run_id)
      values(v_goal.id,v_goal.organization_id,v_goal.client_id,v_goal.program_id,v_goal.version,to_jsonb(v_goal),case when v_action='archive' then 'archived' else 'updated' end,auth.uid(),v_goal.test_run_id);
    update public.program_result_goals_v2 set dimension=p_command->>'dimension',comparator=p_command->>'comparator',target_value=(p_command->>'targetValue')::double precision,
      label=btrim(p_command->>'label'),version=version+1,archived_at=case when v_action='archive' then now() else null end,updated_by=auth.uid(),updated_at=now()
      where id=v_goal_id returning * into v_goal;
  end if;
  return private.issue_command_receipt(p_clinic_id,(p_command->>'operationId')::uuid,(p_command->>'idempotencyKey')::uuid,v_goal_id,'result-goal-v2',p_command,v_goal.version,v_goal.test_run_id);
end;$$;
create function public.command_result_goal_v2(p_clinic_id uuid,p_command jsonb)
returns jsonb language sql volatile security definer set search_path='' as $$select private.a6_result_goal_v2_impl(p_clinic_id,p_command);$$;
revoke all on function private.a6_result_goal_v2_impl(uuid,jsonb),public.command_result_goal_v2(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.command_result_goal_v2(uuid,jsonb) to authenticated;

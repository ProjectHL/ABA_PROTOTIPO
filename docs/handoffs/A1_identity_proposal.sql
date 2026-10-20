-- A1 proposal only. Orchestrator owns migration creation/order/application.
-- Depends on existing memberships, private.is_clinic_admin and command_receipts helpers.
-- Professional identity is GLOBAL per Auth user; role/status/clinic remain memberships.
create table public.professional_profiles (
  user_id uuid primary key references auth.users(id) on delete restrict,
  name text not null default '' check(char_length(name)<=160),
  profession text not null default '' check(char_length(profession)<=120),
  title text not null default '' check(char_length(title)<=160),
  description text not null default '' check(char_length(description)<=2000),
  phone text not null default '' check(char_length(phone)<=40),
  avatar_object_path text,
  avatar_preset text not null default 'blue' check(avatar_preset in ('blue','indigo','green','violet')),
  version bigint not null default 0 check(version between 0 and 9007199254740991),
  updated_at timestamptz,
  test_run_id uuid
);
create index professional_profiles_test_run_idx on public.professional_profiles(test_run_id) where test_run_id is not null;
alter table public.professional_profiles enable row level security;
revoke all on table public.professional_profiles from public,anon,authenticated,service_role;
grant select on table public.professional_profiles to authenticated;
create policy professional_profiles_select on public.professional_profiles for select to authenticated
using(user_id=(select auth.uid()) or exists(select 1 from public.memberships m where m.user_id=professional_profiles.user_id and private.is_clinic_admin(m.organization_id)));

-- Read-model helper: no metadata-derived identity and no guessed names on historical users.
create function private.professional_profile_json(p_user_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
  select jsonb_build_object('id',u.id,'email',u.email,'joinedDate',u.created_at::text,
    'name',coalesce(p.name,''),'profession',coalesce(p.profession,''),'title',coalesce(p.title,''),
    'description',coalesce(p.description,''),'phone',coalesce(p.phone,''),
    'avatarObjectPath',p.avatar_object_path,'avatarPreset',coalesce(p.avatar_preset,'blue'),
    'version',coalesce(p.version,0),'updatedAt',p.updated_at)
  from auth.users u left join public.professional_profiles p on p.user_id=u.id where u.id=p_user_id;
$$;
revoke all on function private.professional_profile_json(uuid) from public,anon,authenticated,service_role;

create function public.aba_identity_context(p_organization_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_choices jsonb; v_active jsonb; v_email text;
begin
  if v_actor is null then raise exception using errcode='42501',message='authenticated_identity_required'; end if;
  select email into strict v_email from auth.users where id=v_actor;
  select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'name',o.name,'role',m.role) order by o.name,o.id),'[]'::jsonb)
    into v_choices from public.memberships m join public.organizations o on o.id=m.organization_id
    where m.user_id=v_actor and m.status='active' and o.status='active' and m.role in('admin','supervisor','therapist');
  select choice into v_active from jsonb_array_elements(v_choices) choice where choice->>'id'=p_organization_id::text;
  if v_active is null and p_organization_id is null and jsonb_array_length(v_choices)=1 then v_active:=v_choices->0; end if;
  return jsonb_build_object('userId',v_actor,'email',v_email,'profile',private.professional_profile_json(v_actor),'choices',v_choices,'active',v_active);
end;
$$;
revoke all on function public.aba_identity_context(uuid) from public,anon,authenticated,service_role;
grant execute on function public.aba_identity_context(uuid) to authenticated;

create function public.aba_team(p_organization_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.is_clinic_admin(p_organization_id) then raise exception using errcode='42501',message='clinic_admin_required'; end if;
  -- Reuse the existing team boundary; the projection only adds persisted professional fields.
  perform public.mvp_team(p_organization_id);
  return (select coalesce(jsonb_agg(private.professional_profile_json(m.user_id)||jsonb_build_object('role',m.role,'status',m.status,'avatar','') order by m.created_at),'[]'::jsonb)
    from public.memberships m where m.organization_id=p_organization_id and m.role in('admin','supervisor','therapist'));
end;
$$;
revoke all on function public.aba_team(uuid) from public,anon,authenticated,service_role;
grant execute on function public.aba_team(uuid) to authenticated;

-- Storage identity boundary reuses active clinic administration; never student/global clinical authority.
create function private.can_access_profile_avatar(p_user_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and (p_user_id=auth.uid() or exists(
    select 1 from public.memberships m where m.user_id=p_user_id and private.is_clinic_admin(m.organization_id)
  ));
$$;
revoke all on function private.can_access_profile_avatar(uuid) from public,anon,authenticated,service_role;
grant execute on function private.can_access_profile_avatar(uuid) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('profile-avatars','profile-avatars',false,5242880,array['image/jpeg','image/png'])
on conflict(id) do nothing;
create policy profile_avatar_read on storage.objects for select to authenticated
using(bucket_id='profile-avatars' and case when (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then private.can_access_profile_avatar(((storage.foldername(name))[1])::uuid) else false end);
create policy profile_avatar_insert on storage.objects for insert to authenticated
with check(bucket_id='profile-avatars' and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f-]{36}\.(png|jpg)$'
  and case when (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then private.can_access_profile_avatar(((storage.foldername(name))[1])::uuid) else false end);
-- No upsert/update/delete policies: replace references; previous bytes persist for explicit batch cleanup.

create function public.aba_save_professional_profile(
  p_organization_id uuid,p_target_user_id uuid,p_expected_version bigint,
  p_operation_id uuid,p_idempotency_key uuid,p_payload jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_profile public.professional_profiles; v_replay jsonb; v_payload jsonb;
begin
  if v_actor is null or not exists(select 1 from public.organizations o join public.memberships m on m.organization_id=o.id
    where o.id=p_organization_id and o.status='active' and m.user_id=v_actor and m.status='active')
    or not exists(select 1 from public.memberships where organization_id=p_organization_id and user_id=p_target_user_id)
    or (p_target_user_id<>v_actor and not private.is_clinic_admin(p_organization_id)) then
    raise exception using errcode='42501',message='professional_profile_edit_required';
  end if;
  if p_expected_version is null or p_expected_version<0 or p_payload is null or jsonb_typeof(p_payload)<>'object'
    or (select count(*) from jsonb_object_keys(p_payload))<>7
    or exists(select 1 from jsonb_object_keys(p_payload) k where k not in('name','profession','title','description','phone','avatarObjectPath','avatarPreset'))
    or jsonb_typeof(p_payload->'name') is distinct from 'string' or char_length(btrim(p_payload->>'name')) not between 3 and 160
    or jsonb_typeof(p_payload->'profession') is distinct from 'string' or char_length(btrim(p_payload->>'profession')) not between 2 and 120
    or jsonb_typeof(p_payload->'title') is distinct from 'string' or char_length(p_payload->>'title')>160
    or jsonb_typeof(p_payload->'description') is distinct from 'string' or char_length(p_payload->>'description')>2000
    or jsonb_typeof(p_payload->'phone') is distinct from 'string' or char_length(p_payload->>'phone')>40
    or p_payload->>'avatarPreset' is null or p_payload->>'avatarPreset' not in('blue','indigo','green','violet')
    or jsonb_typeof(p_payload->'avatarObjectPath') not in('null','string') then
    raise exception using errcode='22023',message='invalid_professional_profile';
  end if;
  if p_payload->>'avatarObjectPath' is not null and (p_payload->>'avatarObjectPath' !~ ('^'||p_target_user_id::text||'/[0-9a-f-]{36}\.(png|jpg)$')
    or not exists(select 1 from storage.objects where bucket_id='profile-avatars' and name=p_payload->>'avatarObjectPath')) then
    raise exception using errcode='22023',message='invalid_avatar_reference';
  end if;
  v_payload:=jsonb_build_object('expectedVersion',p_expected_version,'profile',p_payload);
  v_replay:=private.lock_command_replay(p_organization_id,p_operation_id,p_idempotency_key,p_target_user_id,'professional-profile.save',v_payload);
  -- Prevent concurrent suspension/reassignment between authorization and commit/replay.
  perform 1 from public.organizations where id=p_organization_id and status='active' for share;
  if not found then raise exception using errcode='42501',message='active_clinic_required'; end if;
  perform 1 from public.memberships where organization_id=p_organization_id and user_id in(v_actor,p_target_user_id) order by user_id for share;
  if not exists(select 1 from public.memberships where organization_id=p_organization_id and user_id=v_actor and status='active')
    or (p_target_user_id<>v_actor and not private.is_clinic_admin(p_organization_id)) then raise exception using errcode='42501',message='professional_profile_edit_required'; end if;
  if v_replay is not null then return v_replay; end if;
  insert into public.professional_profiles(user_id) values(p_target_user_id) on conflict(user_id) do nothing;
  select * into strict v_profile from public.professional_profiles where user_id=p_target_user_id for update;
  if v_profile.version<>p_expected_version then raise exception using errcode='40001',message='professional_profile_version_conflict'; end if;
  if v_profile.test_run_id is not null then perform private.require_open_test_batch(p_organization_id,v_profile.test_run_id); end if;
  update public.professional_profiles set name=btrim(p_payload->>'name'),profession=btrim(p_payload->>'profession'),title=p_payload->>'title',
    description=p_payload->>'description',phone=p_payload->>'phone',avatar_object_path=p_payload->>'avatarObjectPath',avatar_preset=p_payload->>'avatarPreset',
    version=version+1,updated_at=now() where user_id=p_target_user_id returning * into v_profile;
  insert into public.clinic_admin_events(organization_id,actor_user_id,subject_user_id,action)
    values(p_organization_id,v_actor,p_target_user_id,'professional-profile.save');
  return private.issue_command_receipt(p_organization_id,p_operation_id,p_idempotency_key,p_target_user_id,'professional-profile.save',v_payload,v_profile.version,v_profile.test_run_id);
end;
$$;
revoke all on function public.aba_save_professional_profile(uuid,uuid,bigint,uuid,uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.aba_save_professional_profile(uuid,uuid,bigint,uuid,uuid,jsonb) to authenticated;

-- Forward-fix after use. Rollback only on empty profile table/bucket and no dependent clients/receipts.
-- Keep rows/avatars/receipts, remove grants first if disabling a command. No reset/drop/data destruction here.
-- professional_profiles.test_run_id marks GLOBAL synthetic identities; matching batch must be open in active clinic.
-- Fixtures create the same batch in both clinics. No FK from global profile to a guessed organization.
-- A2 common attachments can later replace the avatar projection with stable attachment associations.

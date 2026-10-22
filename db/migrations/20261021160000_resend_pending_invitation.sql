-- A pending membership is exactly the state in which a resend is still
-- meaningful: the person has not defined a password yet. Requiring `active`
-- here hid every pending invitation from the resend panel, so an existing
-- guest could never receive a new mail with a fresh token.
create or replace function private.aba_team_invitation_deliveries_impl(p_org uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a uuid:=auth.uid(); result jsonb; begin
  if a is null or not private.is_clinic_admin(p_org) then raise exception using errcode='42501',message='clinic_admin_required'; end if;
  perform 1 from public.organizations where id=p_org for update;
  perform private.require_delivery_actor(p_org,a);
  perform private.expire_team_invitation_claims(p_org,a);
  select coalesce(jsonb_agg(jsonb_build_object('invitationId',i.id,'userId',i.subject_user_id,'email',i.email,'role',i.requested_role,
    'accepted',u.email_confirmed_at is not null,
    'eligible',m.status in ('active','pending') and m.role=i.requested_role and lower(u.email)=i.email,
    'lastDelivery',case when d.id is null then null else private.team_invitation_delivery_json(d) end)
    order by i.created_at desc),'[]'::jsonb) into result
  from (select distinct on(subject_user_id) * from private.clinic_invitation_operations
    where organization_id=p_org and status='completed' order by subject_user_id,
      exists(select 1 from private.team_invitation_deliveries b where b.organization_id=p_org
        and b.invitation_id=clinic_invitation_operations.id and b.state in ('pending','claimed','unknown')) desc,
      created_at desc,id) i
  join auth.users u on u.id=i.subject_user_id
  join public.memberships m on m.organization_id=p_org and m.user_id=i.subject_user_id
  left join lateral (select * from private.team_invitation_deliveries where organization_id=p_org and invitation_id=i.id order by created_at desc,id limit 1) d on true;
  return result;
end $$;

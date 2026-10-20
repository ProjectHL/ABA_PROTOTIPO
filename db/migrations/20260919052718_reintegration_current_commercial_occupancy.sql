-- Forward-only read-model correction. CREATE OR REPLACE preserves the existing EXECUTE grants.
-- Current active memberships are reported without mutating the stored commercial snapshot.
create or replace function public.aba_commercial_read_v2(p_organization_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_plans jsonb; v_subscription jsonb; v_documents jsonb; v_occupied integer;
begin
  if v_actor is null or not private.is_clinic_admin(p_organization_id) then
    raise exception using errcode = '42501', message = 'clinic_admin_required';
  end if;
  select count(*)::integer into v_occupied from public.memberships
  where organization_id = p_organization_id and status = 'active';
  select coalesce(jsonb_agg(jsonb_build_object(
    'planId', version.plan_id, 'planVersionId', version.id, 'name', version.name,
    'description', version.description,
    'price', jsonb_build_object('amountMinor', version.amount_minor, 'currency', version.currency,
      'minorUnitDigits', version.minor_unit_digits, 'period', version.period, 'demonstration', true),
    'includedSeats', version.included_seats, 'maximumSeats', version.maximum_seats,
    'features', version.features, 'active', version.active
  ) order by version.included_seats), '[]'::jsonb)
  into v_plans
  from public.commercial_plan_versions_v2 version
  join public.commercial_plans_v2 plan on plan.id = version.plan_id
  where version.active and version.demonstration and plan.active;
  select jsonb_build_object(
    'id', subscription.id, 'clinicId', subscription.organization_id,
    'version', subscription.version,
    'plan', jsonb_build_object(
      'planId', version.plan_id, 'planVersionId', version.id, 'name', version.name,
      'description', version.description,
      'price', jsonb_build_object('amountMinor', version.amount_minor, 'currency', version.currency,
        'minorUnitDigits', version.minor_unit_digits, 'period', version.period, 'demonstration', true),
      'includedSeats', version.included_seats, 'maximumSeats', version.maximum_seats,
      'features', version.features, 'active', version.active),
    'seats', subscription.seats, 'occupiedSeats', v_occupied,
    'status', subscription.status, 'effectiveAt', subscription.effective_at,
    'cancelledAt', subscription.cancelled_at, 'commercialMode', 'internal-demonstration'
  ) into v_subscription
  from public.clinic_subscriptions_v2 subscription
  join public.commercial_plan_versions_v2 version on version.id = subscription.plan_version_id
  where subscription.organization_id = p_organization_id;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', document.id, 'clinicId', document.organization_id,
    'subscriptionId', document.subscription_id, 'version', document.version,
    'kind', document.kind, 'title', document.title, 'issuedAt', document.issued_at,
    'lines', document.lines, 'currency', document.currency,
    'minorUnitDigits', document.minor_unit_digits,
    'attachmentVersionId', document.attachment_version_id,
    'predecessorId', document.predecessor_id, 'archived', document.archived,
    'demonstration', true, 'taxDocument', false, 'paymentRequested', false,
    'attachmentAvailable', exists (select 1 from public.attachment_versions attachment
      where attachment.id = document.attachment_version_id and attachment.state = 'available'),
    'createdAt', document.created_at, 'updatedAt', document.updated_at
  ) order by document.issued_at desc), '[]'::jsonb)
  into v_documents
  from public.commercial_documents_v2 document
  where document.organization_id = p_organization_id;
  return jsonb_build_object(
    'clinicId', p_organization_id, 'actorId', v_actor, 'isClinicAdmin', true,
    'plans', v_plans, 'subscription', v_subscription, 'documents', v_documents,
    'commercialMode', 'internal-demonstration');
end;
$$;

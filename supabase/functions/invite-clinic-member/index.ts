import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.114.0';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };
const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return reply(405, { error: 'method_not_allowed' });

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return reply(401, { error: 'authentication_required' });

  let body: { organizationId?: unknown; email?: unknown; role?: unknown };
  try {
    body = await request.json();
  } catch {
    return reply(400, { error: 'invalid_json' });
  }

  const organizationId = typeof body.organizationId === 'string' ? body.organizationId : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const role = typeof body.role === 'string' ? body.role : '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(organizationId)) {
    return reply(400, { error: 'invalid_organization' });
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return reply(400, { error: 'invalid_email' });
  }
  if (!['admin', 'supervisor', 'therapist'].includes(role)) {
    return reply(400, { error: 'invalid_role' });
  }

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!url || !anonKey || !serviceKey) return reply(500, { error: 'server_configuration_error' });

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const token = authorization.slice('Bearer '.length);
  const { data: identity, error: identityError } = await userClient.auth.getUser(token);
  if (identityError || !identity.user) return reply(401, { error: 'authentication_required' });

  // The RPC is the authorization boundary: it returns only for active clinic admins.
  const { error: authorizationError } = await userClient.rpc('mvp_team', {
    p_organization_id: organizationId,
  });
  if (authorizationError) return reply(403, { error: 'clinic_admin_required' });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: usersPage, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) return reply(502, { error: 'auth_directory_unavailable' });

  let target = usersPage.users.find((candidate: { email?: string; id: string }) => candidate.email?.toLowerCase() === email);
  let invited = false;
  if (!target) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email);
    if (error || !data.user) return reply(502, { error: 'invitation_not_sent' });
    target = data.user;
    invited = true;
  }

  const { error: membershipError } = await admin.from('memberships').upsert(
    { organization_id: organizationId, user_id: target.id, role, status: 'active' },
    { onConflict: 'organization_id,user_id' },
  );
  if (membershipError) return reply(500, { error: 'membership_not_saved' });

  const { error: auditError } = await admin.from('clinic_admin_events').insert({
    organization_id: organizationId,
    actor_user_id: identity.user.id,
    subject_user_id: target.id,
    action: invited ? `invited:${role}` : `linked:${role}`,
  });
  if (auditError) return reply(500, { error: 'audit_not_saved' });

  return reply(200, { invited, userId: target.id, email, role });
});

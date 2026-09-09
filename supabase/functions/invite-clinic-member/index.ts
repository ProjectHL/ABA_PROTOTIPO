import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.114.0';

const allowedOrigins = new Set(
  (Deno.env.get('ABA_ALLOWED_ORIGINS') ?? 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
);

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('Origin');
  if (origin && !allowedOrigins.has(origin)) {
    return new Response(JSON.stringify({ error: 'origin_not_allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', Vary: 'Origin' },
    });
  }
  const corsHeaders = {
    ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    Vary: 'Origin',
  };
  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };
  const reply = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), { status, headers: jsonHeaders });

  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return reply(405, { error: 'method_not_allowed' });

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return reply(401, { error: 'authentication_required' });

  let body: { organizationId?: unknown; operationId?: unknown; email?: unknown; role?: unknown };
  try {
    body = await request.json();
  } catch {
    return reply(400, { error: 'invalid_json' });
  }

  const organizationId = typeof body.organizationId === 'string' ? body.organizationId : '';
  const operationId = typeof body.operationId === 'string' ? body.operationId : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const role = typeof body.role === 'string' ? body.role : '';
  const validUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  if (!validUuid(organizationId)) {
    return reply(400, { error: 'invalid_organization' });
  }
  if (!validUuid(operationId)) return reply(400, { error: 'invalid_operation' });
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

  // Begin persists the intent before touching Auth and is also the admin boundary.
  const { data: begun, error: beginError } = await userClient.rpc('mvp_begin_clinic_invitation', {
    p_organization_id: organizationId,
    p_operation_id: operationId,
    p_email: email,
    p_role: role,
  });
  if (beginError) {
    if (beginError.code === '42501') return reply(403, { error: 'clinic_admin_required' });
    if (beginError.message.includes('conflict')) return reply(409, { error: 'invitation_conflict' });
    return reply(500, { error: 'invitation_not_started' });
  }

  const started = begun as { operation_id?: string; status?: string; user_id?: string; role?: string };
  const effectiveOperationId = started.operation_id ?? operationId;
  if (started.status === 'completed') {
    return reply(200, {
      operationId: effectiveOperationId,
      status: 'completed',
      userId: started.user_id,
      role: started.role ?? role,
    });
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { error: invitationError } = await admin.auth.admin.inviteUserByEmail(email);

  // Completion resolves the Auth user by normalized email and atomically writes
  // membership, audit event and operation state. Existing users are valid retries.
  const { data: completed, error: completeError } = await userClient.rpc('mvp_complete_clinic_invitation', {
    p_organization_id: organizationId,
    p_operation_id: effectiveOperationId,
  });
  if (completeError) {
    if (completeError.code === '42501') return reply(403, { error: 'clinic_admin_required' });
    if (completeError.message.includes('invited_auth_user_not_found')) {
      return reply(502, {
        error: 'invitation_not_sent',
        operationId: effectiveOperationId,
        retryable: true,
      });
    }
    return reply(500, {
      error: 'invitation_not_completed',
      operationId: effectiveOperationId,
      retryable: true,
    });
  }

  const result = completed as { status?: string; user_id?: string; role?: string };
  return reply(200, {
    invited: !invitationError,
    operationId: effectiveOperationId,
    status: result.status ?? 'completed',
    userId: result.user_id,
    role: result.role ?? role,
  });
});

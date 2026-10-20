import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.114.0';

const uuid = (value: unknown): value is string => typeof value === 'string'
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const allowedOrigins = new Set((Deno.env.get('ABA_ALLOWED_ORIGINS')
  ?? 'http://localhost:3000,http://127.0.0.1:3000').split(',').map((value) => value.trim()).filter(Boolean));
const boundedFetch: typeof fetch = (input, init) => fetch(input, {
  ...init, signal: AbortSignal.timeout(20_000),
});
const signatures: Record<string, readonly number[]> = {
  'application/pdf': [0x25, 0x50, 0x44, 0x46, 0x2d],
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
};
const hex = (bytes: Uint8Array) => Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');

type Target = {
  actorId: string; attachmentId: string; versionId: string; bucket: string; objectKey: string;
  mimeType: keyof typeof signatures; byteLength: number; sha256: string;
};

function parseTarget(raw: unknown): Target {
  if (!raw || typeof raw !== 'object') throw new Error('invalid_target');
  const value = raw as Record<string, unknown>;
  if (!uuid(value.actorId) || !uuid(value.attachmentId) || !uuid(value.versionId)
    || value.bucket !== 'clinical-attachments' || typeof value.objectKey !== 'string'
    || !(value.mimeType as string in signatures) || !Number.isSafeInteger(value.byteLength)
    || Number(value.byteLength) < 1 || Number(value.byteLength) > 20 * 1024 * 1024
    || typeof value.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(value.sha256)) {
    throw new Error('invalid_target');
  }
  return value as Target;
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('Origin');
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin',
    ...(origin && allowedOrigins.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
  };
  const reply = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers });
  if (origin && !allowedOrigins.has(origin)) return reply(403, { error: 'origin_not_allowed' });
  if (request.method === 'OPTIONS') return reply(200, {});
  if (request.method !== 'POST') return reply(405, { error: 'method_not_allowed' });
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return reply(401, { error: 'authentication_required' });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return reply(400, { error: 'invalid_json' }); }
  if (!body || typeof body !== 'object'
    || Object.keys(body).sort().join(',') !== 'confirmation,organizationId,reservation'
    || !uuid(body.organizationId) || !body.reservation || typeof body.reservation !== 'object'
    || !body.confirmation || typeof body.confirmation !== 'object') {
    return reply(400, { error: 'invalid_verification_request' });
  }

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) return reply(503, { error: 'verifier_not_configured' });
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization }, fetch: boundedFetch },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return reply(401, { error: 'authentication_required' });
  const targetResult = await userClient.rpc('aba_attachment_verification_target_v2', {
    p_organization_id: body.organizationId,
    p_reservation: body.reservation,
    p_confirmation: body.confirmation,
  });
  if (targetResult.error || !targetResult.data) return reply(403, { error: 'resource_unavailable' });
  let target: Target;
  try { target = parseTarget(targetResult.data); } catch { return reply(502, { error: 'invalid_verification_target' }); }
  if (target.actorId !== user.id) return reply(403, { error: 'actor_mismatch' });

  const verifier = createClient(url, serviceKey, {
    global: { fetch: boundedFetch }, auth: { persistSession: false, autoRefreshToken: false },
  });
  const downloaded = await verifier.storage.from(target.bucket).download(target.objectKey);
  if (downloaded.error || !downloaded.data) return reply(503, { error: 'outcome_unknown' });
  if (downloaded.data.size !== target.byteLength) {
    await verifier.rpc('aba_attachment_mark_verification_failed_v2', {
      p_organization_id: body.organizationId, p_actor_user_id: user.id,
      p_reservation: body.reservation, p_reason: 'bytes-mismatch',
    });
    return reply(422, { error: 'bytes_mismatch' });
  }
  const bytes = new Uint8Array(await downloaded.data.arrayBuffer());
  const signature = signatures[target.mimeType];
  const digest = hex(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)));
  if (!signature.every((value, index) => bytes[index] === value) || digest !== target.sha256) {
    await verifier.rpc('aba_attachment_mark_verification_failed_v2', {
      p_organization_id: body.organizationId, p_actor_user_id: user.id,
      p_reservation: body.reservation, p_reason: 'bytes-mismatch',
    });
    return reply(422, { error: 'bytes_mismatch' });
  }
  const confirmed = await verifier.rpc('aba_attachment_confirm_verified_v2', {
    p_organization_id: body.organizationId, p_actor_user_id: user.id,
    p_reservation: body.reservation, p_confirmation: body.confirmation,
    p_verified_sha256: digest,
  });
  if (confirmed.error || !confirmed.data) return reply(503, { error: 'outcome_unknown' });
  return reply(200, confirmed.data as Record<string, unknown>);
});

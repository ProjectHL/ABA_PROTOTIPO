import { execFileSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const organizationId = '10000000-0000-4000-8000-000000000001';
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function localSupabaseEnvironment() {
  let output;
  try {
    const cli = resolve(projectRoot, 'node_modules/supabase/dist/supabase.js');
    output = execFileSync(process.execPath, [cli, 'status', '-o', 'env'], {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch (error) {
    const detail = error && typeof error === 'object' ? `${error.code ?? 'unknown'}:${error.status ?? 'none'}` : 'unknown';
    throw new Error(`local_supabase_status_unavailable:${detail}`);
  }

  const values = {};
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)="(.*)"$/);
    if (match) values[match[1]] = match[2];
  }
  const apiUrl = values.API_URL;
  const anonKey = values.ANON_KEY ?? values.PUBLISHABLE_KEY;
  const serviceRoleKey = values.SERVICE_ROLE_KEY ?? values.SECRET_KEY;
  if (!apiUrl || !anonKey || !serviceRoleKey) {
    throw new Error('local_supabase_credentials_unavailable');
  }
  return { apiUrl, anonKey, serviceRoleKey };
}

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, options);
  let body = null;
  try {
    body = await response.json();
  } catch {
    // Some negative gateway responses intentionally have no JSON body.
  }
  return { status: response.status, body };
}

function safeError(result) {
  const body = result.body && typeof result.body === 'object' ? result.body : {};
  const message = typeof body.message === 'string' ? body.message.replace(/[^\s@]+@[^\s@]+/g, '[redacted-email]') : null;
  return {
    status: result.status,
    code: body.error_code ?? body.code ?? body.error ?? null,
    message: message ?? body.msg ?? null,
  };
}

async function requireSuccess(label, request) {
  const result = await request;
  if (result.status < 200 || result.status >= 300) {
    const error = safeError(result);
    throw new Error(`${label}:${error.status}:${error.code ?? 'request_failed'}:${error.message ?? ''}`);
  }
  return result.body;
}

async function mailCount() {
  const response = await jsonRequest('http://127.0.0.1:54324/api/v1/messages');
  if (response.status !== 200) throw new Error('mailpit_unavailable');
  return Number(response.body?.total ?? response.body?.count ?? 0);
}

const { apiUrl, anonKey, serviceRoleKey } = localSupabaseEnvironment();
const nonce = `${Date.now()}-${randomBytes(4).toString('hex')}`;
const password = `Ab!${randomBytes(18).toString('base64url')}9z`;
const adminEmail = `admin-${nonce}@example.test`;
const therapistEmail = `therapist-${nonce}@example.test`;
const inviteeEmail = `invitee-${nonce}@example.test`;

const serviceHeaders = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
};

async function createLoginUser(email) {
  return requireSuccess(
    'create_login_user',
    jsonRequest(`${apiUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: serviceHeaders,
      body: JSON.stringify({ email, password, email_confirm: true }),
    }),
  );
}

async function addMembership(userId, role) {
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !['admin', 'therapist'].includes(role)) {
    throw new Error('invalid_local_fixture_membership');
  }
  const sql = `insert into public.memberships(organization_id,user_id,role,status) values ('${organizationId}','${userId}','${role}','active')`;
  try {
    execFileSync(
      'docker',
      ['exec', 'supabase_db_aba_prototipo', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', sql],
      { stdio: ['ignore', 'ignore', 'ignore'] },
    );
  } catch {
    throw new Error('add_membership:local_database_unavailable');
  }
}

function queryLocalDatabase(sql) {
  try {
    return execFileSync(
      'docker',
      ['exec', 'supabase_db_aba_prototipo', 'psql', '-U', 'postgres', '-d', 'postgres', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-c', sql],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim();
  } catch {
    throw new Error('local_database_query_failed');
  }
}

async function signIn(email) {
  const session = await requireSuccess(
    'sign_in',
    jsonRequest(`${apiUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }),
  );
  if (!session?.access_token) throw new Error('sign_in:missing_access_token');
  return session.access_token;
}

async function invoke(token, body, extraHeaders = {}) {
  return jsonRequest(`${apiUrl}/functions/v1/invite-clinic-member`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
}

const admin = await createLoginUser(adminEmail);
const therapist = await createLoginUser(therapistEmail);
await addMembership(admin.id, 'admin');
await addMembership(therapist.id, 'therapist');
const [adminToken, therapistToken] = await Promise.all([signIn(adminEmail), signIn(therapistEmail)]);

const operationId = randomUUID();
const payload = { organizationId, operationId, email: inviteeEmail, role: 'supervisor' };
const mailBefore = await mailCount();

const publicSignup = await jsonRequest(`${apiUrl}/auth/v1/signup`, {
  method: 'POST',
  headers: { apikey: anonKey, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: `public-${nonce}@example.test`, password }),
});
const unauthenticated = await invoke(null, payload);
const unauthorized = await invoke(therapistToken, payload);
const badOrigin = await invoke(adminToken, payload, { Origin: 'https://not-allowed.example' });
const first = await invoke(adminToken, payload);
const retry = await invoke(adminToken, payload);
const conflict = await invoke(adminToken, { ...payload, role: 'therapist' });
const mailAfter = await mailCount();

const invitedUserId = first.body?.userId;
const validInvitedUserId = typeof invitedUserId === 'string' && /^[0-9a-f-]{36}$/i.test(invitedUserId);
const membership = validInvitedUserId
  ? queryLocalDatabase(
      `select role || ':' || status from public.memberships where organization_id='${organizationId}' and user_id='${invitedUserId}'`,
    )
  : '';
const auditCount = validInvitedUserId
  ? Number(
      queryLocalDatabase(
        `select count(*) from public.clinic_admin_events where organization_id='${organizationId}' and subject_user_id='${invitedUserId}' and action='invitation_completed:supervisor'`,
      ),
    )
  : 0;
const operationState = queryLocalDatabase(
  `select status from private.clinic_invitation_operations where organization_id='${organizationId}' and id='${operationId}'`,
);

const checks = {
  public_signup_disabled:
    [400, 422].includes(publicSignup.status) &&
    ['signup_disabled', 'email_provider_disabled'].includes(safeError(publicSignup).code),
  unauthenticated_rejected: unauthenticated.status === 401,
  non_admin_rejected: unauthorized.status === 403,
  foreign_origin_rejected: badOrigin.status === 403,
  invitation_completed:
    first.status === 200 && first.body?.status === 'completed' && first.body?.role === 'supervisor',
  retry_is_idempotent:
    retry.status === 200 &&
    retry.body?.status === 'completed' &&
    retry.body?.userId === first.body?.userId &&
    retry.body?.operationId === first.body?.operationId,
  reused_operation_conflicts: conflict.status === 409,
  membership_persisted: membership === 'supervisor:active',
  audit_persisted: auditCount === 1,
  operation_completed: operationState === 'completed',
  one_local_email_captured: mailAfter - mailBefore === 1,
};

const report = {
  checks,
  statuses: {
    public_signup: publicSignup.status,
    unauthenticated: unauthenticated.status,
    non_admin: unauthorized.status,
    foreign_origin: badOrigin.status,
    first: first.status,
    retry: retry.status,
    conflict: conflict.status,
  },
  mail_delta: mailAfter - mailBefore,
};

console.log(JSON.stringify(report, null, 2));
if (Object.values(checks).some((value) => !value)) process.exitCode = 1;

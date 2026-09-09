import { execFileSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const organizationId = '10000000-0000-4000-8000-000000000001';
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const checks = {
  pending_without_auth_user: false,
  retry_after_auth_completes: false,
  existing_auth_user_edge_retry_completes: false,
  audit_failure_rolls_back_membership: false,
  audit_failure_keeps_operation_pending: false,
  retry_after_audit_failure_completes: false,
  lost_response_retry_no_duplicates: false,
  temporary_trigger_removed: false,
};

let currentStage = 'bootstrap';
let failureTrigger = null;

function localSupabaseEnvironment() {
  let output;
  try {
    const cli = resolve(projectRoot, 'node_modules/supabase/dist/supabase.js');
    output = execFileSync(process.execPath, [cli, 'status', '-o', 'env'], {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    throw new Error('local_supabase_status_unavailable');
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
    // Some controlled failures intentionally have no JSON body.
  }
  return { status: response.status, body };
}

function requireSuccess(label, result) {
  if (result.status < 200 || result.status >= 300) {
    const code = result.body && typeof result.body === 'object' ? result.body.code ?? result.body.error : null;
    throw new Error(`${label}:${typeof code === 'string' ? code : 'request_failed'}`);
  }
  return result.body;
}

function runLocalSql(sql, capture = false) {
  try {
    return execFileSync(
      'docker',
      [
        'exec',
        'supabase_db_aba_prototipo',
        'psql',
        '-U',
        'postgres',
        '-d',
        'postgres',
        ...(capture ? ['-t', '-A'] : []),
        '-v',
        'ON_ERROR_STOP=1',
        '-c',
        sql,
      ],
      {
        encoding: capture ? 'utf8' : undefined,
        stdio: capture ? ['ignore', 'pipe', 'ignore'] : ['ignore', 'ignore', 'ignore'],
      },
    )?.trim?.() ?? '';
  } catch {
    throw new Error('local_database_command_failed');
  }
}

function assertUuid(value) {
  if (typeof value !== 'string' || !uuidPattern.test(value)) throw new Error('invalid_local_uuid');
  return value;
}

function assertSyntheticEmail(value) {
  if (typeof value !== 'string' || !/^[a-z0-9-]+@example\.test$/.test(value)) {
    throw new Error('invalid_local_synthetic_email');
  }
  return value;
}

function queryOperation(operationId) {
  const safeOperationId = assertUuid(operationId);
  const raw = runLocalSql(
    `select json_build_object('count', count(*), 'status', max(status), 'subject_count', count(subject_user_id))::text from private.clinic_invitation_operations where organization_id='${organizationId}' and id='${safeOperationId}'`,
    true,
  );
  return JSON.parse(raw);
}

function queryEffects(email) {
  const safeEmail = assertSyntheticEmail(email);
  const raw = runLocalSql(
    `select json_build_object('memberships', (select count(*) from public.memberships m join auth.users u on u.id=m.user_id where m.organization_id='${organizationId}' and lower(u.email)='${safeEmail}'), 'audits', (select count(*) from public.clinic_admin_events e join auth.users u on u.id=e.subject_user_id where e.organization_id='${organizationId}' and lower(u.email)='${safeEmail}' and e.action like 'invitation_completed:%'))::text`,
    true,
  );
  return JSON.parse(raw);
}

function installAuditFailureTrigger(name) {
  if (!/^test_fail_invitation_audit_[0-9a-f]{8}$/.test(name)) {
    throw new Error('invalid_local_trigger_name');
  }
  runLocalSql(`
    create function private.${name}()
    returns trigger
    language plpgsql
    security invoker
    set search_path = ''
    as $test_failure$
    begin
      raise exception using errcode = 'P0001', message = 'test_injected_audit_failure';
    end;
    $test_failure$;
    create trigger ${name}
      before insert on public.clinic_admin_events
      for each row execute function private.${name}();
  `);
}

function removeAuditFailureTrigger(name) {
  if (!/^test_fail_invitation_audit_[0-9a-f]{8}$/.test(name)) {
    throw new Error('invalid_local_trigger_name');
  }
  runLocalSql(`
    drop trigger if exists ${name} on public.clinic_admin_events;
    drop function if exists private.${name}();
  `);
}

function failureObjectsRemoved(name) {
  if (!/^test_fail_invitation_audit_[0-9a-f]{8}$/.test(name)) return false;
  const count = Number(
    runLocalSql(
      `select (select count(*) from pg_trigger where tgname='${name}' and not tgisinternal) + (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='${name}')`,
      true,
    ),
  );
  return count === 0;
}

async function main() {
  const { apiUrl, anonKey, serviceRoleKey } = localSupabaseEnvironment();
  const nonce = `${Date.now()}-${randomBytes(4).toString('hex')}`;
  const password = `Ab!${randomBytes(18).toString('base64url')}9z`;
  const adminEmail = `failure-admin-${nonce}@example.test`;
  const emailA = `failure-before-auth-${nonce}@example.test`;
  const emailB = `failure-existing-auth-${nonce}@example.test`;
  const emailC = `failure-audit-${nonce}@example.test`;
  const emailD = `failure-response-${nonce}@example.test`;

  const serviceHeaders = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  };

  async function createAuthUser(email) {
    return requireSuccess(
      'create_auth_user',
      await jsonRequest(`${apiUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: serviceHeaders,
        body: JSON.stringify({ email, password, email_confirm: true }),
      }),
    );
  }

  async function signIn(email) {
    const session = requireSuccess(
      'sign_in',
      await jsonRequest(`${apiUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }),
    );
    if (!session?.access_token) throw new Error('sign_in:missing_access_token');
    return session.access_token;
  }

  async function rpc(token, name, body) {
    return jsonRequest(`${apiUrl}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  async function begin(token, operationId, email, role = 'supervisor') {
    return rpc(token, 'mvp_begin_clinic_invitation', {
      p_organization_id: organizationId,
      p_operation_id: operationId,
      p_email: email,
      p_role: role,
    });
  }

  async function complete(token, operationId) {
    return rpc(token, 'mvp_complete_clinic_invitation', {
      p_organization_id: organizationId,
      p_operation_id: operationId,
    });
  }

  async function invokeEdge(token, operationId, email, role = 'supervisor') {
    return jsonRequest(`${apiUrl}/functions/v1/invite-clinic-member`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ organizationId, operationId, email, role }),
    });
  }

  currentStage = 'admin_fixture';
  const admin = await createAuthUser(adminEmail);
  const adminId = assertUuid(admin?.id);
  runLocalSql(
    `insert into public.memberships(organization_id,user_id,role,status) values ('${organizationId}','${adminId}','admin','active')`,
  );
  const adminToken = await signIn(adminEmail);

  currentStage = 'pending_before_auth';
  const operationA = randomUUID();
  requireSuccess('begin_before_auth', await begin(adminToken, operationA, emailA));
  const missingAuth = await complete(adminToken, operationA);
  const pendingA = queryOperation(operationA);
  const effectsBeforeA = queryEffects(emailA);
  checks.pending_without_auth_user =
    missingAuth.status >= 400 &&
    missingAuth.body?.code === '22023' &&
    missingAuth.body?.message === 'invited_auth_user_not_found' &&
    Number(pendingA.count) === 1 &&
    pendingA.status === 'pending' &&
    Number(pendingA.subject_count) === 0 &&
    Number(effectsBeforeA.memberships) === 0 &&
    Number(effectsBeforeA.audits) === 0;

  const userA = await createAuthUser(emailA);
  const completedA = requireSuccess('retry_after_auth', await complete(adminToken, operationA));
  const finalA = queryOperation(operationA);
  const effectsAfterA = queryEffects(emailA);
  checks.retry_after_auth_completes =
    completedA?.status === 'completed' &&
    completedA?.user_id === userA?.id &&
    finalA.status === 'completed' &&
    Number(finalA.subject_count) === 1 &&
    Number(effectsAfterA.memberships) === 1 &&
    Number(effectsAfterA.audits) === 1;

  currentStage = 'existing_auth_edge_retry';
  const operationB = randomUUID();
  requireSuccess('begin_existing_auth', await begin(adminToken, operationB, emailB));
  const userB = await createAuthUser(emailB);
  const edgeB = await invokeEdge(adminToken, operationB, emailB);
  const finalB = queryOperation(operationB);
  const effectsB = queryEffects(emailB);
  checks.existing_auth_user_edge_retry_completes =
    edgeB.status === 200 &&
    edgeB.body?.invited === false &&
    edgeB.body?.status === 'completed' &&
    edgeB.body?.userId === userB?.id &&
    finalB.status === 'completed' &&
    Number(effectsB.memberships) === 1 &&
    Number(effectsB.audits) === 1;

  currentStage = 'audit_transaction_failure';
  const operationC = randomUUID();
  requireSuccess('begin_audit_failure', await begin(adminToken, operationC, emailC));
  await createAuthUser(emailC);
  failureTrigger = `test_fail_invitation_audit_${randomBytes(4).toString('hex')}`;
  installAuditFailureTrigger(failureTrigger);
  const failedC = await complete(adminToken, operationC);
  const pendingC = queryOperation(operationC);
  const effectsFailedC = queryEffects(emailC);
  checks.audit_failure_rolls_back_membership =
    failedC.status >= 400 &&
    failedC.body?.code === 'P0001' &&
    failedC.body?.message === 'test_injected_audit_failure' &&
    Number(effectsFailedC.memberships) === 0 &&
    Number(effectsFailedC.audits) === 0;
  checks.audit_failure_keeps_operation_pending =
    pendingC.status === 'pending' && Number(pendingC.subject_count) === 0;

  removeAuditFailureTrigger(failureTrigger);
  checks.temporary_trigger_removed = failureObjectsRemoved(failureTrigger);
  failureTrigger = null;
  const completedC = requireSuccess('retry_after_audit_failure', await complete(adminToken, operationC));
  const finalC = queryOperation(operationC);
  const effectsFinalC = queryEffects(emailC);
  checks.retry_after_audit_failure_completes =
    completedC?.status === 'completed' &&
    finalC.status === 'completed' &&
    Number(effectsFinalC.memberships) === 1 &&
    Number(effectsFinalC.audits) === 1;

  currentStage = 'lost_response_retry';
  const operationD = randomUUID();
  requireSuccess('begin_lost_response', await begin(adminToken, operationD, emailD));
  const userD = await createAuthUser(emailD);
  const discarded = await fetch(`${apiUrl}/rest/v1/rpc/mvp_complete_clinic_invitation`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_organization_id: organizationId, p_operation_id: operationD }),
  });
  await discarded.arrayBuffer();

  const retryBeginD = requireSuccess('retry_begin_after_lost_response', await begin(adminToken, operationD, emailD));
  const retryCompleteD = requireSuccess('retry_complete_after_lost_response', await complete(adminToken, operationD));
  const finalD = queryOperation(operationD);
  const effectsD = queryEffects(emailD);
  checks.lost_response_retry_no_duplicates =
    retryBeginD?.status === 'completed' &&
    retryBeginD?.user_id === userD?.id &&
    retryCompleteD?.status === 'completed' &&
    retryCompleteD?.user_id === userD?.id &&
    Number(finalD.count) === 1 &&
    finalD.status === 'completed' &&
    Number(effectsD.memberships) === 1 &&
    Number(effectsD.audits) === 1;
}

try {
  await main();
} catch {
  process.exitCode = 1;
} finally {
  if (failureTrigger) {
    try {
      removeAuditFailureTrigger(failureTrigger);
      checks.temporary_trigger_removed = failureObjectsRemoved(failureTrigger);
    } catch {
      process.exitCode = 1;
    }
  }
}

const allPassed = Object.values(checks).every(Boolean);
console.log(
  JSON.stringify(
    {
      checks,
      ...(allPassed ? {} : { failure: { stage: currentStage, code: 'invitation_failure_harness_failed' } }),
    },
    null,
    2,
  ),
);
if (!allPassed) process.exitCode = 1;

import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const organizationA = '10000000-0000-4000-8000-000000000001';
const organizationB = '10000000-0000-4000-8000-000000000002';

function localEnvironment() {
  const cli = resolve(projectRoot, 'node_modules/supabase/dist/supabase.js');
  let output;
  try {
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
  const url = values.API_URL;
  const anonKey = values.ANON_KEY ?? values.PUBLISHABLE_KEY;
  const serviceKey = values.SERVICE_ROLE_KEY ?? values.SECRET_KEY;
  if (!url || !anonKey || !serviceKey) throw new Error('local_supabase_credentials_unavailable');
  return { url, anonKey, serviceKey };
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

function requireUuid(value, label) {
  if (typeof value !== 'string' || !/^[0-9a-f-]{36}$/i.test(value)) throw new Error(`${label}:invalid_uuid`);
  return value;
}

function requireResult(label, result) {
  if (result.error) throw new Error(`${label}:${result.error.code ?? 'request_failed'}`);
  return result.data;
}

const { url, anonKey, serviceKey } = localEnvironment();
const root = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const nonce = `${Date.now()}-${randomBytes(4).toString('hex')}`;
const password = `Ab!${randomBytes(18).toString('base64url')}9z`;

const definitions = {
  adminA: { email: `admin-a-${nonce}@example.test`, organization: organizationA, role: 'admin', status: 'active' },
  adminB: { email: `admin-b-${nonce}@example.test`, organization: organizationB, role: 'admin', status: 'active' },
  supervisor: { email: `supervisor-${nonce}@example.test`, organization: organizationA, role: 'supervisor', status: 'active' },
  technician: { email: `technician-${nonce}@example.test`, organization: organizationA, role: 'therapist', status: 'active' },
  unassigned: { email: `unassigned-${nonce}@example.test`, organization: organizationA, role: 'therapist', status: 'active' },
  suspended: { email: `suspended-${nonce}@example.test`, organization: organizationA, role: 'therapist', status: 'active' },
  future: { email: `future-${nonce}@example.test`, organization: organizationA, role: 'supervisor', status: 'active' },
};

for (const definition of Object.values(definitions)) {
  const created = requireResult(
    'create_user',
    await root.auth.admin.createUser({ email: definition.email, password, email_confirm: true }),
  );
  definition.id = requireUuid(created.user?.id, 'create_user');
}

const membershipValues = Object.values(definitions)
  .map((definition) => `('${definition.organization}','${definition.id}','${definition.role}','${definition.status}')`)
  .join(',');
queryLocalDatabase(
  `insert into public.memberships(organization_id,user_id,role,status) values ${membershipValues}`,
);

for (const definition of Object.values(definitions)) {
  const session = requireResult(
    'sign_in',
    await root.auth.signInWithPassword({ email: definition.email, password }),
  );
  if (!session.session?.access_token) throw new Error('sign_in:missing_access_token');
  definition.client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${session.session.access_token}` } },
  });
}

const payloadA = {
  clinical_id: `AUTH-A-${nonce}`,
  initials: 'A.A.',
  birth_date: '2015-01-01',
  primary_language: 'Español',
  guardians: [],
  siblings: [],
};
const payloadB = { ...payloadA, clinical_id: `AUTH-B-${nonce}`, initials: 'B.B.' };

async function saveStudent(client, organizationId, studentId, expected, payload) {
  return requireResult(
    'save_student',
    await client.rpc('mvp_save_student', {
      p_organization_id: organizationId,
      p_client_id: studentId,
      p_expected_updated_at: expected,
      p_payload: payload,
      p_test_run_id: null,
    }),
  );
}

const studentA = await saveStudent(definitions.adminA.client, organizationA, null, null, payloadA);
const studentB = await saveStudent(definitions.adminB.client, organizationB, null, null, payloadB);
const studentAId = requireUuid(studentA?.id, 'student_a');
const studentBId = requireUuid(studentB?.id, 'student_b');

async function assign(definition, role) {
  requireResult(
    'set_assignment',
    await definitions.adminA.client.rpc('set_student_assignment', {
      p_client_id: studentAId,
      p_user_id: definition.id,
      p_role: role,
      p_status: 'active',
      p_test_run_id: null,
    }),
  );
}

await assign(definitions.supervisor, 'supervisor');
await assign(definitions.technician, 'therapist');
await assign(definitions.suspended, 'therapist');
await assign(definitions.future, 'supervisor');

requireResult(
  'suspend_member',
  await definitions.adminA.client.rpc('mvp_set_member', {
    p_organization_id: organizationA,
    p_user_id: definitions.suspended.id,
    p_role: 'therapist',
    p_status: 'inactive',
  }),
);
queryLocalDatabase(
  `update public.student_assignments set effective_at=now()+interval '1 day' where client_id='${studentAId}' and user_id='${definitions.future.id}'`,
);

async function visibleStudentIds(client) {
  const rows = requireResult('read_students', await client.from('clients').select('id').order('id')) ?? [];
  return rows.map((row) => row.id).sort();
}

async function capabilities(client, studentId) {
  return requireResult(
    'read_capabilities',
    await client.rpc('get_student_capabilities', { p_client_id: studentId }),
  );
}

const visibility = {};
for (const [name, definition] of Object.entries(definitions)) {
  visibility[name] = await visibleStudentIds(definition.client);
}

const adminCapabilities = await capabilities(definitions.adminA.client, studentAId);
const adminCrossTenantCapabilities = await capabilities(definitions.adminA.client, studentBId);
const supervisorCapabilities = await capabilities(definitions.supervisor.client, studentAId);
const technicianCapabilities = await capabilities(definitions.technician.client, studentAId);
const unassignedCapabilities = await capabilities(definitions.unassigned.client, studentAId);
const suspendedCapabilities = await capabilities(definitions.suspended.client, studentAId);
const futureCapabilities = await capabilities(definitions.future.client, studentAId);

const ownUpdate = await saveStudent(
  definitions.adminA.client,
  organizationA,
  studentAId,
  studentA.updated_at,
  { ...payloadA, initials: 'A.C.' },
);
const directDml = await definitions.adminA.client
  .from('clients')
  .update({ initials: 'X.X.' })
  .eq('id', studentAId)
  .select('id');
const crossTenantWrite = await definitions.adminA.client.rpc('mvp_save_student', {
  p_organization_id: organizationB,
  p_client_id: studentBId,
  p_expected_updated_at: studentB.updated_at,
  p_payload: payloadB,
  p_test_run_id: null,
});
const teamA = requireResult(
  'team_a',
  await definitions.adminA.client.rpc('mvp_team', { p_organization_id: organizationA }),
);
const nonAdminTeam = await definitions.supervisor.client.rpc('mvp_team', { p_organization_id: organizationA });

const checks = {
  admin_a_is_clinic_scoped: JSON.stringify(visibility.adminA) === JSON.stringify([studentAId]),
  admin_b_is_clinic_scoped: JSON.stringify(visibility.adminB) === JSON.stringify([studentBId]),
  supervisor_sees_assigned_student: JSON.stringify(visibility.supervisor) === JSON.stringify([studentAId]),
  technician_sees_assigned_student: JSON.stringify(visibility.technician) === JSON.stringify([studentAId]),
  unassigned_user_sees_nothing: visibility.unassigned.length === 0,
  suspended_member_denied_immediately: visibility.suspended.length === 0 && suspendedCapabilities.length === 0,
  future_assignment_inactive: visibility.future.length === 0 && futureCapabilities.length === 0,
  admin_has_full_capabilities: adminCapabilities.length === 17 && adminCapabilities.includes('authorization.decide'),
  cross_tenant_capabilities_empty: adminCrossTenantCapabilities.length === 0,
  supervisor_can_edit_not_decide:
    supervisorCapabilities.includes('student.edit') && !supervisorCapabilities.includes('authorization.decide'),
  technician_can_capture_not_edit:
    technicianCapabilities.includes('record.capture') && !technicianCapabilities.includes('student.edit'),
  unassigned_capabilities_empty: unassignedCapabilities.length === 0,
  command_update_persisted: ownUpdate?.initials === 'A.C.',
  direct_dml_rejected: directDml.error?.code === '42501',
  cross_tenant_command_rejected: crossTenantWrite.error?.code === '42501',
  admin_team_is_clinic_scoped:
    Array.isArray(teamA) &&
    teamA.some((member) => member.user_id === definitions.adminA.id) &&
    !teamA.some((member) => member.user_id === definitions.adminB.id),
  non_admin_team_rejected: nonAdminTeam.error?.code === '42501',
};

console.log(JSON.stringify({ checks }, null, 2));
if (Object.values(checks).some((value) => !value)) process.exitCode = 1;

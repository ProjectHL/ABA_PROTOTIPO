// Read-only before/after restart probe. Root restarts services separately.
// No service_role, SQL, seeds, command RPCs, uploads, deletes or clinical payload artifacts.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { localStatus, root, state } from './write-env.mjs';

const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
const labels = ['admin-a', 'supervisor-a', 'tecnico-a', 'admin-b', 'supervisor-b', 'tecnico-b', 'externo', 'familia'];
const pngId = '17834b36-a2d1-4821-aa7e-51ef251fcb04';
const pngStudent = 'b347646e-ff29-450b-aedf-9f9c015fb41a';
const pngHash = 'bc21a4fa21aaa7c5eb60fbd88394d86813afd10ad287bf7274d0e1c588ea2764';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const qaRoot = path.join(root, '.aba.local', 'qa');
const uuid = value => typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value);
const gaps = [
  'Private command_receipts has no ordinary read RPC: no DB-ledger receipt comparison is claimed.',
  'Optional receipt files prove only local artifact continuity, not server receipt persistence.',
  'Result goals use the existing authorized REST read (there is no read RPC).',
  'Team invitation delivery reads can expire reservations/claims and mutate state; excluded from this read-only probe.',
  'Chat is deferred. HTTP reads do not prove browser UI, offline cache, Mailpit or Realtime after restart.',
  'Read projections cover currently authorized rows; inaccessible/archived/unexposed data are not a full database backup.',
];

function safeQaPath(input, mustExist = false) {
  const resolved = path.resolve(root, input);
  assert.ok(resolved.startsWith(qaRoot + path.sep), 'Evidence path must stay inside Desktop .aba.local/qa');
  assert.equal(path.extname(resolved), '.json', 'Evidence must be JSON');
  if (mustExist) assert.ok(realpathSync(resolved).startsWith(realpathSync(qaRoot) + path.sep), 'Evidence symlink leaves QA root');
  else {
    mkdirSync(path.dirname(resolved), { recursive: true });
    assert.ok(realpathSync(path.dirname(resolved)).startsWith(realpathSync(qaRoot) + path.sep), 'Evidence directory leaves QA root');
  }
  return resolved;
}

function canonical(raw) {
  if (Array.isArray(raw)) {
    const rows = raw.map(canonical);
    // SQL aggregation can have ties; stable identity ordering prevents false drift.
    if (rows.length && rows.every(row => row && typeof row === 'object' && !Array.isArray(row) && typeof row.id === 'string')) rows.sort((a, b) => a.id.localeCompare(b.id));
    return rows;
  }
  if (raw && typeof raw === 'object') return Object.fromEntries(Object.keys(raw).sort().map(key => [key, canonical(raw[key])]));
  return raw;
}

function versionMetadata(raw, target = []) {
  if (Array.isArray(raw)) { for (const value of raw) versionMetadata(value, target); }
  else if (raw && typeof raw === 'object') {
    if (uuid(raw.id) && ['version', 'revision', 'number'].some(key => Number.isInteger(raw[key]))) {
      const row = { id: raw.id };
      for (const key of ['version', 'revision', 'number']) if (Number.isInteger(raw[key])) row[key] = raw[key];
      target.push(row);
    }
    for (const value of Object.values(raw)) versionMetadata(value, target);
  }
  return target.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

async function main() {
  assert.equal(process.env.ABA_QA_PERSISTENCE_V5_READ, '1', 'Explicit read-only persistence opt-in required');
  assert.equal(path.resolve(process.cwd()), 'C:\\Users\\Moonlabpc\\Desktop\\ABA\\ABA_PROTOTIPO', 'Desktop checkout required');
  assert.equal(path.resolve(root), path.resolve(process.cwd()));
  assert.equal(process.env.ABA_QA_BASE_URL ?? 'http://localhost:3001', 'http://localhost:3001', 'Candidate3001 required');
  const [mode, checkpointArg, ...receiptArgs] = process.argv.slice(2);
  assert.ok(['before', 'after'].includes(mode) && checkpointArg, 'Usage: before|after .aba.local/qa/persistence-v5/checkpoint.json [receipt-summary.json ...]');
  const checkpoint = safeQaPath(checkpointArg, mode === 'after');
  assert.ok(mode === 'after' || !existsSync(checkpoint), 'Refuse to overwrite before checkpoint');
  const previous = mode === 'after' ? JSON.parse(readFileSync(checkpoint, 'utf8')) : null;
  if (previous) { assert.equal(previous.schemaVersion, 1); assert.equal(previous.batchId, batchId); }
  const receiptPaths = previous ? previous.receiptArtifacts.map(item => item.path) : receiptArgs;
  assert.ok(mode === 'before' || receiptArgs.length === 0, 'After reuses checkpoint receipt paths');
  const local = localStatus();
  assert.equal(local.API_URL, 'http://127.0.0.1:54321');
  const manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));
  assert.equal(manifest.batchId, batchId); assert.equal(manifest.state, 'ready'); assert.equal(manifest.apiUrl, local.API_URL);
  assert.equal(manifest.accounts.length, 8); assert.ok(uuid(manifest.clinics.A) && uuid(manifest.clinics.B));
  const snapshot = { schemaVersion: 1, batchId, apiUrl: local.API_URL, candidate: 'http://localhost:3001',
    fixtureHash: null, actors: [], projections: {}, receiptArtifacts: [], png: null, gaps };
  const accounts = labels.map(label => {
    const account = manifest.accounts.find(row => row.label === label);
    assert.ok(account && account.email === `${label}.${batchId}@aba.example.test` && uuid(account.userId), 'Fixture identity mismatch');
    return account;
  });
  snapshot.fixtureHash = sha(JSON.stringify(canonical({ batchId, clinics: manifest.clinics, designatedLabel: manifest.designatedLabel,
    accounts: accounts.map(({ label, userId, role, clinic }) => ({ label, userId, role, clinic })) })));
  const clients = new Map();
  const put = (key, data) => {
    snapshot.projections[key] = { sha256: sha(JSON.stringify(canonical(data))),
      count: Array.isArray(data) ? data.length : null, versions: versionMetadata(data) };
  };
  const rpc = async (label, name, args, expected = 'ok') => {
    const result = await clients.get(label).rpc(name, args);
    if (expected === 'denied') { assert.ok(result.error && ['42501', 'PGRST301', 'PGRST302'].includes(result.error.code), `Expected rejection: ${name}`); return; }
    if (result.error) throw new Error(`Ordinary read failed: ${label}/${name}; response omitted`);
    const data = result.data;
    if (data && !Array.isArray(data) && data.actorId !== undefined) assert.equal(data.actorId, accounts.find(row => row.label === label).userId, 'Read actor mismatch');
    return data;
  };
  try {
    for (const account of accounts) {
      const client = createClient(local.API_URL, local.ANON_KEY ?? local.PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
      clients.set(account.label, client);
      const login = await client.auth.signInWithPassword({ email: account.email, password: account.password });
      if (login.error || login.data.user?.id !== account.userId || login.data.user.app_metadata.aba_fixture_batch !== batchId) throw new Error('Synthetic Auth unconfirmed; values omitted');
      const internal = !['externo', 'familia'].includes(account.label);
      const clinicId = internal ? manifest.clinics[account.label.endsWith('-b') ? 'B' : 'A'] : null;
      const identity = await rpc(account.label, 'aba_identity_context', { p_organization_id: clinicId });
      assert.equal(identity.userId, account.userId);
      if (clinicId) assert.equal(identity.active?.id, clinicId);
      snapshot.actors.push({ label: account.label, userId: account.userId, identityHash: sha(JSON.stringify(canonical(identity))), authMetadataHash: sha(JSON.stringify(canonical(login.data.user.app_metadata))),
        memberships: identity.choices.map(({ id, role }) => ({ clinicId: id, role })).sort((a, b) => a.clinicId.localeCompare(b.clinicId)) });
      put(`${account.label}/notifications`, await rpc(account.label, 'aba_notifications_read_v2', { p_limit: 100 }));
      put(`${account.label}/received-shares`, await rpc(account.label, 'aba_student_share_read_v2', { p_organization_id: null }));
      put(`${account.label}/received-family-access`, await rpc(account.label, 'aba_family_access_read_v2', { p_organization_id: null, p_client_id: null }));
      if (!internal) {
        put(`${account.label}/family-portal`, await rpc(account.label, 'aba_family_portal_read_v2', { p_organization_id: manifest.clinics.A }));
        put(`${account.label}/family-calendar`, await rpc(account.label, 'aba_family_calendar_read_v2', { p_organization_id: manifest.clinics.A }));
        continue;
      }
      for (const name of ['aba_list_students_v2', 'aba_dashboard_read_v2', 'aba_calendar_read_v2', 'aba_support_ticket_read_v2', 'aba_student_share_read_v2']) {
        const data = await rpc(account.label, name, { p_organization_id: clinicId });
        if (data && !Array.isArray(data) && data.clinicId !== undefined) assert.equal(data.clinicId, clinicId);
        // This is the one known generated-at query clock, not persisted content.
        const stable = name === 'aba_dashboard_read_v2' ? Object.fromEntries(Object.entries(data).filter(([key]) => key !== 'generatedAt')) : data;
        put(`${account.label}/${name}`, stable);
      }
      if (!account.label.startsWith('admin-')) continue;
      put(`${account.label}/team`, await rpc(account.label, 'aba_team', { p_organization_id: clinicId }));
      put(`${account.label}/commercial`, await rpc(account.label, 'aba_commercial_read_v2', { p_organization_id: clinicId }));
      await rpc(account.label, 'aba_team', { p_organization_id: clinicId === manifest.clinics.A ? manifest.clinics.B : manifest.clinics.A }, 'denied');
      const students = await rpc(account.label, 'aba_list_students_v2', { p_organization_id: clinicId });
      if (account.label === 'admin-a') for (const expectedId of ['QA-R5-A-2155E99E', 'QA-R5-LIFECYCLE-V5']) assert.equal(students.filter(row => row.clinicalId === expectedId).length, 1, 'Required existing synthetic student missing');
      for (const student of students) {
        assert.ok(uuid(student.id) && student.clinicId === clinicId && /^QA[- ]/i.test(student.clinicalId), 'Only existing synthetic students may be inspected');
        const key = `${account.label}/student/${student.id}`;
        put(`${key}/detail`, await rpc(account.label, 'aba_student_detail_v2', { p_organization_id: clinicId, p_client_id: student.id }));
        put(`${key}/program-session`, await rpc(account.label, 'read_program_session_v2', { p_clinic_id: clinicId, p_student_id: student.id }));
        put(`${key}/family-access`, await rpc(account.label, 'aba_family_access_read_v2', { p_organization_id: clinicId, p_client_id: student.id }));
        put(`${key}/family-publications`, await rpc(account.label, 'aba_family_publication_manage_read_v2', { p_organization_id: clinicId, p_client_id: student.id }));
        const goals = await client.from('program_result_goals_v2').select('id,organization_id,client_id,program_id,dimension,comparator,target_value,label,version,archived_at,created_at,updated_at').eq('organization_id', clinicId).eq('client_id', student.id);
        if (goals.error) throw new Error('Existing ordinary goals REST read failed; values omitted');
        const goalHistory = await client.from('program_result_goal_revisions_v2').select('id,goal_id,organization_id,client_id,program_id,revision,prior_value,action,actor_user_id,test_run_id,created_at').eq('organization_id', clinicId).eq('client_id', student.id);
        if (goalHistory.error) throw new Error('Ordinary goal revisions read failed; values omitted');
        put(key + '/goal-revisions', goalHistory.data);
        put(`${key}/goals`, goals.data);
        const resource = { kind: 'student', clinicId, studentId: student.id };
        const versions = await rpc(account.label, 'aba_attachment_list_v2', { p_organization_id: clinicId, p_resource: resource, p_include_archived: true });
        put(`${key}/attachments`, versions);
        if (account.label === 'admin-a' && student.id === pngStudent) {
          const png = versions.find(row => row.id === pngId);
          assert.ok(png && png.state === 'available' && png.createdBy === account.userId && png.bucket === 'clinical-attachments', 'Existing exact PNG missing; no upload will be created');
          assert.equal(png.upload.mimeType, 'image/png'); assert.match(png.upload.fileName, /^qa-r5-/i);
          assert.equal(png.upload.byteLength, 68); assert.equal(png.upload.sha256, pngHash);
          assert.equal(png.resource.studentId, pngStudent); assert.equal(png.resource.clinicId, clinicId);
          const authorized = await rpc(account.label, 'aba_attachment_read_v2', { p_organization_id: clinicId, p_resource: resource, p_version_id: png.id });
          put(`${key}/png-read-metadata`, authorized);
          const download = await client.storage.from(png.bucket).download(png.objectKey);
          if (download.error || !download.data) throw new Error('Existing authenticated PNG download failed; no URL or payload logged');
          const bytes = Buffer.from(await download.data.arrayBuffer());
          assert.equal(bytes.length, 68); assert.equal(sha(bytes), pngHash);
          assert.ok(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])));
          snapshot.png = { versionId: pngId, studentId: pngStudent, byteLength: bytes.length, sha256: sha(bytes), metadataHash: sha(JSON.stringify(canonical(png))) };
        }
      }
    }
    assert.equal(snapshot.actors.length, 8); assert.ok(snapshot.png, 'Exact persisted PNG is required');
    for (const receiptArg of receiptPaths) {
      const filename = safeQaPath(receiptArg, true);
      // Hash local receipt evidence only. Never serialize the file payload.
      const raw = readFileSync(filename); JSON.parse(raw.toString('utf8'));
      snapshot.receiptArtifacts.push({ path: path.relative(root, filename).replaceAll('\\', '/'), byteLength: raw.length, sha256: sha(raw) });
    }
    if (mode === 'before') writeFileSync(checkpoint, JSON.stringify(snapshot, null, 2), { flag: 'wx', mode: 0o600 });
    else {
      const differences = [];
      for (const section of ['fixtureHash', 'actors', 'projections', 'receiptArtifacts', 'png']) {
        if (JSON.stringify(canonical(snapshot[section])) !== JSON.stringify(canonical(previous[section]))) differences.push(section);
      }
      const resultFile = safeQaPath(path.relative(root, checkpoint).replace(/\.json$/, '.after.json'));
      const result = { schemaVersion: 1, batchId, passed: differences.length === 0, changedSections: differences,
        changedProjectionKeys: [...new Set([...Object.keys(previous.projections), ...Object.keys(snapshot.projections)])].filter(key => JSON.stringify(canonical(previous.projections[key])) !== JSON.stringify(canonical(snapshot.projections[key]))),
        comparedProjections: Object.keys(snapshot.projections).length, actors: snapshot.actors.length, pngBytesVerified: true, gaps };
      writeFileSync(resultFile, JSON.stringify(result, null, 2), { flag: 'wx', mode: 0o600 });
      assert.equal(differences.length, 0, `Persistence drift in ${differences.join(',')}; payloads omitted`);
    }
    console.log(JSON.stringify({ mode, passed: true, actors: 8, projections: Object.keys(snapshot.projections).length, pngBytesVerified: true, receiptArtifacts: snapshot.receiptArtifacts.length, gaps }));
  } finally {
    const releases = await Promise.allSettled([...clients.values()].map(client => client.auth.signOut({ scope: 'local' })));
    if (releases.some(result => result.status === 'rejected' || result.value.error)) throw new Error('Temporary Auth sessions were not locally revoked; values omitted');
  }
}

main().catch(error => {
  // Do not render assertion actual/expected values, RPC responses, credentials or tokens.
  console.error(error instanceof assert.AssertionError ? `Persistence check failed: ${error.message.split('\n')[0]}` : 'Persistence probe failed; outputs withheld and existing state preserved');
  process.exitCode = 1;
});



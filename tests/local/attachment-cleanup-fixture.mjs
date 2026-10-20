// Explicit QA-only preparation. Creates two tagged, archived PNG objects with
// simulated age so ARCHIVOS-013 can be previewed/backed up without real data.
// Never removes objects or updates an existing clinical record.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { localStatus, state } from '../../scripts/local/write-env.mjs';

assert.equal(process.cwd().replaceAll('\\', '/'), 'C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
assert.equal(process.env.ABA_QA_PREPARE_CLEANUP_FIXTURE, '1', 'Preparación QA explícita requerida');
const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
const clinicId = '3e8aa653-8cce-46d0-aa4d-2316d1e5d1b1';
const studentId = 'b347646e-ff29-450b-aedf-9f9c015fb41a';
const manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));
assert.equal(manifest.state, 'ready');
assert.equal(manifest.clinics.A, clinicId);
const admin = manifest.accounts.find(row => row.label === 'admin-a');
assert.equal(admin?.email, `admin-a.${batchId}@aba.example.test`);
const status = localStatus();
assert.equal(status.API_URL, 'http://127.0.0.1:54321');
assert.ok(status.SERVICE_ROLE_KEY, 'Storage administrativo solo local requerido');
const fixturePath = path.join(state, 'qa', 'attachment-cleanup-fixture.json');
assert.equal(existsSync(fixturePath), false, 'Fixture ya preparado; no se duplica');

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y1Y04wAAAAASUVORK5CYII=', 'base64');
const sha256 = createHash('sha256').update(png).digest('hex');
const createdAt = new Date(Date.now() - 4 * 86400000).toISOString();
const confirmedAt = new Date(Date.now() - 3 * 86400000).toISOString();
const archivedAt = new Date(Date.now() - 2 * 86400000).toISOString();
const objects = [1, 2].map(number => {
  const attachmentId = randomUUID(), versionId = randomUUID();
  return { attachmentId, versionId, fileName: `qa-r5-cleanup-${number}.png`,
    objectKey: `clinic/${clinicId}/student/${studentId}/${attachmentId}/${versionId}.png`,
    bucket: 'clinical-attachments', byteLength: png.length, sha256 };
});
const docker = path.join(process.env.LOCALAPPDATA ?? '', 'Programs/DockerDesktop/resources/bin/docker.exe');
function sql(text) {
  try {
    return execFileSync(docker, ['exec', 'supabase_db_aba-reintegration-local', 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres', '-c', text],
      { encoding: 'utf8', windowsHide: true, timeout: 15000, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch { throw new Error('Preparación SQL sintética no confirmada; conservar fixture y revisar destino, sin limpieza automática.'); }
}
const q = value => `'${value}'`;
const guard = `do $$ begin
  if not exists(select 1 from public.organizations where id=${q(clinicId)}::uuid and test_run_id=${q(batchId)}::uuid and status='active')
    or not exists(select 1 from public.test_data_batches where organization_id=${q(clinicId)}::uuid and id=${q(batchId)}::uuid and status='open')
    or not exists(select 1 from public.memberships where organization_id=${q(clinicId)}::uuid and user_id=${q(admin.userId)}::uuid and role='admin' and status='active' and test_run_id=${q(batchId)}::uuid)
    or not exists(select 1 from public.clients where organization_id=${q(clinicId)}::uuid and id=${q(studentId)}::uuid and clinical_id='QA-R5-A-2155E99E')
  then raise exception 'cleanup_fixture_scope_invalid'; end if;
end $$;`;
const loginClient = createClient(status.API_URL, status.ANON_KEY ?? status.PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const login = await loginClient.auth.signInWithPassword({ email: admin.email, password: admin.password });
assert.equal(login.error, null, 'Auth de admin sintético no confirmado');
assert.equal(login.data.user?.id, admin.userId);
assert.equal(login.data.user?.app_metadata?.aba_fixture_batch, batchId);
try {
  sql(guard);
  const recordValues = objects.map(o => `(${q(o.attachmentId)}::uuid,${q(clinicId)}::uuid,'student',${q(studentId)}::uuid,'student-document','pending-upload',1,${q(admin.userId)}::uuid,${q(createdAt)}::timestamptz,${q(batchId)}::uuid)`).join(',');
  const versionValues = objects.map(o => `(${q(o.versionId)}::uuid,${q(o.attachmentId)}::uuid,1,'pending-upload','clinical-attachments',${q(o.objectKey)},${q(o.fileName)},'image/png',${o.byteLength},${q(sha256)},${q(admin.userId)}::uuid,${q(createdAt)}::timestamptz)`).join(',');
  const links = objects.map(o => `update public.attachment_records set current_version_id=${q(o.versionId)}::uuid where id=${q(o.attachmentId)}::uuid and test_run_id=${q(batchId)}::uuid;`).join('\n');
  sql(`${guard} begin;
    insert into public.attachment_records(id,organization_id,resource_kind,client_id,purpose,state,version,created_by,created_at,test_run_id) values ${recordValues};
    insert into public.attachment_versions(id,attachment_id,version,state,bucket_id,object_key,original_name,mime_type,byte_length,sha256,created_by,created_at) values ${versionValues};
    ${links}
    commit;`);
  mkdirSync(path.dirname(fixturePath), { recursive: true });
  writeFileSync(fixturePath, JSON.stringify({ batchId, clinicId, studentId, adminId: admin.userId, createdAt, confirmedAt, archivedAt, objects, status: 'pending-storage' }), { flag: 'wx', mode: 0o600 });
  const storage = createClient(status.API_URL, status.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  for (const object of objects) {
    const upload = await storage.storage.from(object.bucket).upload(object.objectKey, png, { contentType: 'image/png', upsert: false });
    if (upload.error) throw new Error('Storage sintético no confirmado; registros pending-upload conservados.');
    const download = await storage.storage.from(object.bucket).download(object.objectKey);
    if (download.error || !download.data || !Buffer.from(await download.data.arrayBuffer()).equals(png)) throw new Error('Bytes QA no confirmados; registros pending-upload conservados.');
  }
  const ids = objects.map(o => q(o.versionId) + '::uuid').join(',');
  const recordIds = objects.map(o => q(o.attachmentId) + '::uuid').join(',');
  sql(`${guard} begin;
    do $$ begin
      if (select count(*) from storage.objects where bucket_id='clinical-attachments' and name in (${objects.map(o => q(o.objectKey)).join(',')})) <> 2 then raise exception 'fixture_objects_missing'; end if;
    end $$;
    update public.attachment_versions set state='archived',confirmed_at=${q(confirmedAt)}::timestamptz,archived_at=${q(archivedAt)}::timestamptz
      where id in (${ids}) and state='pending-upload' and sha256=${q(sha256)};
    update public.attachment_records set state='archived',archived_at=${q(archivedAt)}::timestamptz
      where id in (${recordIds}) and state='pending-upload' and test_run_id=${q(batchId)}::uuid;
    commit;`);
  assert.equal(sql(`select count(*) from public.attachment_records a join public.attachment_versions v on v.attachment_id=a.id where a.id in (${recordIds}) and a.test_run_id=${q(batchId)}::uuid and a.state='archived' and v.state='archived' and v.archived_at<now()-interval '1 day';`), '2');
  writeFileSync(path.join(state, 'qa', 'attachment-cleanup-fixture-ready.json'), JSON.stringify({ batchId, attachmentIds: objects.map(o => o.attachmentId), versionIds: objects.map(o => o.versionId), sha256, simulatedRetentionDays: 1 }), { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ check: 'ARCHIVOS-013 fixture sintético preparado', batchId, attachmentIds: objects.map(o => o.attachmentId), versions: objects.map(o => o.versionId), simulatedRetentionDays: 1, deleted: false }));
} finally {
  const logout = await loginClient.auth.signOut({ scope: 'local' });
  assert.equal(logout.error, null, 'Sesión QA temporal no revocada');
}

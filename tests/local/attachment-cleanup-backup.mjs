// QA-only backup of an exact preview. Never invokes apply/remove.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { localStatus, state } from '../../scripts/local/write-env.mjs';
import { main, validatePreview } from '../../scripts/local/attachment-cleanup.mjs';

assert.equal(process.cwd().replaceAll('\\', '/'), 'C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
assert.equal(process.env.ABA_QA_BACKUP_CLEANUP_PREVIEW, '1', 'Respaldo QA explícito requerido');
const previewId = process.argv[2];
assert.match(previewId ?? '', /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i);
const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
const clinicId = '3e8aa653-8cce-46d0-aa4d-2316d1e5d1b1';
const ready = JSON.parse(readFileSync(path.join(state, 'qa', 'attachment-cleanup-fixture-ready.json'), 'utf8'));
const directory = path.join(state, 'attachment-cleanup', previewId);
const preview = validatePreview(JSON.parse(readFileSync(path.join(directory, 'preview.json'), 'utf8')));
assert.equal(preview.batchId, batchId);
assert.equal(preview.clinicId, clinicId);
assert.equal(preview.retentionDays, 1);
assert.equal(preview.candidates.length, 2);
assert.equal(preview.excluded.length, 0);
assert.deepEqual(preview.candidates.map(row => row.versionId).sort(), [...ready.versionIds].sort());
assert.ok(preview.candidates.every(row => row.purpose === 'student-document' && row.recordState === 'archived' && row.versionState === 'archived' && row.sha256 === ready.sha256));

const manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));
const admin = manifest.accounts.find(row => row.label === 'admin-a');
assert.equal(admin.userId, preview.actorId);
const status = localStatus();
assert.equal(status.API_URL, 'http://127.0.0.1:54321');
const auth = createClient(status.API_URL, status.ANON_KEY ?? status.PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const login = await auth.auth.signInWithPassword({ email: admin.email, password: admin.password });
assert.equal(login.error, null);
assert.equal(login.data.user?.id, admin.userId);
assert.equal(login.data.user?.app_metadata?.aba_fixture_batch, batchId);
const original = process.env.ABA_CLEANUP_ACCESS_TOKEN;
process.env.ABA_CLEANUP_ACCESS_TOKEN = login.data.session.access_token;
try {
  await main(['backup', previewId]);
  const receipt = JSON.parse(readFileSync(path.join(directory, 'backup.json'), 'utf8'));
  assert.equal(receipt.previewHash, preview.previewHash);
  assert.equal(receipt.objects.length, 2);
  for (const item of receipt.objects) {
    const candidate = preview.candidates.find(row => row.versionId === item.versionId);
    assert.ok(candidate);
    assert.equal(item.sha256, candidate.sha256);
    assert.equal(createHash('sha256').update(readFileSync(path.join(directory, `${item.versionId}.bin`))).digest('hex'), item.sha256);
  }
  console.log(JSON.stringify({ check: 'ARCHIVOS-013 backup QA', previewId, previewHash: preview.previewHash, backedUp: receipt.objects.length, deleted: false }));
} finally {
  if (original === undefined) delete process.env.ABA_CLEANUP_ACCESS_TOKEN; else process.env.ABA_CLEANUP_ACCESS_TOKEN = original;
  const logout = await auth.auth.signOut({ scope: 'local' });
  assert.equal(logout.error, null);
}

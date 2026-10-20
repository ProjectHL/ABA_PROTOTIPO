// R5 read-only clinical scope check. Auth session is synthetic and revoked.
// No reserve/upload/archive/remove RPC, fixture or reset is performed.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { localStatus, state } from '../../scripts/local/write-env.mjs';
import { main } from '../../scripts/local/attachment-cleanup.mjs';

const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
const retentionDays = process.env.ABA_QA_RETENTION_DAYS ?? '30';
assert.match(retentionDays, /^[1-9][0-9]*$/, 'Retención QA explícita inválida');
const manifest = JSON.parse(readFileSync(path.join(state, 'batches', batchId + '.json'), 'utf8'));
assert.equal(manifest.batchId, batchId);
assert.equal(manifest.state, 'ready');
const account = manifest.accounts.find(row => row.label === 'admin-a');
assert.equal(account.email, `admin-a.${batchId}@aba.example.test`);
const status = localStatus();
assert.equal(manifest.apiUrl, status.API_URL);
const client = createClient(status.API_URL, status.ANON_KEY ?? status.PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const session = await client.auth.signInWithPassword({ email: account.email, password: account.password });
assert.equal(session.error, null, 'Auth sintético no confirmado');
assert.equal(session.data.user?.id, account.userId);
assert.equal(session.data.user?.app_metadata?.aba_fixture_batch, batchId);
const originalToken = process.env.ABA_CLEANUP_ACCESS_TOKEN;
const originalLog = console.log;
process.env.ABA_CLEANUP_ACCESS_TOKEN = session.data.session.access_token;
try {
  let output;
  console.log = value => { output = JSON.parse(value); };
  // Retention is a QA input, not an approved retention policy for real data.
  await main(['preview', manifest.clinics.A, batchId, account.userId, retentionDays, 'SETTLED']);
  assert.equal(output.clinicId, manifest.clinics.A);
  assert.equal(output.batchId, batchId);
  assert.equal(output.actorId, account.userId);
  assert.ok(output.previewHash);
  for (const row of [...output.candidates, ...output.excluded]) { assert.equal(row.clinicId, manifest.clinics.A); assert.equal(row.batchId, batchId); }
  await assert.rejects(main(['preview', manifest.clinics.B, batchId, account.userId, retentionDays, 'SETTLED']), /no autorizados actualmente/);
  originalLog(JSON.stringify({ check: 'ARCHIVOS-013 preview local y rechazo clínica cruzada', previewId: output.previewId, retentionDays, candidates: output.candidates.length, excluded: output.excluded.length, passed: true, deletionExecuted: false }));
} finally {
  console.log = originalLog;
  if (originalToken === undefined) delete process.env.ABA_CLEANUP_ACCESS_TOKEN; else process.env.ABA_CLEANUP_ACCESS_TOKEN = originalToken;
  const logout = await client.auth.signOut({ scope: 'local' });
  assert.equal(logout.error, null, 'Sesión temporal no revocada');
}

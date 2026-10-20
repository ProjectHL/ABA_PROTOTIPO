import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { localStatus, root, state } from './write-env.mjs';

if (process.env.ABA_QA_POSTMAN_NEWMAN !== '1') throw new Error('Explicit local QA opt-in required');
if (root.replaceAll('\\', '/').replace(/\/$/, '') !== 'C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO') throw new Error('Desktop root required');
const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
const status = localStatus();
const manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));
if (status.API_URL !== 'http://127.0.0.1:54321' || manifest.apiUrl !== status.API_URL || manifest.batchId !== batchId || manifest.state !== 'ready') throw new Error('Local synthetic batch mismatch');
const require = createRequire(path.join(state, 'qa', 'newman-runner', 'package.json'));
const newman = require('newman');
const kind = process.env.ABA_QA_POSTMAN_COLLECTION ?? 'HTTP';
if (!['HTTP', 'READS'].includes(kind)) throw new Error('Only reviewed local collections allowed');
const source = readFileSync(path.join(root, 'postman', `ABA_LOCAL_R5_${kind}.postman_collection.json`), 'utf8');
const collection = JSON.parse(source);
if (collection.info.schema !== 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json') throw new Error('Collection 2.1 required');
const values = { qa_api_url: status.API_URL, qa_public_key: status.ANON_KEY ?? status.PUBLISHABLE_KEY, qa_batch_id: batchId, qa_clinic_a: manifest.clinics.A, qa_clinic_b: manifest.clinics.B, qa_http_gate: '1' };
for (const account of manifest.accounts) {
  if (account.email !== `${account.label}.${batchId}@aba.example.test`) throw new Error('Synthetic identity mismatch');
  const prefix = `qa_${account.label.replaceAll('-', '_')}`;
  values[`${prefix}_email`] = account.email; values[`${prefix}_password`] = account.password;
}
// Private fixture injection is memory-only. Never export collection/environment/response objects.
for (const [key, value] of Object.entries(values)) {
  const variable = collection.variable.find(item => item.key === key);
  if (variable) variable.value = value; else collection.variable.push({ key, value });
}
const requests = [];
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
await new Promise(resolve => {
  newman.run({ collection, reporters: [], iterationCount: 1, timeoutRequest: 20_000, timeoutScript: 20_000 }, (error, summary) => {
    const evidence = { executedAt: new Date().toISOString(), runner: `Newman ${require('newman/package.json').version} local`, fixture: 'memory only', batchId, collection: kind, collectionSha256: createHash('sha256').update(source).digest('hex'), fatal: Boolean(error), stats: summary?.run?.stats, requests,
      failures: (summary?.run?.failures ?? []).map(failure => ({ name: failure.error?.name, syntaxReason: failure.error?.name === 'SyntaxError' && /^Identifier '[A-Za-z_$][A-Za-z0-9_$]*' has already been declared$/.test(failure.error?.message ?? '') ? failure.error.message : undefined, test: failure.error?.test, item: failure.source?.name })) };
    const output = path.join(state, 'qa', `postman-${kind.toLowerCase()}-newman-${stamp}.json`);
    writeFileSync(output, JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify({ evidence: path.relative(root, output), stats: evidence.stats, fatal: evidence.fatal, failures: evidence.failures }));
    if (error || evidence.failures.length) process.exitCode = 1;
    resolve();
  }).on('request', (error, args) => requests.push({ name: args.item.name, status: args.response?.code, transportError: Boolean(error) }));
});
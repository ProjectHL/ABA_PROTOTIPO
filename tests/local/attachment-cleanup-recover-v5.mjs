// Isolated exact-byte recovery only. Root bootstraps/restores DB and starts services.
// Never updates attachment/Auth metadata, never uploads/upserts and never accesses origin bytes.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = 'C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO';
const previewId = '796f24cb-235e-4dc8-a3d8-bb6370b0047e';
const expectedVersions = ['48c57520-b2e1-4528-a124-b1b3e1b99ad4', '5144a232-a564-4dda-af56-9bb0548e0e76'];
const image = 'public.ecr.aws/supabase/storage-api:v1.72.1';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const docker = path.join(process.env.LOCALAPPDATA ?? '', 'Programs/DockerDesktop/resources/bin/docker.exe');
const directory = path.join(root, '.aba.local/attachment-cleanup', previewId);
let hostStage = 'HOST_GUARDS';
const safeWorkerCodes = new Set(['WORKER_INPUT','WORKER_BACKEND','WORKER_KEYS','LOGIN_A_HTTP','LOGIN_B_HTTP','LOGIN_A_JSON','LOGIN_B_JSON','LOGIN_A_ID','LOGIN_B_ID','LOGIN_A_BATCH','LOGIN_B_BATCH','LOGIN_A_TOKEN','LOGIN_B_TOKEN','USER_A_HTTP','USER_B_HTTP','USER_A_ID','USER_B_ID','PHYSICAL_INVENTORY','SERVICE_DOWNLOAD','SERVICE_BYTES','DENY_A','DENY_B','DENY_ANON','PHYSICAL_HASH','LOGOUT_HTTP','WORKER_OUTPUT']);
function run(args, input) {
  const result = spawnSync(docker, args, { input, encoding: 'utf8', windowsHide: true, timeout: 45000, maxBuffer: 2 * 1024 * 1024 });
  if (result.status !== 0 || result.error) {
    const error = new Error('Isolated Docker operation failed; sensitive output withheld; retain target for diagnosis');
    for (const line of (result.stderr ?? '').split(/\r?\n/)) {
      try { const item = JSON.parse(line).recoveryDiagnostic; if (item && safeWorkerCodes.has(item.code)) error.safeDiagnostic = { code: item.code, ...(Number.isInteger(item.httpStatus) && item.httpStatus >= 100 && item.httpStatus <= 599 ? { httpStatus: item.httpStatus } : {}) }; } catch {}
    }
    throw error;
  }
  return result.stdout.trim();
}
function inspect(name, type = 'container') { return JSON.parse(run([type === 'volume' ? 'volume' : 'inspect', ...(type === 'volume' ? ['inspect', name] : ['--type', 'container', name])]))[0]; }
function noPorts(container) { assert.ok(Object.values(container.NetworkSettings.Ports ?? {}).every(value => !value?.length), 'No published ports allowed'); }
function literal(value) { return "'" + String(value).replaceAll("'", "''") + "'"; }
function filesOf(input) {
  return input.candidates.map(item => ({ versionId: item.versionId, byteLength: item.byteLength, sha256: item.sha256,
    bucket: item.bucket, objectKey: item.objectKey, attachmentId: item.attachmentId }));
}

const copyWorker = String.raw`
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const walk=d=>fs.existsSync(d)?fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{const p=path.join(d,e.name);if(e.isSymbolicLink())throw Error('symlink');return e.isDirectory()?walk(p):[p];}):[];
(async()=>{const input=JSON.parse(fs.readFileSync(0,'utf8'));
if(walk('/mnt').length!==0)throw Error('target not empty');
const expected=input.objects.map(o=>{const source='/from/'+o.versionId+'.bin';const bytes=fs.readFileSync(source);if(bytes.length!==o.byteLength||sha(bytes)!==o.sha256)throw Error('backup mismatch');
if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(o.storageVersion))throw Error('storage version invalid');
const dest='/mnt/stub/stub/'+o.bucket+'/'+o.objectKey+'/'+o.storageVersion;if(!dest.startsWith('/mnt/stub/stub/clinical-attachments/clinic/')||dest.split('/').includes('..'))throw Error('path invalid');return {source,dest,o};});
for(const {source,dest} of expected){fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(source,dest,fs.constants.COPYFILE_EXCL);}
const actual=walk('/mnt');if(actual.length!==2||actual.some(p=>!expected.some(e=>e.dest===p)))throw Error('unexpected physical object');
for(const {dest,o} of expected){const bytes=fs.readFileSync(dest);if(bytes.length!==o.byteLength||sha(bytes)!==o.sha256)throw Error('copied bytes mismatch');}
console.log(JSON.stringify({copied:2,onlyExpectedPhysicalObjects:true,objects:expected.map(({o})=>({versionId:o.versionId,storageVersion:o.storageVersion,byteLength:o.byteLength,sha256:o.sha256}))}));
})().catch(()=>{console.error('Exact isolated copy failed; partial target retained, no overwrite retry');process.exitCode=1;});
`;

const verifyWorker = String.raw`
const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{const p=path.join(d,e.name);if(e.isSymbolicLink())throw Error('symlink');return e.isDirectory()?walk(p):[p];});
let stage='WORKER_INPUT',httpStatus;
const at=code=>{stage=code;httpStatus=undefined;};
(async()=>{const input=JSON.parse(fs.readFileSync(0,'utf8'));at('WORKER_BACKEND');if(process.env.STORAGE_BACKEND!=='file'||process.env.TENANT_ID!=='stub'||process.env.FILE_STORAGE_BACKEND_PATH!=='/mnt')throw Error('backend mismatch');
at('WORKER_KEYS');const serviceKey=process.env.SERVICE_KEY,anonKey=process.env.ANON_KEY;if(!serviceKey||!anonKey)throw Error('service credentials missing');
const tokens=[];
const login=async(a,index)=>{const actor=index===0?'A':'B';at('LOGIN_'+actor+'_HTTP');const response=await fetch('http://127.0.0.1:9999/token?grant_type=password',{method:'POST',headers:{'Content-Type':'application/json',apikey:anonKey},body:JSON.stringify({email:a.email,password:a.password})});httpStatus=response.status;if(!response.ok)throw Error('restored auth unavailable');at('LOGIN_'+actor+'_JSON');const data=await response.json();if(typeof data.access_token==='string'&&data.access_token)tokens.push(data.access_token);
at('LOGIN_'+actor+'_ID');if(data.user?.id!==a.userId)throw Error('auth id mismatch');at('LOGIN_'+actor+'_BATCH');if(data.user.app_metadata?.aba_fixture_batch!==input.batchId)throw Error('auth batch mismatch');at('LOGIN_'+actor+'_TOKEN');if(!data.access_token)throw Error('token missing');
at('USER_'+actor+'_HTTP');const user=await fetch('http://127.0.0.1:9999/user',{headers:{Authorization:'Bearer '+data.access_token,apikey:anonKey}});httpStatus=user.status;if(!user.ok)throw Error('ordinary user HTTP mismatch');at('USER_'+actor+'_ID');if((await user.json()).id!==a.userId)throw Error('ordinary user mismatch');return data.access_token;};
let report,primaryFailure;
try{
for(let index=0;index<input.accounts.length;index++)await login(input.accounts[index],index);
at('PHYSICAL_INVENTORY');const physical=walk('/mnt');const expected=input.objects.map(o=>'/mnt/stub/stub/'+o.bucket+'/'+o.objectKey+'/'+o.storageVersion);if(physical.length!==2||physical.some(p=>!expected.includes(p)))throw Error('unexpected physical object');
const reports=[];
for(const o of input.objects){const pathname='/object/authenticated/'+o.bucket+'/'+o.objectKey.split('/').map(encodeURIComponent).join('/');
at('SERVICE_DOWNLOAD');const privileged=await fetch('http://127.0.0.1:5000'+pathname,{headers:{Authorization:'Bearer '+serviceKey}});httpStatus=privileged.status;if(privileged.status!==200)throw Error('private recovery download failed');at('SERVICE_BYTES');const bytes=Buffer.from(await privileged.arrayBuffer());if(bytes.length!==o.byteLength||sha(bytes)!==o.sha256)throw Error('private recovery bytes mismatch');
const denied=[];for(const [index,token] of [...tokens,null].entries()){at(['DENY_A','DENY_B','DENY_ANON'][index]);const response=await fetch('http://127.0.0.1:5000'+pathname,{headers:token?{Authorization:'Bearer '+token}:{}});httpStatus=response.status;if(![400,401,403,404].includes(response.status))throw Error('archived object unexpectedly readable');denied.push(response.status);await response.arrayBuffer();}
at('PHYSICAL_HASH');const physicalBytes=fs.readFileSync('/mnt/stub/stub/'+o.bucket+'/'+o.objectKey+'/'+o.storageVersion);if(sha(physicalBytes)!==o.sha256)throw Error('physical mismatch');
reports.push({versionId:o.versionId,storageVersion:o.storageVersion,byteLength:bytes.length,sha256:sha(bytes),privateServiceDownload:200,ordinaryA:denied[0],ordinaryB:denied[1],anonymous:denied[2]});}
report={verified:2,ordinaryRecoveredAuthActors:input.accounts.map(a=>({label:a.label,userId:a.userId})),onlyExpectedPhysicalObjects:true,objects:reports,archivedStatesPreserved:true};
}catch{primaryFailure={code:stage,...(Number.isInteger(httpStatus)?{httpStatus}:{})};}
finally{for(const token of tokens){try{at('LOGOUT_HTTP');const response=await fetch('http://127.0.0.1:9999/logout?scope=local',{method:'POST',headers:{Authorization:'Bearer '+token,apikey:anonKey}});httpStatus=response.status;if(!response.ok)throw Error('isolated logout unconfirmed');}catch{primaryFailure??={code:stage,...(Number.isInteger(httpStatus)?{httpStatus}:{})};}}}
if(primaryFailure){console.error(JSON.stringify({recoveryDiagnostic:primaryFailure}));process.exitCode=1;return;}
at('WORKER_OUTPUT');console.log(JSON.stringify(report));
})().catch(()=>{console.error(JSON.stringify({recoveryDiagnostic:{code:stage,...(Number.isInteger(httpStatus)?{httpStatus}:{})}}));process.exitCode=1;});
`;
async function main() {
  assert.equal(process.cwd().replaceAll('\\', '/'), root, 'Only authorized Desktop checkout allowed');
  assert.equal(process.env.ABA_QA_CLEANUP_RECOVER_V5, '1', 'Explicit isolated recovery opt-in required');
  const [mode, confirm] = process.argv.slice(2);
  assert.ok(['plan', 'populate', 'verify'].includes(mode), 'Usage: plan|populate|verify [exact populate confirmation]');
  const locator = JSON.parse(readFileSync(path.join(root, '.aba.local/qa/attachment-cleanup-v5-recovery-target.json'), 'utf8'));
  assert.equal(locator.previewId, previewId); assert.match(locator.targetProject, /^aba-restore-[0-9a-f]{8}$/);
  assert.ok(uuid(locator.backupId)); assert.equal(locator.targetProject, 'aba-restore-' + locator.backupId.slice(0, 8));
  assert.equal(locator.db, 'supabase_db_' + locator.targetProject); assert.equal(locator.storageVolume, 'supabase_storage_' + locator.targetProject);
  const plan = JSON.parse(readFileSync(path.join(directory, 'preview.json'), 'utf8'));
  const backup = JSON.parse(readFileSync(path.join(directory, 'backup.json'), 'utf8'));
  assert.equal(plan.previewId, previewId); assert.equal(backup.previewHash, plan.previewHash);
  assert.equal(backup.metadataSha256, locator.sourceDumpSha256);
  assert.equal(sha(readFileSync(path.join(directory, 'metadata.dump'))), backup.metadataSha256);
  assert.equal(plan.candidates.length, 2); assert.equal(plan.excluded.length, 0);
  assert.deepEqual(plan.candidates.map(row => row.versionId).sort(), expectedVersions);
  for (const candidate of plan.candidates) {
    assert.equal(candidate.bucket, 'clinical-attachments'); assert.equal(candidate.purpose, 'student-document');
    assert.equal(candidate.recordState, 'archived'); assert.equal(candidate.versionState, 'archived');
    assert.match(candidate.objectKey, /^clinic\/[0-9a-f-]{36}\/student\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.png$/);
    const saved = backup.objects.find(row => row.versionId === candidate.versionId);
    assert.ok(saved); assert.equal(saved.byteLength, candidate.byteLength); assert.equal(saved.sha256, candidate.sha256);
    const bytes = readFileSync(path.join(directory, candidate.versionId + '.bin'));
    assert.equal(bytes.length, 68); assert.equal(sha(bytes), candidate.sha256);
  }
  hostStage = 'HOST_DB_GUARDS';
  const db = inspect(locator.db); noPorts(db);
  assert.equal(db.Name, '/' + locator.db); assert.equal(db.State.Running, true);
  assert.equal(db.Config.Labels['com.supabase.cli.project'], locator.targetProject); assert.equal(db.HostConfig.NetworkMode, 'none');
  assert.equal(db.Mounts.length, 1); assert.equal(db.Mounts[0].Type, 'volume'); assert.equal(db.Mounts[0].Name, locator.db); assert.equal(db.Mounts[0].Destination, '/var/lib/postgresql/data');
  hostStage = 'HOST_VOLUME_GUARDS';
  const volume = inspect(locator.storageVolume, 'volume');
  assert.equal(volume.Name, locator.storageVolume); assert.equal(volume.Labels['com.supabase.cli.project'], locator.targetProject);
  const clauses = plan.candidates.map(o => `(s.bucket_id=${literal(o.bucket)} and s.name=${literal(o.objectKey)})`).join(' or ');
  // Read only restored DB. version is Storage's UUID, not attachment versionId.
  const sql = `select coalesce(json_agg(json_build_object('versionId',v.id,'attachmentId',v.attachment_id,'storageVersion',s.version,'storageObjectId',s.id,'bucket',v.bucket_id,'objectKey',v.object_key,'byteLength',v.byte_length,'sha256',v.sha256,'versionState',v.state,'recordState',r.state,'clinicId',r.organization_id,'batchId',r.test_run_id,'purpose',r.purpose) order by v.id),'[]'::json) from public.attachment_versions v join public.attachment_records r on r.id=v.attachment_id join storage.objects s on s.bucket_id=v.bucket_id and s.name=v.object_key where ${clauses}`;
  hostStage = 'HOST_RESTORED_METADATA';
  const restored = JSON.parse(run(['exec', locator.db, 'psql', '-U', 'supabase_admin', '-d', 'postgres', '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', sql]));
  assert.equal(restored.length, 2);
  for (const o of restored) {
    const candidate = plan.candidates.find(row => row.versionId === o.versionId); assert.ok(candidate);
    for (const field of ['bucket', 'objectKey', 'byteLength', 'sha256', 'attachmentId', 'clinicId', 'batchId', 'purpose']) assert.equal(o[field], candidate[field], 'Restored metadata differs from exact backup');
    assert.equal(o.versionState, 'archived'); assert.equal(o.recordState, 'archived'); assert.ok(uuid(o.storageVersion));
  }
  const required = `RECOVER ISOLATED ${locator.targetProject} ${previewId}`;
  if (mode === 'plan') { console.log(JSON.stringify({ mode, previewId, targetProject: locator.targetProject, objects: 2, metadataHash: sha(JSON.stringify(restored)), requiredConfirmation: required, ordinaryDownloadExpectation: 'A/B/anonymous DENY because archived', uploadWouldConflict: true })); return; }
  let report;
  if (mode === 'populate') {
    assert.equal(confirm, required, 'Exact isolated recovery confirmation required');
    const names = run(['ps', '--format', '{{.Names}}']).split(/\r?\n/);
    for (const name of names.filter(Boolean)) {
      const active = inspect(name);
      assert.ok(!active.Mounts.some(mount => mount.Name === locator.storageVolume), 'Target Storage volume must have no running writer during population');
    }
    const immutableImage = run(['image', 'inspect', image, '--format', '{{.Id}}']); assert.match(immutableImage, /^sha256:[0-9a-f]{64}$/);
    report = JSON.parse(run(['run', '-i', '--rm', '--network', 'none', '--label', 'com.supabase.cli.project=' + locator.targetProject,
      '--mount', `type=bind,source=${directory},target=/from,readonly`, '--mount', `type=volume,source=${locator.storageVolume},target=/mnt`,
      '--entrypoint', 'node', immutableImage, '-e', copyWorker], JSON.stringify({ objects: restored })));
  } else {
    hostStage = 'HOST_SERVICE_GUARDS';
    const storageName = 'supabase_storage_' + locator.targetProject + '-recovered';
    const authName = 'supabase_auth_' + locator.targetProject + '-recovered';
    for (const [name, expectedImage] of [[storageName, image], [authName, 'public.ecr.aws/supabase/gotrue:v2.196.0']]) {
      const service = inspect(name); noPorts(service); assert.equal(service.State.Running, true); assert.equal(service.Config.Image, expectedImage);
      assert.equal(service.Config.Labels['com.supabase.cli.project'], locator.targetProject);
      assert.ok([`container:${locator.db}`, `container:${db.Id}`].includes(service.HostConfig.NetworkMode), 'Service must share exact network-none DB namespace');
      if (name === storageName) { assert.equal(service.Mounts.length, 1); assert.equal(service.Mounts[0].Name, locator.storageVolume); assert.equal(service.Mounts[0].Destination, '/mnt'); }
    }
    hostStage = 'HOST_MANIFEST_GUARDS';
    const manifest = JSON.parse(readFileSync(path.join(root, '.aba.local/batches', plan.batchId + '.json'), 'utf8'));
    assert.equal(manifest.state, 'ready'); assert.equal(manifest.batchId, plan.batchId);
    const accounts = ['admin-a', 'admin-b'].map(label => { const account = manifest.accounts.find(row => row.label === label); assert.ok(account && account.email === `${label}.${plan.batchId}@aba.example.test`); return { label, userId: account.userId, email: account.email, password: account.password }; });
    assert.equal(accounts[0].userId, plan.actorId);
    hostStage = 'HOST_MEMBERSHIP_GUARDS';
    const membershipSql = `select count(*) from public.memberships where status='active' and role='admin' and ((user_id=${literal(accounts[0].userId)}::uuid and organization_id=${literal(manifest.clinics.A)}::uuid) or (user_id=${literal(accounts[1].userId)}::uuid and organization_id=${literal(manifest.clinics.B)}::uuid))`;
    assert.equal(run(['exec', locator.db, 'psql', '-U', 'supabase_admin', '-d', 'postgres', '-X', '-A', '-t', '-c', membershipSql]), '2');
    hostStage = 'HOST_VERIFY_WORKER';
    report = JSON.parse(run(['exec', '-i', storageName, 'node', '-e', verifyWorker], JSON.stringify({ batchId: plan.batchId, objects: restored, accounts })));
  }
  hostStage = 'HOST_EVIDENCE_WRITE';
  const evidence = { previewId, targetProject: locator.targetProject, mode, dumpSha256: backup.metadataSha256, metadataHash: sha(JSON.stringify(restored)), report,
    limitations: ['Archived metadata remains archived; ordinary A download cannot be allowed.', 'Only two candidate blobs recovered; other restored Storage metadata has no bytes in this selective target.', 'Auth identity verified through ordinary recovered /user; membership is a separate restored DB read, not a new application API.'] };
  const evidencePath = path.join(root, '.aba.local/qa', `attachment-cleanup-v5-recovery-${mode}-${randomUUID()}.json`);
  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2), { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ mode, previewId, targetProject: locator.targetProject, objects: 2, passed: true, evidencePath }));
}
main().catch(error => { console.error(JSON.stringify({ failed: true, diagnostic: error.safeDiagnostic ?? { code: hostStage }, targetPreserved: true, rawOutputWithheld: true })); process.exitCode = 1; });

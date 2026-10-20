// Verify the exact already-backed-up synthetic preview. No Storage remove or DB writes.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync,writeFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { digest,validatePreview,inventorySql,exclusionReasons } from '../../scripts/local/attachment-cleanup.mjs';
import { localStatus,state } from '../../scripts/local/write-env.mjs';
assert.equal(process.env.ABA_QA_CLEANUP_REVALIDATE,'1');
assert.equal(process.cwd().replaceAll('\\','/'),'C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
const previewId='796f24cb-235e-4dc8-a3d8-bb6370b0047e';
const expectedHash='e470ec1131caa97fd160dbe7bf2e75b1a161de8d1648e5a9aa10e070f46b130c';
const directory=path.join(state,'attachment-cleanup',previewId);
const plan=validatePreview(JSON.parse(readFileSync(path.join(directory,'preview.json'),'utf8')));
assert.equal(plan.previewHash,expectedHash);assert.equal(plan.candidates.length,2);assert.equal(plan.excluded.length,0);
const backup=JSON.parse(readFileSync(path.join(directory,'backup.json'),'utf8'));
assert.equal(backup.previewHash,expectedHash);
assert.equal(digest(readFileSync(path.join(directory,'metadata.dump'))),backup.metadataSha256);
const status=localStatus();
const manifest=JSON.parse(readFileSync(path.join(state,'batches',`${plan.batchId}.json`),'utf8'));
assert.equal(manifest.state,'ready');assert.equal(manifest.apiUrl,status.API_URL);
const account=manifest.accounts.find(row=>row.label==='admin-a');
assert.equal(account.userId,plan.actorId);assert.equal(account.email,`admin-a.${plan.batchId}@aba.example.test`);
assert.equal(manifest.clinics.A,plan.clinicId);
const auth=createClient(status.API_URL,status.ANON_KEY??status.PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const login=await auth.auth.signInWithPassword({email:account.email,password:account.password});
if(login.error||login.data.user?.id!==plan.actorId||login.data.user.app_metadata.aba_fixture_batch!==plan.batchId)throw new Error('Synthetic Auth not verified');
const docker=path.join(process.env.LOCALAPPDATA,'Programs/DockerDesktop/resources/bin/docker.exe');
const query=sql=>execFileSync(docker,['exec','supabase_db_aba-reintegration-local','psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres','-c',sql],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
try{
 const member=await auth.from('memberships').select('role,status').eq('user_id',plan.actorId).eq('organization_id',plan.clinicId);
 if(member.error)throw new Error('Live admin authorization not verified');
 assert.deepEqual(member.data,[{role:'admin',status:'active'}]);
 const objects=JSON.parse(query(inventorySql(plan)));
 assert.equal(objects.length,2);
 const storage=createClient(status.API_URL,status.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 for(const expected of plan.candidates){
  const current=objects.find(row=>row.versionId===expected.versionId);
  assert.equal(digest(current),digest(expected));assert.deepEqual(exclusionReasons(current,plan),[]);
  const saved=backup.objects.find(row=>row.versionId===expected.versionId);
  assert.equal(saved.byteLength,68);assert.equal(saved.sha256,expected.sha256);
  assert.equal(digest(readFileSync(path.join(directory,`${expected.versionId}.bin`))),saved.sha256);
  const result=await storage.storage.from(expected.bucket).download(expected.objectKey);
  if(result.error||!result.data)throw new Error('Synthetic Storage bytes not verified');
  const bytes=Buffer.from(await result.data.arrayBuffer());assert.equal(bytes.length,68);assert.equal(digest(bytes),expected.sha256);
 }
 const summary={verifiedAt:new Date().toISOString(),previewId,previewHash:expectedHash,candidates:2,references:0,bytesEach:68,backupVerified:true,liveAdminVerified:true,deleted:false};
 writeFileSync(path.join(state,'qa/attachment-cleanup-v5-revalidation.json'),JSON.stringify(summary,null,2)+'\n');
 console.log(JSON.stringify(summary));
}finally{const result=await auth.auth.signOut({scope:'local'});if(result.error)throw new Error('Synthetic session logout not verified');}
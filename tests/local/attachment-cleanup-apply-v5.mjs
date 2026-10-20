import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { main, digest, validatePreview, confirmationFor, inventorySql } from '../../scripts/local/attachment-cleanup.mjs';
import { localStatus, state } from '../../scripts/local/write-env.mjs';
const previewId='796f24cb-235e-4dc8-a3d8-bb6370b0047e';
const approvedHash='e470ec1131caa97fd160dbe7bf2e75b1a161de8d1648e5a9aa10e070f46b130c';
assert.equal(process.env.ABA_QA_APPROVED_CLEANUP_HASH,approvedHash,'Specific human approval required');
assert.equal(process.cwd().replaceAll('\\','/'),'C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
const directory=path.join(state,'attachment-cleanup',previewId);
const plan=validatePreview(JSON.parse(readFileSync(path.join(directory,'preview.json'),'utf8')));
assert.equal(plan.previewHash,approvedHash); assert.equal(plan.candidates.length,2);
const journal=path.join(directory,'receipts.jsonl');
if(existsSync(journal)&&readFileSync(journal,'utf8').trim())throw new Error('Existing cleanup attempt: reconcile it, do not rerun first-attempt fault injection');
const status=localStatus(),manifest=JSON.parse(readFileSync(path.join(state,'batches',`${plan.batchId}.json`),'utf8'));
assert.equal(manifest.state,'ready');assert.equal(manifest.apiUrl,status.API_URL);
const account=manifest.accounts.find(row=>row.label==='admin-a');assert.equal(account.userId,plan.actorId);assert.equal(account.email,`admin-a.${plan.batchId}@aba.example.test`);
const auth=createClient(status.API_URL,status.ANON_KEY??status.PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const login=await auth.auth.signInWithPassword({email:account.email,password:account.password});
if(login.error||login.data.user?.id!==plan.actorId||login.data.user.app_metadata.aba_fixture_batch!==plan.batchId)throw new Error('Synthetic operator not verified');
process.env.ABA_CLEANUP_ACCESS_TOKEN=login.data.session.access_token;
const docker=path.join(process.env.LOCALAPPDATA,'Programs/DockerDesktop/resources/bin/docker.exe');
const query=sql=>execFileSync(docker,['exec','supabase_db_aba-reintegration-local','psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres','-c',sql],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const quote=v=>"'"+String(v).replaceAll("'","''")+"'";
const candidates=plan.candidates;
const otherObjectsSql=`select coalesce(jsonb_agg(to_jsonb(s) order by s.id),'[]'::jsonb) from storage.objects s where not (${candidates.map(o=>`(s.bucket_id=${quote(o.bucket)} and s.name=${quote(o.objectKey)})`).join(' or ')});`;
const versionsSql="select coalesce(jsonb_agg(to_jsonb(v) order by v.id),'[]'::jsonb) from public.attachment_versions v;";
const recordsSql="select coalesce(jsonb_agg(to_jsonb(a) order by a.id),'[]'::jsonb) from public.attachment_records a;";
const countPresent=()=>Number(query(`select count(*) from storage.objects s where ${candidates.map(o=>`(s.bucket_id=${quote(o.bucket)} and s.name=${quote(o.objectKey)})`).join(' or ')};`));
const nativeFetch=globalThis.fetch;let deleteCalls=0,forwardedDeletes=0,inject=true;
try{
 assert.equal(digest(JSON.parse(query(inventorySql(plan)))),digest(candidates));assert.equal(countPresent(),2);
 const before={otherObjects:digest(query(otherObjectsSql)),versions:digest(query(versionsSql)),records:digest(query(recordsSql))};
 writeFileSync(path.join(directory,'approval-v5.json'),JSON.stringify({approvedAt:'2026-10-04',source:'Human response in current Codex thread',previewId,previewHash:approvedHash,scope:'Only the two preview PNG objects; receipts/retry/isolated recovery'},null,2)+'\n',{flag:'wx'});
 globalThis.fetch=async(url,options)=>{
  if(options?.method?.toUpperCase()==='DELETE'){
   const target=new URL(String(url));const payload=JSON.parse(options.body);
   assert.equal(target.origin,status.API_URL);assert.equal(payload.prefixes.length,1);
   const object=candidates.find(o=>o.objectKey===payload.prefixes[0]&&target.pathname===`/storage/v1/object/${o.bucket}`);
   assert.ok(object,'DELETE outside approved exact preview refused');deleteCalls++;
   if(inject&&deleteCalls===2)return new Response(JSON.stringify({statusCode:'503',error:'QA local injected failure',message:'Second approved object retained for retry'}),{status:503,headers:{'Content-Type':'application/json'}});
   forwardedDeletes++;
  }
  return nativeFetch(url,options);
 };
 await main(['apply',previewId,confirmationFor(plan)]);
 assert.equal(process.exitCode,1);assert.equal(deleteCalls,2);assert.equal(forwardedDeletes,1);assert.equal(countPresent(),1);
 const partial=readFileSync(journal,'utf8').trim().split('\n').map(JSON.parse);
 assert.equal(partial.filter(r=>r.outcome==='removed').length,1);assert.equal(partial.filter(r=>r.outcome==='failed-or-unknown').length,1);
 inject=false;process.exitCode=0;
 await main(['apply',previewId,confirmationFor(plan)]);
 assert.equal(process.exitCode,0);assert.equal(countPresent(),0);assert.equal(forwardedDeletes,2);
 const callsBeforeReplay=deleteCalls;await main(['apply',previewId,confirmationFor(plan)]);assert.equal(deleteCalls,callsBeforeReplay);
 const receipts=readFileSync(journal,'utf8').trim().split('\n').map(JSON.parse);
 for(const object of candidates)assert.equal(receipts.filter(r=>r.versionId===object.versionId&&r.outcome==='removed').length,1);
 assert.equal(digest(query(otherObjectsSql)),before.otherObjects);assert.equal(digest(query(versionsSql)),before.versions);assert.equal(digest(query(recordsSql)),before.records);
 const result={executedAt:new Date().toISOString(),previewId,previewHash:approvedHash,approved:true,candidates:2,firstAttempt:{complete:false,removed:1,retained:1,injectedFailure:true},retry:{complete:true,totalRemoved:2},replay:{complete:true,additionalDeletes:0},confirmedRemovalReceipts:2,metadataUnchanged:true,otherStorageObjectsUnchanged:true,recoveryPending:true};
 writeFileSync(path.join(state,'qa/attachment-cleanup-v5-apply.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{
 globalThis.fetch=nativeFetch;delete process.env.ABA_CLEANUP_ACCESS_TOKEN;
 const result=await auth.auth.signOut({scope:'local'});if(result.error)throw new Error('Synthetic operator logout not confirmed');
}
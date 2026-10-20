// Read-only regression of R5 clinic-admin assignment SELECT. No SQL writes.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { localStatus, root, state } from '../../scripts/local/write-env.mjs';
assert.equal(process.env.ABA_QA_ASSIGNMENT_READ_V5, '1');
assert.equal(process.cwd().replaceAll('\\', '/'), 'C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
const batchId='2155e99e-bda4-4c68-95cf-b74cacd84ecd', studentId='bbf1e89c-6b06-4f5c-a62a-1d3fa94122de';
const status=localStatus(), manifest=JSON.parse(readFileSync(path.join(state,'batches',batchId+'.json')));
assert.equal(status.API_URL,'http://127.0.0.1:54321');assert.equal(manifest.batchId,batchId);assert.equal(manifest.state,'ready');assert.equal(manifest.apiUrl,status.API_URL);
const expectedVisible=['admin-b','tecnico-b','supervisor-b'];const results=[];let canonical;
for(const label of ['admin-b','tecnico-b','supervisor-b','admin-a','supervisor-a','tecnico-a','externo','familia','anonymous']) {
 const client=createClient(status.API_URL,status.ANON_KEY??status.PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 try {
  if(label!=='anonymous') {const actor=manifest.accounts.find(a=>a.label===label);assert.equal(actor.email,`${label}.${batchId}@aba.example.test`);const login=await client.auth.signInWithPassword({email:actor.email,password:actor.password});assert.ok(!login.error,'Ordinary synthetic Auth required');assert.equal(login.data.user.id,actor.userId);assert.equal(login.data.user.app_metadata.aba_fixture_batch,batchId);}
  const read=await client.from('student_assignments').select('id,organization_id,client_id,user_id,role,status,is_primary,effective_at,ended_at').eq('client_id',studentId).order('id');
  if(expectedVisible.includes(label)) {assert.ok(!read.error,'Authorized SELECT required');assert.ok(read.data.length>=3,'Active/history rows required');assert.ok(read.data.every(row=>row.organization_id===manifest.clinics.B&&row.client_id===studentId));if(label==='admin-b')canonical=read.data;else assert.deepEqual(read.data,canonical,'Assigned team sees exact rows');}
  else assert.ok(read.error||read.data.length===0,'Unassigned/foreign/anonymous must not receive rows');
  results.push({actor:label,visibleRows:read.data?.length??0,authorized:expectedVisible.includes(label),passed:true});
 } finally {if(label!=='anonymous')await client.auth.signOut({scope:'local'});}
}
const destination=path.join(root,'.aba.local','qa',`assignment-read-v5-${randomUUID()}.json`);writeFileSync(destination,JSON.stringify({batchId,studentId,results,passed:true,readOnly:true},null,2),{flag:'wx'});console.log(JSON.stringify({passed:results.length,failed:0,evidence:destination}));

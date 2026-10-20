import { readFileSync,writeFileSync } from 'node:fs';
import path from 'node:path';
import { localStatus,state } from './write-env.mjs';
const [batch,confirmation='']=process.argv.slice(2);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if(!uuid.test(batch??'')) throw new Error('Batch UUID v4 required');
const status=localStatus();const filename=path.join(state,'batches',`${batch}.json`);
const manifest=JSON.parse(readFileSync(filename,'utf8'));
if(manifest.batchId!==batch || manifest.apiUrl!==status.API_URL) throw new Error('Local batch manifest does not match isolated destination');
const key=status.ANON_KEY??status.PUBLISHABLE_KEY;
const apply=confirmation===`DELETE TEST DATA ${batch}`;
if(confirmation && !apply) throw new Error('Confirmation does not match exact batch; no data deleted');
const summaries=[];
for(const clinic of ['A','B']) {
  const org=manifest.clinics[clinic];const account=manifest.accounts.find(a=>a.label===`admin-${clinic.toLowerCase()}`);
  if(!account || account.email!==`admin-${clinic.toLowerCase()}.${batch}@aba.example.test` || !uuid.test(org??'') || !uuid.test(account.userId??'')) throw new Error('Invalid synthetic administrator manifest');
  const response=await fetch(`${status.API_URL}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email:account.email,password:account.password})});
  const session=await response.json();
  if(!response.ok || session.user?.id!==account.userId || session.user.app_metadata?.aba_fixture_batch!==batch) throw new Error('Batch administrator Auth verification failed');
  try {
    const rpc=async(name,args)=>{
      const result=await fetch(`${status.API_URL}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify(args)});
      const data=await result.json();if(!result.ok) throw new Error(`Batch ${clinic} cleanup command failed (${result.status}); no reset will be attempted`);return data;
    };
    const preview=await rpc('mvp_cleanup_test_run',{p_organization_id:org,p_test_run_id:batch,p_confirm:null});
    if(!apply) {summaries.push({clinic,...preview});continue;}
    await rpc('mvp_freeze_test_batch',{p_organization_id:org,p_test_run_id:batch});
    const result=await rpc('mvp_cleanup_test_run',{p_organization_id:org,p_test_run_id:batch,p_confirm:confirmation});
    if(result.status!=='cleaned') throw new Error('Server did not confirm clinical batch cleanup');
    summaries.push({clinic,...result});
  } finally {
    const logout=await fetch(`${status.API_URL}/auth/v1/logout?scope=local`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${session.access_token}`}});
    if(!logout.ok) throw new Error('Temporary cleanup session could not be revoked; inspect local Auth');
  }
}
if(apply) {manifest.state='clinical-cleaned';writeFileSync(filename,JSON.stringify(manifest,null,2),{mode:0o600});}
console.log(JSON.stringify({batchId:batch,applied:apply,clinical:summaries,retained:['Auth accounts','professional profiles','avatars','command receipts','memberships','clinics','credentials'],note:'Historical clinical cleanup RPC only. A2–A7 batch-specific dependency cleanup is orchestrator-owned; no physical Storage/Auth deletion or reset is performed.'},null,2));

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { localStatus,runCli,state } from './write-env.mjs';
const [batch,role,clinic]=process.argv.slice(2);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if(!uuid.test(batch??'') || !['admin','supervisor','therapist'].includes(role) || !['A','B'].includes(clinic)) throw new Error('Invalid local role transition');
const status=localStatus();
const manifest=JSON.parse(readFileSync(path.join(state,'batches',`${batch}.json`),'utf8'));
if(manifest.batchId!==batch || manifest.state!=='ready' || manifest.apiUrl!==status.API_URL) throw new Error('Only ready local synthetic batch is eligible');
const account=manifest.accounts.find(a=>a.label===manifest.designatedLabel);
const org=manifest.clinics[clinic];
if(!account || manifest.designatedLabel!=='supervisor-a' || account.email!==`supervisor-a.${batch}@aba.example.test` || !uuid.test(account.userId) || !uuid.test(org)) throw new Error('Invalid synthetic identity manifest');
const response=await fetch(`${status.API_URL}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:status.ANON_KEY??status.PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({email:account.email,password:account.password})});
const session=await response.json();
if(!response.ok || session.user?.id!==account.userId || session.user.app_metadata?.aba_fixture_batch!==batch) throw new Error('Real Auth verification failed; membership not modified');
// Operator manifest is validated and every relationship is rechecked in the transaction.
let committed=false;
try {runCli(['db','query','--local',`do $$ declare affected integer; begin
  perform 1 from public.organizations where id='${org}' and status='active' and name='Clínica sintética ${clinic} · ${batch}' and test_run_id='${batch}' for update;
  if not found then raise exception 'synthetic_clinic_not_active'; end if;
  if not exists(select 1 from auth.users where id='${account.userId}' and raw_app_meta_data->>'aba_fixture_batch'='${batch}') then raise exception 'synthetic_identity_required'; end if;
  if not exists(select 1 from public.professional_profiles where user_id='${account.userId}' and test_run_id='${batch}') then raise exception 'synthetic_profile_marker_required'; end if;
  perform 1 from public.test_data_batches where organization_id='${org}' and id='${batch}' and status='open' for share;
  if not found then raise exception 'open_fixture_batch_required'; end if;
  if not exists(select 1 from public.memberships where organization_id='${org}' and user_id<>'${account.userId}' and role='admin' and status='active') then raise exception 'another_admin_required'; end if;
  update public.memberships set role='${role}' where organization_id='${org}' and user_id='${account.userId}' and status='active' and test_run_id='${batch}';
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'exactly_one_active_membership_required'; end if;
  insert into public.clinic_admin_events(organization_id,actor_user_id,subject_user_id,action) values('${org}','${account.userId}','${account.userId}','local_fixture_role:${role}');
end $$;`]);committed=true;
} finally {
  const logout=await fetch(`${status.API_URL}/auth/v1/logout?scope=local`,{method:'POST',headers:{apikey:status.ANON_KEY??status.PUBLISHABLE_KEY,Authorization:`Bearer ${session.access_token}`}});
  if(!logout.ok) throw new Error(committed?'Membership committed, but temporary utility session could not be revoked. Review local Auth before continuing.':'Membership not confirmed; temporary utility session could not be revoked. Review local Auth before retrying.');
}
console.log(`Perfil persistido ${role} para cuenta designada del lote ${batch}, clínica ${clinic}. Recarga o vuelve a iniciar sesión; no es simulador de permisos.`);

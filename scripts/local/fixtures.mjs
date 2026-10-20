import { randomUUID,randomBytes } from 'node:crypto';
import { readFileSync,writeFileSync,mkdirSync,existsSync } from 'node:fs';
import path from 'node:path';
import { localStatus,runCli,state } from './write-env.mjs';
async function prepareBatch() {
const batch=process.argv[2];
if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(batch??'')) throw new Error('Batch must be UUID v4');
const status=localStatus();
const key=status.SERVICE_ROLE_KEY;
if(!key) throw new Error('Local service key unavailable');
mkdirSync(path.join(state,'batches'),{recursive:true});
const filename=path.join(state,'batches',`${batch}.json`);
const templates=[
  ['admin-a','admin','A'],['supervisor-a','supervisor','A'],['tecnico-a','therapist','A'],
  ['externo','external',null],['familia','family',null],
  ['admin-b','admin','B'],['supervisor-b','supervisor','B'],['tecnico-b','therapist','B'],
];
const manifest=existsSync(filename)?JSON.parse(readFileSync(filename,'utf8')):{batchId:batch,apiUrl:status.API_URL,state:'creating',clinics:{A:randomUUID(),B:randomUUID()},accounts:templates.map(([label,role,clinic])=>({label,role,clinic,email:`${label}.${batch}@aba.example.test`,password:`Aa1!${randomBytes(24).toString('base64url')}`,userId:null})),designatedLabel:'supervisor-a'};
if(manifest.batchId!==batch || manifest.apiUrl!==status.API_URL || !['creating','ready'].includes(manifest.state)) throw new Error('Invalid or closed local batch manifest');
const uuid=value=>/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value??'');
if(!uuid(manifest.clinics.A)||!uuid(manifest.clinics.B)||manifest.clinics.A===manifest.clinics.B||manifest.accounts.length!==templates.length||manifest.designatedLabel!=='supervisor-a')throw new Error('Invalid immutable fixture manifest');
for(const [label,role,clinic] of templates) {const account=manifest.accounts.find(a=>a.label===label);if(!account||account.role!==role||account.clinic!==clinic||account.email!==`${label}.${batch}@aba.example.test`||account.userId!==null&&!uuid(account.userId))throw new Error('Fixture identity manifest changed');}
const persist=()=>writeFileSync(filename,JSON.stringify(manifest,null,2),{mode:0o600});
persist();
async function authRequest(url,method,body) {
  const response=await fetch(`${status.API_URL}/auth/v1/${url}`,{method,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  const data=await response.json();
  if(!response.ok) throw new Error(`Local Auth operation failed (${response.status}); credentials preserved, rerun the same batch. No secrets logged.`);
  return data;
}
for(const account of manifest.accounts) {
  if(account.userId) {
    const saved=await authRequest(`admin/users/${account.userId}`,'GET');
    const user=saved.user??saved;
    if(user.email!==account.email || user.app_metadata?.aba_fixture_batch!==batch || user.app_metadata?.aba_fixture_kind!==account.role) throw new Error('Stored synthetic user does not match batch');
    continue;
  }
  // Recover an ambiguous create without changing a password or touching unrelated users.
  let existing;
  for(let page=1;page<=100;page++) {
    const listing=await authRequest(`admin/users?page=${page}&per_page=100`,'GET');
    existing=listing.users?.find(user=>user.email===account.email);
    if(existing || (listing.users??[]).length<100) break;
    if(page===100) throw new Error('User inventory too large; explicit operator review required');
  }
  const user=existing??await authRequest('admin/users','POST',{email:account.email,password:account.password,email_confirm:true,app_metadata:{aba_fixture_batch:batch,aba_fixture_kind:account.role}});
  if((user.user??user).app_metadata?.aba_fixture_batch!==batch || (user.user??user).app_metadata?.aba_fixture_kind!==account.role) throw new Error('Email collision outside synthetic batch');
  account.userId=(user.user??user).id;if(!uuid(account.userId))throw new Error('Auth returned invalid user identity');persist();
}
const quote=value=>`'${String(value).replaceAll("'","''")}'`;
const values=[];
const guards=[];
for(const [label,id] of Object.entries(manifest.clinics)) {
  const admin=manifest.accounts.find(a=>a.label===`admin-${label.toLowerCase()}`);
  values.push(`insert into public.organizations(id,name,status,test_run_id) values(${quote(id)},${quote(`Clínica sintética ${label} · ${batch}`)},'active',${quote(batch)}) on conflict(id) do nothing;`);
  values.push(`insert into public.test_data_batches(organization_id,id,status,source,created_by) values(${quote(id)},${quote(batch)},'open','manual',${quote(admin.userId)}) on conflict(organization_id,id) do nothing;`);
  values.push(`perform 1 from public.test_data_batches where organization_id=${quote(id)} and id=${quote(batch)} and status='open' and source='manual' and created_by=${quote(admin.userId)} for share; if not found then raise exception 'fixture_batch_closed_or_diverged'; end if;`);
  guards.push(`if not exists(select 1 from public.organizations where id=${quote(id)} and name=${quote(`Clínica sintética ${label} · ${batch}`)} and status='active' and test_run_id=${quote(batch)}) then raise exception 'fixture_organization_diverged'; end if;`);
}
for(const account of manifest.accounts) {
  values.push(`insert into public.professional_profiles(user_id,name,profession,title,description,phone,avatar_preset,test_run_id) values(${quote(account.userId)},${quote(`Persona sintética ${account.label}`)},${quote(['external','family'].includes(account.role)?'':'Profesional ABA de demostración')},${quote(account.role)},'Datos sintéticos locales, no clínicos','','blue',${quote(batch)}) on conflict(user_id) do nothing;`);
  guards.push(`if not exists(select 1 from public.professional_profiles where user_id=${quote(account.userId)} and test_run_id=${quote(batch)} and name=${quote(`Persona sintética ${account.label}`)}) then raise exception 'fixture_profile_diverged'; end if;`);
  if(account.clinic) {
    const clinic=manifest.clinics[account.clinic];
    values.push(`insert into public.memberships(organization_id,user_id,role,status,test_run_id) values(${quote(clinic)},${quote(account.userId)},${quote(account.role)},'active',${quote(batch)}) on conflict(organization_id,user_id) do nothing;`);
    guards.push(`if not exists(select 1 from public.memberships where organization_id=${quote(clinic)} and user_id=${quote(account.userId)} and role=${quote(account.role)} and status='active' and test_run_id=${quote(batch)}) then raise exception 'fixture_membership_diverged'; end if;`);
  }
  else {guards.push(`if exists(select 1 from public.memberships where user_id=${quote(account.userId)}) then raise exception 'external_family_general_membership_forbidden'; end if;`);}
}
// The designated real Auth identity can select both clinics, but never gets external/family access from metadata.
const designated=manifest.accounts.find(a=>a.label===manifest.designatedLabel);
values.push(`insert into public.memberships(organization_id,user_id,role,status,test_run_id) values(${quote(manifest.clinics.B)},${quote(designated.userId)},'supervisor','active',${quote(batch)}) on conflict(organization_id,user_id) do nothing;`);
guards.push(`if not exists(select 1 from public.memberships where organization_id=${quote(manifest.clinics.B)} and user_id=${quote(designated.userId)} and role='supervisor' and status='active' and test_run_id=${quote(batch)}) then raise exception 'designated_membership_diverged'; end if;`);
// One statement: CLI query uses prepared protocol; the DO command is atomic.
runCli(['db','query','--local',`do $aba_fixture$ begin ${values.join('\n')} ${guards.join('\n')} end $aba_fixture$;`]);
manifest.state='ready'; persist();
console.log(`Lote ${batch} preparado: 2 clínicas y 8 identidades Auth, incluidos externo y familia sin membresía. Credenciales en .aba.local/batches/${batch}.json (ignorado por Git).`);
}
prepareBatch().catch(problem=>{const safe=['multiple-statements','syntax-error','check-violation','foreign-key-violation','permission-denied','missing-schema','connection-or-runtime','cli-failed'].includes(problem?.safeCode)?problem.safeCode:'local-operation-failed';console.error(`Preparación del lote no confirmada (${safe}). Manifiesto/cuentas parciales conservados para recuperar el mismo lote. No se publica stderr/stdout ni claves; no ejecutar reset o reabrir un lote cerrado.`);process.exitCode=1;});

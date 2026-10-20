import {test,expect} from '@playwright/test';
import {readFileSync,writeFileSync,renameSync,existsSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {createClient} from '@supabase/supabase-js';
import {localStatus,state} from '../../scripts/local/write-env.mjs';
const batchId='2155e99e-bda4-4c68-95cf-b74cacd84ecd',baseURL='http://localhost:3002',worker='aba-r5-invite-worker-v5';
const casePath=path.join(state,'qa','invite-worker-v5.private.json'),signalPath=path.join(state,'qa','invite-worker-wire-v5.safe.json');
const save=value=>{const temp=casePath+'.'+randomUUID()+'.tmp';writeFileSync(temp,JSON.stringify(value),{flag:'wx',mode:0o600});renameSync(temp,casePath);};
function docker(action){const r=spawnSync('docker',['container',action,worker],{encoding:'utf8',timeout:20000});if(r.status!==0)throw Error('Own Docker worker operation not confirmed');}
async function rpc(db,name,args){const r=await db.rpc(name,args);if(r.error)throw Error('Ordinary QA RPC not confirmed: '+name);return r.data;}
test.skip(process.env.ABA_QA_INVITE_WORKER_V5!=='1','Explicit local worker fault QA');
test('QA-002/013 worker real: claim, expiry unknown, resolutions, replay and permissions',async({page,request},info)=>{
 test.setTimeout(340000);expect(process.cwd().replaceAll('\\','/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
 const status=localStatus();expect(status.API_URL).toBe('http://127.0.0.1:54321');const m=JSON.parse(readFileSync(path.join(state,'batches',batchId+'.json')));expect(m.batchId).toBe(batchId);const clinicId=m.clinics.B;
 const clients=[];const auth=async label=>{const a=m.accounts.find(row=>row.label===label),db=createClient(status.API_URL,status.ANON_KEY??status.PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});const r=await db.auth.signInWithPassword({email:a.email,password:a.password});if(r.error||r.data.user?.id!==a.userId)throw Error('Fixture login not confirmed');clients.push(db);return db;};
 const db=await auth('admin-b'),foreign=await auth('admin-a'),tech=await auth('tecnico-b'),admin=m.accounts.find(row=>row.label==='admin-b');
 let own=existsSync(casePath)?JSON.parse(readFileSync(casePath)): {schemaVersion:1,batchId,clinicId,email:'qa-r5-worker-'+randomUUID()+'@aba.example.test',armed:false};
 expect(own).toMatchObject({schemaVersion:1,batchId,clinicId});save({...own,armed:false});let stage='login';const proofs=[];
 const rows=()=>rpc(db,'aba_team_invitation_deliveries',{p_org:clinicId});
 const current=async()=>{const r=(await rows()).find(r=>r.invitationId===own.invitationId);if(!r)throw Error('Own invitation not visible');return r;};
 const mail=async()=>{const r=await request.get('http://127.0.0.1:54324/api/v1/search?query='+encodeURIComponent('to:'+own.email)+'&start=0&limit=1000');if(r.status()!==200)throw Error('Mailpit unavailable');const d=await r.json();return d.messages.filter(r=>r.To?.some(to=>to.Address===own.email)).map(r=>r.ID).sort();};
 const card=()=>page.locator('.mantine-Card-root').filter({has:page.getByText(own.email,{exact:true})}).filter({has:page.getByRole('button',{name:'Solicitar reenvío explícito',exact:true})});
 const query=signal=>rpc(db,'aba_team_invitation_delivery_status',{p_org:clinicId,p_invite:own.invitationId,p_operation:signal.operationId,p_key:signal.idempotencyKey});
 try {
 await page.goto('/login');await page.getByRole('textbox',{name:'Email',exact:true}).fill(admin.email);await page.getByRole('textbox',{name:'Contraseña',exact:true}).fill(admin.password);await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await expect(page).toHaveURL(baseURL+'/dashboard');await page.goto('/team');
 if(!own.invitationId){stage='create-own-invitation';await page.getByRole('button',{name:'Invitar miembro',exact:true}).click();const modal=page.getByRole('dialog',{name:'Invitar miembro',exact:true});await modal.getByRole('textbox',{name:'Email',exact:true}).fill(own.email);await modal.getByRole('button',{name:'Enviar invitación',exact:true}).click();await expect(modal).toHaveCount(0);const r=(await rows()).filter(r=>r.email===own.email);expect(r).toHaveLength(1);own={...own,invitationId:r[0].invitationId,userId:r[0].userId};save(own);await expect.poll(async()=> (await mail()).length).toBe(1);}
 expect(await current()).toMatchObject({accepted:false,eligible:true});
 for(const decision of ['observed-sent','allow-new-request']){
 stage='arm-'+decision;docker('start');own={...own,armed:true,armId:randomUUID()};save(own);await page.reload();await expect(card()).toHaveCount(1);const beforeMail=await mail();
 page.once('dialog',d=>d.accept());await card().getByRole('button',{name:'Solicitar reenvío explícito',exact:true}).click();
 let signal;await expect.poll(()=>{try{signal=JSON.parse(readFileSync(signalPath));return signal.armId===own.armId&&signal.authResponseWithheld;}catch{return false;}},{timeout:12000,intervals:[100,200,300]}).toBe(true);
 stage='kill-own-worker-'+decision;docker('kill');save({...own,armed:false});await expect.poll(async()=> (await mail()).length).toBe(beforeMail.length+1);const claimed=await query(signal);expect(claimed).toMatchObject({state:'claimed',operationId:signal.operationId,idempotencyKey:signal.idempotencyKey});
 await expect(card().getByRole('button',{name:'Consultar mi operación',exact:true})).toBeVisible();await card().getByRole('button',{name:'Consultar mi operación',exact:true}).click();await expect(card().getByText('Procesando; no repetir el envío',{exact:true})).toBeVisible();await expect(card().getByRole('button',{name:'Solicitar reenvío explícito',exact:true})).toBeDisabled();
 const body={organizationId:clinicId,invitationId:own.invitationId,operationId:signal.operationId,idempotencyKey:signal.idempotencyKey};
 const replay=await db.functions.invoke('resend-clinic-invitation',{body});if(replay.error)throw Error('Claimed replay not confirmed');expect(replay.data.delivery).toEqual(claimed);expect(await mail()).toHaveLength(beforeMail.length+1);
 const another=await db.functions.invoke('resend-clinic-invitation',{body:{...body,operationId:randomUUID(),idempotencyKey:randomUUID()}});expect(!!another.error).toBe(true);
 stage='real-expiry-'+decision;const waitUntil=Date.parse(claimed.expiresAt)+300;while(Date.now()<waitUntil)await page.waitForTimeout(Math.min(1000,waitUntil-Date.now()));const unknown=await query(signal);expect(unknown).toMatchObject({state:'unknown',errorCode:'claim-expired',version:claimed.version+1});
 const resolution={p_org:clinicId,p_delivery:unknown.deliveryId,p_expected_version:unknown.version,p_decision:decision,p_evidence_ack:true};
 for(const [client,args] of [[foreign,resolution],[tech,resolution],[db,{...resolution,p_evidence_ack:false}],[db,{...resolution,p_expected_version:unknown.version-1}]]){const denied=await client.rpc('aba_resolve_team_invitation_delivery',args);expect(!!denied.error).toBe(true);expect(await query(signal)).toEqual(unknown);}
 const deniedNew=await db.functions.invoke('resend-clinic-invitation',{body:{...body,operationId:randomUUID(),idempotencyKey:randomUUID()}});expect(!!deniedNew.error).toBe(true);expect(await mail()).toHaveLength(beforeMail.length+1);
 stage='resolve-ui-'+decision;await page.reload();const label=decision==='observed-sent'?'Comprobé el correo en Mailpit':'Autorizar otra petición: posible duplicado';await expect(card().getByRole('button',{name:label,exact:true})).toBeVisible();page.once('dialog',d=>d.accept());await card().getByRole('button',{name:label,exact:true}).click();await expect.poll(async()=> (await query(signal)).state).toBe(decision==='observed-sent'?'sent':'failed');const resolved=await query(signal);expect(resolved).toMatchObject({version:unknown.version+1,errorCode:decision==='observed-sent'?'operator-observed-mailpit':'operator-authorized-possible-duplicate',confirmationSource:decision==='observed-sent'?'operator-mailpit':null});expect(await mail()).toHaveLength(beforeMail.length+1);await page.reload();await expect(card().getByRole('button',{name:'Solicitar reenvío explícito',exact:true})).toBeEnabled();
 const finalReplay=await db.functions.invoke('resend-clinic-invitation',{body});if(finalReplay.error)throw Error('Resolved replay not confirmed');expect(finalReplay.data.delivery).toEqual(resolved);expect(await mail()).toHaveLength(beforeMail.length+1);
 proofs.push({decision,deliveryId:resolved.deliveryId,operationId:signal.operationId,idempotencyKey:signal.idempotencyKey,versions:[claimed.version,unknown.version,resolved.version],mailBefore:beforeMail.length,mailAfter:beforeMail.length+1,workerKilledAfterRealAuthSuccess:true,claimExpiredNaturally:true,uiRecovery:true,negatives:4,replaysNoExtraMail:true});
 }
 const proof={passed:true,batchId,invitationId:own.invitationId,userId:own.userId,accepted:false,origin:baseURL,proofs,sharedServicesUnchanged:true};writeFileSync(path.join(state,'qa','invite-worker-v5-safe-20261005.json'),JSON.stringify(proof,null,2));
 }catch(error){writeFileSync(path.join(state,'qa','invite-worker-v5-stage.json'),JSON.stringify({passed:false,stage,invitationId:own.invitationId??null,errorType:error.name,sourceLines:(error.stack??'').split('\n').filter(line=>line.includes('r5.invite-worker-v5.spec.mjs:')).map(line=>line.match(/:(\d+):(\d+)/)?.[0])}));throw Error('Worker QA not confirmed at '+stage+'; private details withheld');}
 finally{save({...own,armed:false});for(const client of clients)await client.auth.signOut({scope:'local'});await page.goto('about:blank').catch(()=>{});}
});
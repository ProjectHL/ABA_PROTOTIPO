import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { randomBytes, randomUUID } from 'node:crypto';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { test, expect } from '@playwright/test';
import { localStatus, state } from '../../scripts/local/write-env.mjs';
const batchId='2155e99e-bda4-4c68-95cf-b74cacd84ecd', baseURL='http://localhost:3000';
test.skip(process.env.ABA_QA_LOCAL_UI!=='1'||process.env.ABA_QA_INVITE_EMAIL_V5_UI!=='1','Invitacion/correo V5 local sintetico explicito');
test.use({baseURL,trace:'off',video:'off',screenshot:'off'});
function save(destination, value) { const temporary=destination+'.'+randomUUID()+'.tmp';writeFileSync(temporary,JSON.stringify(value),{flag:'wx',mode:0o600});renameSync(temporary,destination); }
function client(status) {return createClient(status.API_URL,status.ANON_KEY??status.PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});}
async function mail(request,email) { const response=await request.get(`http://127.0.0.1:54324/api/v1/search?query=${encodeURIComponent('to:'+email)}&start=0&limit=1000`);if(response.status()!==200)throw new Error('Mailpit no disponible');const data=await response.json();if(!Array.isArray(data.messages))throw new Error('Mailpit contrato no confirmado');return data.messages.filter(row=>row.To?.some(to=>to.Address===email)).sort((a,b)=>Date.parse(b.Created)-Date.parse(a.Created)); }
async function links(request,message,type) {const response=await request.get(`http://127.0.0.1:54324/api/v1/message/${message.ID}`);if(response.status()!==200)throw new Error('Correo propio no disponible');const detail=await response.json();const raw=(detail.HTML??'')+'\n'+(detail.Text??'');const candidates=[...raw.replaceAll('&amp;','&').matchAll(/https?:\/\/[^\s"'<>]+/g)].map(row=>row[0]);return [...new Set(candidates)].filter(raw=>{try{const u=new URL(raw);return ((u.origin===baseURL&&u.pathname==='/auth/confirm')||(u.origin==='http://127.0.0.1:54321'&&u.pathname==='/auth/v1/verify'))&&u.searchParams.get('type')===type;}catch{return false;}});}
async function login(page,email,password) {await page.goto('/login');await page.getByRole('textbox',{name:'Email',exact:true}).fill(email);await page.getByRole('textbox',{name:'Contraseña',exact:true}).fill(password);await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await expect.poll(()=>new URL(page.url()).pathname).toBe('/dashboard');}

test('QA-002 V5: aceptar invitacion real, configurar clave, login y correo seguro reversible',async({page,request},testInfo)=>{
 test.setTimeout(180000);expect(process.cwd().replaceAll('\\','/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
 const status=localStatus();expect(status.API_URL).toBe('http://127.0.0.1:54321');
 const manifest=JSON.parse(readFileSync(path.join(state,'batches',batchId+'.json')));expect(manifest.batchId).toBe(batchId);
 const priorName=testInfo.project.name==='desktop'?'team-profile-v5-invitation-dcacb2f7-6597-40d9-bd5c-dc6bb84a7114.json':'team-profile-v5-invitation-5bb76c31-e977-4b8c-841e-078fe286c236.json';
 const prior=JSON.parse(readFileSync(path.join(state,'qa',priorName)));expect(prior).toMatchObject({passed:true,kind:'invitation',project:testInfo.project.name,batchId});
 const admin=manifest.accounts.find(row=>row.label==='admin-b'),dbAdmin=client(status),db=client(status);
 const destination=path.join(state,'qa',`invite-email-v5-${testInfo.project.name}.private.json`);
 let saved,stage='preparation',changed=false,baseline;const checks=[];
 const authRead=async()=>{const r=await db.auth.getUser();if(r.error||r.data.user?.id!==prior.userId)throw new Error('Identidad propia no confirmada');return r.data.user;};
 const ordinaryLogin=async email=>{const r=await db.auth.signInWithPassword({email,password:saved.password});if(r.error||r.data.user?.id!==prior.userId)throw new Error('Login propio no confirmado');return r.data.user;};
 try {
  const authenticated=await dbAdmin.auth.signInWithPassword({email:admin.email,password:admin.password});if(authenticated.error||authenticated.data.user?.id!==admin.userId)throw new Error('Admin sintetico no confirmado');
  const result=await dbAdmin.rpc('aba_team_invitation_deliveries',{p_org:manifest.clinics.B});if(result.error)throw new Error('Lectura invitacion no confirmada');
  const own=result.data.find(row=>row.invitationId===prior.invitationId&&row.userId===prior.userId);if(!own||!own.email.startsWith('qa-r5-invite-')||!own.email.endsWith('@aba.example.test'))throw new Error('Invitacion propia no elegible');
  if(existsSync(destination)){saved=JSON.parse(readFileSync(destination));if(saved.userId!==own.userId||saved.originalEmail!==own.email||saved.batchId!==batchId)throw new Error('Journal propio no coincide');}
  else {saved={batchId,userId:own.userId,invitationId:own.invitationId,originalEmail:own.email,temporaryEmail:`qa-r5-email-${randomUUID()}@aba.example.test`,password:'Qa!'+randomBytes(24).toString('base64url')+'9z',phase:'prepared'};save(destination,saved);}
  stage='accept-invitation';
  if(!own.accepted){let messages=await mail(request,own.email);
   if(!messages.length||Date.now()-Date.parse(messages[0].Created)>1800000){
    stage='fresh-invitation-resend';await login(page,admin.email,admin.password);await page.goto('/team');
    const card=page.locator('.mantine-Card-root').filter({has:page.getByText(own.email,{exact:true})}).filter({has:page.getByRole('button',{name:'Solicitar reenvío explícito',exact:true})});await expect(card).toHaveCount(1);
    const previousIds=new Set(messages.map(row=>row.ID));page.once('dialog',dialog=>dialog.accept());await card.getByRole('button',{name:'Solicitar reenvío explícito',exact:true}).click();
    await expect.poll(async()=>{messages=(await mail(request,own.email)).filter(row=>!previousIds.has(row.ID));return messages.length;}).toBe(1);checks.push('existing-invitation-fresh-ui-resend');
    const renewed=await dbAdmin.rpc('aba_team_invitation_deliveries',{p_org:manifest.clinics.B});expect(renewed.data.find(row=>row.invitationId===own.invitationId)).toMatchObject({userId:own.userId,accepted:false});
   }
   stage='accept-invitation';if(!messages.length)throw new Error('Sin correo propio');const candidates=await links(request,messages[0],'invite');if(candidates.length!==1)throw new Error('Link propio no inequívoco');await page.goto(candidates[0]);await expect.poll(()=>new URL(page.url()).pathname).toBe('/reset-password');await expect(page.getByRole('heading',{name:'Nueva contraseña',exact:true})).toBeVisible();
   await page.getByRole('textbox',{name:'Nueva contraseña',exact:true}).fill(saved.password);await page.getByRole('textbox',{name:'Confirmar contraseña',exact:true}).fill(saved.password);await page.getByRole('button',{name:'Cambiar contraseña',exact:true}).click();await expect.poll(()=>new URL(page.url()).pathname).toBe('/dashboard');save(destination,{...saved,phase:'accepted'});
  }
  const resume=await db.auth.signInWithPassword({email:saved.temporaryEmail,password:saved.password});
  const resumedNew=!resume.error&&resume.data.user?.id===own.userId;changed=resumedNew;
  const currentEmail=resumedNew?saved.temporaryEmail:saved.originalEmail;
  await ordinaryLogin(currentEmail);await login(page,currentEmail,saved.password);
  const current=await authRead();expect(current.email).toBe(currentEmail);expect(!!current.email_confirmed_at).toBe(true);
  const context=await db.rpc('aba_identity_context',{p_organization_id:manifest.clinics.B});if(context.error)throw new Error('Identidad clinica no confirmada');expect(context.data).toMatchObject({userId:own.userId,active:{id:manifest.clinics.B,role:'therapist'}});baseline={userId:context.data.userId,active:context.data.active,profileId:context.data.profile.id};
  const read=await dbAdmin.rpc('aba_team_invitation_deliveries',{p_org:manifest.clinics.B});expect(read.data.find(row=>row.userId===own.userId)).toMatchObject({accepted:true});checks.push(...(!own.accepted?['invite-mail-callback','password-set']:['invitation-already-accepted','password-private-journal-reused']),'ordinary-login','same-user-membership');
  const change=async(target,source)=>{
   const oldIds=new Set((await mail(request,source)).map(row=>row.ID)),newIds=new Set((await mail(request,target)).map(row=>row.ID));
   stage='email-modal';await page.goto('/dashboard');await page.getByRole('button',{name:'Menú de perfil',exact:true}).click();await page.getByRole('menuitem',{name:'Cambiar correo de acceso',exact:true}).click();const modal=page.getByRole('dialog',{name:'Cambiar mi correo',exact:true});await modal.getByRole('textbox',{name:'Nuevo correo',exact:true}).fill(target);await modal.getByRole('textbox',{name:'Contraseña actual',exact:true}).fill(saved.password);
   stage='email-submit';await modal.getByRole('button',{name:'Solicitar cambio y verificación',exact:true}).click();await expect(modal.getByText('Solicitud enviada. Confirma los enlaces del correo anterior y nuevo en Mailpit. El correo actual no cambia hasta la verificación Auth.',{exact:true})).toBeVisible();
   stage='email-before-confirm';expect((await authRead()).email).toBe(source);
   let oldMessages,newMessages;await expect.poll(async()=>{oldMessages=(await mail(request,source)).filter(row=>!oldIds.has(row.ID));newMessages=(await mail(request,target)).filter(row=>!newIds.has(row.ID));return oldMessages.length===1&&newMessages.length===1;}).toBe(true);
   stage='email-links';const oldLinks=await links(request,oldMessages[0],'email_change'),newLinks=await links(request,newMessages[0],'email_change');if(oldLinks.length!==1||newLinks.length!==1)throw new Error('Links cambio de correo no inequívocos');
   await page.goto(oldLinks[0]);expect((await authRead()).email).toBe(source);
   await page.goto(newLinks[0]);await expect.poll(async()=> (await authRead()).email).toBe(target);
   stage='email-new-login';await ordinaryLogin(target);await login(page,target,saved.password);return {oldMessageId:oldMessages[0].ID,newMessageId:newMessages[0].ID};
  };
  stage='email-change';save(destination,{...saved,phase:resumedNew?'resuming-new':'changing'});const first=resumedNew?{oldMessageId:null,newMessageId:null}:await change(saved.temporaryEmail,saved.originalEmail);changed=true;save(destination,{...saved,phase:'changed'});checks.push('dual-mail','first-confirmation-keeps-original','second-confirms-new','login-new-email');
  stage='email-restore';const restored=await change(saved.originalEmail,saved.temporaryEmail);changed=false;save(destination,{...saved,phase:'restored',restoredAt:new Date().toISOString()});checks.push('original-email-restored','login-original');
  const after=await db.rpc('aba_identity_context',{p_organization_id:manifest.clinics.B});expect({userId:after.data.userId,active:after.data.active,profileId:after.data.profile.id}).toEqual(baseline);
  const proof={passed:!resumedNew,recoveryOnly:resumedNew,project:testInfo.project.name,userId:own.userId,invitationId:own.invitationId,inviteAcceptanceExecuted:!own.accepted,passwordSetExecuted:!own.accepted,checks,identityAndRolePreserved:true,originalEmailRestored:true,passwordPrivateJournal:true,mailIds:[first.oldMessageId,first.newMessageId,restored.oldMessageId,restored.newMessageId],origin:baseURL};writeFileSync(testInfo.outputPath('invite-email-v5-safe.json'),JSON.stringify(proof,null,2));
  test.skip(resumedNew,'Recuperacion exacta completada; no acredita una corrida integral nueva');
 }catch(problem){writeFileSync(testInfo.outputPath('invite-email-v5-stage.json'),JSON.stringify({passed:false,stage,userId:prior.userId,changed,errorName:problem?.name??'unknown',sourceLines:[...String(problem?.stack??'').matchAll(/r5\.invite-email-v5\.spec\.mjs:(\d+):(\d+)/g)].map(row=>[Number(row[1]),Number(row[2])])}));await page.goto('about:blank').catch(()=>{});throw new Error(`Invitacion/correo QA no confirmado en ${stage}; journal privado preservado, no borrar ni resetear`);}
 finally{await db.auth.signOut({scope:'local'});await dbAdmin.auth.signOut({scope:'local'});}
});

import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium,expect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import {localStatus} from './write-env.mjs';
assert.equal(process.env.ABA_QA_REMAINING_UX_V21,'1','Explicit serial root opt-in required');
assert.equal(process.cwd().replaceAll('\\','/'),'C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
const buildId='7AtdY0nw3olpUC5PDvk7o',out='.aba.local/qa/ux-current-v21-remaining';
assert.equal(fs.existsSync(out),false,'Preserve prior attempt; review before choosing a new output');
const web=JSON.parse(fs.readFileSync('.aba.local/qa/web-v21-safe.json'));
assert.equal(web.buildId,buildId);
assert.equal(execFileSync('docker',['exec','aba-local-qa-v21','node','-e',"process.stdout.write(require('fs').readFileSync('/workspace/.aba.local/qa/next-build-v21-clinical-header/BUILD_ID','utf8'))"],{encoding:'utf8',windowsHide:true}).trim(),buildId);
const own='94d73448-03ec-495c-8add-30c3cfe05eaa',original='b347646e-ff29-450b-aedf-9f9c015fb41a';
const m=JSON.parse(fs.readFileSync('.aba.local/batches/2155e99e-bda4-4c68-95cf-b74cacd84ecd.json')),a=m.accounts.find(x=>x.label==='admin-a'),s=localStatus();
assert.equal(s.API_URL,'http://127.0.0.1:54321');
const db=createClient(s.API_URL,s.ANON_KEY??s.PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}),hash=x=>createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
const rpc=async(name,args)=>{const r=await db.rpc(name,args);assert.equal(r.error,null);return r.data;};
const read=async()=>{const result={};for(const id of [own,original])result[id]={program:await rpc('read_program_session_v2',{p_clinic_id:m.clinics.A,p_student_id:id}),clinical:await rpc('aba_student_detail_v2',{p_organization_id:m.clinics.A,p_client_id:id})};return result;};
const journal={buildId,status:'prepared',stage:'guard',images:[],attemptedWrites:0,submits:0,externalRequests:0,limits:['Screenshots require subsequent human/agent visual comparison; capture success is not visual acceptance.','Empty local captures only; no timer, server save, transition, publish, export or goal save.','Baseline dc1b0c4 uses mock data; differences in content and V2 controls require explicit assessment.']};
fs.mkdirSync(out,{recursive:true});const save=()=>fs.writeFileSync(out+'/journal.json',JSON.stringify(journal,null,2)+'\n');save();let browser,before;
try{
 const auth=await db.auth.signInWithPassword({email:a.email,password:a.password});assert.equal(auth.error,null);assert.equal(auth.data.user.id,a.userId);
 before=await read();journal.beforeHash=hash(before);
 const session=before[original].program.sessions.find(x=>x.id==='97a8e135-1fb0-4397-910f-f4fe5f099ad1');assert.ok(session);assert.deepEqual(session.events.map(x=>x.type),['started']);assert.ok(session.programs.length>0);
 const ref=session.programs[0],program=before[original].program.programs.find(x=>x.id===ref.programId),version=program?.versions.find(x=>x.id===ref.programVersionId);assert.ok(version?.title);
 const resultRecord=before[own].program.records.find(x=>x.submitted&&!x.discarded&&x.originalMeasurement?.schemaVersion===2&&x.originalMeasurement.dimension==='percentage');assert.ok(resultRecord);
 browser=await chromium.launch({channel:'chrome'});
 for(const project of ['desktop','mobile']){
  const context=await browser.newContext({viewport:project==='desktop'?{width:1440,height:900}:{width:390,height:844},isMobile:project==='mobile',hasTouch:project==='mobile',serviceWorkers:'block'});
  try{
   const page=await context.newPage();page.setDefaultTimeout(15000);
   await page.route('**/*',route=>{const request=route.request(),url=new URL(request.url());if(!['localhost','127.0.0.1'].includes(url.hostname)&&['http:','https:'].includes(url.protocol)){journal.externalRequests++;save();return route.abort('blockedbyclient');}if(request.method()==='POST'&&request.headers()['next-action']&&/operationId|idempotencyKey/.test(request.postData()??'')){journal.attemptedWrites++;save();return route.abort('failed');}return route.continue();});
   await page.exposeFunction('qaSubmit',()=>{journal.submits++;save();});
   await page.addInitScript(()=>document.addEventListener('submit',e=>{if(location.pathname==='/login')return;e.preventDefault();e.stopImmediatePropagation();void window.qaSubmit();},true));
   const withDialog=async(action)=>{
    const dialogs=[];let handling=Promise.resolve();
    const handler=dialog=>{dialogs.push({type:dialog.type(),message:dialog.message()});handling=handling.then(()=>dialog.accept());};
    page.on('dialog',handler);
    try{await action();await handling;assert.equal(dialogs.length,1,'Expected exactly one scoped confirmation');assert.equal(dialogs[0].type,'confirm');}
    finally{page.off('dialog',handler);}
   };
   const stage=value=>{journal.stage=project+':'+value;save();};
   const snap=async(name,scope=page.locator('body'))=>{stage(name);await expect(scope).toBeVisible();await page.waitForTimeout(400);fs.mkdirSync(out+'/'+project,{recursive:true});const path=out+'/'+project+'/'+name+'.png';await page.screenshot({path,fullPage:false});journal.images.push({project,name,path,sha256:hash(fs.readFileSync(path)),route:new URL(page.url()).pathname,geometry:await scope.evaluate(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,right:r.right,viewport:innerWidth,documentWidth:document.documentElement.scrollWidth};})});save();};
   await page.goto('http://localhost:3001/login');await page.getByRole('textbox',{name:'Email',exact:true}).fill(a.email);await page.getByRole('textbox',{name:'Contraseña',exact:true}).fill(a.password);await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await page.waitForURL('**/dashboard');
   await page.goto('http://localhost:3001/students/'+own+'?tab=programs');await expect(page.getByRole('button',{name:'Nuevo Programa',exact:true})).toHaveCount(2);
   for(const [index,kind,title]of [[0,'skill','Diseño de Programa'],[1,'behavior','Diseño de Programa - Manejo de Conducta']]){
    await page.getByRole('button',{name:'Nuevo Programa',exact:true}).nth(index).scrollIntoViewIfNeeded();await snap('board-'+kind);
    await page.getByRole('button',{name:'Nuevo Programa',exact:true}).nth(index).click();const d=page.getByRole('dialog',{name:title,exact:true});await expect(d).toBeVisible();await snap('designer-'+kind+'-top',d);await d.getByRole('button',{name:'Guardar Programa',exact:true}).scrollIntoViewIfNeeded();await snap('designer-'+kind+'-footer',d);await d.getByRole('button',{name:'Cancelar',exact:true}).click();await expect(d).toHaveCount(0);
   }
   await page.goto('http://localhost:3001/session/'+original);await expect(page.getByRole('button',{name:'Pausar',exact:true})).toBeVisible();await snap('session');
   const card=page.locator('.mantine-Card-root').filter({has:page.getByText(version.title,{exact:true})});await expect(card).toHaveCount(1);
   for(const [label,code]of [['Porcentaje','percentage'],['Frecuencia','frecuencia'],['Intervalos','intervalos'],['Duración','duración'],['Latencia','latencia']]){
    await card.getByRole('button',{name:'Nuevo registro',exact:true}).click();const d=page.getByRole('dialog'),dim=d.getByRole('textbox',{name:'Dimensión',exact:true});await expect(dim).toBeVisible();if(await dim.inputValue()!==label){await withDialog(async()=>{await dim.click();await page.getByRole('option',{name:label,exact:true}).click();});}await expect(dim).toHaveValue(label);await snap('capture-'+code,d);if(code==='percentage'){const state=()=>d.locator('input,textarea').evaluateAll(nodes=>nodes.map(n=>({name:n.name,type:n.type,value:n.value,checked:n.checked})));const initial=await state(),help=d.getByRole('textbox',{name:'Ayudas en el estímulo',exact:true}).first();await help.click();await expect(page.getByRole('option',{name:'position',exact:true})).toBeVisible();await snap('percentage-help-open',d);await help.press('Escape');await expect(page.getByRole('option',{name:'position',exact:true})).toHaveCount(0);assert.deepEqual(await state(),initial);journal.helpChecks??=[];journal.helpChecks.push({project,scope:'stimulus prompts empty draft',allInputValuesAndSelectionsPreserved:true,serverCommands:journal.attemptedWrites,limit:'DOM values exact; no hidden React payload introspection'});save();}await d.getByRole('button',{name:'Cerrar',exact:true}).scrollIntoViewIfNeeded();await snap('capture-'+code+'-footer',d);
    await withDialog(()=>d.getByRole('button',{name:'Descartar registro local sin guardar',exact:true}).click());await expect(d).toHaveCount(0);
   }
   await page.goto('http://localhost:3001/students/'+own+'/programs/'+resultRecord.programId+'/chart');await expect(page.getByRole('heading',{name:'Registro detallado y correcciones',exact:true})).toBeVisible();await snap('chart');await page.getByRole('button',{name:'Ampliar',exact:true}).click();const expanded=page.getByRole('dialog',{name:/gráfico ampliado/});await snap('chart-expanded',expanded);await expanded.locator('.mantine-Modal-close').click();await expect(expanded).toHaveCount(0);await page.getByRole('heading',{name:'Registro detallado y correcciones',exact:true}).scrollIntoViewIfNeeded();await snap('chart-records');
   assert.deepEqual(await read(),before);assert.equal(journal.attemptedWrites,0);assert.equal(journal.submits,0);
  }finally{await context.close();}
 }
 assert.equal(journal.images.length,42);assert.deepEqual(await read(),before);journal.status='complete';journal.stage='complete';journal.exactSnapshotsPreserved=true;save();fs.writeFileSync(out+'/safe.json',JSON.stringify({...journal,passed:true},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({captures:journal.images.length,attemptedWrites:journal.attemptedWrites,exactSnapshotsPreserved:true}));
}catch(error){journal.status='failed';journal.errorType=error.name;journal.diagnostic=String(error.message).slice(0,1800);if(before){try{journal.exactSnapshotsPreserved=JSON.stringify(await read())===JSON.stringify(before);}catch{journal.snapshotRecheckFailed=true;}}save();throw Error('Readonly capture incomplete at '+journal.stage+'; inspect project journal');}
finally{await db.auth.signOut({scope:'local'});await browser?.close();}


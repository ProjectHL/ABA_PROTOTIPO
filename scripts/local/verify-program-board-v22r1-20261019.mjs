import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium,expect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import {localStatus} from './write-env.mjs';
assert.equal(process.env.ABA_QA_REMAINING_UX_V21,'1','Explicit serial root opt-in required');
assert.equal(process.cwd().replaceAll('\\','/'),'C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
const buildId='FgNwRAIHnpp1xvN3xuuEX',out='.aba.local/qa/program-board-verified-v22r1-20261019';
assert.equal(fs.existsSync(out),false,'Preserve prior attempt; review before choosing a new output');
const web=JSON.parse(fs.readFileSync('.aba.local/qa/web-v22-safe.json'));
assert.equal(web.buildId,buildId);
assert.equal(execFileSync('docker',['exec','aba-local-qa-v22','node','-e',"process.stdout.write(require('fs').readFileSync('/workspace/.aba.local/qa/next-build-v22r1-program-board/BUILD_ID','utf8'))"],{encoding:'utf8',windowsHide:true}).trim(),buildId);
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
   await page.goto('http://localhost:3001/students/'+own+'?tab=programs');await expect(page.getByRole('button',{name:'Nuevo Programa',exact:true})).toHaveCount(2);await page.getByText('Historial autorizado de versiones',{exact:true}).waitFor();
   journal.filterChecks??=[];
   for(const [label,status] of [['Activos','active'],['Logrados','achieved'],['Pausa','paused'],['Descontinuados','discontinued'],['Borradores','draft'],['Todos','all']]){
    const control=page.locator('.mantine-SegmentedControl-label').filter({hasText:new RegExp('^'+label+'$')});await control.scrollIntoViewIfNeeded();await control.click();await expect(page.getByRole('radio',{name:label,exact:true})).toBeChecked();
    for(const [index,kind] of [[0,'acquisition'],[1,'behavior']]){const table=page.getByRole('tabpanel',{name:'Programación',exact:true}).locator('table').nth(index),expected=before[own].program.programs.filter(p=>p.kind===kind&&(status==='all'||p.status===status));await expect(table.locator('tbody > tr')).toHaveCount(expected.length||1);for(const p of expected){const v=p.versions.find(v=>v.id===p.currentVersionId)??p.versions[0];await expect(table.getByRole('cell',{name:v.title,exact:true})).toHaveCount(1);}}
    const width=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,inner:innerWidth}));assert.equal(width.client,page.viewportSize().width);assert.equal(width.scroll,width.client);assert.equal(width.inner,width.client);journal.filterChecks.push({project,status,tableRowsMatchAuthorizedSnapshot:true,width});save();
   }
   journal.layouts??=[];journal.layouts.push({project,configuredViewport:page.viewportSize(),layout:await page.evaluate(()=>({innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,labels:[...document.querySelectorAll('.mantine-SegmentedControl-label')].map(e=>e.textContent),overflow:[...document.querySelectorAll('body *')].map(e=>{const r=e.getBoundingClientRect();return{tag:e.tagName,classes:e.className,left:r.left,right:r.right,width:r.width,scroll:e.scrollWidth,client:e.clientWidth,text:e.tagName==='TH'?e.textContent:null};}).filter(e=>e.width>0&&e.right>document.documentElement.clientWidth+1).slice(0,40)}))});save();
   for(const [name,title]of [['skill','Programas de Adquisición de Habilidades'],['behavior','Programas de Manejo de Conducta']]){const heading=page.getByRole('heading',{name:title,exact:true});await heading.evaluate(e=>e.scrollIntoView({block:'start'}));await snap('board-'+name);const table=page.getByRole('tabpanel',{name:'Programación',exact:true}).locator('table').nth(name==='skill'?0:1);const action=table.getByTitle('Diseño',{exact:true}).first();await action.scrollIntoViewIfNeeded();await snap('board-'+name+'-actions');await action.click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();await expect(dialog).toHaveCount(0);}
   assert.deepEqual(await read(),before);assert.equal(journal.attemptedWrites,0);assert.equal(journal.submits,0);
  }finally{await context.close();}
 }
 assert.equal(journal.images.length,8);assert.deepEqual(await read(),before);journal.status='complete';journal.stage='complete';journal.exactSnapshotsPreserved=true;save();fs.writeFileSync(out+'/safe.json',JSON.stringify({...journal,passed:true},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({captures:journal.images.length,attemptedWrites:journal.attemptedWrites,exactSnapshotsPreserved:true}));
}catch(error){journal.status='failed';journal.errorType=error.name;journal.diagnostic=String(error.message).slice(0,1800);if(before){try{journal.exactSnapshotsPreserved=JSON.stringify(await read())===JSON.stringify(before);}catch{journal.snapshotRecheckFailed=true;}}save();throw Error('Readonly capture incomplete at '+journal.stage+'; inspect project journal');}
finally{await db.auth.signOut({scope:'local'});await browser?.close();}


import fs from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
import {expect,test} from '@playwright/test';
import {localStatus} from '../../scripts/local/write-env.mjs';
const own='94d73448-03ec-495c-8add-30c3cfe05eaa',original='b347646e-ff29-450b-aedf-9f9c015fb41a',batch='2155e99e-bda4-4c68-95cf-b74cacd84ecd',buildId='7AtdY0nw3olpUC5PDvk7o';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const phases={baseline:'Línea base',treatment:'Tratamiento',generalization:'Generalización',maintenance:'Mantenimiento'};
test.skip(process.env.ABA_QA_RESULTS_CONTROLS_V21R2!=='1','Explicit serial read-only results controls');
test('V21 actual SVG Y limits enlarged chart filters',async({page},info)=>{
 test.setTimeout(180000);
 expect(process.cwd().replaceAll('\\','/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
 const web=JSON.parse(fs.readFileSync('.aba.local/qa/web-v21-safe.json')),built=JSON.parse(fs.readFileSync('.aba.local/qa/build-v21-clinical-header-safe.json'));
 expect(web).toMatchObject({candidate:'aba-local-qa-v21',url:'http://localhost:3001',buildId});expect(built).toMatchObject({exitCode:0,buildId});expect(fs.readFileSync(built.distDir+'/BUILD_ID','utf8').trim()).toBe(buildId);
 expect(execFileSync('docker',['inspect',web.candidate,'--format','{{.State.Running}}'],{encoding:'utf8',windowsHide:true}).trim()).toBe('true');
 expect(execFileSync('docker',['exec',web.candidate,'node','-e',`process.stdout.write(require('fs').readFileSync('/workspace/${built.distDir}/BUILD_ID','utf8'))`],{encoding:'utf8',windowsHide:true}).trim()).toBe(buildId);
 const file='.aba.local/qa/results-controls-v21r2-'+info.project.name+'-journal.json',safe='.aba.local/qa/results-controls-v21r2-'+info.project.name+'-safe.json';expect(fs.existsSync(file)).toBe(false);expect(fs.existsSync(safe)).toBe(false);
 const j={runId:randomUUID(),status:'pending',stage:'guard',buildId,project:info.project.name,attemptedWrites:0,checks:[],limits:['Admin A only; exact two authorized program/session snapshots. No write, goal/correction submission, export or full QA closure.','Y scale checks inspect rendered SVG ticks and point coordinates; enlargement changes viewport geometry, so compare normalized data and exact table/filter state, not absolute pixels.']};const save=()=>fs.writeFileSync(file,JSON.stringify(j,null,2)+'\n'),stage=s=>{j.stage=s;save();};save();
 const m=JSON.parse(fs.readFileSync('.aba.local/batches/'+batch+'.json')),a=m.accounts.find(x=>x.label==='admin-a'),status=localStatus();expect(status.API_URL).toBe('http://127.0.0.1:54321');
 const db=createClient(status.API_URL,status.ANON_KEY??status.PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}),read=async id=>{const r=await db.rpc('read_program_session_v2',{p_clinic_id:m.clinics.A,p_student_id:id});expect(r.error).toBeNull();return r.data;};
 const select=async(name,label)=>{const input=page.getByRole('textbox',{name,exact:true});if(await input.inputValue()!==label){await input.click();await page.getByRole('option',{name:label,exact:true}).click();}await expect(input).toHaveValue(label);};
 const ticks=scope=>scope.locator('.recharts-yAxis-tick-labels .recharts-cartesian-axis-tick-value');
 const checkAxis=async(scope,min,max)=>{await expect.poll(async()=>{const values=(await ticks(scope).allTextContents()).map(Number);return values.length>1&&values[0]===min&&values.at(-1)===max&&values.every(Number.isFinite);}).toBe(true);return(await ticks(scope).allTextContents()).map(Number);};
 const dots=scope=>scope.locator('.recharts-line-dots circle');
 const dotState=scope=>dots(scope).evaluateAll(nodes=>nodes.map(n=>({cx:Number(n.getAttribute('cx')),cy:Number(n.getAttribute('cy')),stroke:n.getAttribute('stroke')})));
 try{
  stage('authorized-snapshots');const auth=await db.auth.signInWithPassword({email:a.email,password:a.password});expect(auth.error).toBeNull();expect(auth.data.user.id).toBe(a.userId);expect(auth.data.user.app_metadata.aba_fixture_batch).toBe(batch);const before=await read(own),old=await read(original);j.beforeHashes={own:hash(before),original:hash(old)};save();
  const candidate=before.records.find(r=>r.submitted&&!r.discarded&&r.originalMeasurement?.schemaVersion===2&&r.originalMeasurement.dimension==='percentage'&&r.originalMeasurement.trials.some(t=>t.response!==null));expect(candidate).toBeTruthy();const measurement=candidate.originalMeasurement;
  const selected=before.records.filter(r=>r.programId===candidate.programId&&r.submitted&&!r.discarded&&r.originalMeasurement?.schemaVersion===2&&r.originalMeasurement.dimension==='percentage'&&r.originalMeasurement.phase===measurement.phase&&r.actorId===candidate.actorId);expect(selected.length).toBeGreaterThan(0);
  await page.route('**/*',route=>{const q=route.request();if(q.method()==='POST'&&q.headers()['next-action']&&/operationId|idempotencyKey/.test(q.postData()??'')){j.attemptedWrites++;save();return route.abort('failed');}return route.continue();});
  await page.goto('/login');await page.getByRole('textbox',{name:'Email',exact:true}).fill(a.email);await page.getByRole('textbox',{name:'Contraseña',exact:true}).fill(a.password);await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await expect(page).toHaveURL(/\/dashboard$/);
  stage('filtered-actual-chart');await page.goto('/students/'+own+'/programs/'+candidate.programId+'/chart');await expect(page.getByRole('heading',{name:'Registro detallado y correcciones',exact:true})).toBeVisible();await select('Dimensión','Porcentaje');await select('Periodo','Todo el historial');await select('Fase',phases[measurement.phase]);await select('Profesional','Profesional · '+candidate.actorId.slice(0,8));await expect(page.locator('tbody tr')).toHaveCount(selected.length);
  const filters=async()=>Promise.all(['Dimensión','Periodo','Fase','Profesional','Eje Y mínimo','Eje Y máximo'].map(name=>page.getByLabel(name,{exact:true}).inputValue()));
  const body=page.locator('tbody'),tableBefore=await body.innerText(),baseTicks=await checkAxis(page,0,100);await expect.poll(async()=>(await dotState(page)).length).toBeGreaterThan(0);const dotsBefore=await dotState(page);expect(dotsBefore.every(x=>Number.isFinite(x.cx)&&Number.isFinite(x.cy))).toBe(true);
  await page.getByLabel('Eje Y mínimo',{exact:true}).fill('10');await page.getByLabel('Eje Y máximo',{exact:true}).fill('90');await page.getByLabel('Eje Y máximo',{exact:true}).blur();const limitedTicks=await checkAxis(page,10,90);await expect.poll(async()=>JSON.stringify(await dotState(page))!==JSON.stringify(dotsBefore)).toBe(true);const limitedDots=await dotState(page),filterBefore=await filters();expect(await body.innerText()).toBe(tableBefore);
  stage('expand-close');await page.getByRole('button',{name:'Ampliar',exact:true}).click();const modal=page.getByRole('dialog',{name:/gráfico ampliado/});await expect(modal).toBeVisible();expect(await checkAxis(modal,10,90)).toEqual(limitedTicks);await expect(dots(modal)).toHaveCount(limitedDots.length);expect((await dotState(modal)).map(d=>d.stroke)).toEqual(limitedDots.map(d=>d.stroke));await expect(modal.getByText('Cerrar esta vista conserva todos los filtros y límites del gráfico.',{exact:true})).toBeVisible();await modal.locator('.mantine-Modal-close').click();await expect(modal).toHaveCount(0);expect(await filters()).toEqual(filterBefore);expect(await body.innerText()).toBe(tableBefore);expect(await checkAxis(page,10,90)).toEqual(limitedTicks);await expect.poll(async()=>hash(await dotState(page))).toBe(hash(limitedDots));
  j.checks.push({action:'RESULTADOS-018/019',programId:candidate.programId,recordIds:selected.map(r=>r.id),baseTicks,limitedTicks,filters:filterBefore,tableHash:hash(tableBefore),dotCount:limitedDots.length,closePreservesData:true});save();
  expect(await read(own)).toEqual(before);expect(await read(original)).toEqual(old);expect(j.attemptedWrites).toBe(0);j.status='complete';stage('complete');fs.writeFileSync(safe,JSON.stringify({...j,passed:true},null,2)+'\n',{flag:'wx'});
 }catch(e){j.errorType=e.name;j.diagnostic=(e.message??'').slice(0,1800);save();throw Error('Results control verification unconfirmed at '+j.stage);}finally{await db.auth.signOut({scope:'local'});}
});


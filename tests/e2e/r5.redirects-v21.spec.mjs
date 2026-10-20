import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {test,expect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import {localStatus} from '../../scripts/local/write-env.mjs';
test.skip(process.env.ABA_QA_REDIRECTS_V21!=='1','Explicit local identity QA');
test('IDENTIDAD007 validates redirects through actual login desktop/mobile',async({browser,request},info)=>{
 test.setTimeout(150000);
 expect(process.cwd().replaceAll('\\','/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
 const build='7AtdY0nw3olpUC5PDvk7o';expect(execFileSync('docker',['exec','aba-local-qa-v21','cat','/workspace/.aba.local/qa/next-build-v21-clinical-header/BUILD_ID'],{encoding:'utf8',windowsHide:true}).trim()).toBe(build);
 expect((await request.get('/api/health')).status()).toBe(200);
 const prefix='.aba.local/qa/redirects-v21-'+info.project.name;expect(fs.existsSync(prefix+'-journal.json')).toBe(false);
 const journal={buildId:build,project:info.project.name,passed:false,cases:[],attemptedCommands:0,externalRequests:0};const save=()=>fs.writeFileSync(prefix+'-journal.json',JSON.stringify(journal,null,2)+'\n',{mode:0o600});save();
 const fixture=JSON.parse(fs.readFileSync('.aba.local/batches/2155e99e-bda4-4c68-95cf-b74cacd84ecd.json')),actor=fixture.accounts.find(a=>a.label==='admin-b'),s=localStatus();expect(s.API_URL).toBe('http://127.0.0.1:54321');
 const db=createClient(s.API_URL,s.ANON_KEY??s.PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const read=async()=>{const r=await db.rpc('aba_identity_context',{p_organization_id:fixture.clinics.B});expect(r.error).toBeNull();return r.data;};
 try{
  const auth=await db.auth.signInWithPassword({email:actor.email,password:actor.password});expect(auth.error).toBeNull();expect(auth.data.user.id).toBe(actor.userId);const before=await read();
  const cases=[['absolute','https://example.invalid/escape','/dashboard'],['protocol-relative','//example.invalid/escape','/dashboard'],['backslash','/\\example.invalid/escape','/dashboard'],['encoded-control','/%0a/escape','/dashboard'],['valid-internal','/team','/team']];
  for(const [name,input,expected] of cases){
   const context=await browser.newContext({viewport:info.project.use.viewport,isMobile:info.project.name==='mobile',hasTouch:info.project.name==='mobile',serviceWorkers:'block'});
   try{
    const page=await context.newPage();await page.route('**/*',route=>{const req=route.request(),url=new URL(req.url());if(!['localhost','127.0.0.1'].includes(url.hostname)){journal.externalRequests++;save();return route.abort('blockedbyclient');}if(req.method()==='POST'&&req.headers()['next-action']&&/operationId|idempotencyKey/.test(req.postData()??'')){journal.attemptedCommands++;save();return route.abort('blockedbyclient');}return route.continue();});
    await page.goto('http://localhost:3001/login?redirectTo='+encodeURIComponent(input));await page.getByRole('textbox',{name:'Email',exact:true}).fill(actor.email);await page.getByRole('textbox',{name:'Contraseña',exact:true}).fill(actor.password);await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await expect(page).toHaveURL('http://localhost:3001'+expected);if(expected==='/team')await expect(page.getByRole('heading',{name:'Gestión de Equipo Terapéutico',exact:true})).toBeVisible();else await expect(page.getByText('Panel clínico autorizado',{exact:true})).toBeVisible();await page.reload();await expect(page).toHaveURL('http://localhost:3001'+expected);
    journal.cases.push({name,input,destination:expected,reloadPreserved:true,passed:true});save();
   }finally{await context.close();}
  }
  expect(await read()).toEqual(before);expect(journal.externalRequests).toBe(0);expect(journal.attemptedCommands).toBe(0);journal.identitySha256=createHash('sha256').update(JSON.stringify(before)).digest('hex');journal.passed=true;save();fs.writeFileSync(prefix+'-safe.json',JSON.stringify({...journal,limits:['Tests login redirectTo with existing synthetic account; no fresh invitation or clinic switching claim.']},null,2)+'\n',{flag:'wx'});
 }catch(error){journal.errorType=error.name;save();throw error;}finally{await db.auth.signOut({scope:'local'});}
});


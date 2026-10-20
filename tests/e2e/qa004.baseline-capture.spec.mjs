import { test, expect } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const root='C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO';
const origin='http://localhost:3002';
test.skip(process.env.ABA_QA_BASELINE_CAPTURE!=='1','Referencia mock explícita');
const states=[['landing','/'],['login','/login'],['dashboard','/dashboard'],['team','/team'],['shared-access','/shared-access'],['students','/students'],['student','/students/std-001'],['session','/session/std-001'],['chart','/students/std-001/programs/prog-001/chart'],['not-found','/qa-baseline-not-found']];
test('QA004 referencia exacta: rutas y controles principales, sin Auth/backend',async({page,context},info)=>{
 test.setTimeout(240000); expect(process.cwd().replaceAll('\\','/')).toBe(root);
 const manifest=JSON.parse(readFileSync('.aba.local/qa/ux-baseline-dc1b0c4/qa-baseline-manifest.json','utf8'));
 expect(manifest.ref).toBe('dc1b0c4');
 const dir=path.join(root,'.aba.local/qa/ux-baseline-render',info.project.name);mkdirSync(dir,{recursive:true});
 const result={baselineRef:manifest.ref,commit:manifest.commit,project:info.project.name,origin,startedAt:new Date().toISOString(),mockOnly:true,authExecuted:false,externalRequestsBlocked:[],screens:[],pageErrors:0,completed:false};
 page.on('pageerror',()=>result.pageErrors++);
 await context.route('**/*',async route=>{const u=new URL(route.request().url());if(['data:','blob:'].includes(u.protocol)||u.origin===origin)return route.continue();result.externalRequestsBlocked.push({host:u.host,type:route.request().resourceType(),classification:'external-placeholder-blocked-not-downloaded'});return route.abort('blockedbyclient');});
 const capture=async(name)=>{await page.waitForTimeout(250);await page.screenshot({path:path.join(dir,name+'.png'),fullPage:true});const geometry=await page.evaluate(()=>({viewport:{width:innerWidth,height:innerHeight},document:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},headings:[...document.querySelectorAll('h1,h2,h3')].map(e=>({text:e.textContent?.trim(),x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y,width:e.getBoundingClientRect().width})),buttons:[...document.querySelectorAll('button')].filter(e=>e.getBoundingClientRect().width>0).map(e=>({label:e.getAttribute('aria-label')||e.textContent?.trim()||e.title,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))}));result.screens.push({name,path:`.aba.local/qa/ux-baseline-render/${info.project.name}/${name}.png`,route:new URL(page.url()).pathname,geometry});};
 try{
 for(const[name,url]of states){const res=await page.goto(origin+url);expect(res?.status()).toBe(200);await expect(page.locator('#root')).not.toBeEmpty();await page.waitForTimeout(500);await capture(name);if(name==='dashboard'){if(info.project.name==='mobile'){await page.locator('button.mantine-Burger-root').click();await capture('dashboard-sidebar-open');await page.locator('button.mantine-Burger-root').click();}}
 if(name==='student'){const tabs=page.getByRole('tab');const count=await tabs.count();for(let i=0;i<count;i++){await tabs.nth(i).click();await capture('student-tab-'+i);}await page.getByRole('tab').filter({hasText:'Programación'}).click();const design=page.getByTitle('Diseño',{exact:true});if(await design.count()){await design.first().click();await capture('program-design-modal');await page.keyboard.press('Escape');}}
 if(name==='shared-access'){const tabs=page.getByRole('tab');for(let i=0;i<await tabs.count();i++){await tabs.nth(i).click();await capture('shared-tab-'+i);}}
 if(name==='session'){const record=page.getByRole('button',{name:'Iniciar',exact:true});expect(await record.count()).toBeGreaterThan(0);if(await record.count()){await record.first().click();await capture('capture-percentage');const select=page.getByRole('textbox',{name:'Dimensión de Medición'});if(await select.count()){for(const label of ['Frecuencia (Conteo de Eventos)','Intervalos (Muestreo Temporal)','Duración (Tiempo Total)','Latencia (Tiempo de Respuesta)']){await select.click();await page.getByRole('option',{name:label,exact:true}).click();await capture('capture-'+label.split(' ')[0].toLowerCase());}}await page.keyboard.press('Escape');}}
 if(name==='chart'){const goal=page.getByRole('button').filter({hasText:/Configurar|Meta/});if(await goal.count()){await goal.first().click();await capture('chart-goal-modal');await page.keyboard.press('Escape');}}
 }
 result.completed=true;result.endedAt=new Date().toISOString();
 }finally{result.externalRequestsBlocked=[...new Map(result.externalRequestsBlocked.map(e=>[e.host+'|'+e.type,e])).values()];writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(result,null,2)+'\n');}
});
test('QA004 referencia ensayos de porcentaje en marcha',async({page,context},info)=>{
 expect(process.cwd().replaceAll('\\','/')).toBe(root);
 await context.route('**/*',route=>{const u=new URL(route.request().url());return u.origin===origin||['blob:','data:'].includes(u.protocol)?route.continue():route.abort('blockedbyclient');});
 await page.goto(origin+'/session/std-001');await page.getByRole('button',{name:'Iniciar',exact:true}).first().click();await page.getByRole('button',{name:'Iniciar Registro',exact:true}).click();await expect(page.getByText('Registro por Porcentaje - 10 ensayos',{exact:true})).toBeVisible();
 await page.screenshot({path:path.join(root,'.aba.local/qa/ux-baseline-render',info.project.name,'capture-percentage-active.png'),fullPage:true});
 writeFileSync(path.join(root,'.aba.local/qa/ux-baseline-render',info.project.name,'percentage-active-safe.json'),JSON.stringify({project:info.project.name,baseline:'dc1b0c4',route:'/session/std-001',mockOnly:true,authExecuted:false,saved:false,screenshot:`.aba.local/qa/ux-baseline-render/${info.project.name}/capture-percentage-active.png`,result:'PASS',at:new Date().toISOString()},null,2));
});

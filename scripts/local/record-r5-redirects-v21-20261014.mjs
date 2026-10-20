import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

// Prepared only. Root reviews and executes after the completed focal run.
assert.equal(process.cwd().replaceAll('\\','/'), 'C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
const buildId = '7AtdY0nw3olpUC5PDvk7o';
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const sha = p => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const base = 'docs/qa/R5_REDIRECTS_V21_20261014';
const checkpoint = 'docs/status-map/ABA_LOCAL.checkpoint-20261014-redirects-v21-antes.json';
for (const p of [base+'.json', base+'.md', checkpoint]) assert.equal(fs.existsSync(p), false, 'Already recorded: '+p);
const cases = ['desktop','mobile'].map(project => {
  const path = '.aba.local/qa/redirects-v21-'+project+'-safe.json';
  const result = read(path);
  assert.equal(result.passed,true); assert.equal(result.project,project); assert.equal(result.buildId,buildId);
  assert.equal(result.attemptedCommands,0); assert.equal(result.externalRequests,0);
  assert.deepEqual(result.cases.map(c=>c.name), ['absolute','protocol-relative','backslash','encoded-control','valid-internal']);
  for (const c of result.cases) {
    assert.equal(c.passed,true); assert.equal(c.reloadPreserved,true);
    assert.equal(c.destination,c.name==='valid-internal'?'/team':'/dashboard');
  }
  return {path,result};
});
assert.equal(cases[0].result.identitySha256,cases[1].result.identitySha256);
const files = [...cases.map(c=>c.path),'tests/e2e/r5.redirects-v21.spec.mjs','playwright.redirects-v21.config.ts'];
for(const f of files) assert.ok(fs.existsSync(f),f);
const lp='docs/qa/R5_LEDGER_ACCIONES_404.json',jp='docs/status-map/ABA_LOCAL.json',hp='docs/status-map/ABA_LOCAL.html';
const ledger=read(lp), map=read(jp), html=fs.readFileSync(hp,'utf8');
assert.equal(ledger.actions.length,404); assert.equal(ledger.candidate.buildId,buildId);
const qa=map.categories.find(c=>c.id==='qa'); assert.equal(qa.hitos.filter(h=>h.hecho).length,11);
assert.ok(/const data = .*?;\r?\n  const root =/s.test(html));
const action=ledger.actions.find(a=>a.actionId==='IDENTIDAD-007'); assert.ok(action);
const remaining=['Callback /auth/confirm next inválido no ejecutado en esta suite; localizar evidencia o completar focal.','QA004 comparación visual y QA015 candidato final permanecen separados.'];
const assertion='Login redirectTo desktop/móvil: URL absoluta, protocol-relative, backslash y control codificado → /dashboard; /team válido → /team, recarga conserva destino; cero solicitudes externas y comandos clínicos, contexto identidad exacto.';
const evidence={recordedAt:new Date().toISOString(),status:'PASS_FOCAL',candidate:'aba-local-qa-v21',buildId,actionId:'IDENTIDAD-007',execution:{projects:2,casesPerProject:5,reportedDurationSeconds:15.4},cases,artifactsSHA256:Object.fromEntries(files.map(f=>[f,sha(f)])),limits:remaining.concat(['Cuenta sintética admin-b existente; sin alta/invitación, cambio de clínica ni modificación de producto.','Prueba de login redirectTo; no atribuir cobertura automática a callback next ni a todos los consumidores del sanitizador.'])};
const note='IDENTIDAD-007 focal: escritorio y móvil 2/2 PASS (15,4 s), cinco entradas por recorrido. Login redirectTo rechaza destino absoluto, protocol-relative, backslash y control codificado hacia /dashboard; destino interno /team conservado. Recarga mantiene destino, cero solicitudes externas y comandos clínicos, identidad sin cambios. Candidato V21 '+buildId+'.\n\nLa prueba no ejecuta callback /auth/confirm con next inválido; ese alcance permanece abierto. No acredita invitación inicial ni cambio de clínica. QA 11/16, sin cierre global ni cambio de producto.';
for(const p of ['docs/handoffs/R5_CLI_GATE_V5.md','docs/CHECKLIST_EJECUCION_INTEGRAL_ABA_LOCAL.md','docs/MATRIZ_UX_CONTRATO_PERSISTENCIA_ABA_LOCAL.md','docs/qa/R5_LEDGER_ACCIONES_404.md','docs/qa/CHECKLIST_PENDIENTE_CIERRE_R5_20261010.md']) assert.ok(fs.existsSync(p));
fs.copyFileSync(jp,checkpoint,fs.constants.COPYFILE_EXCL);
fs.writeFileSync(base+'.json',JSON.stringify(evidence,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(base+'.md','# Redirecciones de login — V21, 2026-10-14\n\n'+note+'\n\nEvidencia detallada: '+base+'.json.\n',{flag:'wx'});
for(const p of ['docs/handoffs/R5_CLI_GATE_V5.md','docs/CHECKLIST_EJECUCION_INTEGRAL_ABA_LOCAL.md','docs/MATRIZ_UX_CONTRATO_PERSISTENCIA_ABA_LOCAL.md','docs/qa/R5_LEDGER_ACCIONES_404.md']) fs.appendFileSync(p,'\n\n## 2026-10-14 — redirecciones de login V21\n\n'+note+'\nEvidencia '+base+'.{json,md}.\n');
fs.appendFileSync('docs/qa/CHECKLIST_PENDIENTE_CIERRE_R5_20261010.md','\n\n## Focal identidad — 2026-10-14\n\n- [x] IDENTIDAD-007 login redirectTo: cuatro entradas rechazadas y destino interno válido, recarga y contexto conservados, escritorio/móvil PASS.\n- [ ] IDENTIDAD-007 callback next inválido: fuera de la suite de login; vincular evidencia o ejecutar focal.\n\n'+note+'\n');
const unique=a=>[...new Set(a)];
action.tests=unique([...(action.tests||[]),files[2]]); action.artifacts=unique([...(action.artifacts||[]),base+'.json',...cases.map(c=>c.path)]);
action.executionState='desktop-mobile-partial'; action.currentControl='Login redirectTo con entradas inválidas y destino interno válido'; action.commandOrNoWrite='Auth login; 0 comandos clínicos, 0 solicitudes externas, contexto identidad conservado'; action.candidateRelation+='; V21 redirectTo 2/2 PASS20261014, callback next fuera de alcance.'; action.remaining=remaining;
action.evidenceAudit={...action.evidenceAudit,executionState:'partial',currentControl:action.currentControl,tests:action.tests,artifacts:action.artifacts,assertions:unique([...(action.evidenceAudit?.assertions||[]),assertion]),projects:['desktop','mobile'],candidateRelation:action.candidateRelation,remaining,interpretation:'Prueba focal ejecutada de login redirectTo; callback next no inferido. No cierre global.'};
fs.writeFileSync(lp,JSON.stringify(ledger,null,2)+'\n');
map.as_of='2026-10-18';
map.decision_log.push('2026-10-14: IDENTIDAD007 login redirectTo cinco casos por viewport escritorio/móvil PASS0comandos0externas; callback next inválido separado. QA11/16.');
fs.writeFileSync(jp,JSON.stringify(map,null,2)+'\n');
const updated=html.replace(/const data = .*?;\r?\n  const root =/s,()=> 'const data = '+JSON.stringify(map).replaceAll('<','\\u003c')+';\n  const root =');
assert.deepEqual(JSON.parse(updated.match(/const data = (.*?);\r?\n  const root =/s)[1]),map); fs.writeFileSync(hp,updated);
console.log(JSON.stringify({recorded:base,cases:10,qa:'11/16',callbackNextPending:true,mapMatches:true,checkpoint}));


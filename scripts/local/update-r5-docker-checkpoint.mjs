import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync,existsSync} from 'node:fs';
import path from 'node:path';
assert.equal(process.cwd().replaceAll('\\','/'),'C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
const source='docs/status-map/ABA_LOCAL.json',htmlPath='docs/status-map/ABA_LOCAL.html',checkpoint='docs/status-map/ABA_LOCAL.checkpoint-20261005-docker-recuperado-antes.json';
assert.ok(!existsSync(checkpoint),'Checkpoint already exists');copyFileSync(source,checkpoint);
const data=JSON.parse(readFileSync(source,'utf8'));
data.baseline='Checkout Desktop, main, HEAD39071f8542968f334ab6732a9a4a222d4ad0a1a1 más cambios locales preservados;404 requisitos integrados y101 migraciones. Candidato BUILD_ID ZLD0G_lNLWR-fufnzOPZw. Supabase recuperado dentro de Docker, puertos127.0.0.1, Auth200 y doble confirmación aplicada;8actores/98proyecciones/PNG PASS. Correo seguro escritorio/móvil2/2 y API75/75 sin skipped. Restore/config final pendiente; sin aceptación local.';
data.next_checkpoint='Completar variantes de invitaciones y conciliación QA integral; renovar respaldo y recuperación de configuración final dentro de Docker; actualizar manual/versionado. Tres recorridos humanos al final y QA-016.';
data.decision_log.push('2026-10-05: restricción estricta carpeta Desktop ABA y Docker; PowerShell sólo intérprete expresamente autorizado. Stack recuperado sin configurar Windows; volúmenes preservados. Correo seguro2/2 y API75/75 PASS. Mailpit recreado no conserva mensajes previos; invitación móvil existente reenviada por UI. QA-014 vigencia aún pendiente, ensayo humano no ejecutado.');
for(const category of data.categories.filter(c=>['operacion','qa'].includes(c.id))){category.state='en_validacion';category.blocker=null;category.next_action=data.next_checkpoint;if(category.id==='operacion')category.hitos[0].hecho=true;category.verified_at='2026-10-05';category.evidence.push({label:'Recuperación Docker vigente',path:'../runbooks/LOCAL_R5_DOCKER_TOOLS.md'});}
const serialized=JSON.stringify(data,null,2)+'\n';writeFileSync(source,serialized);
let html=readFileSync(htmlPath,'utf8');const anchor=/const data = .*?;\r?\n  const root =/s;assert.ok(anchor.test(html),'Existing HTML data anchor absent');
html=html.replace(anchor,()=> 'const data = '+JSON.stringify(data).replaceAll('<','\\u003c')+';\n  const root =');
const embedded=JSON.parse(html.match(/const data = (.*?);\r?\n  const root =/s)[1]);assert.deepEqual(embedded,data);
for(const category of data.categories)for(const evidence of category.evidence??[])if(evidence.path&&!/^[a-z]+:/i.test(evidence.path))assert.ok(existsSync(path.resolve('docs/status-map',evidence.path)),'Missing evidence link');
writeFileSync(htmlPath,html);console.log(JSON.stringify({checkpointPreserved:true,jsonHtmlEqual:true,operationHitos:'1/3',qaCompleted:'0/16',acceptance:false}));
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import path from 'node:path';
import { localStatus, root, state } from './write-env.mjs';
if(process.env.ABA_QA_POSTMAN_BOOTSTRAP !== '1') throw new Error('Explicit local QA opt-in required');
if(root.replaceAll('\\','/').replace(/\/$/,'')!=='C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO') throw new Error('Desktop root required');
const batchId='2155e99e-bda4-4c68-95cf-b74cacd84ecd';
const status=localStatus();
const sourceName=process.env.ABA_QA_POSTMAN_HTTP === '1' ? 'ABA_LOCAL_R5_HTTP.postman_collection.json' : 'ABA_LOCAL_R5_READS.postman_collection.json';
const outputName=process.env.ABA_QA_POSTMAN_HTTP === '1' ? 'postman-r5-http-runtime.postman_collection.json' : 'postman-r5-runtime.postman_collection.json';
const manifest=JSON.parse(readFileSync(path.join(state,'batches',`${batchId}.json`),'utf8'));
if(manifest.state!=='ready'||manifest.batchId!==batchId||manifest.apiUrl!==status.API_URL) throw new Error('Synthetic batch mismatch');
const values={qa_api_url:status.API_URL,qa_public_key:status.ANON_KEY??status.PUBLISHABLE_KEY,qa_batch_id:batchId,qa_clinic_a:manifest.clinics.A,qa_clinic_b:manifest.clinics.B};
if(process.env.ABA_QA_POSTMAN_HTTP === '1') values.qa_http_gate='1';
for(const account of manifest.accounts){
 if(account.email!==`${account.label}.${batchId}@aba.example.test`)throw new Error('Synthetic identity mismatch');
 const prefix=`qa_${account.label.replaceAll('-','_')}`;
 values[`${prefix}_email`]=account.email; values[`${prefix}_password`]=account.password;
}
const route=`/${randomBytes(32).toString('hex')}`;
let delivered=false;
const server=createServer((req,res)=>{
 if(req.method!=='GET'||req.url!==route||delivered){res.writeHead(404);res.end();return;}
 delivered=true;
 res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});
 res.end(JSON.stringify(values));
 server.close();
 clearTimeout(expiry);
 console.log('Private fixture variables delivered once to the local Runner; listener closed.');
});
const expiry=setTimeout(()=>server.close(),15*60*1000);
server.listen(0,'127.0.0.1',()=>{
 const url=`http://127.0.0.1:${server.address().port}${route}`;
 const collection=JSON.parse(readFileSync(path.join(root,'postman',sourceName),'utf8'));
 collection.info.name+=' — runtime local V5';
 const bootstrap=[
  "if(pm.variables.get('qa_api_url')!=='http://127.0.0.1:54321') throw new Error('Local API required');",
  "if(!pm.variables.get('qa_runtime_v5_loaded')) {",
  ` const runtime=await pm.sendRequest('${url}');`,
  " if(runtime.code!==200) throw new Error('Private local fixture unavailable');",
  " const values=runtime.json();",
  " if(values.qa_api_url!=='http://127.0.0.1:54321'||values.qa_batch_id!=='2155e99e-bda4-4c68-95cf-b74cacd84ecd') throw new Error('Local batch mismatch');",
  " for(const [key,value] of Object.entries(values)) pm.variables.set(key,value);",
  " pm.variables.set('qa_runtime_v5_loaded',true);",
  "}"
 ];
 const prerequest=collection.event.find(e=>e.listen==='prerequest');
 if(!prerequest)throw new Error('Original collection guard missing');
 prerequest.script.exec=[...bootstrap,...prerequest.script.exec];
 const output=path.join(state,'qa',outputName);
 mkdirSync(path.dirname(output),{recursive:true});
 writeFileSync(output,JSON.stringify(collection,null,2)+'\n');
 console.log('Runtime clone ready under .aba.local/qa/'+outputName+'. No credentials stored in collection. Import and run locally with logs and persisted responses off.');
});
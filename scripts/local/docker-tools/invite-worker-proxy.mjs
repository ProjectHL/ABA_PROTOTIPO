import http from 'node:http';
import {readFileSync,writeFileSync,renameSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
if(process.platform!=='linux'||process.cwd()!=='/workspace')throw Error('Docker project root required');
const casePath='/workspace/.aba.local/qa/invite-worker-v5.private.json',signalPath='/workspace/.aba.local/qa/invite-worker-wire-v5.safe.json';
const kong='http://supabase_kong_aba-reintegration-local:8000',edge='http://aba-r5-invite-worker-v5:8081';
const uuid=v=>typeof v==='string'&&/^[0-9a-f-]{36}$/.test(v);
const save=v=>{const temp=signalPath+'.'+randomUUID()+'.tmp';writeFileSync(temp,JSON.stringify(v),{flag:'wx',mode:0o600});renameSync(temp,signalPath);};
const readCase=()=>{try{const c=JSON.parse(readFileSync(casePath,'utf8'));if(c.schemaVersion!==1||c.batchId!=='2155e99e-bda4-4c68-95cf-b74cacd84ecd'||!uuid(c.clinicId)||!c.email?.startsWith('qa-r5-worker-')||!c.email.endsWith('@aba.example.test'))return null;return c;}catch{return null;}};
const forward=(req,res,body,origin,pathname,hold,signal)=>{
 const url=new URL(origin),incoming=new URL(req.url,'http://qa.invalid');url.pathname=pathname;url.search=incoming.search;
 const headers={...req.headers,host:url.host};delete headers.connection;delete headers['transfer-encoding'];headers['content-length']=String(body.length);
 const upstream=http.request(url,{method:req.method,headers},reply=>{const chunks=[];let bytes=0;reply.on('data',chunk=>{bytes+=chunk.length;if(bytes>16*1024*1024){upstream.destroy();return;}chunks.push(chunk);});reply.on('end',()=>{const result=Buffer.concat(chunks);if(hold&&[200,201].includes(reply.statusCode)){save({...signal,upstreamStatus:reply.statusCode,heldAt:new Date().toISOString(),authResponseWithheld:true});req.on('close',()=>{});return;}if(res.destroyed)return;const responseHeaders={...reply.headers};delete responseHeaders['transfer-encoding'];delete responseHeaders.connection;responseHeaders['content-length']=String(result.length);res.writeHead(reply.statusCode??502,responseHeaders);res.end(result);});});
 upstream.on('error',()=>{if(!res.headersSent&&!res.destroyed){res.writeHead(502,{'content-type':'application/json'});res.end('{"error":"qa_cloned_worker_transport_interrupted"}');}});upstream.end(body);
};
http.createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://qa.invalid').pathname;
  if(path==='/_qa/health'){res.writeHead(200,{'content-type':'application/json'});res.end('{"scope":"invitation-worker-v5","ready":true}');return;}
  const chunks=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>2*1024*1024){res.writeHead(413);res.end();return;}chunks.push(chunk);}const body=Buffer.concat(chunks);let parsed;try{parsed=JSON.parse(body);}catch{}
  const own=readCase();
  if(req.method==='POST'&&path==='/functions/v1/resend-clinic-invitation'&&own?.armed&&own.invitationId===parsed?.invitationId&&own.clinicId===parsed?.organizationId&&uuid(parsed?.operationId)&&uuid(parsed?.idempotencyKey)){
   save({schemaVersion:1,invitationId:own.invitationId,organizationId:own.clinicId,operationId:parsed.operationId,idempotencyKey:parsed.idempotencyKey,routedAt:new Date().toISOString(),armId:own.armId,authResponseWithheld:false});
   forward(req,res,body,edge,path.slice('/functions/v1'.length),false,null);return;
  }
  if(req.method==='POST'&&path==='/auth/v1/invite'&&own?.armed&&parsed?.email?.toLowerCase()===own.email){let signal;try{signal=JSON.parse(readFileSync(signalPath,'utf8'));}catch{}if(signal?.armId===own.armId&&signal.invitationId===own.invitationId&&!signal.authResponseWithheld){forward(req,res,body,kong,path,true,signal);return;}}
  forward(req,res,body,kong,path,false,null);
 }catch{if(!res.headersSent&&!res.destroyed){res.writeHead(502,{'content-type':'application/json'});res.end('{"error":"qa_proxy_failure_values_withheld"}');}}
}).listen(8089,'0.0.0.0');
import{readFileSync,writeFileSync}from'node:fs';import{spawnSync}from'node:child_process';
const root='/workspace',real=root+'/.aba.local/docker-tools/docker-linux',project='aba-reintegration-local';
if(process.platform!=='linux'||process.cwd()!==root)throw new Error('Docker-only tools root required');
const lines=readFileSync(root+'/.aba.local/stack/supabase/config.toml','utf8').split('\n').map(l=>l.trim());
for(const section of ['db.seed','db.migrations']){const start=lines.indexOf('['+section+']');if(start<0)throw new Error('Config section missing');let end=lines.findIndex((l,i)=>i>start&&l.startsWith('['));if(end<0)end=lines.length;if(!lines.slice(start+1,end).includes('enabled = false'))throw new Error('Seeds/migrations must stay disabled');}
for(const name of ['supabase_db_'+project,'supabase_storage_'+project,'supabase_edge_runtime_'+project]){const checked=spawnSync(real,['volume','inspect',name],{encoding:'utf8'});if(checked.status!==0||JSON.parse(checked.stdout)[0].Name!==name)throw new Error('Original volume missing');}
const result=spawnSync(process.execPath,[root+'/node_modules/supabase/dist/supabase.js','--network-id',project,'--workdir',root+'/.aba.local/stack','start'],{encoding:'utf8',maxBuffer:64*1024*1024,timeout:240000});
writeFileSync(root+'/.aba.local/qa/start-docker-tools.private.log',(result.stdout??'')+'\n'+(result.stderr??''),{mode:0o600});
const safe={project,exitCode:result.status,signal:result.signal??null,privateLogRetained:true,originalVolumesGuarded:true};writeFileSync(root+'/.aba.local/qa/start-docker-tools-safe.json',JSON.stringify(safe,null,2));console.log(JSON.stringify(safe));process.exit(result.status??1);

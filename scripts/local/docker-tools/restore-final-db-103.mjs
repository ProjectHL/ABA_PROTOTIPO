import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createDecipheriv,createHash} from 'node:crypto';

// DB-only rehearsal. Never restore a running source or reuse an earlier target.
assert.equal(process.platform,'linux');assert.equal(process.cwd(),'/workspace');
assert.equal(process.env.ABA_QA_ISOLATED_RESTORE103,'1');
const root='/workspace',docker=root+'/.aba.local/docker-tools/docker-linux',base=root+'/.aba.local/backups',qa=root+'/.aba.local/qa';
const locatorFile=qa+'/restore-final-current.json',proof=JSON.parse(readFileSync(locatorFile)),id=process.env.ABA_QA_EXPECTED_BACKUP_ID;
assert.match(id??'',/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);assert.equal(proof.backupId,id);
assert.equal(proof.schemaVersion,3);assert.equal(proof.catalog,103);assert.equal(proof.restored,false);assert.equal(proof.dbRestored,false);
const project='aba-restore-'+id.slice(0,8),db='supabase_db_'+project,storageVolume='supabase_storage_'+project;
assert.equal(proof.targetProject,project);assert.equal(proof.restoreAttemptId,undefined,'Fresh UUID target only; no retry into earlier target');
const sha=x=>createHash('sha256').update(x).digest('hex'),manifestBytes=readFileSync(base+'/'+id+'.manifest.json');
assert.equal(sha(manifestBytes),proof.manifestSha256);const manifest=JSON.parse(manifestBytes);
assert.equal(manifest.backupId,id);assert.equal(manifest.sourceProject,'aba-reintegration-local');assert.equal(manifest.catalog,103);assert.equal(manifest.migrationVersions.length,103);assert.equal(manifest.migrationVersions.at(-1),'20261010152644');
const run=(args,input)=>{const r=spawnSync(docker,args,{input,encoding:'utf8',maxBuffer:64*1024*1024,timeout:180000});if(r.status!==0||r.error)throw Error('Isolated103 operation failed; output withheld; target retained');return r.stdout.trim();};
const inspect=name=>JSON.parse(run(['inspect','--type','container',name]))[0];
const key=readFileSync(root+'/.aba.local/backup-keys/'+id+'.services.key');
const decrypt=kind=>{const bytes=readFileSync(base+'/'+id+'.'+kind+'.aesgcm');assert.equal(sha(bytes),manifest.envelopeHashes[kind]);const e=JSON.parse(bytes);assert.equal(e.backupId,id);const d=createDecipheriv('aes-256-gcm',key,Buffer.from(e.iv,'base64'));d.setAuthTag(Buffer.from(e.tag,'base64'));const value=JSON.parse(Buffer.concat([d.update(Buffer.from(e.ciphertext,'base64')),d.final()]));assert.equal(value.backupId,id);return value;};
const quoted=x=>'"'+String(x).replaceAll('"','""')+'"',literal=x=>"'"+String(x).replaceAll("'","''")+"'";
let stage="validate-backup";
try{
 const config=decrypt('services'),saved=decrypt('snapshot');assert.equal(config.sourceProject,manifest.sourceProject);assert.equal(saved.sourceProject,manifest.sourceProject);
 for(const kind of ['roles','memberships','acl'])assert.deepEqual(decrypt(kind)[kind==='acl'?'aclObjects':kind],saved.baseline[kind==='acl'?'aclObjects':kind]);
 assert.ok(config.services.auth.environment.includes('GOTRUE_MAILER_AUTOCONFIRM=false'));
 for(const [kind,name] of [['container',db],['volume',db],['volume',storageVolume]]){const r=spawnSync(docker,[kind,'inspect',name],{encoding:'utf8'});assert.equal(r.status,1,'Entirely new isolated target required');assert.match(r.stderr??'',kind==='volume'?/no such volume/i:/no such container/i,'Explicit absence required; daemon/access failure does not prove new target');}
 const source=inspect('supabase_db_aba-reintegration-local');assert.equal(source.Config.Labels['com.supabase.cli.project'],manifest.sourceProject);assert.ok(source.State.Running);
 const image=JSON.parse(run(['image','inspect',config.services.db.imageId]))[0];assert.equal(image.Id,config.services.db.imageId);
 const archive=base+'/'+id+'.dump';assert.equal(sha(readFileSync(archive)),manifest.dumpSha256);assert.equal(proof.dumpSha256,manifest.dumpSha256);
 const password=config.services.db.environment.find(v=>v.startsWith('POSTGRES_PASSWORD='));assert.ok(password);
 for(const name of [db,storageVolume])run(['volume','create','--label','com.supabase.cli.project='+project,'--label','aba.qa.backup-id='+id,name]);
 run(['run','-d','--name',db,'--label','com.supabase.cli.project='+project,'--label','aba.qa.backup-id='+id,'--network','none','--env',password,'--env','PGDATA=/var/lib/postgresql/data','--mount','type=volume,source='+db+',target=/var/lib/postgresql/data',config.services.db.imageId,'postgres','-c','listen_addresses=127.0.0.1']);
 let ready=false;for(let i=0;i<45;i++){if(spawnSync(docker,['exec',db,'pg_isready','-h','127.0.0.1','-U','supabase_admin','-d','postgres'],{stdio:'ignore'}).status===0){ready=true;break;}await new Promise(resolve=>setTimeout(resolve,1000));}assert.ok(ready);
 const target=inspect(db);assert.equal(target.HostConfig.NetworkMode,'none');assert.equal(target.Config.Labels['com.supabase.cli.project'],project);assert.equal(target.Config.Labels['aba.qa.backup-id'],id);assert.equal(target.Image,config.services.db.imageId);assert.equal(target.Mounts.length,1);assert.equal(target.Mounts[0].Name,db);assert.ok(Object.values(target.NetworkSettings.Ports??{}).every(v=>!v?.length));
 const sql=text=>run(['exec','-i',db,'psql','-U','supabase_admin','-d','postgres','-X','-q','-At','-v','ON_ERROR_STOP=1'],text);
 const existing=sql('select rolname from pg_roles;').split('\n'),statements=[];
 for(const role of saved.baseline.roles){assert.match(role.name,/^[a-z_][a-z0-9_]*$/);if(!existing.includes(role.name))statements.push('CREATE ROLE '+quoted(role.name)+';');const flags=[['login','LOGIN'],['inherit','INHERIT'],['superuser','SUPERUSER'],['createdb','CREATEDB'],['createrole','CREATEROLE'],['replication','REPLICATION'],['bypassrls','BYPASSRLS']].map(([key,flag])=>(role[key]?'':'NO')+flag).join(' ');assert.ok(Number.isInteger(role.connectionLimit));statements.push('ALTER ROLE '+quoted(role.name)+' '+flags+' CONNECTION LIMIT '+role.connectionLimit+' VALID UNTIL '+literal(role.validUntil??'infinity')+' PASSWORD '+(role.password===null?'NULL':literal(role.password))+';');statements.push('ALTER ROLE '+quoted(role.name)+' RESET ALL;');for(const setting of role.config??[]){const split=setting.indexOf('=');assert.ok(split>0);const name=setting.slice(0,split);assert.match(name,/^[a-z_][a-z0-9_.]*$/);if(['search_path','session_preload_libraries'].includes(name)){statements.push('SELECT set_config('+literal(name)+','+literal(setting.slice(split+1))+',false);');statements.push('ALTER ROLE '+quoted(role.name)+' SET '+name+' FROM CURRENT;');}else{statements.push('ALTER ROLE '+quoted(role.name)+' SET '+name+' TO '+literal(setting.slice(split+1))+';');}}}
 stage="restore-roles"; sql(statements.join('\n'));
 run(['cp',archive,db+':/tmp/aba-restore103.dump']);assert.equal(run(['exec',db,'sha256sum','/tmp/aba-restore103.dump']).split(' ')[0],manifest.dumpSha256);
 stage="restore-dump"; run(['exec',db,'pg_restore','-U','supabase_admin','--exit-on-error','--clean','--if-exists','-d','postgres','/tmp/aba-restore103.dump']);
 const capture=name=>{const rows=sql(saved.queries[name]).split(/\r?\n/).filter(Boolean).map(x=>JSON.parse(x));return name==='tables'?rows:rows[0];};
 // Expected state comes exclusively from immutable backup, never live source fallback.
 stage="compare-definitions"; for(const name of ['tables','migrations','policies','rls','functions'])assert.deepEqual(capture(name),saved.baseline[name],name+' mismatch');
 stage="reconcile-acl"; const desired=saved.baseline.aclObjects,current=capture('aclObjects');assert.deepEqual(desired.map(x=>[x.kind,x.identity,x.owner]),current.map(x=>[x.kind,x.identity,x.owner]));
 const aclStatements=[];for(let i=0;i<desired.length;i++){const o=desired[i];if(JSON.stringify(o.grants)===JSON.stringify(current[i].grants))continue;assert.ok(['SCHEMA','TABLE','SEQUENCE','FUNCTION','PROCEDURE'].includes(o.kind));const grantees=[...new Set([...o.grants,...current[i].grants].map(g=>g.grantee))],q=x=>x==='PUBLIC'?'PUBLIC':quoted(x);if(grantees.length)aclStatements.push('REVOKE ALL PRIVILEGES ON '+o.kind+' '+o.identity+' FROM '+grantees.map(q).join(',')+';');for(const g of o.grants){assert.match(g.privilege,/^[A-Z ]+$/);aclStatements.push('GRANT '+g.privilege+' ON '+o.kind+' '+o.identity+' TO '+q(g.grantee)+(g.grantable?' WITH GRANT OPTION':'')+';');}}
 if(aclStatements.length)sql('BEGIN;\n'+aclStatements.join('\n')+'\nCOMMIT;');assert.deepEqual(capture('aclObjects'),desired);
 stage="reconcile-memberships"; const members=saved.baseline.memberships,now=capture('memberships'),identity=x=>x.role+'|'+x.member+'|'+x.grantor,memberStatements=[];
 for(const x of now)if(!members.some(d=>identity(d)===identity(x)))memberStatements.push('REVOKE '+quoted(x.role)+' FROM '+quoted(x.member)+' GRANTED BY '+quoted(x.grantor)+';');
 for(const x of members)if(!now.some(d=>JSON.stringify(d)===JSON.stringify(x)))for(const flag of ['admin','inherit','set'])memberStatements.push('GRANT '+quoted(x.role)+' TO '+quoted(x.member)+' WITH '+flag.toUpperCase()+' '+String(x[flag]).toUpperCase()+' GRANTED BY '+quoted(x.grantor)+';');
 if(memberStatements.length)sql('BEGIN;\n'+memberStatements.join('\n')+'\nCOMMIT;');assert.deepEqual(capture('memberships'),members);assert.deepEqual(capture('roles'),saved.baseline.roles);
 assert.equal(inspect('supabase_db_aba-reintegration-local').Id,source.Id);assert.ok(inspect('supabase_db_aba-reintegration-local').State.Running);
 stage="publish-proof"; const dataProof={schemaVersion:3,backupId:id,manifestSha256:proof.manifestSha256,targetProject:project,catalog:103,dbRestored:true,tableCount:manifest.scope.tables,rows:manifest.scope.rows,tableFingerprint:manifest.scope.tableFingerprint,definitions:{policies:true,functions:true,rls:true,acl:true,roles:true,memberships:true},sourcePreserved:true,isolated:true,restored:false,physicalStorageVerified:false,ordinaryAuthStorageVerified:false,assignmentRlsActorsVerified:false,scope:'DB snapshot103 structural/data equivalence only. Storage copy, ordinary Auth/Storage and actor RLS tests remain mandatory. Other schema/table scopes not fingerprinted.'};
 const proofFile=qa+'/restore-final-data-proof-'+id+'.json';assert.ok(!existsSync(proofFile));writeFileSync(proofFile,JSON.stringify(dataProof,null,2),{flag:'wx',mode:0o600});
 // Root publishes this candidate proof only after preparing downstream UUID guards.
 Object.assign(proof,{dbRestored:true,dbShaVerified:true,networkIsolated:true,dbProofFile:'restore-final-data-proof-'+id+'.json',restored:false});
 assert.equal(JSON.parse(readFileSync(locatorFile)).backupId,id);writeFileSync(locatorFile,JSON.stringify(proof,null,2),{mode:0o600});writeFileSync(qa+'/restore-final-'+id+'.json',JSON.stringify(proof,null,2),{mode:0o600});
 console.log(JSON.stringify({backupId:id,catalog:103,dbRestored:true,isolated:true,tableCount:manifest.scope.tables,restored:false,storageAndActorsPending:true}));
}catch(error){console.error(JSON.stringify({restore103:'not-confirmed',stage,errorType:error?.name,errorCode:error?.code??null,targetPreserved:true,rawErrorWithheld:true}));process.exitCode=1;}

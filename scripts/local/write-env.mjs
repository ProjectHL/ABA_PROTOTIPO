import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync,readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
export const root = fileURLToPath(new URL('../../', import.meta.url));
export const state = path.join(root, '.aba.local');
export const stack = path.join(state, 'stack');
export const cli = path.join(root, 'node_modules/supabase/dist/supabase.js');
export function runCli(args) {
  try{return execFileSync(process.execPath,[cli,...args,'--workdir',stack],{encoding:'utf8',stdio:['ignore','pipe','pipe']});}
  catch(problem){
    const captured=String(problem?.stderr??'')+'\n'+String(problem?.stdout??'');
    const categories=[['multiple-statements',/multiple commands|multiple statements|prepared statement/i],['syntax-error',/42601|syntax error|unterminated/i],['check-violation',/23514|check constraint/i],['foreign-key-violation',/23503|foreign key constraint/i],['permission-denied',/42501|permission denied|row.level security/i],['missing-schema',/does not exist/i],['connection-or-runtime',/ECONNREFUSED|connection.*failed|network|docker/i]];
    const safeCode=categories.find(([,pattern])=>pattern.test(captured))?.[0]??'cli-failed';
    const safe=new Error(`Local CLI failed (${safeCode}); outputs withheld, data preserved, no reset attempted.`);
    safe.safeCode=safeCode;throw safe;
  }
}
export function localStatus() {
  const config=readFileSync(path.join(stack,'supabase/config.toml'),'utf8');
  if(!/^project_id\s*=\s*"aba-reintegration-local"\s*$/m.test(config)) throw new Error('Isolated local project identity mismatch');
  const docker='docker'; // Docker through PATH; no host-directory probing.
  const call=args=>execFileSync(docker,args,{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  const names=call(['ps','--filter','label=com.supabase.cli.project=aba-reintegration-local','--format','{{.Names}}']).trim().split(/\r?\n/).filter(Boolean);
  if(!names.length)throw new Error('Isolated Docker stack is not running');
  let apiBinding=false;
  for(const name of names) {
    if(!/^supabase_[a-z_]+_aba-reintegration-local$/.test(name))throw new Error('Unexpected project container identity');
    const network=JSON.parse(call(['inspect','--type','container',name,'--format','{{json .NetworkSettings}}']));
    if(!network.Networks?.['aba-reintegration-local'])throw new Error('Isolated network mismatch');
    for(const bindings of Object.values(network.Ports??{}))for(const binding of bindings??[]) {
      if(!['127.0.0.1','::1'].includes(binding.HostIp))throw new Error('Published ports are not loopback-only; credentials/fixtures refused');
      if(binding.HostPort==='54321')apiBinding=true;
    }
  }
  if(!apiBinding)throw new Error('Loopback API binding not confirmed');
  const data = JSON.parse(runCli(['status','-o','json']));
  if(data.API_URL !== 'http://127.0.0.1:54321') throw new Error('Unexpected API destination: only isolated loopback stack accepted');
  return data;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const data=localStatus();
  const publicKey=data.PUBLISHABLE_KEY ?? data.ANON_KEY;
  if(!publicKey) throw new Error('Local publishable key unavailable');
  mkdirSync(state,{recursive:true});
  writeFileSync(path.join(state,'browser.env'), `ABA_LOCAL_MODE=true\nNEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321\nSUPABASE_INTERNAL_URL=http://supabase_kong_aba-reintegration-local:8000\nNEXT_PUBLIC_APP_URL=http://localhost:3000\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${publicKey}\n`,{mode:0o600});
  writeFileSync(path.join(root,'.env.development.local'), `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321\nNEXT_PUBLIC_APP_URL=http://localhost:3000\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${publicKey}\n`,{mode:0o600});
  // Privileged status values are kept in memory only; no console/log output.
}

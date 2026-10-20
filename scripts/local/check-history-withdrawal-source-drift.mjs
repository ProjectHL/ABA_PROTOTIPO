import fs from 'node:fs';import assert from 'node:assert/strict';
const original=fs.readFileSync('supabase/migrations/20260915195448_reintegration_clinical_history_command_v2.sql','utf8'),current=JSON.parse(fs.readFileSync('.aba.local/qa/history-withdrawal-current102-functions.json'));
const body=s=>s.match(/as \$(?:function)?\$([\s\S]*?)\$(?:function)?\$/i)?.[1].trim();
const v=original.slice(original.indexOf('create function private.clinical_history_command_v2_valid'),original.indexOf('create function public.aba_clinical_history_command_v2'));assert.equal(body(v),body(current.validator));
let c=original.slice(original.indexOf('create function public.aba_clinical_history_command_v2'));
for(const fn of ['command_rejected_result','command_version_conflict_result'])c=c.replace(new RegExp('(private\\.'+fn+'\\(v_operation_id,\\s*v_idempotency_key,\\s*)v_client_id(,)','g'),'$1v_history_id$2');
for(const fn of ['command_identity_or_replay_result','issue_command_receipt'])c=c.replace(new RegExp('(private\\.'+fn+'\\(\\s*p_organization_id,\\s*v_operation_id,\\s*v_idempotency_key,\\s*)v_client_id(,\\s*\'clinical-history-v2\')','g'),'$1v_history_id$2');
assert.equal(body(c),body(current.command));console.log(JSON.stringify({currentValidatorExactHistoricalBody:true,currentCommandExactForwardIdentityBody:true,catalog:102}));

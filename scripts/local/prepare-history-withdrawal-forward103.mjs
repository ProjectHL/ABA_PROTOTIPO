import fs from 'node:fs';import assert from 'node:assert/strict';
assert.equal(process.cwd().replaceAll('\\','/'),'C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
const name='20261010152644_qa_clinical_history_withdrawal.sql',source=fs.readFileSync('supabase/migrations/20260915195448_reintegration_clinical_history_command_v2.sql','utf8');
let sql=source.slice(source.indexOf('create function private.clinical_history_command_v2_valid'),source.indexOf('-- Retire every authenticated V1 history mutation path'));
assert.ok(sql.includes('create function public.aba_clinical_history_command_v2'));
sql=sql.replaceAll('create function ','create or replace function ').replaceAll("'create','initialize-v2','correct','update-treatment','finish-treatment','reactivate-treatment'","'create','initialize-v2','correct','update-treatment','finish-treatment','reactivate-treatment','retire-reference'");
sql=sql.replace("(v_action in ('update-treatment','finish-treatment','reactivate-treatment') and not (p_command->>'confirmation')::boolean)","(v_action in ('update-treatment','finish-treatment','reactivate-treatment','retire-reference') and not (p_command->>'confirmation')::boolean)");
sql=sql.replace("or (v_action = 'finish-treatment' and v_ended is null)","or (v_action = 'retire-reference' and v_kind = 'medication')\n    or (v_action = 'finish-treatment' and v_ended is null)");
for(const fn of ['command_rejected_result','command_version_conflict_result'])sql=sql.replace(new RegExp('(private\\.'+fn+'\\(v_operation_id,\\s*v_idempotency_key,\\s*)v_client_id(,)','g'),'$1v_history_id$2');
for(const fn of ['command_identity_or_replay_result','issue_command_receipt'])sql=sql.replace(new RegExp('(private\\.'+fn+'\\(\\s*p_organization_id,\\s*v_operation_id,\\s*v_idempotency_key,\\s*)v_client_id(,\\s*\'clinical-history-v2\')','g'),'$1v_history_id$2');
const anchor="    update public.clinical_history_versions_v2\n    set status=case";assert.ok(sql.includes(anchor));
sql=sql.replace(anchor,`    if v_action='retire-reference' and (
      v_current.status <> 'active' or v_current.kind='medication'
      or v_current.descriptor is distinct from btrim(v_payload->>'descriptor')
      or v_current.notes is distinct from nullif(btrim(v_payload->>'notes'),'')
    ) then
      return private.command_rejected_result(v_operation_id,v_idempotency_key,v_history_id,
        'invalid-transition','Sólo una referencia clínica activa admite retiro sin modificar su contenido.');
    end if;
    if v_action='correct' and v_current.kind<>'medication' and v_current.status='inactive' then
      return private.command_rejected_result(v_operation_id,v_idempotency_key,v_history_id,
        'invalid-transition','Una referencia retirada se conserva como evidencia y no admite corrección activa.');
    end if;
`+anchor);
sql=sql.replace("case when v_action='finish-treatment' then 'inactive' else 'active' end","case when v_action in ('finish-treatment','retire-reference') then 'inactive' else 'active' end");
assert.ok(sql.includes("v_action = 'retire-reference' and v_kind = 'medication'"));assert.ok(sql.includes("'reactivate-treatment','retire-reference') and not"));assert.ok(!/v_client_id,\s*'clinical-history-v2'/.test(sql));
const header=`-- HISTORIAL-013 forward: retire a non-medication reference with an immutable
-- inactive successor. Preserve descriptor/notes, prior row, ledger identity,
-- capability authorization, optimistic version check and exact replay.
-- No DELETE, no new grants/RLS, no rewriting applied migration history.
alter table public.clinical_history_versions_v2 drop constraint clinical_history_versions_v2_action_check;
alter table public.clinical_history_versions_v2 add constraint clinical_history_versions_v2_action_check check (action in ('create','initialize-v2','correct','update-treatment','finish-treatment','reactivate-treatment','retire-reference'));
alter table public.clinical_history_events_v2 drop constraint clinical_history_events_v2_action_check;
alter table public.clinical_history_events_v2 add constraint clinical_history_events_v2_action_check check (action in ('create','initialize-v2','correct','update-treatment','finish-treatment','reactivate-treatment','retire-reference'));

`;
fs.writeFileSync('supabase/migrations/'+name,header+sql,{flag:'wx'});
fs.writeFileSync('.aba.local/migration-102/supabase/migrations/'+name,header+sql);
console.log(JSON.stringify({migration:name,prepared:true,applied:false}));

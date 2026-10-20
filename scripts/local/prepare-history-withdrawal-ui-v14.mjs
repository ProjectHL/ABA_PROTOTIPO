import fs from 'node:fs';import assert from 'node:assert/strict';
assert.equal(process.cwd().replaceAll('\\','/'),'C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
const paths=['src/modules/students/contracts.ts','src/features/students/StudentClinicalHistoryPanel.tsx','src/features/students/StudentDetail.tsx'];for(const p of paths)fs.copyFileSync(p,'.aba.local/qa/'+p.split('/').at(-1)+'-before-withdrawal-v14',fs.constants.COPYFILE_EXCL);
let p=paths[0],s=fs.readFileSync(p,'utf8');s=s.replace("'finish-treatment', 'reactivate-treatment']),","'finish-treatment', 'reactivate-treatment', 'retire-reference']),");s=s.replace("['update-treatment', 'finish-treatment', 'reactivate-treatment'].includes(command.action)","['update-treatment', 'finish-treatment', 'reactivate-treatment', 'retire-reference'].includes(command.action)");const contractAnchor="  if (['finish-treatment', 'reactivate-treatment'].includes(command.action)";assert.ok(s.includes(contractAnchor));s=s.replace(contractAnchor,`  if (command.action === 'retire-reference' && command.payload.kind === 'medication') {
    ctx.addIssue({ code: 'custom', path: ['payload', 'kind'], message: 'Usa la finalización de tratamiento para medicación' });
  }
`+contractAnchor);fs.writeFileSync(p,s);
p=paths[1];s=fs.readFileSync(p,'utf8');s=s.replace('  onEdit: (entry: ClinicalHistoryDto) => void;','  onEdit: (entry: ClinicalHistoryDto) => void;\n  onRetire: (entry: ClinicalHistoryDto) => void;');s=s.replace('saving, onAdd, onEdit }: Props','saving, onAdd, onEdit, onRetire }: Props');s=s.replace('{current.status}</Badge>','{current.status === \'inactive\' ? \'Retirada\' : current.status}</Badge>');s=s.replace('disabled={!canEdit || saving}><Edit','disabled={!canEdit || saving || current.status === \'inactive\'}><Edit');const retired='<Tooltip label="La evidencia clínica no se elimina; se corrige con una versión nueva"><ActionIcon color="red" variant="light" disabled><Trash size={16}/></ActionIcon></Tooltip>';assert.ok(s.includes(retired));s=s.replace(retired,`<Tooltip label={current.status === 'inactive' ? 'Referencia retirada; evidencia conservada' : 'Retirar referencia conservando evidencia'}><ActionIcon aria-label="Retirar referencia clínica" color="red" variant="light" onClick={() => onRetire(current)} disabled={!canEdit || saving || current.status === 'inactive'}><Trash size={16}/></ActionIcon></Tooltip>`);fs.writeFileSync(p,s);
p=paths[2];s=fs.readFileSync(p,'utf8');const anchor='  const openHistory = (entry?:';assert.ok(s.includes(anchor));s=s.replace(anchor,`  const retireHistory = async (entry: StudentProfile['history'][number]) => {
    if (commandBusy.current || conflict) return;
    if (pendingCommands.current.size) { await retryPending(); return; }
    if (!canEditVersioned) return v2Unavailable();
    if (entry.version === null) { toast('Inicializa primero la entrada V2', 'yellow', 'Crea una corrección versionada de la entrada original antes de retirarla.'); return; }
    if (entry.kind === 'medication' || entry.status !== 'active') return;
    if (!window.confirm('¿Retirar esta referencia clínica? Se conservarán su contenido y todas las versiones como evidencia.')) return;
    commandBusy.current = true; setSaving(true); setSelectedHistory(entry);
    try {
      const commandKey = \`history:retire-reference:\${entry.historyId}\`;
      const command = retain<ClinicalHistoryCommand>(commandKey, () => ({
        clinicId: student.clinicId, operationId: newId(), idempotencyKey: newId(), studentId: student.id,
        expectedVersion: entry.version!, action: 'retire-reference', historyId: entry.historyId,
        versionId: newId(), supersedesVersionId: entry.versionId, confirmation: true,
        payload: { kind: entry.kind as 'reported_diagnosis' | 'assessment' | 'procedure', descriptor: entry.descriptor,
          dose: null, frequency: null, prescriber: null, startedOn: null, endedOn: null, notes: entry.notes },
      }));
      const result = await saveClinicalHistoryV2(command);
      await receive(commandKey, command, result);
      toast(result.status === 'acknowledged' ? 'Referencia retirada; evidencia conservada' : 'Retiro sin confirmar', result.status === 'acknowledged' ? 'green' : 'yellow', commandMessage(result));
      if (result.status === 'acknowledged') {
        try { await onRefresh(); }
        catch { toast('Retiro confirmado; lectura pendiente', 'yellow', 'El recibo está confirmado. Vuelve a consultar la ficha sin repetir la operación.'); }
      }
    } catch (cause) { toast('Retiro sin confirmar', 'red', cause instanceof Error ? cause.message : 'Recupera la misma operación antes de continuar.'); }
    finally { commandBusy.current = false; setSaving(false); }
  };

`+anchor);s=s.replace('onEdit={openHistory} />','onEdit={openHistory} onRetire={(entry) => void retireHistory(entry)} />');fs.writeFileSync(p,s);console.log(JSON.stringify({preparedUI:paths,appliedToRunningCandidate:false}));

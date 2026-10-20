import fs from'node:fs';import assert from'node:assert/strict';const f='src/features/programs/SkillProgramDesigner.tsx';let t=fs.readFileSync(f,'utf8');assert.ok(!t.includes('handleMoveStep'));t=t.replace('Plus, Trash, Download, X, Save','Plus, Trash, Download, X, Save, ArrowUp, ArrowDown');const anchor='    const handleUpdateStep = (id: string, description: string) => {';assert.ok(t.includes(anchor));t=t.replace(anchor,`    const handleMoveStep = (id: string, direction: -1 | 1) => {
        if (locked || submitting) return;
        setSteps((current) => {
            const index = current.findIndex((step) => step.id === id);
            const target = index + direction;
            if (index < 0 || target < 0 || target >= current.length) return current;
            const reordered = [...current];
            [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
            return reordered.map((step, position) => ({ ...step, order: position + 1 }));
        });
    };

`+anchor);t=t.replace('{steps.map((step) => (','{steps.map((step, index) => (');const trash='<ActionIcon color="red" variant="subtle" onClick={() => handleRemoveStep(step.id)}>';assert.ok(t.includes(trash));t=t.replace(trash,`<Stack gap={2}>
                                                            <ActionIcon type="button" variant="subtle" aria-label={'Mover paso ' + step.order + ' hacia arriba'} disabled={locked || submitting || index === 0} onClick={() => handleMoveStep(step.id, -1)}><ArrowUp size={16} /></ActionIcon>
                                                            <ActionIcon type="button" variant="subtle" aria-label={'Mover paso ' + step.order + ' hacia abajo'} disabled={locked || submitting || index === steps.length - 1} onClick={() => handleMoveStep(step.id, 1)}><ArrowDown size={16} /></ActionIcon>
                                                        </Stack>
                                                        <ActionIcon type="button" aria-label={'Retirar paso ' + step.order} color="red" variant="subtle" onClick={() => handleRemoveStep(step.id)}>`);fs.writeFileSync(f,t);
for(const [from,to]of[['scripts/local/docker-tools/build-external-v6.mjs','scripts/local/docker-tools/build-designer-v7.mjs'],['scripts/local/docker-tools/start-external-v6.mjs','scripts/local/docker-tools/start-designer-v7.mjs']]){assert.ok(!fs.existsSync(to));let s=fs.readFileSync(from,'utf8').replaceAll('v6','v7').replaceAll('V6','V7').replaceAll('v5','v6').replaceAll('V5','V6').replaceAll('V6Stopped','V6Stopped').replaceAll('external','designer');fs.writeFileSync(to,s);}
console.log('PROGRAMAS012 movement controls added without changing draft contracts or applied migrations');


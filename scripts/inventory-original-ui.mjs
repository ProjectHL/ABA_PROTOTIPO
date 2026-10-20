import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// Read-only evidence generator. Prints JSON; never edits sources or runs QA.
const repo = resolve(fileURLToPath(new URL('..', import.meta.url)));
const baseline = 'dc1b0c4';
const pattern = '<(Button|ActionIcon|Menu\\.Item|Tabs\\.Tab|Anchor|NavLink|Burger|Select|MultiSelect|TextInput|Textarea|NumberInput|FileButton|Checkbox|Switch|DateInput|DatePickerInput|Modal\\.CloseButton|button|a)([[:space:]>]|$)|on(Click|Submit|Change|Close)=|href=';
function run(program, args) {
  try { return execFileSync(program, args, { cwd: repo, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }); }
  catch (error) {
    if (error.status === 1 && typeof error.stdout === 'string') return error.stdout;
    throw error;
  }
}
const head = run('git', ['-c', `safe.directory=${repo.replaceAll('\\', '/')}`, 'rev-parse', 'HEAD']).trim();
const original = run('git', ['-c', `safe.directory=${repo.replaceAll('\\', '/')}`, 'grep', '-n', '-E', pattern, baseline, '--', '*.tsx']);
const current = run('rg', ['-n', '--glob', '*.tsx', pattern, 'src', 'app']);
function parse(output, origin) {
  return output.trim().split(/\r?\n/).filter(Boolean).map((row) => {
    const text = origin === 'BASELINE' ? row.slice(baseline.length + 1) : row;
    const match = /^(.*?):(\d+):(.*)$/.exec(text);
    if (!match) throw new Error(`Ancla no reconocida: ${row}`);
    return { origin, file: match[1].replaceAll('\\', '/'), line: Number(match[2]), source: match[3].trim(),
      actionId: null, contract: null, persistence: null, owner: null, status: 'CONCILIAR' };
  });
}
const controls = [...parse(original, 'BASELINE'), ...parse(current, 'WORKTREE')];
console.log(JSON.stringify({ baseline, head, warning: 'Índice léxico de anclas, no inventario semántico exhaustivo ni QA. Revisar controles dinámicos, comentarios, campos spread y coincidencias duplicadas; enlazar cada ancla con acciones de la matriz.',
  originalAnchors: controls.filter((item) => item.origin === 'BASELINE').length,
  currentAnchors: controls.filter((item) => item.origin === 'WORKTREE').length, controls }, null, 2));

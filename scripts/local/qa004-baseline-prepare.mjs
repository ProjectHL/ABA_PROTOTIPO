import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = 'C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO';
const ref = 'dc1b0c4';
if (process.env.ABA_QA_PREPARE_UX_BASELINE !== '1') throw new Error('Extracción baseline requiere ABA_QA_PREPARE_UX_BASELINE=1; no se ejecutó.');
if (realpathSync(process.cwd()).replaceAll('\\', '/') !== root) throw new Error('Raíz ABA Desktop no confirmada.');
const gitConfig = path.join(root, '.aba.local/qa/git-empty.config');
if (!existsSync(gitConfig) || readFileSync(gitConfig, 'utf8').trim()) throw new Error('Configuración Git local vacía no confirmada.');
const env = { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: gitConfig, GIT_OPTIONAL_LOCKS: '0' };
const git = args => execFileSync('git', args, { cwd: root, env, maxBuffer: 20 * 1024 * 1024, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
if (git(['rev-parse', '--show-toplevel']).toString().trim().replaceAll('\\', '/') !== root) throw new Error('Checkout Git distinto del autorizado.');
const commit = git(['rev-parse', `${ref}^{commit}`]).toString().trim();
if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('Ref baseline no resolvió a commit.');
const target = path.join(root, '.aba.local/qa/ux-baseline-dc1b0c4');
if (existsSync(target)) throw new Error('Destino ya existe; se conserva. No se sobrescribe ni limpia.');
const extras = new Set(['index.html', 'package.json', 'package-lock.json', 'vite.config.ts', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json']);
const tree = git(['ls-tree', '-r', '--name-only', commit]).toString().trim().split('\n');
const files = tree.filter(name => name.startsWith('src/') || name.startsWith('public/') || extras.has(name));
for (const file of files) {
  const pieces = file.split('/');
  if (pieces.some(p => p === '..' || p === '.' || !p) || path.isAbsolute(file) || file.includes('\\') || /(^|\/)\.env(?:\.|$)/.test(file)) throw new Error('Ruta de extracción no válida.');
  const dest = path.resolve(target, file);
  if (!dest.startsWith(path.resolve(target) + path.sep)) throw new Error('Destino fuera de baseline.');
  const mode = git(['ls-tree', commit, '--', file]).toString().split(' ')[0];
  if (mode !== '100644' && mode !== '100755') throw new Error('Sólo blobs regulares, sin symlinks/submódulos.');
}
if (!files.includes('src/App.tsx') || !files.includes('vite.config.ts') || !files.includes('package-lock.json')) throw new Error('Baseline frontend incompleto.');
mkdirSync(target, { recursive: false });
const manifest = { schemaVersion: 1, extractedAt: new Date().toISOString(), ref, commit, rootRelative: '.aba.local/qa/ux-baseline-dc1b0c4', purpose: 'Frontend sintético de referencia UX; nunca candidato producto ni backend.', scriptsExecuted: false, servicesStarted: false, dependenciesInstalled: false, files: [] };
for (const file of files) {
  const data = git(['show', `${commit}:${file}`]);
  const dest = path.join(target, file);
  mkdirSync(path.dirname(dest), { recursive: true });
  writeFileSync(dest, data, { flag: 'wx' });
  manifest.files.push({ path: file, bytes: data.byteLength, sha256: createHash('sha256').update(data).digest('hex') });
}
writeFileSync(path.join(target, 'qa-baseline-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: 'extracted', ref, commit, files: files.length, destination: manifest.rootRelative, scriptsExecuted: false, servicesStarted: false, dependenciesInstalled: false }));

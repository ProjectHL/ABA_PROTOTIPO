import { spawn, execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, writeSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { localStatus, state, root } from './write-env.mjs';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const container = 'supabase_db_aba-reintegration-local';
const docker = path.join(process.env.LOCALAPPDATA ?? '', 'Programs/DockerDesktop/resources/bin/docker.exe');
const cleanupRoot = path.join(state, 'attachment-cleanup');
export const digest = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
export function uuid(value) { if (!uuidPattern.test(value ?? '')) throw new Error('UUID requerido.'); return value.toLowerCase(); }
export function retention(value) { const days = Number(value); if (!Number.isSafeInteger(days) || days < 1 || days > 36500) throw new Error('Retención explícita entre 1 y 36500 días requerida.'); return days; }
const quote = value => "'" + String(value).replaceAll("'", "''") + "'";

function safeDirectory(id, create = false) {
  id = uuid(id);
  for (const directory of [state, cleanupRoot, path.join(cleanupRoot, id)]) {
    if (create && !existsSync(directory)) mkdirSync(directory);
    if (!existsSync(directory) || lstatSync(directory).isSymbolicLink() || !lstatSync(directory).isDirectory()) throw new Error('Directorio privado inválido.');
  }
  return path.join(cleanupRoot, id);
}
function persist(filename, value, append = false) {
  if (existsSync(filename) && lstatSync(filename).isSymbolicLink()) throw new Error('Enlace de archivo rechazado.');
  const fd = openSync(filename, append ? 'a' : 'wx', 0o600);
  try { writeSync(fd, Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value) + '\n')); fsyncSync(fd); } finally { closeSync(fd); }
}
function readJson(filename) {
  if (lstatSync(filename).isSymbolicLink()) throw new Error('Enlace de archivo rechazado.');
  return JSON.parse(readFileSync(filename, 'utf8'));
}
function readBytes(filename) {
  const stat = lstatSync(filename);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('Archivo de respaldo inválido.');
  return readFileSync(filename);
}

// One psql session keeps authorization/reference locks across each Storage I/O.
// No SQL DELETE, UPDATE, DDL or public RPC is used by this administrative tool.
class DatabaseSession {
  constructor() {
    this.child = spawn(docker, ['exec', '-i', container, 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres'], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    this.buffer = ''; this.pending = null; this.closed = false;
    this.child.stdout.on('data', bytes => { this.buffer += bytes.toString().replaceAll('\r', ''); this.flush(); });
    this.child.stderr.on('data', () => {}); // Never print SQL/context or credentials.
    this.child.on('error', () => this.fail());
    this.child.on('exit', () => { this.closed = true; this.fail(); });
  }
  fail() { if (this.pending) { clearTimeout(this.pending.timer); this.pending.reject(new Error('Sesión DB no confirmada; operación detenida.')); this.pending = null; } }
  flush() {
    if (!this.pending) return;
    const at = this.buffer.indexOf(this.pending.marker + '\n');
    if (at < 0) return;
    const output = this.buffer.slice(0, at).trim();
    this.buffer = this.buffer.slice(at + this.pending.marker.length + 1);
    const pending = this.pending; this.pending = null; clearTimeout(pending.timer); pending.resolve(output);
  }
  query(sql) {
    if (this.closed || this.pending) throw new Error('Sesión DB no disponible.');
    return new Promise((resolve, reject) => {
      const marker = 'ABA_' + randomUUID().replaceAll('-', '');
      const timer = setTimeout(() => { this.fail(); this.child.kill(); }, 15000);
      this.pending = { marker, resolve, reject, timer };
      this.child.stdin.write(sql + '\nselect ' + quote(marker) + ';\n');
    });
  }
  async close() {
    try { if (!this.closed && !this.pending) await this.query('rollback;'); } finally { this.child.stdin.end(); this.child.kill(); }
  }
}

const lockedTables = ['attachment_records', 'attachment_versions', 'memberships', 'organizations', 'test_data_batches', 'client_profiles_v2', 'consent_records', 'commercial_documents_v2', 'family_publications_v2', 'family_publication_resources_v2', 'chat_message_attachments_v2'];
const reviewedForeignKeys = [
  'public.consent_records|evidence_attachment_id|public.attachment_records|id',
  'public.client_profiles_v2|photo_attachment_id|public.attachment_records|id',
  'public.attachment_records|current_version_id,id|public.attachment_versions|id,attachment_id',
  'public.attachment_versions|attachment_id|public.attachment_records|id',
  'public.attachment_versions|supersedes_version_id,attachment_id|public.attachment_versions|id,attachment_id',
  'public.attachment_events_v2|attachment_id|public.attachment_records|id',
  'public.attachment_events_v2|version_id,attachment_id|public.attachment_versions|id,attachment_id',
  'public.commercial_documents_v2|attachment_record_id,organization_id,id|public.attachment_records|id,organization_id,commercial_document_id',
  'public.commercial_documents_v2|attachment_version_id,attachment_record_id|public.attachment_versions|id,attachment_id',
  'public.chat_message_attachments_v2|attachment_version_id,attachment_id|public.attachment_versions|id,attachment_id',
];
export function inventorySql(plan) {
  const clinic = quote(uuid(plan.clinicId)), batch = quote(uuid(plan.batchId));
  return `select coalesce(jsonb_agg(item order by item->>'versionId'),'[]'::jsonb) from (
    select jsonb_build_object('attachmentId',a.id,'versionId',v.id,'version',v.version,
      'clinicId',a.organization_id,'batchId',a.test_run_id,'purpose',a.purpose,
      'recordState',a.state,'versionState',v.state,'archivedAt',v.archived_at,
      'recordArchivedAt',a.archived_at,'bucket',v.bucket_id,'objectKey',v.object_key,
      'byteLength',v.byte_length,'sha256',v.sha256,
      'references',array_remove(array[
        case when exists(select 1 from public.client_profiles_v2 p where p.photo_attachment_id=a.id) then 'photo' end,
        case when exists(select 1 from public.consent_records c where c.evidence_attachment_id=a.id) then 'consent' end,
        case when exists(select 1 from public.commercial_documents_v2 d where d.attachment_record_id=a.id or d.attachment_version_id=v.id) then 'commercial' end,
        case when exists(select 1 from public.family_publication_resources_v2 r where r.resource_kind='attachment-version' and r.resource_id=v.id) then 'family-manifest' end,
        case when exists(select 1 from public.chat_message_attachments_v2 c where c.attachment_id=a.id or c.attachment_version_id=v.id) then 'chat' end
      ],null)) item
    from public.attachment_records a join public.attachment_versions v on v.attachment_id=a.id
    where a.organization_id=${clinic}::uuid and a.test_run_id=${batch}::uuid
  ) objects;`;
}
export function exclusionReasons(object, plan, now = Date.now()) {
  const reasons = [...(object.references ?? [])];
  if (object.clinicId !== plan.clinicId || object.batchId !== plan.batchId) reasons.push('scope');
  if (object.purpose !== 'student-document') reasons.push('purpose');
  if (object.recordState !== 'archived' || object.versionState !== 'archived') reasons.push('not-archived');
  if (object.bucket !== 'clinical-attachments') reasons.push('bucket');
  if (typeof object.objectKey !== 'string' || !object.objectKey || object.objectKey.length > 1000 || object.objectKey.split('/').some(part => !part || part === '.' || part === '..') || /[\u0000-\u001f\\]/.test(object.objectKey)) reasons.push('path');
  const age = Math.max(Date.parse(object.archivedAt), Date.parse(object.recordArchivedAt));
  if (!Number.isFinite(age) || now - age < retention(plan.retentionDays) * 86400000) reasons.push('retention');
  if (!Number.isSafeInteger(object.byteLength) || object.byteLength < 1 || object.byteLength > 20971520 || !/^[a-f0-9]{64}$/.test(object.sha256 ?? '')) reasons.push('integrity');
  if (plan.operationsSettled !== true) reasons.push('uncertain-operations');
  return [...new Set(reasons)];
}
export function validatePreview(preview) {
  const { previewHash, ...plan } = preview;
  if (previewHash !== digest(plan) || plan.schemaVersion !== 1 || plan.apiUrl !== 'http://127.0.0.1:54321') throw new Error('Preview modificado o destino inválido.');
  for (const key of ['previewId', 'clinicId', 'batchId', 'actorId']) uuid(plan[key]);
  retention(plan.retentionDays);
  if (plan.operationsSettled !== true || !Array.isArray(plan.candidates) || !Array.isArray(plan.excluded)) throw new Error('Preview incompleto.');
  const ids = new Set();
  for (const object of plan.candidates) {
    uuid(object.versionId); uuid(object.attachmentId);
    if (ids.has(object.versionId) || exclusionReasons(object, plan, Date.parse(plan.createdAt)).length) throw new Error('Candidato inválido en preview.');
    ids.add(object.versionId);
  }
  return preview;
}
export const confirmationFor = preview => `DELETE ATTACHMENT OBJECTS ${preview.previewId} ${preview.previewHash}`;

async function authorize(status, plan) {
  const token = process.env.ABA_CLEANUP_ACCESS_TOKEN;
  if (!token) throw new Error('Sesión Auth del administrador requerida en ABA_CLEANUP_ACCESS_TOKEN; nunca se registra el token.');
  const client = createClient(status.API_URL, status.ANON_KEY ?? status.PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getUser(token);
  if (error || data.user?.id !== plan.actorId) throw new Error('Identidad Auth del operador no confirmada.');
}
async function openScope(status, plan) {
  await authorize(status, plan);
  const db = new DatabaseSession();
  try {
    await db.query("begin; set local lock_timeout='3s'; set local statement_timeout='10s'; set local idle_in_transaction_session_timeout='30s';");
    const acquired = await db.query(`select pg_try_advisory_xact_lock(hashtextextended(${quote('aba-attachment-cleanup:' + plan.clinicId + ':' + plan.batchId)},0));`);
    if (acquired !== 't') throw new Error('Otro operador está trabajando en esta clínica/lote.');
    await db.query('lock table ' + lockedTables.map(name => 'public.' + name).join(',') + ' in share mode;');
    const eligible = await db.query(`select exists(select 1 from public.memberships m join public.organizations o on o.id=m.organization_id join public.test_data_batches b on b.organization_id=o.id
      where m.user_id=${quote(uuid(plan.actorId))}::uuid and m.organization_id=${quote(uuid(plan.clinicId))}::uuid and m.role='admin' and m.status='active' and o.status='active' and b.id=${quote(uuid(plan.batchId))}::uuid);`);
    if (eligible !== 't') throw new Error('Administrador/clínica/lote no autorizados actualmente.');
    const keys = JSON.parse(await db.query(`select coalesce(jsonb_agg(signature order by signature),'[]'::jsonb) from (
      select n.nspname||'.'||t.relname||'|'||(select string_agg(a.attname,',' order by k.ord) from unnest(c.conkey) with ordinality k(num,ord) join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.num)||'|'||fn.nspname||'.'||ft.relname||'|'||(select string_agg(a.attname,',' order by k.ord) from unnest(c.confkey) with ordinality k(num,ord) join pg_attribute a on a.attrelid=c.confrelid and a.attnum=k.num) signature
      from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace join pg_class ft on ft.oid=c.confrelid join pg_namespace fn on fn.oid=ft.relnamespace
      where c.contype='f' and c.confrelid in ('public.attachment_records'::regclass,'public.attachment_versions'::regclass)
    ) reviewed;`));
    if (JSON.stringify(keys) !== JSON.stringify([...reviewedForeignKeys].sort())) throw new Error('Referencias FK de esquema cambiaron; limpieza rechazada.');
    return db;
  } catch (error) { await db.close(); throw error; }
}
const inventory = async (db, plan) => JSON.parse(await db.query(inventorySql(plan)));
async function exactObject(db, plan, expected) {
  const current = (await inventory(db, plan)).find(object => object.versionId === expected.versionId);
  if (!current || digest(current) !== digest(expected) || exclusionReasons(current, plan).length) throw new Error('Objeto/referencias/retención cambiaron; requiere otro preview.');
  return current;
}
function storageClient(status) {
  if (!status.SERVICE_ROLE_KEY) throw new Error('Credencial administrativa local no disponible.');
  return createClient(status.API_URL, status.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(12000) }) } });
}
async function download(client, object) {
  const { data, error } = await client.storage.from(object.bucket).download(object.objectKey);
  if (error || !data) throw new Error('Objeto Storage no disponible para respaldo.');
  const bytes = Buffer.from(await data.arrayBuffer());
  if (bytes.length !== object.byteLength || digest(bytes) !== object.sha256) throw new Error('Integridad de Storage no confirmada.');
  return bytes;
}
async function present(db, object) {
  return await db.query(`select exists(select 1 from storage.objects where bucket_id=${quote(object.bucket)} and name=${quote(object.objectKey)});`) === 't';
}
const journalPath = directory => path.join(directory, 'receipts.jsonl');
function receipts(directory) {
  const file = journalPath(directory);
  if (!existsSync(file)) return [];
  if (lstatSync(file).isSymbolicLink()) throw new Error('Journal inválido.');
  return readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
}
export async function main(args) {
  const [mode, id, ...rest] = args;
  if (mode === '--help' || !mode) {
    console.log('preview <clinic UUID> <batch UUID> <actor UUID> <retention days> SETTLED\nbackup <preview UUID>\napply <preview UUID> <exact confirmation>\nreconcile <preview UUID>\nLocal only. Auth admin token required. No automatic deletion.'); return;
  }
  if (!['preview', 'backup', 'apply', 'reconcile'].includes(mode)) throw new Error('Modo desconocido.');
  if (path.resolve(root).toLowerCase() !== path.resolve('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO').toLowerCase()) throw new Error('Sólo checkout Desktop autorizado.');
  const status = localStatus(); // Existing loopback/project/network checks, keys remain in memory.
  if (mode === 'preview') {
    if (rest.length !== 4 || rest[3] !== 'SETTLED') throw new Error('Confirmar explícitamente operaciones inciertas resueltas y política de retención.');
    const plan = { schemaVersion: 1, previewId: randomUUID(), apiUrl: status.API_URL, clinicId: uuid(id), batchId: uuid(rest[0]), actorId: uuid(rest[1]), retentionDays: retention(rest[2]), operationsSettled: true, createdAt: new Date().toISOString() };
    const db = await openScope(status, plan);
    try {
      const objects = await inventory(db, plan);
      const candidates = [], excluded = [];
      for (const object of objects) { const reasons = exclusionReasons(object, plan); if (reasons.length) excluded.push({ ...object, reasons }); else candidates.push(object); }
      const body = { ...plan, candidates, excluded }, preview = { ...body, previewHash: digest(body) };
      const directory = safeDirectory(plan.previewId, true);
      persist(path.join(directory, 'preview.json'), preview);
      console.log(JSON.stringify({ ...preview, requiredConfirmation: confirmationFor(preview), note: 'No eliminación. Preview contiene rutas privadas, no credenciales; conservar fuera de Git.' }, null, 2));
    } finally { await db.close(); }
    return;
  }
  const directory = safeDirectory(id);
  const plan = validatePreview(readJson(path.join(directory, 'preview.json')));
  if (plan.previewId !== uuid(id) || plan.apiUrl !== status.API_URL) throw new Error('Preview/destino no coinciden.');
  if (mode === 'apply' && (rest.length !== 1 || rest[0] !== confirmationFor(plan))) throw new Error('Falta autorización específica del preview exacto. No eliminado.');
  if (mode !== 'apply' && rest.length) throw new Error('Argumentos adicionales rechazados.');
  const client = storageClient(status);
  if (mode === 'backup') {
    if (existsSync(path.join(directory, 'backup.json'))) throw new Error('Respaldo completo existente; no se sobrescribe.');
    const db = await openScope(status, plan);
    try {
      // Complete metadata dump includes sensitive Auth: private local artifact only.
      const dump = execFileSync(docker, ['exec', container, 'pg_dump', '-U', 'postgres', '-Fc', 'postgres'], { windowsHide: true, maxBuffer: 256 * 1024 * 1024, timeout: 12000, stdio: ['ignore', 'pipe', 'pipe'] });
      const dumpFile = path.join(directory, 'metadata.dump');
      if (!existsSync(dumpFile)) persist(dumpFile, dump);
      else if (digest(readBytes(dumpFile)) !== digest(dump)) throw new Error('Respaldo parcial anterior: crear otro preview, no sobrescribir.');
      await db.query('select 1;');
      const objects = [];
      for (const expected of plan.candidates) {
        const object = await exactObject(db, plan, expected);
        const bytes = await download(client, object);
        await exactObject(db, plan, expected);
        const filename = path.join(directory, object.versionId + '.bin');
        if (!existsSync(filename)) persist(filename, bytes);
        else if (digest(readBytes(filename)) !== object.sha256) throw new Error('Respaldo de bytes previo inconsistente.');
        objects.push({ versionId: object.versionId, byteLength: bytes.length, sha256: digest(bytes) });
      }
      persist(path.join(directory, 'backup.json'), { previewHash: plan.previewHash, createdAt: new Date().toISOString(), metadataSha256: digest(readBytes(dumpFile)), objects });
      console.log(JSON.stringify({ previewId: id, backedUp: objects.length, deleted: false }));
    } finally { await db.close(); }
    return;
  }
  if (mode === 'reconcile') {
    const db = await openScope(status, plan);
    try { const results = []; for (const object of plan.candidates) results.push({ versionId: object.versionId, present: await present(db, object), receipts: receipts(directory).filter(row => row.versionId === object.versionId) }); console.log(JSON.stringify({ previewId: id, results }, null, 2)); } finally { await db.close(); }
    return;
  }
  const backup = readJson(path.join(directory, 'backup.json'));
  if (backup.previewHash !== plan.previewHash || digest(readBytes(path.join(directory, 'metadata.dump'))) !== backup.metadataSha256) throw new Error('Respaldo de metadatos/preview no verificado.');
  for (const object of plan.candidates) {
    const saved = backup.objects.find(row => row.versionId === object.versionId);
    if (!saved || saved.sha256 !== object.sha256 || saved.byteLength !== object.byteLength || digest(readBytes(path.join(directory, object.versionId + '.bin'))) !== object.sha256) throw new Error('Respaldo de objetos incompleto/corrupto.');
  }
  const results = [];
  const scopeCheck = await openScope(status, plan);
  await scopeCheck.close(); // Even an empty/already-completed batch requires live authorization.
  for (const expected of plan.candidates) {
    const previous = receipts(directory).filter(row => row.previewHash === plan.previewHash && row.clinicId === plan.clinicId && row.batchId === plan.batchId && row.actorId === plan.actorId && row.attachmentId === expected.attachmentId && row.versionId === expected.versionId && row.bucket === expected.bucket && row.objectKey === expected.objectKey);
    const operationId = randomUUID();
    const record = outcome => ({ operationId, previewHash: plan.previewHash, clinicId: plan.clinicId, batchId: plan.batchId, actorId: plan.actorId, attachmentId: expected.attachmentId, versionId: expected.versionId, bucket: expected.bucket, objectKey: expected.objectKey, timestamp: new Date().toISOString(), outcome });
    let db;
    try {
      db = await openScope(status, plan);
      const object = await exactObject(db, plan, expected);
      if (previous.some(row => row.outcome === 'removed' || row.outcome === 'absent-after-attempt')) {
        if (await present(db, object)) throw new Error('Objeto reaparecido tras recibo; no se elimina automáticamente otra vez.');
        results.push({ versionId: object.versionId, outcome: 'already-confirmed' }); continue;
      }
      if (!await present(db, object)) {
        if (!previous.some(row => row.outcome === 'delete-intent')) throw new Error('Objeto ausente sin intento autorizado registrado.');
        persist(journalPath(directory), record('absent-after-attempt'), true);
        results.push({ versionId: object.versionId, outcome: 'absent-after-attempt' }); continue;
      }
      await download(client, object); // Recheck actual bytes, not only Storage metadata.
      await exactObject(db, plan, expected);
      persist(journalPath(directory), record('delete-intent'), true); // fsync before irreversible I/O.
      const { data, error } = await client.storage.from(object.bucket).remove([object.objectKey]);
      if (error || !Array.isArray(data) || !data.some(row => row.name === object.objectKey) || await present(db, object)) throw new Error('Eliminación no confirmada; conservar resultado incierto para reconciliar.');
      persist(journalPath(directory), record('removed'), true);
      results.push({ versionId: object.versionId, outcome: 'removed' });
    } catch {
      persist(journalPath(directory), record('failed-or-unknown'), true);
      results.push({ versionId: expected.versionId, outcome: 'failed-or-unknown' });
    } finally { if (db) await db.close(); }
  }
  console.log(JSON.stringify({ previewId: id, complete: results.every(row => ['removed', 'absent-after-attempt', 'already-confirmed'].includes(row.outcome)), results, metadataRetained: true }, null, 2));
  if (results.some(row => row.outcome === 'failed-or-unknown')) process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(() => { console.error('Limpieza no completada. Conservar preview/respaldo/recibos para revisión; no se ejecuta reset ni limpieza alternativa.'); process.exitCode = 1; });
}

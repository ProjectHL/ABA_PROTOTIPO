import { z } from 'zod';
import { captureCommandV2Schema } from '../measurements/measurement-v2';
import { sessionCommandV2Schema } from '../sessions/session-v2';
import { readCommandResult } from '../commands/result';

export const offlineScopeSchema = z.object({ userId: z.uuid(), clinicId: z.uuid() }).strict();
export type OfflineScope = z.infer<typeof offlineScopeSchema>;
// Only session/capture operations are offline writable. Program design and administration are deliberately absent.
export const offlineCommandSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('capture'), command: captureCommandV2Schema }).strict(),
  z.object({ kind: z.literal('session'), command: sessionCommandV2Schema }).strict(),
]);
export const syncQueueEntrySchema = z.object({
  id: z.uuid(), scope: offlineScopeSchema, payload: offlineCommandSchema,
  dependsOn: z.array(z.uuid()).max(1000),
  status: z.enum(['pending', 'in-flight', 'acknowledged', 'blocked-conflict', 'blocked-permission', 'blocked-validation', 'superseded']),
  createdAt: z.iso.datetime({ offset: true }), attempts: z.number().int().nonnegative(),
  retryAfter: z.iso.datetime({ offset: true }).nullable(),
  serverVersion: z.number().int().nonnegative().nullable(), serverReceiptId: z.uuid().nullable(),
  error: z.string().max(10000).nullable(), supersedesEntryId: z.uuid().nullable(),
}).strict().superRefine((entry, ctx) => {
  if (entry.dependsOn.includes(entry.id) || new Set(entry.dependsOn).size !== entry.dependsOn.length) ctx.addIssue({ code: 'custom', path: ['dependsOn'], message: 'Dependencias repetidas o sobre sí mismo' });
  if (entry.status === 'acknowledged' && (entry.serverReceiptId === null || entry.serverVersion === null)) ctx.addIssue({ code: 'custom', path: ['serverReceiptId'], message: 'Guardado servidor requiere recibo persistido y versión' });
});
export type SyncQueueEntry = z.infer<typeof syncQueueEntrySchema>;

export function sameOfflineScope(left: OfflineScope, right: OfflineScope): boolean {
  return left.userId === right.userId && left.clinicId === right.clinicId;
}

/** One dependency level at a time: a ready command is not mistaken for a persisted dependency. */
export function planSyncQueue(raw: SyncQueueEntry[], rawScope: OfflineScope, now: string) {
  const scope = offlineScopeSchema.parse(rawScope);
  z.iso.datetime({ offset: true }).parse(now);
  const entries = raw.map((entry) => syncQueueEntrySchema.parse(entry));
  if (new Set(entries.map((entry) => entry.id)).size !== entries.length) throw new Error('ID de cola repetido');
  const scoped = entries.filter((entry) => sameOfflineScope(entry.scope, scope));
  if (new Set(scoped.map((entry) => entry.payload.command.operationId)).size !== scoped.length
    || new Set(scoped.map((entry) => entry.payload.command.idempotencyKey)).size !== scoped.length) {
    throw new Error('Operación o clave idempotente repetida en entradas distintas de la cola');
  }
  const byId = new Map(scoped.map((entry) => [entry.id, entry]));
  const ready: SyncQueueEntry[] = [];
  const waiting: { id: string; reason: string }[] = [];
  const cyclic = (id: string, path = new Set<string>()): boolean => {
    if (path.has(id)) return true;
    const item = byId.get(id);
    if (!item || item.status === 'acknowledged') return false;
    const next = new Set(path); next.add(id);
    return item.dependsOn.some((dependency) => cyclic(dependency, next));
  };
  for (const entry of scoped) {
    if (entry.status !== 'pending') continue;
    if (cyclic(entry.id)) { waiting.push({ id: entry.id, reason: 'dependency-cycle' }); continue; }
    if (entry.retryAfter && Date.parse(entry.retryAfter) > Date.parse(now)) { waiting.push({ id: entry.id, reason: 'retry-delay' }); continue; }
    if (entry.dependsOn.some((id) => !byId.has(id))) { waiting.push({ id: entry.id, reason: 'dependency-missing' }); continue; }
    if (entry.dependsOn.some((id) => byId.get(id)!.status !== 'acknowledged')) { waiting.push({ id: entry.id, reason: 'dependency-not-persisted' }); continue; }
    ready.push(entry);
  }
  ready.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id));
  return { ready, waiting, blocked: scoped.filter((entry) => entry.status.startsWith('blocked-')) };
}

/** After reload, retry ambiguous sends with the exact original operation/idempotency key. No success is invented. */
export function recoverInterruptedQueue(raw: SyncQueueEntry[], scope: OfflineScope): SyncQueueEntry[] {
  offlineScopeSchema.parse(scope);
  return raw.map((item) => {
    const entry = syncQueueEntrySchema.parse(item);
    return sameOfflineScope(entry.scope, scope) && entry.status === 'in-flight'
      ? { ...entry, status: 'pending', error: 'Envío interrumpido; confirmación servidor pendiente' }
      : entry;
  });
}

export const downloadedStudentManifestSchema = z.object({
  schemaVersion: z.literal(1), scope: offlineScopeSchema, studentId: z.uuid(),
  downloadedAt: z.iso.datetime({ offset: true }), serverVersion: z.number().int().nonnegative(),
  selectedAttachmentVersionIds: z.array(z.uuid()).max(1000),
  permissionCheckedAt: z.iso.datetime({ offset: true }),
}).strict();

/** Pure transition; the IndexedDB adapter must commit it atomically before rendering success. */
export function applySyncResult(rawEntry: SyncQueueEntry, rawResult: unknown, scope: OfflineScope): SyncQueueEntry {
  const entry = syncQueueEntrySchema.parse(rawEntry);
  const authorizedScope = offlineScopeSchema.parse(scope);
  if (!sameOfflineScope(entry.scope, authorizedScope)) throw new Error('Resultado fuera del usuario/clínica activos');
  if (entry.status !== 'in-flight' && entry.status !== 'pending') throw new Error('La operación no admite resultado de envío');
  const command = entry.payload.command;
  const resourceId = entry.payload.kind === 'capture' ? entry.payload.command.recordId : entry.payload.command.sessionId;
  const result = readCommandResult(rawResult, { operationId: command.operationId, idempotencyKey: command.idempotencyKey, resourceId });
  if (result.status === 'acknowledged') {
    return syncQueueEntrySchema.parse({ ...entry, status: 'acknowledged', serverReceiptId: result.receiptId,
      serverVersion: result.serverVersion, retryAfter: null, error: null });
  }
  if (result.status === 'conflict') {
    if (result.code === 'version-conflict') {
      if (result.expectedVersion !== command.expectedVersion) throw new Error('Conflicto no corresponde a la versión enviada');
      if (result.currentVersion === result.expectedVersion) throw new Error('Conflicto de versión sin diferencia de versiones');
    }
    return syncQueueEntrySchema.parse({ ...entry, status: 'blocked-conflict', retryAfter: null,
      serverReceiptId: null, serverVersion: null, error: `${result.code}: ${result.message}` });
  }
  return syncQueueEntrySchema.parse({ ...entry,
    status: result.code === 'permission-denied' || result.code === 'resource-unavailable' ? 'blocked-permission' : 'blocked-validation',
    retryAfter: null, serverReceiptId: null, serverVersion: null, error: `${result.code}: ${result.message}` });
}

// Adapters must persist queue changes atomically in IndexedDB before claiming local durability.
// A scope change locks previous data. Reconnection rechecks resource permissions before every command.
// A permission rejection blocks, never discards. A conflict preserves local content and requires a visible new revision.
// Resolving a conflict creates a new operation/key linked by supersedesEntryId; no last-write-wins.
// Logout warns about non-acknowledged work before any explicit destructive cache discard.

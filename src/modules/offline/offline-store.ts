import {
    offlineCommandSchema,
    offlineScopeSchema,
    recoverInterruptedQueue,
    syncQueueEntrySchema,
    type OfflineScope,
    type SyncQueueEntry,
} from '@/domain/offline/sync';
import type { ProgramSessionPageData } from '@/modules/program-session';
import type { IdentityDto } from '@/features/team/identity.types';
import { attachmentVersionSchema, verifyAttachmentUpload, type AttachmentVersion } from '@/domain/attachments/attachment';

const databaseName = 'aba-offline-v1';
const databaseVersion = 3;

type StoredQueueEntry = SyncQueueEntry & { scopeKey: string };
type StoredStudentSnapshot = OfflineStudentSnapshot & { key: string; scopeKey: string };
type StoredAttachment = OfflineAttachment & { key: string; scopeKey: string; studentKey: string };

export type OfflineStudentSnapshot = {
    schemaVersion: 1;
    scope: OfflineScope;
    studentId: string;
    cachedAt: string;
    data: ProgramSessionPageData;
    selectedAttachmentVersionIds: string[];
};

export type OfflineAttachmentMetadata = {
    schemaVersion: 1;
    scope: OfflineScope;
    studentId: string;
    version: AttachmentVersion;
    cachedAt: string;
};

export type OfflineAttachment = OfflineAttachmentMetadata & { blob: Blob };

function keyForScope(scope: OfflineScope) {
    const parsed = offlineScopeSchema.parse(scope);
    return `${parsed.userId}:${parsed.clinicId}`;
}

function keyForStudent(scope: OfflineScope, studentId: string) {
    return `${keyForScope(scope)}:${studentId}`;
}

function keyForAttachment(scope: OfflineScope, studentId: string, versionId: string) {
    return `${keyForStudent(scope, studentId)}:${versionId}`;
}

function requestResult<T>(request: IDBRequest<T>) {
    return new Promise<T>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB no confirmó la operación.'));
    });
}

function transactionDone(transaction: IDBTransaction) {
    return new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB no confirmó la transacción.'));
        transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB abortó la transacción.'));
    });
}

async function openDatabase() {
    if (typeof indexedDB === 'undefined') throw new Error('Este navegador no ofrece IndexedDB.');
    const request = indexedDB.open(databaseName, databaseVersion);
    request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains('queue')) {
            const queue = database.createObjectStore('queue', { keyPath: 'id' });
            queue.createIndex('scopeKey', 'scopeKey', { unique: false });
        }
        if (!database.objectStoreNames.contains('students')) {
            const students = database.createObjectStore('students', { keyPath: 'key' });
            students.createIndex('scopeKey', 'scopeKey', { unique: false });
        }
        if (!database.objectStoreNames.contains('identities')) database.createObjectStore('identities', { keyPath: 'userId' });
        if (!database.objectStoreNames.contains('attachments')) {
            const attachments = database.createObjectStore('attachments', { keyPath: 'key' });
            attachments.createIndex('scopeKey', 'scopeKey', { unique: false });
            attachments.createIndex('studentKey', 'studentKey', { unique: false });
        }
    };
    return requestResult(request);
}

export async function putOfflineIdentity(identity: IdentityDto) {
    const database = await openDatabase();
    try {
        const transaction = database.transaction('identities', 'readwrite');
        transaction.objectStore('identities').put(identity);
        await transactionDone(transaction);
    } finally {
        database.close();
    }
}

export async function getOfflineIdentity(userId: string): Promise<IdentityDto | null> {
    const database = await openDatabase();
    try {
        const transaction = database.transaction('identities', 'readonly');
        const identity = await requestResult(transaction.objectStore('identities').get(userId)) as IdentityDto | undefined;
        await transactionDone(transaction);
        return identity ?? null;
    } finally {
        database.close();
    }
}

export async function listOfflineQueue(scope: OfflineScope): Promise<SyncQueueEntry[]> {
    const database = await openDatabase();
    try {
        const transaction = database.transaction('queue', 'readonly');
        const stored = await requestResult(transaction.objectStore('queue').index('scopeKey').getAll(keyForScope(scope))) as StoredQueueEntry[];
        await transactionDone(transaction);
        return stored.map(({ scopeKey: _scopeKey, ...entry }) => syncQueueEntrySchema.parse(entry));
    } finally {
        database.close();
    }
}

export async function replaceOfflineQueue(scope: OfflineScope, entries: SyncQueueEntry[]) {
    const parsedScope = offlineScopeSchema.parse(scope);
    const parsedEntries = entries.map((entry) => syncQueueEntrySchema.parse(entry));
    if (parsedEntries.some((entry) => entry.scope.userId !== parsedScope.userId || entry.scope.clinicId !== parsedScope.clinicId)) {
        throw new Error('La cola contiene operaciones de otro usuario o clínica.');
    }
    const database = await openDatabase();
    try {
        const transaction = database.transaction('queue', 'readwrite');
        const store = transaction.objectStore('queue');
        const current = await requestResult(store.index('scopeKey').getAllKeys(keyForScope(parsedScope)));
        for (const key of current) store.delete(key);
        for (const entry of parsedEntries) store.put({ ...entry, scopeKey: keyForScope(parsedScope) } satisfies StoredQueueEntry);
        await transactionDone(transaction);
    } finally {
        database.close();
    }
}

export async function recoverOfflineQueue(scope: OfflineScope) {
    const database = await openDatabase();
    try {
        const transaction = database.transaction('queue', 'readwrite');
        const store = transaction.objectStore('queue');
        const stored = await requestResult(store.index('scopeKey').getAll(keyForScope(scope))) as StoredQueueEntry[];
        const current = stored.map(({ scopeKey: _scopeKey, ...entry }) => syncQueueEntrySchema.parse(entry));
        const recovered = recoverInterruptedQueue(current, scope);
        for (let index = 0; index < recovered.length; index += 1) {
            if (current[index].status === 'in-flight') store.put({ ...recovered[index], scopeKey: keyForScope(scope) } satisfies StoredQueueEntry);
        }
        await transactionDone(transaction);
        return recovered;
    } finally { database.close(); }
}

export async function enqueueOfflineCommand({
    scope,
    payload,
    dependsOn = [],
}: {
    scope: OfflineScope;
    payload: unknown;
    dependsOn?: string[];
}) {
    const entry = syncQueueEntrySchema.parse({
        id: crypto.randomUUID(),
        scope: offlineScopeSchema.parse(scope),
        payload: offlineCommandSchema.parse(payload),
        dependsOn,
        status: 'pending',
        createdAt: new Date().toISOString(),
        attempts: 0,
        retryAfter: null,
        serverVersion: null,
        serverReceiptId: null,
        error: null,
        supersedesEntryId: null,
    });
    const database = await openDatabase();
    try {
        const transaction = database.transaction('queue', 'readwrite');
        transaction.objectStore('queue').add({ ...entry, scopeKey: keyForScope(entry.scope) } satisfies StoredQueueEntry);
        await transactionDone(transaction);
        return entry;
    } finally {
        database.close();
    }
}

export async function supersedeOfflineCommand({
    scope,
    entryId,
    payload,
}: {
    scope: OfflineScope;
    entryId: string;
    payload: unknown;
}) {
    const parsedScope = offlineScopeSchema.parse(scope);
    const parsedPayload = offlineCommandSchema.parse(payload);
    const database = await openDatabase();
    try {
        const transaction = database.transaction('queue', 'readwrite');
        const store = transaction.objectStore('queue');
        const stored = await requestResult(store.index('scopeKey').getAll(keyForScope(parsedScope))) as StoredQueueEntry[];
        const entries = stored.map(({ scopeKey: _scopeKey, ...entry }) => syncQueueEntrySchema.parse(entry));
        const previous = entries.find((entry) => entry.id === entryId);
        if (!previous || previous.status !== 'blocked-conflict') throw new Error('El conflicto ya no está disponible para resolverlo.');
        if (previous.payload.kind !== parsedPayload.kind) throw new Error('La nueva operación no corresponde al conflicto.');
        let sameResource = false;
        if (previous.payload.kind === 'session' && parsedPayload.kind === 'session') {
            const previousCommand = previous.payload.command;
            const nextCommand = parsedPayload.command;
            sameResource = previousCommand.studentId === nextCommand.studentId && previousCommand.sessionId === nextCommand.sessionId;
        } else if (previous.payload.kind === 'capture' && parsedPayload.kind === 'capture') {
            const previousCommand = previous.payload.command;
            const nextCommand = parsedPayload.command;
            sameResource = previousCommand.studentId === nextCommand.studentId && previousCommand.sessionId === nextCommand.sessionId && previousCommand.recordId === nextCommand.recordId;
        }
        if (!sameResource) throw new Error('La nueva operación apunta a otro recurso.');
        const previousCommand = previous.payload.command;
        const nextCommand = parsedPayload.command;
        if (previousCommand.operationId === nextCommand.operationId || previousCommand.idempotencyKey === nextCommand.idempotencyKey) {
            throw new Error('Resolver un conflicto requiere una operación y clave idempotente nuevas.');
        }
        const next = syncQueueEntrySchema.parse({
            id: crypto.randomUUID(), scope: parsedScope, payload: parsedPayload,
            dependsOn: previous.dependsOn, status: 'pending', createdAt: new Date().toISOString(), attempts: 0,
            retryAfter: null, serverVersion: null, serverReceiptId: null, error: null, supersedesEntryId: previous.id,
        });
        for (const entry of entries) {
            if (entry.id === previous.id) {
                store.put({ ...entry, status: 'superseded', error: 'Conflicto revisado y sustituido por una nueva operación explícita.', scopeKey: keyForScope(parsedScope) } satisfies StoredQueueEntry);
                continue;
            }
            const dependsOn = entry.dependsOn.includes(previous.id)
                ? [...new Set(entry.dependsOn.map((dependency) => dependency === previous.id ? next.id : dependency))]
                : entry.dependsOn;
            store.put({ ...entry, dependsOn, scopeKey: keyForScope(parsedScope) } satisfies StoredQueueEntry);
        }
        store.add({ ...next, scopeKey: keyForScope(parsedScope) } satisfies StoredQueueEntry);
        await transactionDone(transaction);
        return next;
    } finally {
        database.close();
    }
}

export async function putOfflineQueueEntry(scope: OfflineScope, rawEntry: SyncQueueEntry) {
    const parsedScope = offlineScopeSchema.parse(scope);
    const entry = syncQueueEntrySchema.parse(rawEntry);
    if (entry.scope.userId !== parsedScope.userId || entry.scope.clinicId !== parsedScope.clinicId) {
        throw new Error('La operación no pertenece al alcance activo.');
    }
    const database = await openDatabase();
    try {
        const transaction = database.transaction('queue', 'readwrite');
        const store = transaction.objectStore('queue');
        const previous = await requestResult(store.get(entry.id)) as StoredQueueEntry | undefined;
        if (!previous || previous.scopeKey !== keyForScope(parsedScope)) throw new Error('La operación ya no está disponible en este alcance; no se recreó.');
        if (previous.status === 'acknowledged' || previous.status === 'superseded') {
            await transactionDone(transaction);
            return;
        }
        store.put({ ...entry, scopeKey: keyForScope(parsedScope) } satisfies StoredQueueEntry);
        await transactionDone(transaction);
    } finally {
        database.close();
    }
}

export async function discardUnacknowledgedQueue(scope: OfflineScope) {
    const database = await openDatabase();
    try {
        const transaction = database.transaction('queue', 'readwrite');
        const store = transaction.objectStore('queue');
        const stored = await requestResult(store.index('scopeKey').getAll(keyForScope(scope))) as StoredQueueEntry[];
        if (stored.some(entry => entry.status === 'in-flight')) throw new Error('Hay un envío en curso. Espera su resultado antes de descartar.');
        let discarded = 0;
        for (const entry of stored) {
            if (entry.status !== 'acknowledged' && entry.status !== 'superseded') { store.delete(entry.id); discarded += 1; }
        }
        await transactionDone(transaction);
        return discarded;
    } finally { database.close(); }
}

export async function putOfflineStudentSnapshot(snapshot: OfflineStudentSnapshot) {
    const scope = offlineScopeSchema.parse(snapshot.scope);
    if (snapshot.schemaVersion !== 1 || snapshot.studentId !== snapshot.data.studentId || snapshot.data.clinicId !== scope.clinicId) {
        throw new Error('La ficha descargada no corresponde al alcance activo.');
    }
    const stored: StoredStudentSnapshot = {
        ...snapshot,
        key: keyForStudent(scope, snapshot.studentId),
        scopeKey: keyForScope(scope),
    };
    const database = await openDatabase();
    try {
        const transaction = database.transaction('students', 'readwrite');
        transaction.objectStore('students').put(stored);
        await transactionDone(transaction);
    } finally {
        database.close();
    }
}

export async function getOfflineStudentSnapshot(scope: OfflineScope, studentId: string): Promise<OfflineStudentSnapshot | null> {
    const database = await openDatabase();
    try {
        const transaction = database.transaction('students', 'readonly');
        const stored = await requestResult(transaction.objectStore('students').get(keyForStudent(scope, studentId))) as StoredStudentSnapshot | undefined;
        await transactionDone(transaction);
        if (!stored) return null;
        const { key: _key, scopeKey: _scopeKey, ...snapshot } = stored;
        return snapshot;
    } finally {
        database.close();
    }
}

export async function listOfflineStudentSnapshots(scope: OfflineScope): Promise<OfflineStudentSnapshot[]> {
    const database = await openDatabase();
    try {
        const transaction = database.transaction('students', 'readonly');
        const stored = await requestResult(transaction.objectStore('students').index('scopeKey').getAll(keyForScope(scope))) as StoredStudentSnapshot[];
        await transactionDone(transaction);
        return stored.map(({ key: _key, scopeKey: _scopeKey, ...snapshot }) => snapshot);
    } finally {
        database.close();
    }
}

export async function removeOfflineStudentSnapshot(scope: OfflineScope, studentId: string) {
    const database = await openDatabase();
    try {
        const transaction = database.transaction(['students', 'attachments', 'queue'], 'readwrite');
        const queue = await requestResult(transaction.objectStore('queue').index('scopeKey').getAll(keyForScope(scope))) as StoredQueueEntry[];
        if (queue.some(entry => entry.payload.command.studentId === studentId && entry.status !== 'acknowledged' && entry.status !== 'superseded')) throw new Error('La ficha tiene operaciones pendientes; no se retiró la descarga.');
        transaction.objectStore('students').delete(keyForStudent(scope, studentId));
        const attachmentStore = transaction.objectStore('attachments');
        const attachmentKeys = await requestResult(attachmentStore.index('studentKey').getAllKeys(keyForStudent(scope, studentId)));
        for (const key of attachmentKeys) attachmentStore.delete(key);
        await transactionDone(transaction);
    } finally {
        database.close();
    }
}

export async function putOfflineAttachment(scope: OfflineScope, studentId: string, rawVersion: AttachmentVersion, blob: Blob) {
    const parsedScope = offlineScopeSchema.parse(scope);
    const version = attachmentVersionSchema.parse(rawVersion);
    if (version.resource.kind !== 'student' || version.resource.clinicId !== parsedScope.clinicId || version.resource.studentId !== studentId
        || version.upload.purpose !== 'student-document' || version.state !== 'available') {
        throw new Error('El documento no corresponde a la ficha y clínica activas.');
    }
    const bytes = new Uint8Array(await blob.arrayBuffer());
    await verifyAttachmentUpload(version.upload, bytes);
    const database = await openDatabase();
    try {
        const transaction = database.transaction(['students', 'attachments'], 'readwrite');
        const students = transaction.objectStore('students');
        const studentKey = keyForStudent(parsedScope, studentId);
        const snapshot = await requestResult(students.get(studentKey)) as StoredStudentSnapshot | undefined;
        if (!snapshot) throw new Error('Descarga primero la ficha antes de seleccionar documentos offline.');
        const attachment: OfflineAttachment = {
            schemaVersion: 1, scope: parsedScope, studentId, version, cachedAt: new Date().toISOString(),
            blob: new Blob([bytes], { type: version.upload.mimeType }),
        };
        transaction.objectStore('attachments').put({ ...attachment, key: keyForAttachment(parsedScope, studentId, version.id), scopeKey: keyForScope(parsedScope), studentKey } satisfies StoredAttachment);
        students.put({ ...snapshot, selectedAttachmentVersionIds: [...new Set([...snapshot.selectedAttachmentVersionIds, version.id])] } satisfies StoredStudentSnapshot);
        await transactionDone(transaction);
        const { blob: _blob, ...metadata } = attachment;
        return metadata;
    } finally {
        database.close();
    }
}

export async function listOfflineAttachments(scope: OfflineScope): Promise<OfflineAttachmentMetadata[]> {
    const database = await openDatabase();
    try {
        const transaction = database.transaction('attachments', 'readonly');
        const stored = await requestResult(transaction.objectStore('attachments').index('scopeKey').getAll(keyForScope(scope))) as StoredAttachment[];
        await transactionDone(transaction);
        return stored.map(({ key: _key, scopeKey: _scopeKey, studentKey: _studentKey, blob: _blob, ...metadata }) => metadata);
    } finally {
        database.close();
    }
}

export async function getOfflineAttachment(scope: OfflineScope, studentId: string, versionId: string): Promise<OfflineAttachment | null> {
    const database = await openDatabase();
    try {
        const transaction = database.transaction('attachments', 'readonly');
        const stored = await requestResult(transaction.objectStore('attachments').get(keyForAttachment(scope, studentId, versionId))) as StoredAttachment | undefined;
        await transactionDone(transaction);
        if (!stored) return null;
        const { key: _key, scopeKey: _scopeKey, studentKey: _studentKey, ...attachment } = stored;
        return attachment;
    } finally {
        database.close();
    }
}

export async function removeOfflineAttachment(scope: OfflineScope, studentId: string, versionId: string) {
    const database = await openDatabase();
    try {
        const transaction = database.transaction(['students', 'attachments'], 'readwrite');
        transaction.objectStore('attachments').delete(keyForAttachment(scope, studentId, versionId));
        const students = transaction.objectStore('students');
        const studentKey = keyForStudent(scope, studentId);
        const snapshot = await requestResult(students.get(studentKey)) as StoredStudentSnapshot | undefined;
        if (snapshot) students.put({ ...snapshot, selectedAttachmentVersionIds: snapshot.selectedAttachmentVersionIds.filter((id) => id !== versionId) } satisfies StoredStudentSnapshot);
        await transactionDone(transaction);
    } finally {
        database.close();
    }
}

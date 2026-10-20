'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useIdentity } from '@/context/IdentityContext';
import type { OfflineScope, SyncQueueEntry } from '@/domain/offline/sync';
import {
    discardUnacknowledgedQueue,
    enqueueOfflineCommand,
    getOfflineAttachment,
    listOfflineAttachments,
    listOfflineQueue,
    listOfflineStudentSnapshots,
    putOfflineIdentity,
    putOfflineAttachment,
    putOfflineStudentSnapshot,
    recoverOfflineQueue,
    removeOfflineAttachment,
    removeOfflineStudentSnapshot,
    supersedeOfflineCommand,
    type OfflineAttachmentMetadata,
    type OfflineStudentSnapshot,
} from './offline-store';
import type { ProgramSessionPageData } from '@/modules/program-session';
import type { AttachmentVersion } from '@/domain/attachments/attachment';

type InstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type OfflineContextValue = {
    supported: boolean;
    online: boolean;
    scope: OfflineScope | null;
    queue: SyncQueueEntry[];
    downloads: OfflineStudentSnapshot[];
    documents: OfflineAttachmentMetadata[];
    loading: boolean;
    syncing: boolean;
    error: string | null;
    installAvailable: boolean;
    refresh: () => Promise<void>;
    syncNow: () => Promise<void>;
    enqueue: (payload: unknown, dependsOn?: string[]) => Promise<SyncQueueEntry>;
    supersedeConflict: (entryId: string, payload: unknown) => Promise<SyncQueueEntry>;
    saveStudent: (data: ProgramSessionPageData) => Promise<void>;
    removeStudent: (studentId: string) => Promise<void>;
    saveDocument: (studentId: string, version: AttachmentVersion, blob: Blob) => Promise<void>;
    removeDocument: (studentId: string, versionId: string) => Promise<void>;
    openDocument: (studentId: string, versionId: string, download?: boolean) => Promise<void>;
    discardPending: () => Promise<number>;
    requestInstall: () => Promise<boolean>;
    confirmScopeExit: (label: 'cerrar sesión' | 'cambiar de clínica') => Promise<boolean>;
};

const OfflineContext = createContext<OfflineContextValue | undefined>(undefined);

export function OfflineProvider({ children }: { children: ReactNode }) {
    const { identity, verified } = useIdentity();
    const userId = identity?.userId ?? null;
    const clinicId = identity?.active?.id ?? null;
    const scope = useMemo<OfflineScope | null>(() => userId && clinicId ? { userId, clinicId } : null, [clinicId, userId]);
    const scopeKey = scope ? `${scope.userId}:${scope.clinicId}` : null;
    const [online, setOnline] = useState(true);
    const [queue, setQueue] = useState<SyncQueueEntry[]>([]);
    const [downloads, setDownloads] = useState<OfflineStudentSnapshot[]>([]);
    const [documents, setDocuments] = useState<OfflineAttachmentMetadata[]>([]);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [loadedScopeKey, setLoadedScopeKey] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
    const sequence = useRef(0);
    const syncLock = useRef(false);
    const liveContext = useRef({ scopeKey, verified, online });
    liveContext.current = { scopeKey, verified, online };
    const latestSync = useRef<(() => Promise<void>) | null>(null);
    const supported = typeof window === 'undefined' || 'indexedDB' in window;

    const refresh = useCallback(async () => {
        const request = ++sequence.current;
        if (!scope) {
            setQueue([]);
            setDownloads([]);
            setDocuments([]);
            setError(null);
            setLoadedScopeKey(null);
            return;
        }
        setLoading(true);
        try {
            const [nextQueue, nextDownloads, nextDocuments] = await Promise.all([listOfflineQueue(scope), listOfflineStudentSnapshots(scope), listOfflineAttachments(scope)]);
            if (request !== sequence.current || liveContext.current.scopeKey !== scopeKey) return;
            setQueue(nextQueue);
            setDownloads(nextDownloads);
            setDocuments(nextDocuments);
            setError(null);
        } catch (cause) {
            if (request === sequence.current && liveContext.current.scopeKey === scopeKey) setError(cause instanceof Error ? cause.message : 'No se pudo abrir el almacenamiento offline.');
        } finally {
            if (request === sequence.current && liveContext.current.scopeKey === scopeKey) { setLoading(false); setLoadedScopeKey(scopeKey); }
        }
    }, [scope, scopeKey]);

    useEffect(() => {
        setLoadedScopeKey(null);
        setQueue([]);
        setDownloads([]);
        setDocuments([]);
        void (async () => {
            if (scope) {
                if (navigator.locks) await navigator.locks.request(`aba-offline-sync:${scopeKey}`, { ifAvailable: true }, async lock => { if (lock) await recoverOfflineQueue(scope); });
                else if (!syncLock.current) await recoverOfflineQueue(scope);
            }
            if (liveContext.current.scopeKey === scopeKey) await refresh();
        })().catch(cause => { if (liveContext.current.scopeKey === scopeKey) setError(cause instanceof Error ? cause.message : 'No se pudo recuperar la cola.'); });
        return () => { sequence.current += 1; };
    }, [refresh, scope, scopeKey]);

    useEffect(() => {
        const update = () => setOnline(navigator.onLine);
        update();
        window.addEventListener('online', update);
        window.addEventListener('offline', update);
        return () => {
            window.removeEventListener('online', update);
            window.removeEventListener('offline', update);
        };
    }, []);

    useEffect(() => {
        if (!userId || !verified || !online || !('serviceWorker' in navigator) || !window.isSecureContext) return;
        const prepare = async () => {
            await navigator.serviceWorker.register('/sw.js', { scope: '/' });
            await navigator.serviceWorker.ready;
            const response = await fetch('/offline-workspace', { headers: { accept: 'text/html' }, credentials: 'same-origin' });
            if (!response.ok || response.redirected || new URL(response.url).pathname !== '/offline-workspace') throw new Error('No se pudo preparar el workspace offline.');
            const html = await response.clone().text();
            const document = new DOMParser().parseFromString(html, 'text/html');
            const assets = [...document.querySelectorAll<HTMLScriptElement>('script[src]')].map((item) => item.src)
                .concat([...document.querySelectorAll<HTMLLinkElement>('link[href]')].map((item) => item.href))
                .filter((url) => new URL(url, window.location.href).pathname.startsWith('/_next/static/'));
            const cache = await caches.open('aba-shell-v1');
            await cache.put('/offline-workspace', response);
            await Promise.allSettled([...new Set(assets)].map((url) => cache.add(url)));
        };
        void prepare().catch((cause: unknown) => {
            if (liveContext.current.verified && liveContext.current.scopeKey?.startsWith(`${userId}:`)) setError(cause instanceof Error ? cause.message : 'No se pudo preparar el modo instalable.');
        });
    }, [userId, verified, online]);

    useEffect(() => {
        const capture = (event: Event) => {
            event.preventDefault();
            setInstallPrompt(event as InstallPromptEvent);
        };
        window.addEventListener('beforeinstallprompt', capture);
        return () => window.removeEventListener('beforeinstallprompt', capture);
    }, []);

    const enqueue = useCallback(async (payload: unknown, dependsOn: string[] = []) => {
        if (!scope) throw new Error('Selecciona una clínica autorizada antes de guardar trabajo offline.');
        if (liveContext.current.scopeKey !== `${scope.userId}:${scope.clinicId}`) throw new Error('El contexto cambió; no se agregó una operación a la cola anterior.');
        const entry = await enqueueOfflineCommand({ scope, payload, dependsOn });
        await refresh();
        return entry;
    }, [refresh, scope]);

    const supersedeConflict = useCallback(async (entryId: string, payload: unknown) => {
        if (!scope) throw new Error('Selecciona una clínica autorizada antes de resolver el conflicto.');
        if (liveContext.current.scopeKey !== `${scope.userId}:${scope.clinicId}`) throw new Error('El contexto cambió; vuelve a consultar el conflicto.');
        const entry = await supersedeOfflineCommand({ scope, entryId, payload });
        await refresh();
        return entry;
    }, [refresh, scope]);

    const discardPending = useCallback(async () => {
        if (!scope) return 0;
        if (liveContext.current.scopeKey !== `${scope.userId}:${scope.clinicId}`) throw new Error('La identidad o clínica cambió; vuelve a consultar la cola antes de descartar.');
        if (syncLock.current) throw new Error('Espera a que termine la sincronización antes de descartar.');
        const count = await discardUnacknowledgedQueue(scope);
        await refresh();
        return count;
    }, [refresh, scope]);

    const syncNow = useCallback(async () => {
        if (!scope || !online || !verified || syncLock.current || liveContext.current.scopeKey !== scopeKey) return;
        syncLock.current = true;
        setSyncing(true);
        try {
            const { synchronizeOfflineQueue } = await import('./sync-engine');
            const isCurrent = () => liveContext.current.scopeKey === scopeKey && liveContext.current.verified && liveContext.current.online;
            const execute = async () => {
                const result = await synchronizeOfflineQueue(scope, isCurrent);
                if (isCurrent()) { setQueue(result.queue); setError(null); }
            };
            if (navigator.locks) await navigator.locks.request(`aba-offline-sync:${scopeKey}`, { ifAvailable: true }, async lock => { if (lock) await execute(); });
            else await execute();
        } catch (cause) {
            if (liveContext.current.scopeKey === scopeKey) setError(cause instanceof Error ? cause.message : 'No se pudo sincronizar la cola local.');
        } finally {
            syncLock.current = false;
            setSyncing(false);
            if (liveContext.current.scopeKey !== scopeKey) void latestSync.current?.();
        }
    }, [online, scope, scopeKey, verified]);
    latestSync.current = syncNow;

    useEffect(() => {
        if (online && verified && scope && loadedScopeKey === scopeKey) void syncNow();
    }, [loadedScopeKey, online, scope, scopeKey, syncNow, verified]);

    const saveStudent = useCallback(async (data: ProgramSessionPageData) => {
        if (!scope) throw new Error('Selecciona una clínica autorizada antes de descargar la ficha.');
        if (liveContext.current.scopeKey !== `${scope.userId}:${scope.clinicId}` || !liveContext.current.verified) throw new Error('Revalida la identidad y clínica antes de descargar la ficha.');
        if (data.actorId !== scope.userId || data.clinicId !== scope.clinicId) throw new Error('La ficha no corresponde al usuario y clínica activos.');
        if (data.student.status !== 'active' || !data.capabilities.includes('record.capture')) throw new Error('La ficha no está autorizada para captura offline.');
        if (!identity) throw new Error('La identidad activa no está disponible para proteger esta descarga.');
        const previous = downloads.find((item) => item.studentId === data.studentId);
        await putOfflineIdentity(identity);
        await putOfflineStudentSnapshot({
            schemaVersion: 1,
            scope,
            studentId: data.studentId,
            cachedAt: new Date().toISOString(),
            data,
            selectedAttachmentVersionIds: previous?.selectedAttachmentVersionIds ?? [],
        });
        await refresh();
    }, [downloads, identity, refresh, scope]);

    const removeStudent = useCallback(async (studentId: string) => {
        if (!scope) return;
        const hasPending = queue.some((entry) => entry.status !== 'acknowledged' && entry.status !== 'superseded' && entry.payload.command.studentId === studentId);
        if (hasPending) throw new Error('La ficha tiene operaciones pendientes. Sincronízalas o descártalas explícitamente antes de quitar la descarga.');
        await removeOfflineStudentSnapshot(scope, studentId);
        await refresh();
    }, [queue, refresh, scope]);

    const saveDocument = useCallback(async (studentId: string, version: AttachmentVersion, blob: Blob) => {
        if (!scope || !verified) throw new Error('Revalida la sesión antes de guardar un documento offline.');
        if (liveContext.current.scopeKey !== `${scope.userId}:${scope.clinicId}` || !liveContext.current.verified) throw new Error('La identidad o clínica cambió; no se guardó el documento.');
        await putOfflineAttachment(scope, studentId, version, blob);
        await refresh();
    }, [refresh, scope, verified]);

    const removeDocument = useCallback(async (studentId: string, versionId: string) => {
        if (!scope) throw new Error('No hay un alcance local desbloqueado.');
        await removeOfflineAttachment(scope, studentId, versionId);
        await refresh();
    }, [refresh, scope]);

    const openDocument = useCallback(async (studentId: string, versionId: string, download = false) => {
        if (!scope) throw new Error('No hay un alcance local desbloqueado.');
        const attachment = await getOfflineAttachment(scope, studentId, versionId);
        if (liveContext.current.scopeKey !== `${scope.userId}:${scope.clinicId}`) throw new Error('La identidad o clínica cambió; no se abrió el documento.');
        if (!attachment) throw new Error('El documento no está guardado en este alcance.');
        const url = URL.createObjectURL(attachment.blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.target = download ? '_self' : '_blank';
        anchor.rel = 'noopener noreferrer';
        if (download) anchor.download = attachment.version.upload.fileName;
        document.body.appendChild(anchor);
        try { anchor.click(); } finally { anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 30_000); }
    }, [scope]);

    const requestInstall = useCallback(async () => {
        if (!installPrompt) return false;
        await installPrompt.prompt();
        const result = await installPrompt.userChoice;
        setInstallPrompt(null);
        return result.outcome === 'accepted';
    }, [installPrompt]);

    const confirmScopeExit = useCallback(async (label: 'cerrar sesión' | 'cambiar de clínica') => {
        if (!scope) return true;
        const current = await listOfflineQueue(scope);
        if (liveContext.current.scopeKey !== `${scope.userId}:${scope.clinicId}`) return false;
        const pending = current.filter((entry) => entry.status !== 'acknowledged' && entry.status !== 'superseded').length;
        if (!pending) return true;
        return window.confirm(`Hay ${pending} operación${pending === 1 ? '' : 'es'} pendiente${pending === 1 ? '' : 's'} en este usuario y clínica. Al ${label}, el caché quedará bloqueado para la siguiente identidad y no se descartará. ¿Continuar?`);
    }, [scope]);

    const value = useMemo<OfflineContextValue>(() => ({
        supported,
        online,
        scope,
        queue: loadedScopeKey === scopeKey ? queue : [],
        downloads: loadedScopeKey === scopeKey ? downloads : [],
        documents: loadedScopeKey === scopeKey ? documents : [],
        loading,
        syncing,
        error: loadedScopeKey === scopeKey ? error : null,
        installAvailable: Boolean(installPrompt),
        refresh,
        syncNow,
        enqueue,
        supersedeConflict,
        saveStudent,
        removeStudent,
        saveDocument,
        removeDocument,
        openDocument,
        discardPending,
        requestInstall,
        confirmScopeExit,
    }), [confirmScopeExit, discardPending, documents, downloads, enqueue, error, installPrompt, loadedScopeKey, loading, online, openDocument, queue, refresh, removeDocument, removeStudent, requestInstall, saveDocument, saveStudent, scope, scopeKey, supersedeConflict, supported, syncNow, syncing]);

    return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline() {
    const value = useContext(OfflineContext);
    if (!value) throw new Error('OfflineProvider requerido');
    return value;
}

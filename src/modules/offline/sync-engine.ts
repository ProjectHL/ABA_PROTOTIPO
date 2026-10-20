import { applySyncResult, planSyncQueue, syncQueueEntrySchema, type OfflineScope, type SyncQueueEntry } from '@/domain/offline/sync';
import { revalidateProgramSessionPageData, mutateSessionV2, persistCaptureV2 } from '@/modules/program-session/program-session.server';
import type { ProgramSessionPageData } from '@/modules/program-session';
import { listOfflineQueue, putOfflineQueueEntry } from './offline-store';

function blocked(entry: SyncQueueEntry, status: 'blocked-conflict' | 'blocked-permission' | 'blocked-validation', error: string) {
    return syncQueueEntrySchema.parse({ ...entry, status, retryAfter: null, serverReceiptId: null, serverVersion: null, error });
}

function pending(entry: SyncQueueEntry, error: string) {
    return syncQueueEntrySchema.parse({ ...entry, status: 'pending', retryAfter: null, serverReceiptId: null, serverVersion: null, error });
}

function revalidate(entry: SyncQueueEntry, data: ProgramSessionPageData) {
    if (data.actorId !== entry.scope.userId || data.clinicId !== entry.scope.clinicId || data.studentId !== entry.payload.command.studentId) {
        return blocked(entry, 'blocked-permission', 'La lectura autorizada no coincide con el usuario, clínica o ficha de la operación.');
    }
    if (data.student.status !== 'active') return blocked(entry, 'blocked-permission', 'La ficha ya no está activa; se conservó el trabajo local.');

    const requiredCapability = entry.payload.kind === 'session'
        ? entry.payload.command.action === 'finish' || entry.payload.command.action === 'cancel' ? 'record.submit' : 'record.capture'
        : entry.payload.command.action === 'submit' || entry.payload.command.action === 'revise' ? 'record.submit' : 'record.capture';
    if (!data.capabilities.includes(requiredCapability)) return blocked(entry, 'blocked-permission', `Permiso ${requiredCapability} revocado; se conservó el trabajo local.`);

    // Do not preempt exact replay with a local version/resource comparison:
    // a timeout may hide a committed write which already advanced the version.
    // The authorized RPC resolves the durable receipt first, then locks and
    // validates current resources/expectedVersion for genuinely new writes.
    return null;
}

export async function synchronizeOfflineQueue(scope: OfflineScope, isCurrent: () => boolean = () => true) {
    let processed = 0;
    for (;;) {
        const current = await listOfflineQueue(scope);
        if (!isCurrent()) return { queue: current, processed };
        const { ready } = planSyncQueue(current, scope, new Date().toISOString());
        const next = ready[0];
        if (!next) return { queue: current, processed };

        const inFlight = syncQueueEntrySchema.parse({ ...next, status: 'in-flight', attempts: next.attempts + 1, error: null });
        await putOfflineQueueEntry(scope, inFlight);

        let data: ProgramSessionPageData;
        try {
            const access = await revalidateProgramSessionPageData(scope.clinicId, inFlight.payload.command.studentId, scope.userId);
            if (access.status === 'unavailable') {
                if (access.actorId !== scope.userId || access.clinicId !== scope.clinicId || access.studentId !== inFlight.payload.command.studentId) throw new Error('La respuesta de revalidación no coincide con la operación.');
                await putOfflineQueueEntry(scope, blocked(inFlight, 'blocked-permission', 'La ficha ya no está disponible para esta identidad; se conservó el trabajo local sin enviarlo.'));
                processed += 1;
                continue;
            }
            data = access.data;
        } catch (cause) {
            await putOfflineQueueEntry(scope, pending(inFlight, `No se pudo revalidar permisos; no se envió el comando. ${cause instanceof Error ? cause.message : ''}`.trim()));
            return { queue: await listOfflineQueue(scope), processed };
        }

        if (!isCurrent()) {
            await putOfflineQueueEntry(scope, pending(inFlight, 'El contexto cambió antes de enviar. Se conserva la operación original.'));
            return { queue: await listOfflineQueue(scope), processed };
        }

        const rejected = revalidate(inFlight, data);
        if (rejected) {
            await putOfflineQueueEntry(scope, rejected);
            processed += 1;
            continue;
        }

        try {
            const result = inFlight.payload.kind === 'session'
                ? await mutateSessionV2({ clinicId: scope.clinicId, command: inFlight.payload.command })
                : await persistCaptureV2({ clinicId: scope.clinicId, command: inFlight.payload.command });
            await putOfflineQueueEntry(scope, applySyncResult(inFlight, result, scope));
            processed += 1;
        } catch (cause) {
            await putOfflineQueueEntry(scope, pending(inFlight, `Resultado desconocido; se reintentará la misma operación. ${cause instanceof Error ? cause.message : ''}`.trim()));
            return { queue: await listOfflineQueue(scope), processed };
        }
    }
}

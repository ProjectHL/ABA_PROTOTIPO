import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recoverInterruptedQueue, syncQueueEntrySchema, type SyncQueueEntry } from '../../src/domain/offline/sync';

const mocks = vi.hoisted(() => ({
  list: vi.fn(), put: vi.fn(), revalidate: vi.fn(), mutate: vi.fn(), capture: vi.fn(),
}));
vi.mock('../../src/modules/offline/offline-store', () => ({
  listOfflineQueue: mocks.list,
  putOfflineQueueEntry: mocks.put,
}));
vi.mock('../../src/modules/program-session/program-session.server', () => ({
  revalidateProgramSessionPageData: mocks.revalidate,
  mutateSessionV2: mocks.mutate,
  persistCaptureV2: mocks.capture,
}));

import { synchronizeOfflineQueue } from '../../src/modules/offline/sync-engine';

const scope = {
  userId: '10000000-0000-4000-8000-000000000001',
  clinicId: '20000000-0000-4000-8000-000000000001',
};
const studentId = '30000000-0000-4000-8000-000000000001';
const sessionId = '40000000-0000-4000-8000-000000000001';
const now = '2026-09-30T12:00:00.000Z';
let rows: SyncQueueEntry[];

function pendingEntry(): SyncQueueEntry {
  return syncQueueEntrySchema.parse({
    id: '50000000-0000-4000-8000-000000000001', scope,
    payload: {
      kind: 'session', command: {
        schemaVersion: 2,
        operationId: '60000000-0000-4000-8000-000000000001',
        idempotencyKey: '70000000-0000-4000-8000-000000000001',
        studentId, sessionId, expectedVersion: 1, action: 'update-notes',
        occurredAt: now, notes: 'Nota local irremplazable', programs: [], terminalConfirmation: false,
      },
    },
    dependsOn: [], status: 'pending', createdAt: now, attempts: 0, retryAfter: null,
    serverVersion: null, serverReceiptId: null, error: null, supersedesEntryId: null,
  });
}

function available() {
  return {
    status: 'available',
    data: {
      actorId: scope.userId, clinicId: scope.clinicId, studentId,
      student: { status: 'active' }, capabilities: ['record.capture'],
    },
  };
}

function receipt(replayed = false) {
  const command = rows[0].payload.command;
  return {
    operationId: command.operationId, idempotencyKey: command.idempotencyKey,
    resourceId: sessionId, status: 'acknowledged',
    receiptId: '80000000-0000-4000-8000-000000000001',
    serverVersion: 2, committedAt: now, replayed,
  };
}

beforeEach(() => {
  rows = [pendingEntry()];
  vi.clearAllMocks();
  mocks.list.mockImplementation(async () => [...rows]);
  mocks.put.mockImplementation(async (_scope: unknown, item: SyncQueueEntry) => {
    rows = rows.map((row) => row.id === item.id ? item : row);
  });
  mocks.revalidate.mockResolvedValue(available());
  mocks.mutate.mockImplementation(async () => receipt());
});

describe('offline sync engine: failure boundaries', () => {
  it('blocks revoked access before calling the mutation and retains the original command', async () => {
    const original = rows[0];
    mocks.revalidate.mockResolvedValue({
      status: 'unavailable', actorId: scope.userId, clinicId: scope.clinicId, studentId,
    });
    const result = await synchronizeOfflineQueue(scope);
    expect(result.processed).toBe(1);
    expect(rows[0].status).toBe('blocked-permission');
    expect(rows[0].payload).toEqual(original.payload);
    expect(rows[0].serverReceiptId).toBeNull();
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it('keeps the command pending when permission revalidation has a transport error', async () => {
    const original = rows[0];
    mocks.revalidate.mockRejectedValue(new Error('red caída'));
    const result = await synchronizeOfflineQueue(scope);
    expect(result.processed).toBe(0);
    expect(rows[0].status).toBe('pending');
    expect(rows[0].payload).toEqual(original.payload);
    expect(rows[0].serverReceiptId).toBeNull();
    expect(rows[0].error).toMatch(/No se pudo revalidar permisos/);
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it('replays the exact operation after a lost response, and only then accepts the receipt', async () => {
    const original = rows[0];
    mocks.mutate.mockRejectedValueOnce(new Error('respuesta perdida'));
    const unknown = await synchronizeOfflineQueue(scope);
    expect(unknown.processed).toBe(0);
    expect(rows[0].status).toBe('pending');
    expect(rows[0].payload).toEqual(original.payload);
    expect(rows[0].serverReceiptId).toBeNull();

    mocks.mutate.mockImplementation(async () => receipt(true));
    const replay = await synchronizeOfflineQueue(scope);
    expect(replay.processed).toBe(1);
    expect(rows[0].status).toBe('acknowledged');
    expect(rows[0].serverReceiptId).toBe('80000000-0000-4000-8000-000000000001');
    expect(mocks.mutate).toHaveBeenCalledTimes(2);
    expect(mocks.mutate.mock.calls[0][0].command).toEqual(mocks.mutate.mock.calls[1][0].command);
  });

  it('does not send when IndexedDB cannot record the in-flight transition', async () => {
    const original = rows[0];
    mocks.put.mockRejectedValueOnce(new Error('QuotaExceededError'));
    await expect(synchronizeOfflineQueue(scope)).rejects.toThrow('QuotaExceededError');
    expect(rows[0]).toEqual(original);
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it('does not claim success if persisting the ACK fails; fallback pending replays the same key', async () => {
    const original = rows[0];
    mocks.put.mockImplementationOnce(async (_scope: unknown, item: SyncQueueEntry) => {
      rows = [item];
    }).mockRejectedValueOnce(new Error('IndexedDB abortó la transacción'));
    const unknown = await synchronizeOfflineQueue(scope);
    expect(unknown.processed).toBe(0);
    expect(rows[0].status).toBe('pending');
    expect(rows[0].serverReceiptId).toBeNull();
    expect(rows[0].payload).toEqual(original.payload);
    expect(rows[0].error).toMatch(/Resultado desconocido/);
    mocks.mutate.mockImplementation(async () => receipt(true));
    const replay = await synchronizeOfflineQueue(scope);
    expect(replay.processed).toBe(1);
    expect(rows[0].status).toBe('acknowledged');
    expect(mocks.mutate.mock.calls[0][0].command).toEqual(mocks.mutate.mock.calls[1][0].command);
  });

  it('recovers an in-flight write if both ACK and fallback persistence fail', async () => {
    const original = rows[0];
    mocks.put.mockImplementationOnce(async (_scope: unknown, item: SyncQueueEntry) => {
      rows = [item];
    }).mockRejectedValueOnce(new Error('ACK no persistido'))
      .mockRejectedValueOnce(new Error('pending no persistido'));
    await expect(synchronizeOfflineQueue(scope)).rejects.toThrow('pending no persistido');
    expect(rows[0].status).toBe('in-flight');
    expect(rows[0].serverReceiptId).toBeNull();
    expect(rows[0].payload).toEqual(original.payload);

    rows = recoverInterruptedQueue(rows, scope);
    expect(rows[0].status).toBe('pending');
    mocks.mutate.mockImplementation(async () => receipt(true));
    const replay = await synchronizeOfflineQueue(scope);
    expect(replay.processed).toBe(1);
    expect(rows[0].status).toBe('acknowledged');
    expect(mocks.mutate.mock.calls[0][0].command).toEqual(mocks.mutate.mock.calls[1][0].command);
  });
});

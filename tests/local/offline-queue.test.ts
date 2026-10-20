import { describe, expect, it } from 'vitest';
import {
  applySyncResult,
  planSyncQueue,
  recoverInterruptedQueue,
  syncQueueEntrySchema,
  type SyncQueueEntry,
} from '../../src/domain/offline/sync';

const scope = {
  userId: '10000000-0000-4000-8000-000000000001',
  clinicId: '20000000-0000-4000-8000-000000000001',
};
const otherScope = { ...scope, clinicId: '20000000-0000-4000-8000-000000000002' };
const studentId = '30000000-0000-4000-8000-000000000001';
const sessionId = '40000000-0000-4000-8000-000000000001';
const now = '2026-09-30T12:00:00.000Z';

function entry(sequence = 1, status: SyncQueueEntry['status'] = 'pending'): SyncQueueEntry {
  const id = `50000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`;
  const operationId = `60000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`;
  const idempotencyKey = `70000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`;
  return syncQueueEntrySchema.parse({
    id, scope,
    payload: {
      kind: 'session',
      command: {
        schemaVersion: 2, operationId, idempotencyKey, studentId, sessionId,
        expectedVersion: sequence, action: 'update-notes', occurredAt: now,
        notes: `Nota local ${sequence}`, programs: [], terminalConfirmation: false,
      },
    },
    dependsOn: [], status, createdAt: now, attempts: 0, retryAfter: null,
    serverVersion: null, serverReceiptId: null, error: null, supersedesEntryId: null,
  });
}

function receipt(item: SyncQueueEntry) {
  return {
    operationId: item.payload.command.operationId,
    idempotencyKey: item.payload.command.idempotencyKey,
    resourceId: sessionId,
    status: 'acknowledged' as const,
    receiptId: '80000000-0000-4000-8000-000000000001',
    serverVersion: 2, committedAt: now, replayed: false,
  };
}

describe('offline queue: no fabricated success', () => {
  it('recovers an interrupted send as pending without changing its command or inventing a receipt', () => {
    const original = entry(1, 'in-flight');
    const [recovered] = recoverInterruptedQueue([original], scope);
    expect(recovered.status).toBe('pending');
    expect(recovered.payload).toEqual(original.payload);
    expect(recovered.id).toBe(original.id);
    expect(recovered.serverReceiptId).toBeNull();
    expect(recovered.serverVersion).toBeNull();
    expect(recovered.error).toMatch(/confirmación servidor pendiente/);
  });

  it('keeps a dependent command waiting until the first one has a durable receipt', () => {
    const first = entry(1);
    const second = { ...entry(2), dependsOn: [first.id] };
    const waiting = planSyncQueue([first, second], scope, now);
    expect(waiting.ready.map((item) => item.id)).toEqual([first.id]);
    expect(waiting.waiting).toContainEqual({ id: second.id, reason: 'dependency-not-persisted' });

    const acknowledged = applySyncResult(first, receipt(first), scope);
    const released = planSyncQueue([acknowledged, second], scope, now);
    expect(released.ready.map((item) => item.id)).toEqual([second.id]);
  });

  it('refuses an ACK for another operation, scope, or without a receipt', () => {
    const original = entry();
    expect(() => applySyncResult(original, { ...receipt(original), operationId: entry(2).payload.command.operationId }, scope)).toThrow();
    expect(() => applySyncResult(original, receipt(original), otherScope)).toThrow();
    expect(() => applySyncResult(original, { ...receipt(original), receiptId: null }, scope)).toThrow();
    expect(() => syncQueueEntrySchema.parse({ ...original, status: 'acknowledged' })).toThrow();
  });

  it('retains the exact local command when permission is rejected', () => {
    const original = entry();
    const blocked = applySyncResult(original, {
      operationId: original.payload.command.operationId,
      idempotencyKey: original.payload.command.idempotencyKey,
      resourceId: sessionId,
      status: 'rejected', code: 'permission-denied', message: 'Revocado', issues: [],
    }, scope);
    expect(blocked.status).toBe('blocked-permission');
    expect(blocked.payload).toEqual(original.payload);
    expect(blocked.serverReceiptId).toBeNull();
    expect(blocked.serverVersion).toBeNull();
    expect(planSyncQueue([blocked], scope, now).ready).toEqual([]);
  });
});

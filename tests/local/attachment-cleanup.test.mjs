import { describe, expect, it } from 'vitest';
import { confirmationFor, digest, exclusionReasons, inventorySql, retention, uuid, validatePreview } from '../../scripts/local/attachment-cleanup.mjs';
const clinicId = '11111111-1111-4111-8111-111111111111';
const batchId = '22222222-2222-4222-8222-222222222222';
const actorId = '33333333-3333-4333-8333-333333333333';
const now = Date.parse('2026-09-27T12:00:00Z');
const plan = { schemaVersion: 1, previewId: '44444444-4444-4444-8444-444444444444', apiUrl: 'http://127.0.0.1:54321', clinicId, batchId, actorId, retentionDays: 30, operationsSettled: true, createdAt: new Date(now).toISOString() };
const object = { attachmentId: '55555555-5555-4555-8555-555555555555', versionId: '66666666-6666-4666-8666-666666666666', version: 1, clinicId, batchId, purpose: 'student-document', recordState: 'archived', versionState: 'archived', archivedAt: '2026-08-01T00:00:00Z', recordArchivedAt: '2026-08-01T00:00:00Z', bucket: 'clinical-attachments', objectKey: clinicId + '/document.pdf', byteLength: 12, sha256: 'a'.repeat(64), references: [] };
const preview = () => { const body = { ...plan, candidates: [{ ...object }], excluded: [] }; return { ...body, previewHash: digest(body) }; };
describe('ARCHIVOS-013 guardas R5 sin borrado', () => {
  it('acepta documento archivado sin referencias y con retención cumplida', () => expect(exclusionReasons(object, plan, now)).toEqual([]));
  it.each(['pending-upload', 'available', 'failed'])('rechaza estado %s', state => {
    expect(exclusionReasons({ ...object, recordState: state }, plan, now)).toContain('not-archived');
    expect(exclusionReasons({ ...object, versionState: state }, plan, now)).toContain('not-archived');
  });
  it.each(['photo', 'consent', 'commercial', 'family-manifest', 'chat'])('protege referencia %s', reference => expect(exclusionReasons({ ...object, references: [reference] }, plan, now)).toContain(reference));
  it('rechaza clínica o lote cruzado', () => {
    expect(exclusionReasons({ ...object, clinicId: actorId }, plan, now)).toContain('scope');
    expect(exclusionReasons({ ...object, batchId: actorId }, plan, now)).toContain('scope');
  });
  it('usa archivo más reciente y rechaza fechas inválidas', () => {
    expect(exclusionReasons({ ...object, recordArchivedAt: '2026-09-26T00:00:00Z' }, plan, now)).toContain('retention');
    expect(exclusionReasons({ ...object, archivedAt: null }, plan, now)).toContain('retention');
  });
  it.each([undefined, '', '0', -1, 1.5, 'foo', 36501])('retención inválida %s', days => expect(() => retention(days)).toThrow());
  it('rechaza incertidumbre, propósito y bucket', () => {
    expect(exclusionReasons(object, { ...plan, operationsSettled: false }, now)).toContain('uncertain-operations');
    expect(exclusionReasons({ ...object, purpose: 'chat-attachment' }, plan, now)).toContain('purpose');
    expect(exclusionReasons({ ...object, bucket: 'avatars' }, plan, now)).toContain('bucket');
  });
  it.each(['../outside', 'a/../b', 'a//b', 'a\\b', 'a\nkey'])('ruta inválida %s', objectKey => expect(exclusionReasons({ ...object, objectKey }, plan, now)).toContain('path'));
  it('exige longitud/hash', () => {
    expect(exclusionReasons({ ...object, byteLength: 0 }, plan, now)).toContain('integrity');
    expect(exclusionReasons({ ...object, sha256: 'invalid' }, plan, now)).toContain('integrity');
  });
  it('confirmación ligada a UUID/hash y preview inmutable', () => {
    const original = preview(); expect(validatePreview(original)).toEqual(original);
    expect(confirmationFor(original)).toContain(original.previewHash);
    expect(confirmationFor(original)).toContain(original.previewId);
    expect(() => validatePreview({ ...original, retentionDays: 1 })).toThrow();
  });
  it('rechaza destino externo, duplicados y elegibilidad manipulada', () => {
    for (const change of [{ apiUrl: 'https://example.com' }, { candidates: [object, object] }, { candidates: [{ ...object, versionState: 'available' }] }]) {
      const original = preview(); const { previewHash, ...body } = original; const modified = { ...body, ...change };
      expect(() => validatePreview({ ...modified, previewHash: digest(modified) })).toThrow();
    }
  });
  it('SQL restringido a clínica/lote sin DML, rechaza inyección', () => {
    const sql = inventorySql(plan);
    expect(sql).toContain(`a.organization_id='${clinicId}'::uuid`);
    expect(sql).toContain(`a.test_run_id='${batchId}'::uuid`);
    expect(sql).not.toMatch(/\b(delete|update|insert|drop)\b/i);
    expect(() => uuid("';delete from storage.objects;--")).toThrow();
  });
});

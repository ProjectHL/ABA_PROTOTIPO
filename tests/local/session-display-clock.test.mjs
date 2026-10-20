import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { sessionV2Timeline } from '../../src/domain/sessions/session-v2';

const id = '10000000-0000-4000-8000-000000000001';
const timestamp = milliseconds => new Date(Date.UTC(2026, 8, 27) + milliseconds).toISOString();
const transitions = ['started', 'paused', 'resumed', 'finished'];
for (let count = 1; count <= transitions.length; count++) {
  it(`ACK ${transitions[count - 1]} newer than UI tick retains valid canonical timeline`, () => {
    const session = {
      schemaVersion: 2, id, clinicId: id, studentId: id, version: count,
      capturedAt: timestamp(count * 1000), notes: '', programs: [],
      events: transitions.slice(0, count).map((type, index) => ({
        id: `10000000-0000-4000-8000-00000000000${index + 1}`,
        actorId: id, sequence: index + 1, occurredAt: timestamp((index + 1) * 1000), type, notes: '',
      })),
    };
    const clock = Date.parse(session.capturedAt) - 300;
    expect(() => sessionV2Timeline({ ...session, capturedAt: new Date(clock).toISOString() })).toThrow();
    const display = sessionV2Timeline({ ...session, capturedAt: new Date(Math.max(clock, Date.parse(session.capturedAt))).toISOString() });
    expect(display.status).toBe(['active', 'paused', 'active', 'finished'][count - 1]);
    expect(display.activeSeconds).toBeGreaterThanOrEqual(0);
  });
}
it('SessionPage uses the monotonic display boundary, not the stale tick', () => {
  const source = readFileSync(new URL('../../src/views/SessionPage.tsx', import.meta.url), 'utf8');
  expect(source).toContain('Math.max(clock,Date.parse(session.capturedAt))');
});

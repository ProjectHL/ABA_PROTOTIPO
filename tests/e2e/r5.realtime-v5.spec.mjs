import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import { localStatus, state } from '../../scripts/local/write-env.mjs';
import { notificationsPage, notificationStateCommand } from '../../src/modules/notifications/contracts.ts';
import { readCommandResult } from '../../src/domain/commands/result.ts';

const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
const baseURL = process.env.ABA_QA_BASE_URL ?? 'http://localhost:3001';
const ownTitle = 'QA R5 RECORDATORIO DOBLE 2155E99E';
test.skip(process.env.ABA_QA_LOCAL_UI !== '1' || process.env.ABA_QA_REALTIME_V5_UI !== '1', 'Realtime V5 sintético local explícito');
test.use({ baseURL, actionTimeout: 15000, trace: 'off', video: 'off', screenshot: 'off' });

async function readNotifications(client, actorId) {
  const result = await client.rpc('aba_notifications_read_v2', { p_limit: 100 });
  if (result.error) throw new Error('Lectura ordinaria de notificaciones no confirmada');
  const page = notificationsPage.parse(result.data);
  expect(page.actorId).toBe(actorId);
  return page.notifications;
}

async function authenticate(client, account) {
  const result = await client.auth.signInWithPassword({ email: account.email, password: account.password });
  if (result.error || result.data.user?.id !== account.userId || result.data.user.app_metadata.aba_fixture_batch !== batchId) throw new Error('Actor sintético no confirmado; credenciales omitidas');
}

function observeWire(page, actorId) {
  // Retain only table/change identity metadata: never URLs, JWTs, raw frames or notes.
  const wire = { joins: 0, closes: 0, changes: [] };
  page.on('websocket', socket => {
    if (!socket.url().includes('/realtime/v1/websocket')) return;
    socket.on('close', () => { wire.closes += 1; });
    socket.on('framereceived', frame => {
      let message;
      try { message = JSON.parse(typeof frame.payload === 'string' ? frame.payload : frame.payload.toString()); }
      catch { return; }
      // realtime-js supports Phoenix object and array envelopes.
      if (Array.isArray(message)) message = { topic: message[2], event: message[3], payload: message[4] };
      if (message.topic !== `realtime:notifications:${actorId}`) return;
      if (message.event === 'phx_reply' && message.payload?.status === 'ok'
        && message.payload?.response?.postgres_changes?.some(binding => binding.schema === 'public' && binding.table === 'user_notifications_v2')) wire.joins += 1;
      const change = message.payload?.data;
      if (message.event !== 'postgres_changes' || change?.schema !== 'public' || change?.table !== 'user_notifications_v2') return;
      wire.changes.push({ type: change.type, id: change.record?.id, userId: change.record?.user_id,
        clinicId: change.record?.organization_id, version: Number(change.record?.version), read: change.record?.read_at !== null });
    });
  });
  return wire;
}

async function subscribeForeign(client, actorA) {
  const changes = [];
  let status = 'starting';
  // Deliberately request A's filter with B's ordinary JWT: RLS must hide A.
  const channel = client.channel(`qa-r5-v5-isolation-${randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_notifications_v2', filter: `user_id=eq.${actorA}` }, payload => {
      changes.push({ id: payload.new?.id, version: payload.new?.version });
    });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Suscripción real B no confirmada')), 15000);
    channel.subscribe(value => {
      status = value;
      if (value === 'SUBSCRIBED') { clearTimeout(timeout); resolve(); }
      if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(value)) { clearTimeout(timeout); reject(new Error('Canal B no operativo')); }
    });
  });
  return { channel, changes, status: () => status };
}

async function sendRead(client, command) {
  const parsed = notificationStateCommand.parse(command);
  const args = { p_notification_id: parsed.notificationId, p_read: parsed.read, p_expected_version: parsed.expectedVersion,
    p_operation_id: parsed.operationId, p_idempotency_key: parsed.idempotencyKey };
  // One exact retry for an unknown transport result; never generate new identity here.
  let result = await client.rpc('aba_notification_read_state_v2', args);
  if (result.error) result = await client.rpc('aba_notification_read_state_v2', args);
  if (result.error) throw new Error('Comando sin confirmación; conservar identidad y consultar antes de repetir');
  return readCommandResult(result.data, { operationId: parsed.operationId, idempotencyKey: parsed.idempotencyKey, resourceId: parsed.notificationId });
}

test('QA-002/005/013 V5: postgres_changes real, reconexión y aislamiento B sobre aviso propio', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Ensayo focal único serial; sin mutaciones móviles duplicadas');
  test.setTimeout(150000);
  expect(process.cwd().replaceAll('\\', '/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
  expect(new URL(baseURL).origin).toBe('http://localhost:3001');
  const local = localStatus();
  expect(local.API_URL).toBe('http://127.0.0.1:54321');
  const manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));
  expect(manifest.batchId).toBe(batchId); expect(manifest.state).toBe('ready'); expect(manifest.apiUrl).toBe(local.API_URL);
  const accounts = ['admin-a', 'admin-b'].map(label => {
    const account = manifest.accounts.find(row => row.label === label);
    if (account?.email !== `${label}.${batchId}@aba.example.test`) throw new Error('Cuenta sintética incorrecta');
    return account;
  });
  const [accountA, accountB] = accounts;
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const clientA = createClient(local.API_URL, local.ANON_KEY ?? local.PUBLISHABLE_KEY, options);
  const clientB = createClient(local.API_URL, local.ANON_KEY ?? local.PUBLISHABLE_KEY, options);
  const wire = observeWire(page, accountA.userId);
  const receipts = [];
  let foreign, baseline, currentVersion, pendingCommand, completed = false;
  const readOwn = async () => {
    const rows = await readNotifications(clientA, accountA.userId);
    const found = rows.find(row => row.id === baseline.id);
    if (!found) throw new Error('Aviso dedicado ya no disponible; no escoger otro');
    return found;
  };
  const mutate = async read => {
    const latest = await readOwn();
    expect(latest.version, 'Otro operador cambió el aviso; no sobrescribir').toBe(currentVersion);
    pendingCommand = notificationStateCommand.parse({ notificationId: baseline.id, read, expectedVersion: currentVersion,
      operationId: randomUUID(), idempotencyKey: randomUUID() });
    const receipt = await sendRead(clientA, pendingCommand);
    expect(receipt.status).toBe('acknowledged');
    expect(receipt.serverVersion).toBe(currentVersion + 1);
    currentVersion = receipt.serverVersion;
    receipts.push({ operationId: receipt.operationId, idempotencyKey: receipt.idempotencyKey, receiptId: receipt.receiptId, serverVersion: receipt.serverVersion, replayed: receipt.replayed });
    pendingCommand = null;
    const saved = await readOwn();
    expect(saved.version).toBe(currentVersion); expect(Boolean(saved.readAt)).toBe(read);
    return saved;
  };
  try {
    await authenticate(clientA, accountA); await authenticate(clientB, accountB);
    foreign = await subscribeForeign(clientB, accountA.userId);
    // Real native socket shutdown is test-only fault injection; no synthetic events.
    await page.addInitScript(() => {
      // Disable the known 60s fallback in this test context so UI success requires
      // a real event/reconnect trigger. Preserve all other timers and socket retries.
      const nativeInterval = window.setInterval.bind(window);
      window.setInterval = (handler, delay, ...args) => nativeInterval(delay === 60_000 ? () => {} : handler, delay, ...args);
      const NativeWebSocket = window.WebSocket;
      const sockets = new Set();
      window.WebSocket = class extends NativeWebSocket {
        constructor(...args) { super(...args); sockets.add(this); this.addEventListener('close', () => sockets.delete(this)); }
      };
      window.__abaQaRealtimeDisconnect = () => {
        let count = 0;
        for (const socket of sockets) if (socket.url.includes('/realtime/v1/websocket') && socket.readyState === NativeWebSocket.OPEN) {
          socket.close(4001, 'QA R5 local reconnect'); count += 1;
        }
        return count;
      };
    });
    await page.goto('/login');
    try {
      await page.getByRole('textbox', { name: 'Email', exact: true }).fill(accountA.email);
      await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(accountA.password);
    } catch { throw new Error('Formulario local no disponible; credenciales omitidas'); }
    await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
    await expect(page).toHaveURL(`${baseURL}/dashboard`);
    await expect.poll(() => wire.joins, { timeout: 20000, message: 'La campana requiere suscripción postgres_changes real' }).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Notificaciones', exact: true }).click();
    const bell = page.locator('.mantine-Popover-dropdown').filter({ hasText: 'Notificaciones' });
    await expect(bell).toBeVisible();
    const rowsBefore = await readNotifications(clientA, accountA.userId);
    const own = rowsBefore.filter(row => row.clinicId === manifest.clinics.A && row.kind === 'reminder'
      && row.resourcePath === '/calendar' && row.body.includes(ownTitle));
    expect(own, 'Necesita el recordatorio sintético existente; no se crean identidades ni citas').toHaveLength(1);
    baseline = own[0]; currentVersion = baseline.version;
    const row = bell.getByText(baseline.body, { exact: true }).locator('xpath=..');
    await expect(row).toHaveCount(1);
    const assertUI = async read => {
      await expect(row.getByRole('button', { name: read ? 'Marcar no leída' : 'Marcar leída', exact: true })).toBeVisible({ timeout: 12000 });
    };
    const expectEvent = async (version, read, since) => {
      await expect.poll(() => wire.changes.slice(since).filter(change => change.id === baseline.id && change.version === version).length,
        { timeout: 12000, message: 'Evento WebSocket exacto requerido; polling RPC no sustituye Realtime' }).toBe(1);
      const event = wire.changes.slice(since).find(change => change.id === baseline.id && change.version === version);
      expect(event).toMatchObject({ type: 'UPDATE', userId: accountA.userId, clinicId: manifest.clinics.A, read });
    };
    const baselineRead = Boolean(baseline.readAt);
    await assertUI(baselineRead);
    const foreignBefore = await readNotifications(clientB, accountB.userId);
    expect(foreignBefore.some(item => item.id === baseline.id)).toBe(false);
    const deniedCommand = { notificationId: baseline.id, read: !baselineRead, expectedVersion: currentVersion, operationId: randomUUID(), idempotencyKey: randomUUID() };
    const denied = await sendRead(clientB, deniedCommand);
    expect(denied).toMatchObject({ status: 'rejected', code: 'permission-denied' });
    expect((await readOwn()).version).toBe(currentVersion);

    // No manual Consultar/reload/focus. Actual WS UPDATE and UI update both required.
    let eventStart = wire.changes.length;
    await mutate(!baselineRead);
    await expectEvent(currentVersion, !baselineRead, eventStart); await assertUI(!baselineRead);
    const closesBefore = wire.closes;
    const joinsBefore = wire.joins;
    await context.setOffline(true);
    await page.evaluate(() => window.__abaQaRealtimeDisconnect());
    await expect.poll(() => wire.closes, { timeout: 10000 }).toBeGreaterThan(closesBefore);
    expect(await page.evaluate(() => navigator.onLine)).toBe(false);
    eventStart = wire.changes.length;
    await mutate(baselineRead); // Ordinary independent A client writes while UI is offline.
    const offlineVersion = currentVersion;
    await assertUI(!baselineRead); // UI must still show the state seen before disconnection.
    expect(wire.changes.slice(eventStart).some(change => change.id === baseline.id && change.version === offlineVersion)).toBe(false);
    await context.setOffline(false);
    await assertUI(baselineRead); // Persisted recovery; no claim of replaying missed WS events.
    await expect.poll(() => wire.joins, { timeout: 25000, message: 'Reconexión real postgres_changes requerida' }).toBeGreaterThan(joinsBefore);
    eventStart = wire.changes.length;
    await mutate(!baselineRead);
    await expectEvent(currentVersion, !baselineRead, eventStart); await assertUI(!baselineRead);
    // Preserve the initial read/unread value. Versions/receipts remain durable history.
    eventStart = wire.changes.length;
    await mutate(baselineRead);
    await expectEvent(currentVersion, baselineRead, eventStart); await assertUI(baselineRead);
    // Hold B subscribed after the positively observed A events; a missing A event alone never passes.
    await expect.poll(() => foreign.status(), { timeout: 5000 }).toBe('SUBSCRIBED');
    await page.waitForTimeout(2000);
    expect(foreign.status()).toBe('SUBSCRIBED'); expect(foreign.changes).toHaveLength(0);
    expect(await readNotifications(clientB, accountB.userId)).toEqual(foreignBefore);
    const after = await readNotifications(clientA, accountA.userId);
    expect(after).toHaveLength(rowsBefore.length);
    for (const prior of rowsBefore.filter(item => item.id !== baseline.id)) expect(after.find(item => item.id === prior.id)).toEqual(prior);
    const final = await readOwn();
    expect(final).toMatchObject({ id: baseline.id, clinicId: baseline.clinicId, kind: baseline.kind, title: baseline.title,
      body: baseline.body, resourcePath: baseline.resourcePath, createdAt: baseline.createdAt, version: baseline.version + 4 });
    expect(Boolean(final.readAt)).toBe(baselineRead);
    await testInfo.attach('realtime-v5-summary.json', { contentType: 'application/json', body: Buffer.from(JSON.stringify({
      batchId, actor: 'admin-a', isolationActor: 'admin-b', notificationId: baseline.id, baselineVersion: baseline.version,
      finalVersion: final.version, restoredReadValue: true, joins: wire.joins, closes: wire.closes,
      observedOwnVersions: wire.changes.filter(item => item.id === baseline.id).map(item => item.version),
      offlineVersionRecoveredByRead: offlineVersion, foreignEvents: foreign.changes.length, receipts,
    }, null, 2)) });
    writeFileSync(path.join(state, 'qa', 'realtime-v5-post-recovery-'+randomUUID()+'-safe.json'), JSON.stringify({batchId, passed:true, notificationId:baseline.id, baselineVersion:baseline.version, finalVersion:final.version, restoredReadValue:true, joins:wire.joins, closes:wire.closes, observedOwnVersions:wire.changes.filter(item=>item.id===baseline.id).map(item=>item.version), offlineVersionRecoveredByRead:offlineVersion, foreignEvents:foreign.changes.length, receipts}, null, 2));
    completed = true;
  } finally {
    await context.setOffline(false);
    try {
      // Never overwrite a concurrent/unknown change during cleanup. Pending identity
      // is preserved for the operator to query/retry exactly; do not start another write.
      if (pendingCommand) await testInfo.attach('realtime-v5-pending-command.json', { contentType: 'application/json', body: Buffer.from(JSON.stringify(pendingCommand)) });
      if (!completed && baseline && !pendingCommand) {
        const latest = await readOwn();
        if (latest.version === currentVersion && Boolean(latest.readAt) !== Boolean(baseline.readAt)) await mutate(Boolean(baseline.readAt));
      }
    } finally {
      try { if (foreign) await clientB.removeChannel(foreign.channel); }
      finally {
        const releases = await Promise.allSettled([clientA.auth.signOut({ scope: 'local' }), clientB.auth.signOut({ scope: 'local' })]);
        if (releases.some(result => result.status === 'rejected' || result.value.error)) throw new Error('Revocación local de sesiones QA no confirmada; valores omitidos');
      }
    }
    // Browser context closes with the fixture; no password, email, token or raw frames in artifacts.
  }
});





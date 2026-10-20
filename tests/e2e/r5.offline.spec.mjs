import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { localStatus, state } from '../../scripts/local/write-env.mjs';

test.skip(process.env.ABA_QA_LOCAL_UI !== '1' || process.env.ABA_QA_OFFLINE_UI !== '1', 'Caso sintético local explícito');
test.use({ actionTimeout: 15000 });

test('QA-011: captura offline espera recibo de transición de sesión', async ({ page, context, request }) => {
  test.skip(process.env.ABA_QA_OFFLINE_CAPTURE_UI !== '1', 'Captura sintética offline explícita');
  test.setTimeout(120000);
  expect(process.cwd().replaceAll('\\', '/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
  expect(localStatus().API_URL).toBe('http://127.0.0.1:54321');
  expect((await request.get('/api/health')).status()).toBe(200);
  const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
  const manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));
  expect(manifest.state).toBe('ready');
  const account = manifest.accounts.find(row => row.label === 'admin-a');
  if (account?.email !== `admin-a.${batchId}@aba.example.test`) throw new Error('Identidad sintética incorrecta');
  const studentId = 'b347646e-ff29-450b-aedf-9f9c015fb41a';
  const readQueue = () => page.evaluate(async () => {
    const database = await new Promise((resolve, reject) => {
      const open = indexedDB.open('aba-offline-v1', 3);
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    try {
      return await new Promise((resolve, reject) => {
        const transaction = database.transaction('queue', 'readonly');
        const read = transaction.objectStore('queue').getAll();
        read.onsuccess = () => resolve(read.result.map(entry => ({
          id: entry.id, status: entry.status, kind: entry.payload.kind,
          action: entry.payload.command.action, dependsOn: entry.dependsOn,
          operationId: entry.payload.command.operationId,
          idempotencyKey: entry.payload.command.idempotencyKey,
          notes: entry.payload.kind === 'session' ? entry.payload.command.notes : entry.payload.command.measurement.notes,
          serverReceiptId: entry.serverReceiptId, serverVersion: entry.serverVersion,
        })));
        read.onerror = () => reject(read.error);
      });
    } finally { database.close(); }
  });
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto(`/session/${studentId}`);
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Descargar ficha', exact: true }).click();
  await expect(page.getByText(/Ficha disponible en IndexedDB para este usuario y clínica/)).toBeVisible();
  const sessionNotes = page.locator('div.mantine-Card-root').filter({ has: page.getByText('Notas de sesión', { exact: true }) }).getByRole('textbox');
  const suffix = `${test.info().project.name} ${Date.now()}`;
  const sessionNote = `QA R5 CAPTURA DEPENDENCIA ${suffix}`;
  const captureDimension = process.env.ABA_QA_OFFLINE_CAPTURE_DIMENSION ?? 'Frecuencia';
  const captureNote = `QA R5 CAPTURA OFFLINE ${captureDimension} ${suffix}`;
  await context.setOffline(true);
  await sessionNotes.fill(sessionNote);
  await page.getByRole('button', { name: 'Guardar notas', exact: true }).click();
  await expect(page.getByText(/Sesión guardada en este dispositivo y pendiente de servidor/)).toBeVisible();
  const transition = (await readQueue()).find(entry => entry.kind === 'session' && entry.notes === sessionNote);
  expect(transition).toEqual(expect.objectContaining({ status: 'pending', serverReceiptId: null }));
  await page.getByRole('button', { name: 'Nuevo registro', exact: true }).first().click();
  const dimensionInput = page.getByRole('textbox', { name: 'Dimensión', exact: true });
  if (await dimensionInput.inputValue() !== captureDimension) {
    page.once('dialog', async dialog => {
      if (dialog.message().startsWith('La dimensión nueva se guardará')) await dialog.accept();
      else await dialog.dismiss();
    });
    await dimensionInput.click();
    await page.getByRole('option', { name: captureDimension, exact: true }).click();
  }
  if (captureDimension === 'Porcentaje') {
    const radio = page.getByRole('radio', { name: 'A', exact: true }).first();
    await page.locator(`label[for="${await radio.getAttribute('id')}"]`).click();
    await page.getByRole('textbox', { name: 'Ayuda en la respuesta', exact: true }).click();
    await page.getByRole('option', { name: 'model', exact: true }).click();
    const nr = page.getByRole('radio', { name: 'NR', exact: true }).nth(1);
    await page.locator(`label[for="${await nr.getAttribute('id')}"]`).click();
  } else if (captureDimension === 'Frecuencia') {
    await page.getByRole('button', { name: 'Iniciar cronómetro', exact: true }).click();
    await page.locator('[role="dialog"] button:has(svg.lucide-plus)').click();
    await page.getByRole('button', { name: 'Pausar cronómetro', exact: true }).click();
  } else if (captureDimension === 'Intervalos') {
    for (const label of ['Número de intervalos', 'Duración (segundos)']) {
      page.once('dialog', async dialog => {
        if (dialog.message().startsWith('Reconfigurar intervalos')) await dialog.accept();
        else await dialog.dismiss();
      });
      await page.getByRole('textbox', { name: label, exact: true }).fill('1');
    }
    const occurred = page.getByRole('radio', { name: 'Ocurrió', exact: true });
    await expect(occurred).toBeEnabled();
    await page.locator(`label[for="${await occurred.getAttribute('id')}"]`).click();
  } else if (captureDimension === 'Duración') {
    await page.getByRole('button', { name: 'Iniciar episodio', exact: true }).click();
    await page.getByRole('button', { name: 'Cerrar episodio', exact: true }).click();
  } else if (captureDimension === 'Latencia') {
    await page.getByRole('textbox', { name: 'Antecedente presentado', exact: true }).fill('Antecedente offline sintético');
    await page.getByRole('button', { name: 'Presentar', exact: true }).click();
    await page.getByRole('button', { name: 'Registrar respuesta', exact: true }).click();
  } else throw new Error('Dimensión QA no reconocida');
  await page.getByRole('textbox', { name: 'Notas originales', exact: true }).fill(captureNote);
  await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  await expect(page.getByText(/Captura guardada en este dispositivo y pendiente de servidor/)).toBeVisible();
  const capture = (await readQueue()).find(entry => entry.kind === 'capture' && entry.notes === captureNote);
  expect(capture).toEqual(expect.objectContaining({ status: 'pending', serverReceiptId: null }));
  expect(capture.dependsOn).toContain(transition.id);
  expect(capture.operationId).not.toBe(transition.operationId);
  await context.setOffline(false);
  await expect.poll(async () => (await readQueue()).find(entry => entry.id === capture.id)?.status, { timeout: 30000 }).toBe('acknowledged');
  const confirmed = await readQueue();
  const first = confirmed.find(entry => entry.id === transition.id);
  const second = confirmed.find(entry => entry.id === capture.id);
  expect(first).toEqual(expect.objectContaining({ status: 'acknowledged', operationId: transition.operationId }));
  expect(second).toEqual(expect.objectContaining({ status: 'acknowledged', operationId: capture.operationId }));
  expect(first.serverReceiptId).toBeTruthy();
  expect(second.serverReceiptId).toBeTruthy();
  expect(second.serverReceiptId).not.toBe(first.serverReceiptId);
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await page.reload();
  await expect(sessionNotes).toHaveValue(sessionNote);
  const drafts = page.getByRole('button', { name: /^Continuar borrador/ });
  let restored = false;
  for (let index = 0; index < await drafts.count(); index += 1) {
    await drafts.nth(index).click();
    restored = await page.getByRole('textbox', { name: 'Notas originales', exact: true }).inputValue() === captureNote;
    if (restored) break;
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  }
  expect(restored).toBe(true);
  await expect(dimensionInput).toHaveValue(captureDimension);
  if (process.env.ABA_QA_OFFLINE_SUBMIT_REVISE_UI === '1') {
    await context.setOffline(true);
    await page.getByRole('button', { name: 'Enviar registro', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const submit = (await readQueue()).find(entry => entry.kind === 'capture' && entry.action === 'submit' && entry.notes === captureNote);
    expect(submit).toEqual(expect.objectContaining({ status: 'pending', serverReceiptId: null }));
    await context.setOffline(false);
    await expect.poll(async () => (await readQueue()).find(entry => entry.id === submit.id)?.status, { timeout: 30000 }).toBe('acknowledged');
    const submitAck = (await readQueue()).find(entry => entry.id === submit.id);
    expect(submitAck.serverReceiptId).toBeTruthy();
    expect(submitAck.serverReceiptId).not.toBe(second.serverReceiptId);
    await page.reload();
    let found = false;
    const submitted = page.getByRole('button', { name: 'Corregir enviado', exact: true });
    await expect(submitted.first()).toBeVisible();
    for (let index = 0; index < await submitted.count(); index++) {
      await submitted.nth(index).click();
      found = await page.getByRole('textbox', { name: 'Notas originales', exact: true }).inputValue() === captureNote;
      if (found) break;
      await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
    }
    expect(found).toBe(true);
    const revisedNote = `${captureNote} CORREGIDO`;
    await context.setOffline(true);
    await page.getByRole('textbox', { name: 'Motivo de la corrección', exact: true }).fill('Corrección offline sintética trazable');
    await page.getByRole('textbox', { name: 'Notas originales', exact: true }).fill(revisedNote);
    await page.getByRole('button', { name: 'Guardar corrección', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const revise = (await readQueue()).find(entry => entry.kind === 'capture' && entry.action === 'revise' && entry.notes === revisedNote);
    expect(revise).toEqual(expect.objectContaining({ status: 'pending', serverReceiptId: null }));
    await context.setOffline(false);
    await expect.poll(async () => (await readQueue()).find(entry => entry.id === revise.id)?.status, { timeout: 30000 }).toBe('acknowledged');
    const reviseAck = (await readQueue()).find(entry => entry.id === revise.id);
    expect(reviseAck.serverReceiptId).toBeTruthy();
    expect(reviseAck.serverVersion).toBe(submitAck.serverVersion + 1);
    const { createClient } = await import('@supabase/supabase-js');
    const status = localStatus();
    const client = createClient(status.API_URL, status.ANON_KEY ?? status.PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    try {
      const login = await client.auth.signInWithPassword({ email: account.email, password: account.password });
      if (login.error || login.data.user?.id !== account.userId) throw new Error('Identidad de captura offline no verificada');
      const read = await client.rpc('read_program_session_v2', { p_clinic_id: manifest.clinics.A, p_student_id: studentId });
      if (read.error) throw new Error('Relectura de captura offline no confirmada');
      const records = read.data.records.filter(record => record.originalMeasurement?.notes === revisedNote);
      expect(records).toHaveLength(1);
      const record = records[0];
      expect(record.submitted).toBe(true);
      expect(record.version).toBe(reviseAck.serverVersion);
      expect(record.revisions).toHaveLength(1);
      expect(record.revisions[0].reason).toBe('Corrección offline sintética trazable');
      const { notes: previousNotes, capturedAt: previousCapturedAt, ...previousObservations } = record.revisions[0].originalMeasurement;
      const { notes: currentNotes, capturedAt: currentCapturedAt, ...currentObservations } = record.originalMeasurement;
      expect(previousNotes).toBe(captureNote);
      expect(currentNotes).toBe(revisedNote);
      expect(currentObservations).toEqual(previousObservations);
      expect(Date.parse(currentCapturedAt)).toBeGreaterThanOrEqual(Date.parse(previousCapturedAt));
    } finally { await client.auth.signOut({ scope: 'local' }); }
  }
});

test('QA-011: documento seleccionado conserva bytes y alcance tras recarga offline', async ({ page, context, request }) => {
  test.skip(process.env.ABA_QA_OFFLINE_DOCUMENT_UI !== '1', 'Documento sintético offline explícito');
  test.setTimeout(120000);
  expect(process.cwd().replaceAll('\\', '/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
  expect(localStatus().API_URL).toBe('http://127.0.0.1:54321');
  expect((await request.get('/api/health')).status()).toBe(200);
  const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
  const manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));
  expect(manifest.state).toBe('ready');
  const account = manifest.accounts.find(row => row.label === 'admin-a');
  if (account?.email !== `admin-a.${batchId}@aba.example.test`) throw new Error('Identidad sintética incorrecta');
  const studentId = 'b347646e-ff29-450b-aedf-9f9c015fb41a';
  const versionId = 'a839a0ff-de63-4652-b1fa-96f0bb387495';
  const fileName = 'qa-r5-doc-v2-mull0so3.png';
  const sha256 = 'bc21a4fa21aaa7c5eb60fbd88394d86813afd10ad287bf7274d0e1c588ea2764';
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto(`/session/${studentId}`);
  await expect(page.getByRole('button', { name: 'Descargar ficha', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Descargar ficha', exact: true }).click();
  await expect(page.getByText(/Ficha disponible en IndexedDB para este usuario y clínica/)).toBeVisible();
  await page.goto(`/students/${studentId}`);
  await page.getByRole('tab', { name: 'Documentación Legal' }).click();
  const row = page.getByText(fileName, { exact: true }).locator('xpath=ancestor::*[contains(@class,"mantine-Paper-root")][1]');
  await expect(row.getByText('Disponible', { exact: true })).toBeVisible();
  if (process.env.ABA_QA_OFFLINE_STORAGE_FAILURE_UI === '1') {
    await page.evaluate(() => {
      const original = IDBObjectStore.prototype.put;
      window.__abaRestoreAttachmentPut = () => { IDBObjectStore.prototype.put = original; };
      IDBObjectStore.prototype.put = function (...args) {
        if (this.name === 'attachments') throw new DOMException('Cuota sintética de QA', 'QuotaExceededError');
        return original.apply(this, args);
      };
    });
    await row.getByRole('button', { name: 'Guardar offline', exact: true }).click();
    await expect(page.getByRole('alert', { name: 'Operación documental no completada' })).toContainText('Cuota sintética de QA');
    const afterFailure = await page.evaluate(async ({ studentKey, versionId: targetVersionId }) => {
      const database = await new Promise((resolve, reject) => {
        const open = indexedDB.open('aba-offline-v1', 3);
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      try {
        return await new Promise((resolve, reject) => {
          const transaction = database.transaction(['students', 'attachments'], 'readonly');
          const student = transaction.objectStore('students').get(studentKey);
          const attachment = transaction.objectStore('attachments').get(`${studentKey}:${targetVersionId}`);
          transaction.oncomplete = () => resolve({
            hasAttachment: Boolean(attachment.result),
            selected: student.result?.selectedAttachmentVersionIds.includes(targetVersionId) ?? false,
          });
          transaction.onerror = () => reject(transaction.error);
        });
      } finally { database.close(); }
    }, { studentKey: `${account.userId}:${manifest.clinics.A}:${studentId}`, versionId });
    expect(afterFailure).toEqual({ hasAttachment: false, selected: false });
    await page.evaluate(() => window.__abaRestoreAttachmentPut());
  }
  await row.getByRole('button', { name: 'Guardar offline', exact: true }).click();
  await expect(page.getByText('Documento disponible offline', { exact: true })).toBeVisible();
  const readStored = () => page.evaluate(async targetVersionId => {
    const database = await new Promise((resolve, reject) => {
      const open = indexedDB.open('aba-offline-v1', 3);
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    try {
      const entry = await new Promise((resolve, reject) => {
        const transaction = database.transaction('attachments', 'readonly');
        const read = transaction.objectStore('attachments').getAll();
        read.onsuccess = () => resolve(read.result.find(item => item.version?.id === targetVersionId) ?? null);
        read.onerror = () => reject(read.error);
      });
      if (!entry) return null;
      const bytes = await entry.blob.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      return {
        scopeKey: entry.scopeKey, studentId: entry.studentId, versionId: entry.version.id,
        fileName: entry.version.upload.fileName, byteLength: bytes.byteLength,
        sha256: [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join(''),
      };
    } finally { database.close(); }
  }, versionId);
  const expected = {
    scopeKey: `${account.userId}:${manifest.clinics.A}`, studentId, versionId,
    fileName, byteLength: 68, sha256,
  };
  expect(await readStored()).toEqual(expected);
  await page.goto('/offline-workspace');
  await expect(page.getByText(fileName, { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(async () => Boolean(await caches.match('/offline-workspace'))), { timeout: 15000 }).toBe(true);
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Trabajo offline' })).toBeVisible();
  await expect(page.getByText('1 documentos seleccionados', { exact: false })).toBeVisible();
  await expect(page.getByText(fileName, { exact: true })).toBeVisible();
  expect(await readStored()).toEqual(expected);
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Abrir', exact: true }).click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(/^blob:/);
  await popup.close();
  await context.setOffline(false);
});

test('QA-011: ficha descargada, comando durable offline y recibo tras reconectar', async ({ page, context, request }) => {
  test.setTimeout(120000);
  expect(process.cwd().replaceAll('\\', '/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
  expect(localStatus().API_URL).toBe('http://127.0.0.1:54321');
  await expect.poll(async () => {
    try { return (await request.get('/api/health', { timeout: 3000 })).status(); }
    catch { return 0; }
  }, { timeout: 30000 }).toBe(200);
  const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
  const manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));
  expect(manifest.state).toBe('ready');
  const account = manifest.accounts.find(row => row.label === 'admin-a');
  if (account?.email !== `admin-a.${batchId}@aba.example.test`) throw new Error('Identidad sintética incorrecta');

  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/students');
  await page.getByText('ID clínico: QA-R5-A-2155E99E', { exact: true }).click();
  await expect(page.getByRole('textbox', { name: /^Nombre completo/ })).toHaveValue('QA SINTETICO LOCAL A');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Programas para la sesión' })).toBeVisible();
  const sessionNotes = page.locator('div.mantine-Card-root').filter({ has: page.getByText('Notas de sesión', { exact: true }) }).getByRole('textbox');
  const start = page.getByRole('button', { name: 'Iniciar sesión', exact: true });
  if (await start.count()) {
    await page.getByRole('checkbox', { name: 'Incluir en la sesión', exact: true }).check();
    await start.click();
  }
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Descargar ficha', exact: true }).click();
  await expect(page.getByText(/Ficha disponible en IndexedDB para este usuario y clínica/)).toBeVisible();
  if (process.env.ABA_QA_OFFLINE_PENDING_RELOAD_UI === '1') {
    await expect.poll(() => page.evaluate(async () => Boolean(await caches.match('/offline-workspace'))), { timeout: 15000 }).toBe(true);
  }

  await context.setOffline(true);
  const note = `QA R5 OFFLINE ${batchId.slice(0, 8)}`;
  await sessionNotes.fill(note);
  if (process.env.ABA_QA_OFFLINE_QUEUE_FAILURE_UI === '1') {
    await page.evaluate(() => {
      const original = IDBObjectStore.prototype.add;
      window.__abaQueueFailure = { captured: null };
      window.__abaRestoreQueueAdd = () => { IDBObjectStore.prototype.add = original; };
      IDBObjectStore.prototype.add = function (value, ...rest) {
        if (this.name === 'queue') {
          if (!window.__abaQueueFailure.captured) window.__abaQueueFailure.captured = {
              operationId: value.payload.command.operationId,
              idempotencyKey: value.payload.command.idempotencyKey,
            };
          throw new DOMException('Cuota sintética de cola QA', 'QuotaExceededError');
        }
        return original.apply(this, [value, ...rest]);
      };
    });
    await page.getByRole('button', { name: 'Guardar notas', exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.__abaQueueFailure.captured), { timeout: 5000 }).not.toBeNull();
    await expect(page.getByText('Cuota sintética de cola QA')).toBeVisible();
    expect(await page.evaluate(async targetNote => {
      const database = await new Promise((resolve, reject) => {
        const open = indexedDB.open('aba-offline-v1', 3);
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      try {
        return await new Promise((resolve, reject) => {
          const transaction = database.transaction('queue', 'readonly');
          const read = transaction.objectStore('queue').getAll();
          read.onsuccess = () => resolve(read.result.some(entry => entry.payload?.command?.notes === targetNote));
          read.onerror = () => reject(read.error);
        });
      } finally { database.close(); }
    }, note)).toBe(false);
    await page.evaluate(() => window.__abaRestoreQueueAdd());
  }
  await page.getByRole('button', { name: process.env.ABA_QA_OFFLINE_QUEUE_FAILURE_UI === '1' ? 'Reintentar misma operación' : 'Guardar notas', exact: true }).click();
  await expect(page.getByText(/Sesión guardada en este dispositivo y pendiente de servidor/)).toBeVisible();
  const readQueue = () => page.evaluate(async () => {
    const database = await new Promise((resolve, reject) => {
      const open = indexedDB.open('aba-offline-v1', 3);
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    try {
      return await new Promise((resolve, reject) => {
        const transaction = database.transaction('queue', 'readonly');
        const read = transaction.objectStore('queue').getAll();
        read.onsuccess = () => resolve(read.result.map(({ id, dependsOn, status, payload, scopeKey, serverReceiptId, serverVersion }) => ({ id, dependsOn, status, kind: payload.kind, action: payload.command.action, operationId: payload.command.operationId, idempotencyKey: payload.command.idempotencyKey, expectedVersion: payload.command.expectedVersion, notes: payload.command.notes, scopeKey, serverReceiptId, serverVersion })));
        read.onerror = () => reject(read.error);
      });
    } finally { database.close(); }
  });
  const queued = await readQueue();
  expect(queued).toContainEqual(expect.objectContaining({ status: 'pending', kind: 'session', action: 'update-notes', notes: note }));
  const pending = queued.find(entry => entry.notes === note && entry.status === 'pending');
  expect(pending?.scopeKey).toContain('3e8aa653-8cce-46d0-aa4d-2316d1e5d1b1');
  if (process.env.ABA_QA_OFFLINE_QUEUE_FAILURE_UI === '1') {
    expect({ operationId: pending.operationId, idempotencyKey: pending.idempotencyKey })
      .toEqual(await page.evaluate(() => window.__abaQueueFailure.captured));
  }
  const dependentNote = `QA R5 OFFLINE DEPENDENCIA ${batchId.slice(0, 8)}`;
  if (process.env.ABA_QA_OFFLINE_DEPENDENCY_UI === '1') {
    await sessionNotes.fill(dependentNote);
    await page.getByRole('button', { name: 'Guardar notas', exact: true }).click();
    await expect.poll(async () => (await readQueue()).find(entry => entry.notes === dependentNote)?.status).toBe('pending');
    const dependent = (await readQueue()).find(entry => entry.notes === dependentNote);
    expect(dependent.dependsOn).toContain(pending.id);
    expect(dependent.operationId).not.toBe(pending.operationId);
    expect(dependent.idempotencyKey).not.toBe(pending.idempotencyKey);
  }
  const expectedNote = process.env.ABA_QA_OFFLINE_DEPENDENCY_UI === '1' ? dependentNote : note;
  if (process.env.ABA_QA_OFFLINE_PENDING_RELOAD_UI === '1') {
    await page.goto('/offline-workspace', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Trabajo offline' })).toBeVisible();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Trabajo offline' })).toBeVisible();
    await expect(page.getByText('QA SINTETICO LOCAL A', { exact: true })).toBeVisible();
    expect(await readQueue()).toContainEqual(expect.objectContaining({
      status: 'pending', kind: 'session', action: 'update-notes',
      operationId: pending.operationId, idempotencyKey: pending.idempotencyKey, notes: note,
    }));
    await page.getByRole('button', { name: 'Abrir ficha offline' }).click();
    await expect(page.getByRole('heading', { name: 'Programas para la sesión' })).toBeVisible();
    await expect(sessionNotes).toHaveValue(expectedNote);
  }

  const ackPersistFailure = process.env.ABA_QA_OFFLINE_ACK_FAILURE_UI === '1';
  if (ackPersistFailure) {
    await page.evaluate(targetId => {
      const original = IDBObjectStore.prototype.put;
      window.__abaAckFailure = { count: 0, result: null };
      window.__abaRestoreAckPut = () => { IDBObjectStore.prototype.put = original; };
      IDBObjectStore.prototype.put = function (value, ...rest) {
        if (this.name === 'queue' && value.id === targetId && value.status === 'acknowledged') {
          window.__abaAckFailure.count += 1;
          window.__abaAckFailure.result = {
            operationId: value.payload.command.operationId,
            idempotencyKey: value.payload.command.idempotencyKey,
            serverReceiptId: value.serverReceiptId, serverVersion: value.serverVersion,
          };
          throw new DOMException('Persistencia ACK sintética QA', 'QuotaExceededError');
        }
        return original.apply(this, [value, ...rest]);
      };
    }, pending.id);
  }
  let abortSync;
  let abortedSync = false;
  if (process.env.ABA_QA_OFFLINE_TRANSPORT_UI === '1') {
    abortSync = async route => {
      const request = route.request();
      if (!abortedSync && request.method() === 'POST' && request.postData()?.includes(pending.operationId)) {
        abortedSync = true;
        await route.abort('failed');
      } else await route.continue();
    };
    await page.route('**/*', abortSync);
  }
  await context.setOffline(false);
  let ackResult;
  if (ackPersistFailure) {
    await expect.poll(() => page.evaluate(() => window.__abaAckFailure.count), { timeout: 30000 }).toBeGreaterThan(0);
    await expect.poll(async () => (await readQueue()).find(entry => entry.id === pending.id)?.status, { timeout: 30000 }).toBe('pending');
    const retained = (await readQueue()).find(entry => entry.id === pending.id);
    expect(retained).toEqual(expect.objectContaining({
      operationId: pending.operationId, idempotencyKey: pending.idempotencyKey,
      expectedVersion: pending.expectedVersion, notes: note, serverReceiptId: null,
    }));
    ackResult = await page.evaluate(() => window.__abaAckFailure.result);
    expect(ackResult.serverReceiptId).toBeTruthy();
    expect(ackResult.serverVersion).toBe(pending.expectedVersion + 1);
    // Independent authorized server read proves the command committed before replay.
    const { createClient } = await import('@supabase/supabase-js');
    const status = localStatus();
    const client = createClient(status.API_URL, status.ANON_KEY ?? status.PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    try {
      const login = await client.auth.signInWithPassword({ email: account.email, password: account.password });
      if (login.error || login.data.user?.id !== account.userId) throw new Error('Identidad sintética no verificada para ACK');
      const read = await client.rpc('read_program_session_v2', { p_clinic_id: manifest.clinics.A, p_student_id: 'b347646e-ff29-450b-aedf-9f9c015fb41a' });
      if (read.error) throw new Error('Relectura autorizada del ACK falló');
      expect(read.data.sessions.some(session => session.notes === note && session.version === ackResult.serverVersion)).toBe(true);
    } finally { await client.auth.signOut({ scope: 'local' }); }
    await page.evaluate(() => window.__abaRestoreAckPut());
    await page.goto('/offline-workspace');
    await page.getByRole('button', { name: 'Estado offline y sincronización' }).click();
    await page.getByRole('button', { name: 'Sincronizar', exact: true }).click();
  }
  if (abortSync) {
    await expect.poll(() => abortedSync, { timeout: 30000 }).toBe(true);
    await expect.poll(async () => (await readQueue()).find(entry => entry.id === pending.id)?.status, { timeout: 30000 }).toBe('pending');
    expect((await readQueue()).find(entry => entry.id === pending.id)).toEqual(expect.objectContaining({
      operationId: pending.operationId, idempotencyKey: pending.idempotencyKey,
      notes: note, serverReceiptId: null,
    }));
    await page.unroute('**/*', abortSync);
    await page.goto('/offline-workspace');
    await page.getByRole('button', { name: 'Estado offline y sincronización' }).click();
    await page.getByRole('button', { name: 'Sincronizar', exact: true }).click();
  }
  await expect.poll(async () => page.evaluate(async targetNote => {
    const database = await new Promise((resolve, reject) => {
      const open = indexedDB.open('aba-offline-v1', 3);
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    try {
      return await new Promise((resolve, reject) => {
        const transaction = database.transaction('queue', 'readonly');
        const read = transaction.objectStore('queue').getAll();
        read.onsuccess = () => resolve(read.result.find(entry => entry.payload?.command?.notes === targetNote)?.status ?? null);
        read.onerror = () => reject(read.error);
      });
    } finally { database.close(); }
  }, note), { timeout: 30000 }).toBe('acknowledged');
  if (abortSync || ackPersistFailure) {
    const acknowledged = (await readQueue()).find(entry => entry.id === pending.id);
    expect(acknowledged).toEqual(expect.objectContaining({
      status: 'acknowledged', operationId: pending.operationId,
      idempotencyKey: pending.idempotencyKey, notes: note,
      serverVersion: pending.expectedVersion + 1,
    }));
    expect(acknowledged.serverReceiptId).toBeTruthy();
    if (ackPersistFailure) {
      expect(acknowledged.serverReceiptId).toBe(ackResult.serverReceiptId);
      expect(acknowledged.serverVersion).toBe(ackResult.serverVersion);
    }
    await page.getByRole('button', { name: 'Estado offline y sincronización' }).click();
    await page.getByRole('button', { name: 'Abrir ficha offline' }).click();
  }
  if (process.env.ABA_QA_OFFLINE_DEPENDENCY_UI === '1') {
    await expect.poll(async () => (await readQueue()).find(entry => entry.notes === dependentNote)?.status, { timeout: 30000 }).toBe('acknowledged');
    const receipts = await readQueue();
    const first = receipts.find(entry => entry.notes === note);
    const second = receipts.find(entry => entry.notes === dependentNote);
    expect(first?.serverReceiptId).toBeTruthy();
    expect(second?.serverReceiptId).toBeTruthy();
    expect(second.serverReceiptId).not.toBe(first.serverReceiptId);
    expect(second.serverVersion).toBe(first.serverVersion + 1);
  }
  await page.reload();
  if (process.env.ABA_QA_OFFLINE_PENDING_RELOAD_UI === '1' || abortSync || ackPersistFailure) {
    await expect(page.getByRole('heading', { name: 'Trabajo offline' })).toBeVisible();
    await page.getByRole('button', { name: 'Abrir ficha offline' }).click();
  }
  await expect(sessionNotes).toHaveValue(expectedNote);
  await page.goto('/offline-workspace');
  await expect(page.getByRole('heading', { name: 'Trabajo offline' })).toBeVisible();
  await expect(page.getByText('QA SINTETICO LOCAL A', { exact: true })).toBeVisible();
  if (process.env.ABA_QA_OFFLINE_RELOAD_UI === '1') {
    await expect.poll(() => page.evaluate(async () => Boolean(await caches.match('/offline-workspace'))), { timeout: 15000 }).toBe(true);
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Trabajo offline' })).toBeVisible();
    await expect(page.getByText('QA SINTETICO LOCAL A', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Abrir ficha offline' }).click();
    await expect(page.getByRole('heading', { name: 'Programas para la sesión' })).toBeVisible();
    await expect(sessionNotes).toHaveValue(expectedNote);
    await context.setOffline(false);
  }
});

test('QA-011: conflicto offline conserva borrador hasta revisión y supersesión explícita', async ({ page, context, browser, request }) => {
  test.skip(process.env.ABA_QA_OFFLINE_CONFLICT_UI !== '1', 'Conflicto sintético explícito');
  test.setTimeout(180000);
  expect(process.cwd().replaceAll('\\', '/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
  expect(localStatus().API_URL).toBe('http://127.0.0.1:54321');
  expect((await request.get('/api/health')).status()).toBe(200);
  const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
  const manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));
  expect(manifest.state).toBe('ready');
  const accountLabel = process.env.ABA_QA_OFFLINE_CLINIC_UI === '1' ? 'supervisor-a' : 'admin-a';
  const account = manifest.accounts.find(row => row.label === accountLabel);
  if (account?.email !== `${accountLabel}.${batchId}@aba.example.test`) throw new Error('Identidad sintética incorrecta');
  const studentId = 'b347646e-ff29-450b-aedf-9f9c015fb41a';
  const login = async target => {
    await target.goto('/login');
    try {
      await target.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
      await target.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(account.password);
    } catch { throw new Error('Formulario sintético no disponible; valores omitidos'); }
    await target.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
    await expect(target).toHaveURL(/\/dashboard$/);
    if (process.env.ABA_QA_OFFLINE_CLINIC_UI === '1') {
      const clinic = target.getByRole('textbox', { name: 'Clínica activa' });
      const mobile = (target.viewportSize()?.width ?? 9999) < 576;
      if (mobile) await target.locator('header button').first().click();
      if (!(await clinic.inputValue()).includes('Clínica sintética A')) {
        await clinic.click();
        await target.getByRole('option', { name: /Clínica sintética A/ }).click();
      }
      await expect(clinic).toHaveValue(/Clínica sintética A/);
      if (mobile) await target.locator('header button').first().click();
    }
  };
  const notesFor = target => target.locator('div.mantine-Card-root').filter({ has: target.getByText('Notas de sesión', { exact: true }) }).getByRole('textbox');
  const readQueue = () => page.evaluate(async () => {
    const database = await new Promise((resolve, reject) => {
      const open = indexedDB.open('aba-offline-v1', 3);
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    try {
      return await new Promise((resolve, reject) => {
        const transaction = database.transaction('queue', 'readonly');
        const read = transaction.objectStore('queue').getAll();
        read.onsuccess = () => resolve(read.result.map(entry => ({
          id: entry.id, status: entry.status, operationId: entry.payload.command.operationId,
          idempotencyKey: entry.payload.command.idempotencyKey, notes: entry.payload.command.notes,
          supersedesEntryId: entry.supersedesEntryId, serverReceiptId: entry.serverReceiptId,
        })));
        read.onerror = () => reject(read.error);
      });
    } finally { database.close(); }
  });

  let adminContext;
  let assignmentActive = false;
  let setAssignment;
  try {
  if (process.env.ABA_QA_OFFLINE_CLINIC_UI === '1') {
    const admin = manifest.accounts.find(row => row.label === 'admin-a');
    if (admin?.email !== `admin-a.${batchId}@aba.example.test`) throw new Error('Administrador sintético incorrecto');
    adminContext = await browser.newContext({ baseURL: process.env.ABA_QA_BASE_URL ?? 'http://localhost:3000' });
    const adminPage = await adminContext.newPage();
    await adminPage.goto('/login');
    await adminPage.getByRole('textbox', { name: 'Email', exact: true }).fill(admin.email);
    await adminPage.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(admin.password);
    await adminPage.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
    await expect(adminPage).toHaveURL(/\/dashboard$/);
    await adminPage.goto('/team');
    await adminPage.getByRole('textbox', { name: 'Buscar equipo' }).fill(account.email);
    await expect(adminPage.getByText(account.email, { exact: true })).toBeVisible();
    await adminPage.getByRole('button', { name: 'Editar Perfil', exact: true }).click();
    const modal = adminPage.getByRole('dialog', { name: 'Editar Perfil del Miembro' });
    await expect(modal.getByText('Asignaciones por ficha', { exact: true })).toBeVisible();
    setAssignment = async status => {
      const clientInput = modal.getByRole('textbox', { name: 'Ficha autorizada' });
      if (!(await clientInput.inputValue()).includes('QA-R5-A-2155E99E')) {
        await clientInput.click();
        await adminPage.getByRole('option', { name: /QA-R5-A-2155E99E/ }).click();
      }
      const statusInput = modal.getByRole('textbox', { name: 'Estado' });
      const statusLabel = status === 'active' ? 'Activo' : 'Suspendido';
      if (await statusInput.inputValue() !== statusLabel) {
        await statusInput.click();
        await adminPage.getByRole('option', { name: statusLabel, exact: true }).click();
      }
      await modal.getByRole('button', { name: 'Guardar asignación', exact: true }).click();
      await expect(modal.getByText('Asignación confirmada por el servidor.', { exact: true })).toBeVisible();
      await expect(modal.getByRole('button', { name: 'Guardar asignación', exact: true })).toBeEnabled();
    };
    assignmentActive = true;
    await setAssignment('active');
  }
  await login(page);
  await page.goto(`/session/${studentId}`);
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Descargar ficha', exact: true }).click();
  await expect(page.getByText(/Ficha disponible en IndexedDB para este usuario y clínica/)).toBeVisible();
  const localNote = `QA R5 CONFLICTO LOCAL ${test.info().project.name} ${Date.now()}`;
  await context.setOffline(true);
  await notesFor(page).fill(localNote);
  await page.getByRole('button', { name: 'Guardar notas', exact: true }).click();
  await expect(page.getByText(/Sesión guardada en este dispositivo y pendiente de servidor/)).toBeVisible();
  const original = (await readQueue()).find(entry => entry.notes === localNote && entry.status === 'pending');
  expect(original?.operationId).toBeTruthy();

  const competitor = await browser.newContext({ baseURL: process.env.ABA_QA_BASE_URL ?? 'http://localhost:3000' });
  try {
    const other = await competitor.newPage();
    await login(other);
    await other.goto(`/session/${studentId}`);
    const serverNote = `QA R5 CONFLICTO SERVIDOR ${test.info().project.name} ${Date.now()}`;
    await notesFor(other).fill(serverNote);
    await other.getByRole('button', { name: 'Guardar notas', exact: true }).click();
    await expect(other.getByText('Servidor confirmado', { exact: true })).toBeVisible();
    await other.reload();
    await expect(notesFor(other)).toHaveValue(serverNote);
  } finally { await competitor.close(); }

  await context.setOffline(false);
  await expect.poll(async () => (await readQueue()).find(entry => entry.id === original.id)?.status, { timeout: 30000 }).toBe('blocked-conflict');
  expect((await readQueue()).find(entry => entry.id === original.id)).toEqual(expect.objectContaining({
    operationId: original.operationId, idempotencyKey: original.idempotencyKey, notes: localNote, serverReceiptId: null,
  }));
  await expect(page.getByText('Conflicto offline preservado', { exact: true })).toBeVisible();
  if (process.env.ABA_QA_OFFLINE_CLINIC_UI === '1') {
    await page.goto('/offline-workspace');
    const clinic = page.getByRole('textbox', { name: 'Clínica activa' });
    const mobile = (page.viewportSize()?.width ?? 9999) < 576;
    const chooseClinic = async (name, confirm) => {
      if (mobile) await page.locator('header button').first().click();
      await clinic.click();
      const dialogPromise = confirm === null ? null : page.waitForEvent('dialog');
      await page.getByRole('option', { name: new RegExp(name) }).click();
      if (dialogPromise) {
        const dialog = await dialogPromise;
        expect(dialog.message()).toMatch(/operación pendiente.*caché quedará bloqueado/);
        if (confirm) await dialog.accept();
        else await dialog.dismiss();
      }
      await expect(clinic).toHaveValue(new RegExp(confirm === false ? 'Clínica sintética A' : name));
      if (mobile) await page.locator('header button').first().click();
    };
    await expect(page.getByText('QA SINTETICO LOCAL A', { exact: true })).toBeVisible();
    await chooseClinic('Clínica sintética B', false);
    expect((await readQueue()).find(entry => entry.id === original.id)?.status).toBe('blocked-conflict');
    await chooseClinic('Clínica sintética B', true);
    await expect(page.getByText('No hay fichas descargadas en este alcance.')).toBeVisible();
    await page.getByRole('button', { name: 'Estado offline y sincronización' }).click();
    await expect(page.getByText('No hay operaciones locales pendientes en este alcance.')).toBeVisible();
    await page.getByRole('button', { name: 'Estado offline y sincronización' }).click();
    await chooseClinic('Clínica sintética A', null);
    await expect(page.getByText('QA SINTETICO LOCAL A', { exact: true })).toBeVisible();
    expect((await readQueue()).find(entry => entry.id === original.id)).toEqual(expect.objectContaining({
      status: 'blocked-conflict', operationId: original.operationId, idempotencyKey: original.idempotencyKey,
      notes: localNote, serverReceiptId: null,
    }));
    await page.goto(`/session/${studentId}`);
    await expect(page.getByText('Conflicto offline preservado', { exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Consultar versión vigente', exact: true }).click();
  await expect(page.getByText('Compara explícitamente la versión servidor con el comando local antes de continuar:')).toBeVisible();
  await page.getByRole('button', { name: 'He revisado: crear nueva operación enlazada', exact: true }).click();
  await expect.poll(async () => {
    const queue = await readQueue();
    const previous = queue.find(entry => entry.id === original.id);
    const replacement = queue.find(entry => entry.supersedesEntryId === original.id);
    return previous?.status === 'superseded' && replacement?.status === 'acknowledged' && replacement.notes === localNote && Boolean(replacement.serverReceiptId);
  }, { timeout: 30000 }).toBe(true);
  const queue = await readQueue();
  const replacement = queue.find(entry => entry.supersedesEntryId === original.id);
  expect(replacement.operationId).not.toBe(original.operationId);
  expect(replacement.idempotencyKey).not.toBe(original.idempotencyKey);
  await page.reload();
  await expect(notesFor(page)).toHaveValue(localNote);
  } finally {
    try { if (assignmentActive) await setAssignment('inactive'); }
    finally { if (adminContext) await adminContext.close(); }
  }
});

test('QA-011: revocación de asignación bloquea envío y conserva comando local', async ({ page, browser, request }) => {
  test.skip(process.env.ABA_QA_OFFLINE_REVOKE_UI !== '1', 'Revocación sintética explícita');
  test.setTimeout(180000);
  expect(process.cwd().replaceAll('\\', '/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
  expect(localStatus().API_URL).toBe('http://127.0.0.1:54321');
  expect((await request.get('/api/health')).status()).toBe(200);
  const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
  const manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));
  expect(manifest.state).toBe('ready');
  const admin = manifest.accounts.find(row => row.label === 'admin-a');
  const technician = manifest.accounts.find(row => row.label === 'tecnico-a');
  if (admin?.email !== `admin-a.${batchId}@aba.example.test` || technician?.email !== `tecnico-a.${batchId}@aba.example.test`) throw new Error('Identidad sintética incorrecta');
  const studentId = 'b347646e-ff29-450b-aedf-9f9c015fb41a';
  const login = async (target, account) => {
    await target.goto('/login');
    try {
      await target.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
      await target.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(account.password);
    } catch { throw new Error('Formulario sintético no disponible; valores omitidos'); }
    await target.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
    await expect(target).toHaveURL(/\/dashboard$/);
  };
  const notesFor = target => target.locator('div.mantine-Card-root').filter({ has: target.getByText('Notas de sesión', { exact: true }) }).getByRole('textbox');
  await login(page, admin);
  await page.goto('/team');
  await page.getByRole('textbox', { name: 'Buscar equipo' }).fill(technician.email);
  await expect(page.getByText(technician.email, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Editar Perfil', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Editar Perfil del Miembro' });
  await expect(modal.getByText('Asignaciones por ficha', { exact: true })).toBeVisible();
  const setAssignment = async status => {
    const clientInput = modal.getByRole('textbox', { name: 'Ficha autorizada' });
    if (!(await clientInput.inputValue()).includes('QA-R5-A-2155E99E')) {
      await clientInput.click();
      await page.getByRole('option', { name: /QA-R5-A-2155E99E/ }).click();
    }
    await expect(clientInput).toHaveValue(/QA-R5-A-2155E99E/);
    const statusInput = modal.getByRole('textbox', { name: 'Estado' });
    const statusLabel = status === 'active' ? 'Activo' : 'Suspendido';
    if (await statusInput.inputValue() !== statusLabel) {
      await statusInput.click();
      await page.getByRole('option', { name: statusLabel, exact: true }).click();
    }
    await expect(statusInput).toHaveValue(statusLabel);
    await modal.getByRole('button', { name: 'Guardar asignación', exact: true }).click();
    await expect(modal.getByText('Asignación confirmada por el servidor.', { exact: true })).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Guardar asignación', exact: true })).toBeEnabled();
  };
  let active = false;
  let techContext;
  try {
    await setAssignment('active');
    active = true;
    const adminSession = await page.context().newPage();
    await adminSession.goto(`/session/${studentId}`);
    const serverNotesBefore = await notesFor(adminSession).inputValue();
    techContext = await browser.newContext({ baseURL: process.env.ABA_QA_BASE_URL ?? 'http://localhost:3000' });
    const techPage = await techContext.newPage();
    await login(techPage, technician);
    await techPage.goto(`/session/${studentId}`);
    await expect(techPage.getByRole('button', { name: 'Descargar ficha', exact: true })).toBeEnabled();
    await techPage.getByRole('button', { name: 'Descargar ficha', exact: true }).click();
    await expect(techPage.getByText(/Ficha disponible en IndexedDB para este usuario y clínica/)).toBeVisible();
    await techContext.setOffline(true);
    const localNote = `QA R5 REVOCACION LOCAL ${test.info().project.name} ${Date.now()}`;
    await notesFor(techPage).fill(localNote);
    await techPage.getByRole('button', { name: 'Guardar notas', exact: true }).click();
    await expect(techPage.getByText(/Sesión guardada en este dispositivo y pendiente de servidor/)).toBeVisible();
    const readCommand = () => techPage.evaluate(async targetNote => {
      const database = await new Promise((resolve, reject) => {
        const open = indexedDB.open('aba-offline-v1', 3);
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      try {
        return await new Promise((resolve, reject) => {
          const transaction = database.transaction('queue', 'readonly');
          const read = transaction.objectStore('queue').getAll();
          read.onsuccess = () => {
            const found = read.result.find(entry => entry.payload?.command?.notes === targetNote);
            resolve(found ? { id: found.id, status: found.status, operationId: found.payload.command.operationId, idempotencyKey: found.payload.command.idempotencyKey, notes: found.payload.command.notes, serverReceiptId: found.serverReceiptId, error: found.error } : null);
          };
          read.onerror = () => reject(read.error);
        });
      } finally { database.close(); }
    }, localNote);
    const pending = await readCommand();
    expect(pending).toEqual(expect.objectContaining({ status: 'pending', notes: localNote, serverReceiptId: null }));
    await setAssignment('inactive');
    active = false;
    await techContext.setOffline(false);
    await expect.poll(async () => (await readCommand())?.status, { timeout: 30000 }).toBe('blocked-permission');
    expect(await readCommand()).toEqual(expect.objectContaining({
      status: 'blocked-permission', operationId: pending.operationId,
      idempotencyKey: pending.idempotencyKey, notes: localNote, serverReceiptId: null,
    }));
    await adminSession.reload();
    await expect(notesFor(adminSession)).toHaveValue(serverNotesBefore);
    await adminSession.close();
    if (process.env.ABA_QA_OFFLINE_SCOPE_UI === '1') {
      await techPage.goto('/offline-workspace');
      const offlineButton = techPage.getByRole('button', { name: 'Estado offline y sincronización' });
      await offlineButton.click();
      await expect(techPage.getByText('1 pendientes', { exact: true })).toBeVisible();
      await expect(techPage.getByText('1 bloqueados', { exact: true })).toBeVisible();
      await offlineButton.click();
      const signOut = async withPending => {
        await techPage.getByRole('button', { name: 'Menú de perfil' }).click();
        const dialogPromise = withPending ? techPage.waitForEvent('dialog') : null;
        await techPage.getByRole('menuitem', { name: 'Cerrar Sesión' }).click();
        if (dialogPromise) {
          const dialog = await dialogPromise;
          expect(dialog.message()).toMatch(/operación pendiente.*caché quedará bloqueado/);
          await dialog.accept();
        }
        await expect(techPage).toHaveURL(/\/login$/);
      };
      await techPage.getByRole('button', { name: 'Menú de perfil' }).click();
      const cancelPromise = techPage.waitForEvent('dialog');
      await techPage.getByRole('menuitem', { name: 'Cerrar Sesión' }).click();
      const cancelDialog = await cancelPromise;
      expect(cancelDialog.message()).toMatch(/operación pendiente.*caché quedará bloqueado/);
      await cancelDialog.dismiss();
      await expect(techPage).toHaveURL(/\/offline-workspace$/);
      await signOut(true);
      await login(techPage, admin);
      await techPage.goto('/offline-workspace');
      await expect(techPage.getByText('No hay fichas descargadas en este alcance.')).toBeVisible();
      await offlineButton.click();
      await expect(techPage.getByText('No hay operaciones locales pendientes en este alcance.')).toBeVisible();
      await offlineButton.click();
      expect(await readCommand()).toEqual(expect.objectContaining({ status: 'blocked-permission', id: pending.id }));
      await signOut(false);
      await login(techPage, technician);
      await techPage.goto('/offline-workspace');
      await offlineButton.click();
      await expect(techPage.getByText('1 pendientes', { exact: true })).toBeVisible();
      await expect(techPage.getByText('1 bloqueados', { exact: true })).toBeVisible();
      expect(await readCommand()).toEqual(expect.objectContaining({ status: 'blocked-permission', id: pending.id }));
    }
  } finally {
    if (active) await setAssignment('inactive');
    if (techContext) await techContext.close();
  }
});

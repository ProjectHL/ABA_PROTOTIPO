import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import { localStatus, state } from '../../scripts/local/write-env.mjs';

test.skip(process.env.ABA_QA_LOCAL_UI !== '1' || process.env.ABA_QA_CAPTURE_CONFLICT_UI !== '1', 'Concurrencia de medición sintética local explícita');
test.use({ actionTimeout: 15000 });
const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
const studentId = 'b347646e-ff29-450b-aedf-9f9c015fb41a';
const sessionId = '97a8e135-1fb0-4397-910f-f4fe5f099ad1';
const sessionPath = `/session/${studentId}`;
const baseURL = process.env.ABA_QA_BASE_URL ?? 'http://localhost:3000';

async function signIn(page, account) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto(sessionPath);
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
}

async function openOwnRecord(page, prefix) {
  const buttons = page.getByRole('button', { name: 'Corregir enviado', exact: true });
  await expect(buttons.first()).toBeVisible();
  for (let index = 0; index < await buttons.count(); index += 1) {
    await buttons.nth(index).click();
    const modal = page.getByRole('dialog');
    const note = await modal.getByRole('textbox', { name: 'Notas originales', exact: true }).inputValue();
    if (note.startsWith(prefix)) return modal;
    await modal.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await expect(modal).toHaveCount(0);
  }
  throw new Error('Registro dedicado de concurrencia no disponible; no editar otros registros');
}

function capturedCommand(request, recordId) {
  if (request.method() !== 'POST' || !request.headers()['next-action']) return null;
  let args;
  try { args = JSON.parse(request.postData() ?? '[]'); }
  catch { return null; }
  if (!Array.isArray(args)) return null;
  return args.find(arg => arg?.command?.action === 'revise' && arg.command.recordId === recordId)?.command ?? null;
}

test('QA-007/015: revisión concurrente conserva observaciones y replay exacto no duplica medición', async ({ page, browser, request }, testInfo) => {
  test.setTimeout(240000);
  expect(process.cwd().replaceAll('\\', '/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
  const status = localStatus();
  expect(status.API_URL).toBe('http://127.0.0.1:54321');
  expect((await request.get('/api/health')).status()).toBe(200);
  const manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));
  expect(manifest.state).toBe('ready');
  expect(manifest.batchId).toBe(batchId);
  expect(manifest.apiUrl).toBe(status.API_URL);
  const account = manifest.accounts.find(row => row.label === 'admin-a');
  if (account?.email !== `admin-a.${batchId}@aba.example.test`) throw new Error('Identidad sintética incorrecta');
  const client = createClient(status.API_URL, status.ANON_KEY ?? status.PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } });
  const otherContext = await browser.newContext({ baseURL, viewport: testInfo.project.use.viewport,
    isMobile: testInfo.project.name === 'mobile', hasTouch: testInfo.project.name === 'mobile' });
  const other = await otherContext.newPage();
  try {
    const login = await client.auth.signInWithPassword({ email: account.email, password: account.password });
    if (login.error || login.data.user?.id !== account.userId || login.data.user.app_metadata.aba_fixture_batch !== batchId) throw new Error('Actor sintético no verificado');
    const readSnapshot = async () => {
      const result = await client.rpc('read_program_session_v2', { p_clinic_id: manifest.clinics.A, p_student_id: studentId });
      if (result.error || !result.data) throw new Error('Lectura autorizada de sesión no confirmada');
      expect(result.data.actorId).toBe(account.userId);
      return result.data;
    };
    const student = await client.rpc('aba_student_detail_v2', { p_organization_id: manifest.clinics.A, p_client_id: studentId });
    if (student.error || student.data?.clinicalId !== 'QA-R5-A-2155E99E' || student.data?.fullName !== 'QA SINTETICO LOCAL A') throw new Error('Ficha sintética no confirmada');
    const before = await readSnapshot();
    const session = before.sessions.find(row => row.id === sessionId);
    expect(session).toBeDefined();
    expect(session.studentId).toBe(studentId);
    expect(session.clinicId).toBe(manifest.clinics.A);
    expect(session.notes).toMatch(/^QA /);
    expect(['started', 'resumed']).toContain(session.events.at(-1)?.type);
    const program = before.programs.find(row => session.programs.some(ref => ref.programId === row.id)
      && row.versions.some(version => version.title === 'QA R5 CONDUCTA LOCAL'));
    expect(program).toBeDefined();
    const prefix = `QA R5 MEDICION CONFLICTO ${testInfo.project.name.toUpperCase()}`;
    const existing = before.records.filter(row => row.sessionId === sessionId && row.programId === program.id
      && row.originalMeasurement?.notes?.startsWith(prefix) && !row.discarded);
    if (existing.length > 1) throw new Error('Fixture de medición ambiguo; no seleccionar otro registro');
    await signIn(page, account);
    if (existing.length === 0) {
      const programCard = page.locator('.mantine-Card-root').filter({ has: page.getByText('QA R5 CONDUCTA LOCAL', { exact: true }) });
      await expect(programCard).toHaveCount(1);
      await programCard.getByRole('button', { name: 'Nuevo registro', exact: true }).click();
      let modal = page.getByRole('dialog');
      const dimension = modal.getByRole('textbox', { name: 'Dimensión', exact: true });
      if (await dimension.inputValue() !== 'Porcentaje') {
        page.once('dialog', dialog => dialog.message().startsWith('La dimensión nueva se guardará') ? dialog.accept() : dialog.dismiss());
        await dimension.click();
        await page.getByRole('option', { name: 'Porcentaje', exact: true }).click();
        modal = page.getByRole('dialog');
      }
      const independent = modal.getByRole('radio', { name: 'I', exact: true }).first();
      await modal.locator(`label[for="${await independent.getAttribute('id')}"]`).click();
      await expect(independent).toBeChecked();
      await modal.getByRole('textbox', { name: 'Notas originales', exact: true }).fill(`${prefix} BASE`);
      await modal.getByRole('button', { name: 'Enviar registro', exact: true }).click();
      await expect(modal).toHaveCount(0);
    }
    const readRecord = async () => {
      const snapshot = await readSnapshot();
      const matches = snapshot.records.filter(row => row.sessionId === sessionId && row.programId === program.id
        && row.originalMeasurement?.notes?.startsWith(prefix) && !row.discarded);
      expect(matches).toHaveLength(1);
      const record = matches[0];
      expect(record.actorId).toBe(account.userId);
      expect(record.studentId).toBe(studentId);
      expect(record.submitted).toBe(true);
      expect(record.originalMeasurement.schemaVersion).toBe(2);
      expect(record.originalMeasurement.dimension).toBe('percentage');
      return record;
    };
    const baseline = await readRecord();
    const baseVersion = baseline.version;
    await signIn(other, account);
    const ownModal = await openOwnRecord(page, prefix);
    const otherModal = await openOwnRecord(other, prefix);
    const noteA = `${prefix} A`;
    const noteB = `${prefix} B`;
    await otherModal.getByRole('textbox', { name: 'Notas originales', exact: true }).fill(noteB);
    await otherModal.getByRole('textbox', { name: 'Motivo de la corrección', exact: true }).fill('QA revisión B concurrente');
    await ownModal.getByRole('textbox', { name: 'Notas originales', exact: true }).fill(noteA);
    await ownModal.getByRole('textbox', { name: 'Motivo de la corrección', exact: true }).fill('QA revisión A concurrente');
    await ownModal.getByRole('button', { name: 'Guardar corrección', exact: true }).click();
    await expect(ownModal).toHaveCount(0);
    await expect.poll(async () => (await readRecord()).version).toBe(baseVersion + 1);
    const committedA = await readRecord();
    expect(committedA.originalMeasurement.notes).toBe(noteA);
    expect(committedA.originalMeasurement.trials).toEqual(baseline.originalMeasurement.trials);
    expect(committedA.revisions.some(row => JSON.stringify(row.originalMeasurement) === JSON.stringify(baseline.originalMeasurement))).toBe(true);

    const rebaseCommands = [];
    await other.route(sessionPath, async route => {
      const command = capturedCommand(route.request(), baseline.id);
      if (command) rebaseCommands.push(command);
      await route.continue();
    });
    await otherModal.getByRole('button', { name: 'Guardar corrección', exact: true }).click();
    await expect(otherModal.getByRole('button', { name: 'Consultar versión vigente', exact: true })).toBeVisible();
    await expect(otherModal.getByRole('textbox', { name: 'Notas originales', exact: true })).toHaveValue(noteB);
    await expect(otherModal.getByRole('textbox', { name: 'Motivo de la corrección', exact: true })).toHaveValue('QA revisión B concurrente');
    await expect(otherModal.getByRole('button', { name: 'Guardar corrección', exact: true })).toBeDisabled();
    expect((await readRecord()).version).toBe(baseVersion + 1);
    expect((await readRecord()).originalMeasurement.notes).toBe(noteA);
    await otherModal.getByRole('button', { name: 'Consultar versión vigente', exact: true }).click();
    await expect(otherModal.locator('pre')).toContainText(noteA);
    await otherModal.getByRole('button', { name: 'He revisado: conservar mi borrador sobre esta versión', exact: true }).click();
    await expect(otherModal.getByRole('textbox', { name: 'Notas originales', exact: true })).toHaveValue(noteB);
    expect((await readRecord()).version).toBe(baseVersion + 1); // Review is not a write.
    await otherModal.getByRole('button', { name: 'Guardar corrección', exact: true }).click();
    await expect(otherModal).toHaveCount(0);
    await expect.poll(async () => (await readRecord()).version).toBe(baseVersion + 2);
    expect(rebaseCommands).toHaveLength(2);
    expect(rebaseCommands[0].expectedVersion).toBe(baseVersion);
    expect(rebaseCommands[1].expectedVersion).toBe(baseVersion + 1);
    expect(rebaseCommands[1].operationId).not.toBe(rebaseCommands[0].operationId);
    expect(rebaseCommands[1].idempotencyKey).not.toBe(rebaseCommands[0].idempotencyKey);
    const committedB = await readRecord();
    expect(committedB.originalMeasurement.notes).toBe(noteB);
    expect(committedB.originalMeasurement.trials).toEqual(baseline.originalMeasurement.trials);
    await other.unrouteAll({ behavior: 'wait' });

    await page.reload();
    const retryModal = await openOwnRecord(page, prefix);
    const retryNote = `${prefix} ACK PERDIDO`;
    await retryModal.getByRole('textbox', { name: 'Notas originales', exact: true }).fill(retryNote);
    await retryModal.getByRole('textbox', { name: 'Motivo de la corrección', exact: true }).fill('QA resultado desconocido y replay exacto');
    const replayCommands = [];
    let responseLost = false;
    let transportFailure = false;
    await page.route(sessionPath, async route => {
      const command = capturedCommand(route.request(), baseline.id);
      if (!command || command.measurement.notes !== retryNote) return route.continue();
      replayCommands.push(command);
      if (responseLost) return route.continue();
      try {
        const actual = await route.fetch({ timeout: 15000 });
        if (actual.status() !== 200) throw new Error('Server Action de medición no confirmada');
        await actual.body();
        responseLost = true;
        await route.abort('failed');
      } catch {
        // Fetch call logs contain session cookies; never expose the original error.
        transportFailure = true;
        await route.abort('failed').catch(() => {});
      }
    });
    await retryModal.getByRole('button', { name: 'Guardar corrección', exact: true }).click();
    await expect.poll(() => responseLost || transportFailure, { timeout: 20000 }).toBe(true);
    expect(transportFailure, 'Transporte no completado; detalles sensibles omitidos').toBe(false);
    await expect(retryModal.getByRole('button', { name: 'Reintentar mismo registro', exact: true })).toBeVisible();
    await expect(retryModal.getByRole('button', { name: 'Guardar corrección', exact: true })).toBeDisabled();
    expect(replayCommands).toHaveLength(1);
    await expect.poll(async () => (await readRecord()).version).toBe(baseVersion + 3);
    expect((await readRecord()).originalMeasurement.notes).toBe(retryNote);
    await other.reload();
    const observer = await openOwnRecord(other, prefix);
    await expect(observer.getByRole('textbox', { name: 'Notas originales', exact: true })).toHaveValue(retryNote);
    await observer.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await retryModal.getByRole('button', { name: 'Reintentar mismo registro', exact: true }).click();
    await expect(retryModal.getByRole('button', { name: 'Reintentar mismo registro', exact: true })).toHaveCount(0);
    expect(replayCommands).toHaveLength(2);
    expect(replayCommands[1]).toEqual(replayCommands[0]);
    await page.unrouteAll({ behavior: 'wait' });
    const final = await readRecord();
    expect(final.version).toBe(baseVersion + 3);
    expect(final.revisions).toHaveLength(baseline.revisions.length + 3);
    expect(final.originalMeasurement.trials).toEqual(baseline.originalMeasurement.trials);
    for (const original of baseline.revisions) expect(final.revisions).toContainEqual(original);
    const after = await readSnapshot();
    expect(after.sessions.find(row => row.id === sessionId)).toEqual(session);
    for (const original of before.records) {
      if (original.id !== final.id) expect(after.records.find(row => row.id === original.id)).toEqual(original);
    }
    // Leave the shared offline session active. No finish, cancel, archive, or clinical cleanup.
  } finally {
    await page.unrouteAll({ behavior: 'wait' });
    await other.unrouteAll({ behavior: 'wait' });
    await otherContext.close();
    await client.auth.signOut({ scope: 'local' });
  }
});
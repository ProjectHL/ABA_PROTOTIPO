import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import { localStatus, state } from '../../scripts/local/write-env.mjs';
import { measurementV2Metrics } from '../../src/domain/measurements/measurement-v2.ts';
import { sessionV2Timeline } from '../../src/domain/sessions/session-v2.ts';

const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
const baseURL = process.env.ABA_QA_BASE_URL ?? 'http://localhost:3001';
const clinicalId = 'QA-R5-LIFECYCLE-V5';
const studentName = 'QA R5 CICLO LOCAL V5';
const programTitle = 'QA R5 CICLO V5';
// Root runs desktop then mobile serially: both use admin-a and the same own fixture.
// All mutations below use production UI; Supabase is authenticated read-only.
test.skip(process.env.ABA_QA_LOCAL_UI !== '1' || process.env.ABA_QA_SESSION_LIFECYCLE_V5_UI !== '1', 'Ciclo V5 sintético local explícito');
test.use({ baseURL, actionTimeout: 15000, trace: 'off', video: 'off', screenshot: 'off' });

async function signIn(page, account) {
  await page.goto('/login');
  try {
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(account.password);
  } catch { throw new Error('Formulario local no disponible; credenciales omitidas'); }
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(`${baseURL}/dashboard`);
}

async function ownStudent(page) {
  await page.goto('/students');
  await expect(page.getByRole('heading', { name: 'Carpetas de Estudiantes' })).toBeVisible();
  await expect(page.getByText('Cargando fichas autorizadas…')).toHaveCount(0);
  await expect(page.getByText('No se pudieron cargar las fichas', { exact: true })).toHaveCount(0);
  const card = page.getByText(`ID clínico: ${clinicalId}`, { exact: true });
  if (await card.count() === 0) {
    await page.locator('button:has(svg.lucide-plus)').click();
    await expect(page.getByRole('dialog', { name: 'Nueva ficha clínica' })).toBeVisible();
    await page.getByRole('textbox', { name: /^Nombre completo/ }).fill(studentName);
    await page.getByRole('textbox', { name: /^Iniciales clínicas/ }).fill('Q.V.');
    await page.getByRole('textbox', { name: /^Identificador clínico/ }).fill(clinicalId);
    await page.getByRole('textbox', { name: /^Fecha de nacimiento/ }).fill('2016-01-01');
    await page.getByRole('textbox', { name: /^Diagnóstico inicial reportado/ }).click();
    await page.getByRole('option', { name: 'Otro', exact: true }).click();
    await page.getByRole('textbox', { name: /^Especificar diagnóstico/ }).fill('Evaluación sintética QA');
    await page.getByRole('button', { name: 'Crear ficha', exact: true }).click();
  } else {
    await expect(card).toHaveCount(1);
    await card.click();
  }
  await expect(page).toHaveURL(/\/students\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('textbox', { name: /^Nombre completo/ })).toHaveValue(studentName);
  await expect(page.getByRole('textbox', { name: /^Identificador clínico/ })).toHaveValue(clinicalId);
  return new URL(page.url()).pathname.split('/').at(-1);
}

async function ownProgram(page) {
  await page.getByRole('tab', { name: 'Programación', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Programas de Manejo de Conducta' })).toBeVisible();
  const row = page.getByRole('row').filter({ hasText: programTitle });
  if (await row.count() === 0) {
    await page.getByRole('button', { name: 'Nuevo Programa', exact: true }).nth(1).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    for (const [label, value] of [
      ['Nombre del Programa', programTitle], ['Topografía', 'Observación ficticia de conducta para QA local V5'],
      ['Definición Operacional', 'Registro sintético de respuesta observable sin datos clínicos reales'],
      ['Dimensión Actual de la Conducta', 'Frecuencia sintética'], ['Conducta de Reemplazo', 'Respuesta sintética alternativa'],
      ['Procedimiento Detallado', 'Procedimiento ficticio exclusivamente para validación local V5'],
      ['Estrategia de prevención', 'Prevención sintética'], ['Estrategia de respuesta', 'Respuesta sintética'],
      ['Criterio de Logro', 'Criterio sintético de prueba'],
    ]) await page.getByRole('textbox', { name: new RegExp(`^${label}`) }).fill(value);
    await page.getByRole('textbox', { name: /^Funciones de la Conducta/ }).click();
    await page.getByRole('option', { name: /^Atención:/ }).click();
    await page.getByRole('textbox', { name: /^Nombre del Programa/ }).click();
    await page.getByRole('button', { name: 'Guardar y publicar', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await expect(row).toHaveCount(1);
  await expect(row.getByText('Activo', { exact: true })).toBeVisible();
}

async function dismissReceipts(page) {
  await page.mouse.move(0, 600);
  await expect(page.locator('.mantine-Notification-root')).toHaveCount(0, { timeout: 15000 });
}

async function chooseResponse(page, name, index) {
  const radio = page.getByRole('dialog').getByRole('radio', { name, exact: true }).nth(index);
  await page.getByRole('dialog').locator(`label[for="${await radio.getAttribute('id')}"]`).click();
  await expect(radio).toBeChecked();
}

function assertMeasurement(measurement, note) {
  expect(measurement.schemaVersion).toBe(2);
  expect(measurement.dimension).toBe('percentage');
  expect(measurement.notes).toBe(note);
  expect(measurement.trials).toHaveLength(10);
  expect(measurement.trials[0].response).toBe('prompted');
  expect(measurement.trials[0].responsePrompt).toBe('model');
  expect(measurement.trials[1].response).toBe('no-response');
  expect(measurement.trials[1].responsePrompt).toBeNull();
  expect(measurement.trials.slice(2).every(trial => trial.response === null && trial.recordedAt === null)).toBe(true);
  expect(measurementV2Metrics(measurement)).toMatchObject({ value: 0, recorded: 2, planned: 10, independent: 0, prompted: 1, noResponse: 1, unrecorded: 8 });
}

test('QA-006/007 V5: sesión propia online pausa/reanuda, A-model/NR, borrador, revisión y cierre', async ({ page, request }, testInfo) => {
  test.setTimeout(240000);
  expect(process.cwd().replaceAll('\\', '/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
  expect(['desktop', 'mobile']).toContain(testInfo.project.name);
  const status = localStatus();
  expect(status.API_URL).toBe('http://127.0.0.1:54321');
  expect(new URL(baseURL).hostname).toBe('localhost');
  expect((await request.get('/api/health')).status()).toBe(200);
  expect(await (await request.get('/api/health')).json()).toEqual({ status: 'ok', service: 'aba-clinico' });
  const manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));
  expect(manifest.batchId).toBe(batchId); expect(manifest.state).toBe('ready'); expect(manifest.apiUrl).toBe(status.API_URL);
  const account = manifest.accounts.find(row => row.label === 'admin-a');
  if (account?.email !== `admin-a.${batchId}@aba.example.test`) throw new Error('Identidad sintética incorrecta');
  const client = createClient(status.API_URL, status.ANON_KEY ?? status.PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const login = await client.auth.signInWithPassword({ email: account.email, password: account.password });
    if (login.error || login.data.user?.id !== account.userId || login.data.user.app_metadata.aba_fixture_batch !== batchId) throw new Error('Actor sintético no verificado');
    await signIn(page, account);
    const studentId = await ownStudent(page);
    const detail = await client.rpc('aba_student_detail_v2', { p_organization_id: manifest.clinics.A, p_client_id: studentId });
    if (detail.error || detail.data?.clinicalId !== clinicalId || detail.data?.fullName !== studentName) throw new Error('Ficha dedicada no confirmada');
    await ownProgram(page);
    const read = async () => {
      const result = await client.rpc('read_program_session_v2', { p_clinic_id: manifest.clinics.A, p_student_id: studentId });
      if (result.error || !result.data) throw new Error('Lectura autenticada no confirmada');
      expect(result.data.actorId).toBe(account.userId);
      return result.data;
    };
    const before = await read();
    const programs = before.programs.filter(program => program.versions.some(version => version.title === programTitle));
    expect(programs).toHaveLength(1);
    const program = programs[0];
    expect(program).toMatchObject({ studentId, clinicId: manifest.clinics.A, kind: 'behavior', status: 'active' });
    const version = program.versions.find(item => item.id === program.currentVersionId);
    expect(version).toMatchObject({ studentId, clinicId: manifest.clinics.A, programId: program.id, state: 'released', title: programTitle });
    // Do not salvage/finalize a prior failed run, and never visit the original QA student.
    expect(before.sessions.filter(session => ['draft', 'active', 'paused'].includes(sessionV2Timeline(session).status)), 'Sesión pendiente dedicada: revisar antes de repetir; no se modifica').toHaveLength(0);
    if (testInfo.project.name === 'mobile') expect(before.sessions.some(session => session.notes.startsWith('QA R5 CICLO V5 desktop ') && sessionV2Timeline(session).status === 'finished'), 'Root debe ejecutar desktop antes de mobile').toBe(true);
    const prefix = `QA R5 CICLO V5 ${testInfo.project.name} ${randomUUID()}`;
    const originalNote = `${prefix} ORIGINAL A-model NR`;
    const revisedNote = `${prefix} REVISADO A-model NR`;
    const reason = `${prefix} Corrección explícita sintética`;
    await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
    await expect(page).toHaveURL(`${baseURL}/session/${studentId}`);
    await expect(page.getByRole('heading', { name: 'Programas para la sesión' })).toBeVisible();
    const sessionNotes = page.locator('.mantine-Card-root').filter({ has: page.getByText('Notas de sesión', { exact: true }) }).getByRole('textbox');
    await sessionNotes.fill(prefix);
    const card = page.locator('.mantine-Card-root').filter({ has: page.getByText(programTitle, { exact: true }) });
    await expect(card).toHaveCount(1);
    await card.getByRole('checkbox', { name: 'Incluir en la sesión', exact: true }).check();
    await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
    const getSession = async () => {
      const matches = (await read()).sessions.filter(session => session.notes === prefix);
      expect(matches).toHaveLength(1);
      const session = matches[0];
      expect(session).toMatchObject({ studentId, clinicId: manifest.clinics.A });
      expect(session.programs).toEqual([{ programId: program.id, programVersionId: version.id }]);
      expect(session.events.every(event => event.actorId === account.userId)).toBe(true);
      return session;
    };
    const started = await getSession();
    expect(before.sessions.some(session => session.id === started.id)).toBe(false);
    await dismissReceipts(page);
    await page.getByRole('button', { name: 'Pausar', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Reanudar', exact: true })).toBeVisible();
    const paused = await getSession();
    expect(sessionV2Timeline(paused).status).toBe('paused');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Reanudar', exact: true })).toBeVisible();
    await expect(card.getByRole('button', { name: 'Nuevo registro', exact: true })).toBeDisabled();
    await expect(sessionNotes).toHaveValue(prefix);
    expect(await getSession()).toEqual(paused);
    await page.getByRole('button', { name: 'Reanudar', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
    await dismissReceipts(page);
    await card.getByRole('button', { name: 'Nuevo registro', exact: true }).click();
    const modal = page.getByRole('dialog');
    const dimension = modal.getByRole('textbox', { name: 'Dimensión', exact: true });
    if (await dimension.inputValue() !== 'Porcentaje') {
      page.once('dialog', dialog => dialog.message().startsWith('La dimensión nueva se guardará') ? dialog.accept() : dialog.dismiss());
      await dimension.click(); await page.getByRole('option', { name: 'Porcentaje', exact: true }).click();
    }
    await chooseResponse(page, 'A', 0);
    await modal.getByRole('textbox', { name: 'Ayuda en la respuesta', exact: true }).click();
    await page.getByRole('option', { name: 'model', exact: true }).click();
    await chooseResponse(page, 'NR', 1);
    await modal.getByRole('textbox', { name: 'Notas originales', exact: true }).fill(originalNote);
    await modal.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
    await expect(page.getByText('Registro confirmado', { exact: true })).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Cerrar', exact: true })).toBeEnabled();
    await modal.getByRole('button', { name: 'Cerrar', exact: true }).click();
    const getRecord = async () => {
      const records = (await read()).records.filter(record => record.sessionId === started.id);
      expect(records).toHaveLength(1);
      expect(records[0]).toMatchObject({ studentId, actorId: account.userId, programId: program.id, programVersionId: version.id, discarded: false });
      return records[0];
    };
    const draft = await getRecord();
    expect(draft.submitted).toBe(false); assertMeasurement(draft.originalMeasurement, originalNote);
    await page.reload();
    await card.getByRole('button', { name: /^Continuar borrador/ }).click();
    await expect(modal.getByRole('textbox', { name: 'Notas originales', exact: true })).toHaveValue(originalNote);
    await expect(modal.getByRole('radio', { name: 'A', exact: true }).first()).toBeChecked();
    await expect(modal.getByRole('radio', { name: 'NR', exact: true }).nth(1)).toBeChecked();
    await expect(modal.getByRole('textbox', { name: 'Ayuda en la respuesta', exact: true })).toHaveValue('model');
    await modal.getByRole('button', { name: 'Enviar registro', exact: true }).click();
    await expect(modal).toHaveCount(0);
    const submitted = await getRecord();
    expect(submitted).toMatchObject({ id: draft.id, submitted: true, version: draft.version + 1 });
    assertMeasurement(submitted.originalMeasurement, originalNote);
    expect(submitted.originalMeasurement.trials).toEqual(draft.originalMeasurement.trials);
    expect(Date.parse(submitted.originalMeasurement.capturedAt)).toBeGreaterThanOrEqual(Date.parse(draft.originalMeasurement.capturedAt));
    await dismissReceipts(page);
    await card.getByRole('button', { name: 'Corregir enviado', exact: true }).click();
    await expect(modal.getByRole('button', { name: 'Guardar corrección', exact: true })).toBeDisabled();
    await modal.getByRole('textbox', { name: 'Notas originales', exact: true }).fill(revisedNote);
    await modal.getByRole('textbox', { name: 'Motivo de la corrección', exact: true }).fill(reason);
    await modal.getByRole('button', { name: 'Guardar corrección', exact: true }).click();
    await expect(modal).toHaveCount(0);
    const revised = await getRecord();
    expect(revised).toMatchObject({ id: draft.id, submitted: true, version: submitted.version + 1 });
    assertMeasurement(revised.originalMeasurement, revisedNote);
    expect(revised.originalMeasurement.trials).toEqual(submitted.originalMeasurement.trials);
    expect(revised.revisions).toHaveLength(submitted.revisions.length + 1);
    const revision = revised.revisions.find(item => item.reason === reason);
    expect(revision).toMatchObject({ actorId: account.userId, originalMeasurement: submitted.originalMeasurement });
    await page.reload();
    await card.getByRole('button', { name: 'Corregir enviado', exact: true }).click();
    await expect(modal.getByRole('textbox', { name: 'Notas originales', exact: true })).toHaveValue(revisedNote);
    await modal.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await dismissReceipts(page);
    await page.getByRole('button', { name: 'Finalizar', exact: true }).click();
    await page.getByRole('dialog', { name: 'Finalizar sesión', exact: true }).getByRole('button', { name: 'Confirmar', exact: true }).click();
    await expect(modal).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Archivar', exact: true })).toBeVisible();
    const finished = await getSession();
    expect(finished.id).toBe(started.id);
    expect(finished.events.map(event => event.type)).toEqual(['started', 'paused', 'resumed', 'finished']);
    expect(finished.events.map(event => event.sequence)).toEqual([1, 2, 3, 4]);
    expect(finished.version).toBe(started.version + 3);
    const timeline = sessionV2Timeline(finished);
    expect(timeline.status).toBe('finished'); expect(timeline.activeWindows).toHaveLength(2);
    const [start, pause, resume, finish] = finished.events.map(event => Date.parse(event.occurredAt));
    expect(timeline.activeSeconds).toBeCloseTo(((pause - start) + (finish - resume)) / 1000, 6);
    expect(timeline.activeWindows.every(window => window.endedAt !== null)).toBe(true);
    const after = await read();
    expect(after.programs).toEqual(before.programs);
    expect(after.sessions).toHaveLength(before.sessions.length + 1);
    expect(after.records).toHaveLength(before.records.length + 1);
    for (const prior of before.sessions) expect(after.sessions.find(item => item.id === prior.id)).toEqual(prior);
    for (const prior of before.records) expect(after.records.find(item => item.id === prior.id)).toEqual(prior);
    expect(await getRecord()).toEqual(revised);
    await page.screenshot({ path: testInfo.outputPath('session-lifecycle-v5-finished.png'), fullPage: true });
    await page.goto('/students');
    await page.getByRole('button', { name: 'Menú de perfil' }).click();
    await page.getByRole('menuitem', { name: 'Cerrar Sesión' }).click();
    await expect(page).toHaveURL(/\/login$/);
  } finally { await client.auth.signOut(); }
});



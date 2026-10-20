import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import { localStatus, state } from '../../scripts/local/write-env.mjs';
import { measurementV2Metrics } from '../../src/domain/measurements/measurement-v2.ts';

test.skip(process.env.ABA_QA_LOCAL_UI !== '1' || process.env.ABA_QA_RESULTS_UI !== '1', 'Resultados sintéticos locales explícitos');
test.use({ actionTimeout: 15000 });
function parseCsv(input) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let index = 0; index < input.length; index++) {
    const char = input[index];
    if (char === '"') {
      if (quoted && input[index + 1] === '"') { field += '"'; index++; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(field); field = ''; }
    else if (char === '\n' && !quoted) { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}
test('QA-012: resultados y descargas cinco dimensiones conciliados', async ({ page }, testInfo) => {
  test.setTimeout(120000);
  expect(process.cwd().replaceAll('\\', '/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
  const status = localStatus(); expect(status.API_URL).toBe('http://127.0.0.1:54321');
  const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
  const manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));
  expect(manifest.state).toBe('ready');
  const account = manifest.accounts.find(row => row.label === 'admin-a');
  if (account?.email !== `admin-a.${batchId}@aba.example.test`) throw new Error('Identidad sintética incorrecta');
  const client = createClient(status.API_URL, status.ANON_KEY ?? status.PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  let snapshot, student;
  try {
    const login = await client.auth.signInWithPassword({ email: account.email, password: account.password });
    if (login.error || login.data.user?.id !== account.userId || login.data.user.app_metadata.aba_fixture_batch !== batchId) throw new Error('Lectura sintética no autorizada');
    const list = await client.rpc('aba_list_students_v2', { p_organization_id: manifest.clinics.A });
    if (list.error) throw new Error('Lectura de fichas no confirmada');
    student = list.data.find(row => row.clinicalId === 'QA-R5-A-2155E99E');
    expect(student).toBeDefined();
    const read = await client.rpc('read_program_session_v2', { p_clinic_id: manifest.clinics.A, p_student_id: student.id });
    if (read.error) throw new Error('Lectura autorizada de resultados falló');
    snapshot = read.data;
  } finally { await client.auth.signOut({ scope: 'local' }); }
  const programs = snapshot.programs.filter(program => program.versions.some(version => version.title === 'QA R5 CONDUCTA LOCAL'));
  expect(programs).toHaveLength(1); const program = programs[0];
  const records = snapshot.records.filter(row => row.programId === program.id && row.submitted && !row.discarded && row.originalMeasurement?.schemaVersion === 2);
  expect(records.length).toBeGreaterThanOrEqual(6);
  expect([...new Set(records.map(record => record.originalMeasurement.dimension))].sort()).toEqual(['duration', 'frequency', 'interval', 'latency', 'percentage']);
  await page.goto('/login');
  try {
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(account.password);
  } catch { throw new Error('Formulario no disponible; valores omitidos'); }
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto(`/students/${student.id}`);
  await expect(page.getByRole('textbox', { name: /^Identificador clínico/ })).toHaveValue('QA-R5-A-2155E99E');
  await page.getByRole('tab', { name: 'Programación', exact: true }).click();
  const programRow = page.getByRole('row').filter({ hasText: 'QA R5 CONDUCTA LOCAL' });
  await expect(programRow).toHaveCount(1);
  await programRow.getByTitle('Gráfico', { exact: true }).click();
  await expect(page).toHaveURL(`/students/${student.id}/programs/${program.id}/chart`);
  await expect(page.getByRole('button', { name: 'Descargar CSV', exact: true })).toBeEnabled();
  for (const [dimension, label] of [['percentage', 'Porcentaje'], ['frequency', 'Frecuencia'], ['interval', 'Intervalos'], ['duration', 'Duración'], ['latency', 'Latencia']]) {
    const dimensionInput = page.getByRole('textbox', { name: 'Dimensión', exact: true });
    if (await dimensionInput.inputValue() !== label) {
      await dimensionInput.click();
      await page.getByRole('option', { name: label, exact: true }).click();
    }
    await expect(dimensionInput).toHaveValue(label);
    const expected = records.filter(row => row.originalMeasurement.dimension === dimension);
    await expect(page.getByRole('button', { name: 'Editar nota', exact: true })).toHaveCount(expected.length);
    for (const record of expected) await expect(page.getByRole('cell', { name: record.originalMeasurement.notes, exact: true })).toBeVisible();
    const csvWait = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar CSV', exact: true }).click();
    const csv = await csvWait; const csvPath = testInfo.outputPath(`${dimension}.csv`); await csv.saveAs(csvPath);
    const rows = parseCsv(readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, ''));
    expect(rows[0]).toEqual(['esquema','registro','fecha','fase','dimension','valor','unidad','notas','profesional','version','metricas_derivadas_json','observaciones_originales_json','revisiones_json']);
    const v2Rows = rows.slice(1).filter(row => row[0] === '2');
    expect(v2Rows).toHaveLength(expected.length);
    for (const row of v2Rows) {
      const record = expected.find(record => record.id === row[1]); expect(record).toBeDefined();
      const metric = measurementV2Metrics(record.originalMeasurement);
      expect(row[0]).toBe('2'); expect(row[2]).toBe(record.originalMeasurement.capturedAt);
      expect(row[4]).toBe(dimension); expect(Number(row[5])).toBe(metric.value);
      expect(row[6]).toBe(metric.unit); expect(row[7]).toBe(record.originalMeasurement.notes);
      expect(row[8]).toBe(record.actorId); expect(Number(row[9])).toBe(record.version);
      expect(JSON.parse(row[10])).toEqual(metric); expect(JSON.parse(row[11])).toEqual(record.originalMeasurement);
      expect(JSON.parse(row[12])).toEqual(record.revisions);
    }
    const pdfWait = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar PDF', exact: true }).click();
    const pdf = await pdfWait; const pdfPath = testInfo.outputPath(`${dimension}.pdf`); await pdf.saveAs(pdfPath);
    const raw = readFileSync(pdfPath).toString('latin1');
    expect(raw.startsWith('%PDF-')).toBe(true); expect(raw).toContain('QA R5 CONDUCTA LOCAL');
    for (const record of expected) expect(raw).toContain(record.id);
    for (const record of records.filter(row => row.originalMeasurement.dimension !== dimension)) expect(raw).not.toContain(record.id);
  }
  await page.getByRole('textbox', { name: 'Periodo', exact: true }).click();
  await page.getByRole('option', { name: 'Últimos 7 días', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Periodo', exact: true })).toHaveValue('Últimos 7 días');
  await page.getByRole('textbox', { name: 'Fase', exact: true }).click();
  await page.getByRole('option', { name: 'Línea base', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Editar nota', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Descargar CSV', exact: true })).toBeDisabled();
  await page.getByRole('textbox', { name: 'Fase', exact: true }).click();
  await page.getByRole('option', { name: 'Tratamiento', exact: true }).click();
  await page.getByRole('textbox', { name: 'Profesional', exact: true }).click();
  await page.getByRole('option', { name: `Profesional · ${account.userId.slice(0, 8)}`, exact: true }).click();
  const filteredRecords = records.filter(record => record.originalMeasurement.dimension === 'latency'
    && record.originalMeasurement.phase === 'treatment' && record.actorId === account.userId
    && Date.parse(record.originalMeasurement.capturedAt) >= Date.now() - 7 * 86400000);
  await expect(page.getByRole('button', { name: 'Editar nota', exact: true })).toHaveCount(filteredRecords.length);
  for (const record of filteredRecords) await expect(page.getByRole('cell', { name: record.originalMeasurement.notes, exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Eje Y mínimo', exact: true }).fill('10');
  await expect(page.getByRole('button', { name: 'Ampliar', exact: true })).toBeDisabled();
  await expect(page.getByText('El mínimo debe ser menor que el máximo.', { exact: false })).toBeVisible();
  await page.getByRole('textbox', { name: 'Eje Y mínimo', exact: true }).fill('0');
  await page.getByRole('button', { name: 'Ampliar', exact: true }).click();
  await expect(page.getByRole('dialog', { name: /gráfico ampliado/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: /gráfico ampliado/ })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('resultados.png'), fullPage: true });
  await page.getByRole('button', { name: 'Menú de perfil' }).click();
  await page.getByRole('menuitem', { name: 'Cerrar Sesión' }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('QA-012: agregado V1 histórico se lee y exporta separado de V2', async ({ page }, testInfo) => {
  test.skip(process.env.ABA_QA_LEGACY_RESULTS_UI !== '1', 'Fixture V1 sintética explícita');
  test.setTimeout(120000);
  expect(process.cwd().replaceAll('\\', '/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
  const status = localStatus(); expect(status.API_URL).toBe('http://127.0.0.1:54321');
  const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
  const legacyId = 'c38dbfa7-5f55-40c2-a2c6-1b506374a011';
  const studentId = 'b347646e-ff29-450b-aedf-9f9c015fb41a';
  const manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));
  expect(manifest.state).toBe('ready');
  const adminA = manifest.accounts.find(row => row.label === 'admin-a');
  const adminB = manifest.accounts.find(row => row.label === 'admin-b');
  if (adminA?.email !== `admin-a.${batchId}@aba.example.test` || adminB?.email !== `admin-b.${batchId}@aba.example.test`) throw new Error('Identidades sintéticas incorrectas');
  const client = createClient(status.API_URL, status.ANON_KEY ?? status.PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  let programId, legacy, v2;
  try {
    let auth = await client.auth.signInWithPassword({ email: adminA.email, password: adminA.password });
    if (auth.error || auth.data.user?.id !== adminA.userId || auth.data.user.app_metadata.aba_fixture_batch !== batchId) throw new Error('Admin A sintético no verificado');
    const read = await client.rpc('read_program_session_v2', { p_clinic_id: manifest.clinics.A, p_student_id: studentId });
    if (read.error) throw new Error(`Lectura V1 autorizada falló: ${read.error.message}`);
    const program = read.data.programs.find(item => item.versions.some(version => version.title === 'QA R5 CONDUCTA LOCAL'));
    expect(program).toBeDefined(); programId = program.id;
    legacy = read.data.records.find(row => row.id === legacyId);
    expect(legacy).toEqual(expect.objectContaining({
      programId, studentId, submitted: true, discarded: false, actorId: adminA.userId,
      originalMeasurement: { schemaVersion: 1, dimension: 'frequency', detailsUnavailable: true, payload: { count: 3, notes: 'QA R5 V1 AGREGADO SINTETICO 2155e99e' } },
    }));
    v2 = read.data.records.filter(row => row.programId === programId && row.submitted && !row.discarded && row.originalMeasurement?.schemaVersion === 2 && row.originalMeasurement.dimension === 'frequency');
    expect(v2.length).toBeGreaterThan(0);
    await client.auth.signOut({ scope: 'local' });
    auth = await client.auth.signInWithPassword({ email: adminB.email, password: adminB.password });
    if (auth.error || auth.data.user?.id !== adminB.userId) throw new Error('Admin B sintético no verificado');
    const foreign = await client.rpc('read_program_session_v2', { p_clinic_id: manifest.clinics.A, p_student_id: studentId });
    expect(foreign.error || !foreign.data?.records?.some(row => row.id === legacyId)).toBeTruthy();
  } finally { await client.auth.signOut({ scope: 'local' }); }

  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(adminA.email);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(adminA.password);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto(`/students/${studentId}/programs/${programId}/chart`);
  const dimension = page.getByRole('textbox', { name: 'Dimensión', exact: true });
  if (await dimension.inputValue() !== 'Frecuencia') {
    await dimension.click();
    await page.getByRole('option', { name: 'Frecuencia', exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: 'Resultados históricos V1 · 1' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Editar nota', exact: true })).toHaveCount(v2.length);
  const legacyDetails = page.getByRole('heading', { name: 'Resultados históricos V1 · 1' }).locator('xpath=ancestor::*[contains(@class,"mantine-Paper-root")][1]').locator('details');
  await legacyDetails.locator('summary').click();
  await expect(legacyDetails).toContainText('"count": 3');
  await expect(legacyDetails).toContainText('QA R5 V1 AGREGADO SINTETICO 2155e99e');

  const csvWait = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar CSV', exact: true }).click();
  const csvPath = testInfo.outputPath('historico-v1.csv');
  await (await csvWait).saveAs(csvPath);
  const rows = parseCsv(readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, ''));
  const historical = rows.slice(1).filter(row => row[1] === legacyId);
  expect(historical).toHaveLength(1);
  expect(historical[0][0]).toBe('1');
  expect(historical[0][4]).toBe('frequency');
  expect(historical[0][5]).toBe('');
  expect(historical[0][6]).toBe('Detalle V1 no reconstruible');
  expect(JSON.parse(historical[0][11])).toEqual(legacy.originalMeasurement);
  expect(rows.slice(1).filter(row => row[0] === '2')).toHaveLength(v2.length);

  const pdfWait = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar PDF', exact: true }).click();
  const pdfPath = testInfo.outputPath('historico-v1.pdf');
  await (await pdfWait).saveAs(pdfPath);
  const pdf = readFileSync(pdfPath).toString('latin1');
  expect(pdf.startsWith('%PDF-')).toBe(true);
  expect(pdf).toContain(legacyId);
  expect(pdf).toContain('Registros históricos V1 filtrados');
  await page.screenshot({ path: testInfo.outputPath('historico-v1.png'), fullPage: true });
});

test('QA-012: PDF y CSV de diseño reflejan borrador visible sin persistirlo', async ({ page }, testInfo) => {
  test.setTimeout(120000);
  expect(process.cwd().replaceAll('\\', '/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
  const status = localStatus(); expect(status.API_URL).toBe('http://127.0.0.1:54321');
  const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
  const manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));
  const account = manifest.accounts.find(row => row.label === 'admin-a');
  if (account?.email !== `admin-a.${batchId}@aba.example.test`) throw new Error('Identidad sintética incorrecta');
  const client = createClient(status.API_URL, status.ANON_KEY ?? status.PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  let student, program, current;
  try {
    const login = await client.auth.signInWithPassword({ email: account.email, password: account.password });
    if (login.error || login.data.user?.id !== account.userId || login.data.user.app_metadata.aba_fixture_batch !== batchId) throw new Error('Admin sintético no verificado');
    const list = await client.rpc('aba_list_students_v2', { p_organization_id: manifest.clinics.A });
    if (list.error) throw new Error('Ficha sintética no disponible');
    student = list.data.find(row => row.clinicalId === 'QA-R5-A-2155E99E');
    expect(student).toBeDefined();
    const read = await client.rpc('read_program_session_v2', { p_clinic_id: manifest.clinics.A, p_student_id: student.id });
    if (read.error) throw new Error('Programa sintético no disponible');
    program = read.data.programs.find(item => item.versions.some(version => version.title === 'QA R5 CONDUCTA LOCAL'));
    expect(program).toBeDefined();
    current = program.versions.find(version => version.id === program.currentVersionId);
    expect(current).toBeDefined();
  } finally { await client.auth.signOut({ scope: 'local' }); }
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto(`/students/${student.id}`);
  await page.getByRole('tab', { name: 'Programación', exact: true }).click();
  const row = page.getByRole('row').filter({ hasText: 'QA R5 CONDUCTA LOCAL' });
  await expect(row).toHaveCount(1);
  await row.getByTitle('Diseño').click();
  const editor = page.getByRole('dialog', { name: 'Diseño de Programa - Manejo de Conducta' });
  await expect(editor.getByRole('textbox', { name: /^Topografía/ })).toHaveValue(current.originalDesign.topography);
  const draft = `QA PDF BORRADOR SIN GUARDAR ${testInfo.project.name.toUpperCase()}`;
  await editor.getByRole('textbox', { name: /^Topografía/ }).fill(draft);
  const pdfWait = page.waitForEvent('download');
  await editor.getByRole('button', { name: 'Descargar PDF' }).click();
  const pdf = await pdfWait; const pdfPath = testInfo.outputPath('programa-diseno-borrador.pdf'); await pdf.saveAs(pdfPath);
  const rawPdf = readFileSync(pdfPath).toString('latin1');
  expect(rawPdf.startsWith('%PDF-')).toBe(true);
  expect(rawPdf).toContain(draft);
  expect(rawPdf).toContain('QA R5 CONDUCTA LOCAL');
  const csvWait = page.waitForEvent('download');
  await editor.getByRole('button', { name: 'Descargar CSV' }).click();
  const csv = await csvWait; const csvPath = testInfo.outputPath('programa-diseno-borrador.csv'); await csv.saveAs(csvPath);
  expect(readFileSync(csvPath, 'utf8')).toContain(draft);
  page.once('dialog', dialog => dialog.accept());
  await editor.getByRole('button', { name: 'Cancelar' }).click();
  await expect(editor).toBeHidden();
  await page.reload();
  await page.getByRole('tab', { name: 'Programación', exact: true }).click();
  await page.getByRole('row').filter({ hasText: 'QA R5 CONDUCTA LOCAL' }).getByTitle('Diseño').click();
  await expect(page.getByRole('dialog', { name: 'Diseño de Programa - Manejo de Conducta' }).getByRole('textbox', { name: /^Topografía/ })).toHaveValue(current.originalDesign.topography);
});

test('QA-012: otra clínica, externo y familia no pueden exportar gráfico ajeno', async ({ page }) => {
  test.setTimeout(120000);
  expect(process.cwd().replaceAll('\\', '/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
  const status = localStatus(); expect(status.API_URL).toBe('http://127.0.0.1:54321');
  const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
  const manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));
  expect(manifest.state).toBe('ready');
  const owner = manifest.accounts.find(row => row.label === 'admin-a');
  const deniedAccounts = ['admin-b', 'externo', 'familia'].map(label => manifest.accounts.find(row => row.label === label));
  if (owner?.email !== `admin-a.${batchId}@aba.example.test` || deniedAccounts.some((row, index) => row?.email !== `${['admin-b', 'externo', 'familia'][index]}.${batchId}@aba.example.test`)) throw new Error('Identidades sintéticas incorrectas');
  const client = createClient(status.API_URL, status.ANON_KEY ?? status.PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  let student, program;
  try {
    const login = await client.auth.signInWithPassword({ email: owner.email, password: owner.password });
    if (login.error || login.data.user?.id !== owner.userId || login.data.user.app_metadata.aba_fixture_batch !== batchId) throw new Error('Dueño sintético no confirmado');
    const list = await client.rpc('aba_list_students_v2', { p_organization_id: manifest.clinics.A });
    if (list.error) throw new Error('Ficha sintética no legible por su dueño');
    student = list.data.find(row => row.clinicalId === 'QA-R5-A-2155E99E'); expect(student).toBeDefined();
    const read = await client.rpc('read_program_session_v2', { p_clinic_id: manifest.clinics.A, p_student_id: student.id });
    if (read.error) throw new Error('Programa sintético no legible por su dueño');
    const matches = read.data.programs.filter(row => row.versions.some(version => version.title === 'QA R5 CONDUCTA LOCAL'));
    expect(matches).toHaveLength(1); program = matches[0];
  } finally { await client.auth.signOut({ scope: 'local' }); }
  for (const account of deniedAccounts) {
    await page.goto('/login');
    try {
      await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
      await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(account.password);
    } catch { throw new Error('Formulario no disponible; valores omitidos'); }
    await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto(`/students/${student.id}/programs/${program.id}/chart`);
    await expect(page.getByRole('heading', { name: 'Página no encontrada' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Descargar CSV', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Descargar PDF', exact: true })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'QA R5 CONDUCTA LOCAL' })).toHaveCount(0);
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Menú de perfil' }).click();
    await page.getByRole('menuitem', { name: 'Cerrar Sesión' }).click();
    await expect(page).toHaveURL(/\/login$/);
  }
});

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { localStatus, state } from '../../scripts/local/write-env.mjs';

const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
const baseURL = process.env.ABA_QA_BASE_URL ?? 'http://localhost:3000';
test.skip(process.env.ABA_QA_LOCAL_UI !== '1', 'Solo candidato local autorizado');

test.beforeAll(async ({ request }) => {
  expect(process.cwd().replaceAll('\\', '/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
  expect(localStatus().API_URL).toBe('http://127.0.0.1:54321');
  const health = await request.get(`${baseURL}/api/health`);
  expect(health.status()).toBe(200);
  expect(await health.json()).toEqual({ status: 'ok', service: 'aba-clinico' });
});

test('QA-003/004: landing navega al formulario real', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ingresar al entorno', exact: true }).click();
  await expect(page).toHaveURL(`${baseURL}/login`);
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
});

test('QA-002/003/005: login real, contexto, páginas y recarga', async ({ page }, testInfo) => {
  test.setTimeout(process.env.ABA_QA_CAPTURE_UI === '1' ? 120000 : 60000);
  const runtimeIssues = [];
  const classify = message => {
    const known = message.match(/In HTML, [\s\S]{0,100}?(?:cannot be a child of|cannot be a descendant of)[\s\S]{0,40}?\./)?.[0]
      ?? message.match(/Hydration failed|hydration mismatch|Each child in a list should have a unique.*?prop|Encountered two children with the same key/)?.[0];
    if (known) runtimeIssues.push(known);
  };
  page.on('pageerror', error => classify(error.message));
  page.on('console', message => { if (message.type() === 'error') classify(message.text()); });
  const manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));
  expect(manifest.batchId).toBe(batchId); expect(manifest.state).toBe('ready');
  const account = manifest.accounts.find(row => row.label === 'admin-a');
  if (account?.email !== `admin-a.${batchId}@aba.example.test`) throw new Error('Cuenta sintética incorrecta');
  await page.goto('/login');
  await expect(page.getByRole('textbox', { name: 'Email', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Contraseña', exact: true })).toBeVisible();
  // Avoid credentials in failure call logs. No trace, video or password screenshot.
  try {
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(account.password);
  } catch { throw new Error('No se pudo completar el formulario local; valores omitidos'); }
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(`${baseURL}/dashboard`);
  await expect(page.getByRole('button', { name: 'Menú de perfil' })).toBeVisible();
  await page.goto('/students');
  await expect(page.getByRole('heading', { name: 'Carpetas de Estudiantes' })).toBeVisible();
  await expect(page.getByText('Cargando fichas autorizadas…')).toHaveCount(0);
  await expect(page.getByText('No se pudieron cargar las fichas', { exact: true })).toHaveCount(0);
  // One stable synthetic resource in the existing synthetic clinic; never reset
  // or delete it. UI create uses the production contract (test_run_id is null).
  const clinicalId = 'QA-R5-A-2155E99E';
  const card = page.getByText(`ID clínico: ${clinicalId}`, { exact: true });
  if (await card.count() === 0) {
    await page.locator('button:has(svg.lucide-plus)').click();
    await expect(page.getByRole('dialog', { name: 'Nueva ficha clínica' })).toBeVisible();
    await page.getByRole('textbox', { name: /^Nombre completo/ }).fill('QA SINTETICO LOCAL A');
    await page.getByRole('textbox', { name: /^Iniciales clínicas/ }).fill('Q.A.');
    await page.getByRole('textbox', { name: /^Identificador clínico/ }).fill(clinicalId);
    await page.getByRole('textbox', { name: /^Fecha de nacimiento/ }).fill('2016-01-01');
    await page.getByRole('textbox', { name: /^Diagnóstico inicial reportado/ }).click();
    await page.getByRole('option', { name: 'Otro', exact: true }).click();
    await page.getByRole('textbox', { name: /^Especificar diagnóstico/ }).fill('Evaluación sintética QA');
    await page.getByRole('button', { name: 'Crear ficha', exact: true }).click();
  } else await card.click();
  await expect(page).toHaveURL(/\/students\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('textbox', { name: /^Nombre completo/ })).toHaveValue('QA SINTETICO LOCAL A');
  await page.reload();
  await expect(page.getByRole('textbox', { name: /^Nombre completo/ })).toHaveValue('QA SINTETICO LOCAL A');
  await expect(page.getByRole('textbox', { name: /^Identificador clínico/ })).toHaveValue(clinicalId);
  const consultation = `QA sintético persistido ${testInfo.project.name}`;
  await page.getByRole('textbox', { name: 'Motivo de consulta', exact: true }).fill(consultation);
  await page.getByRole('button', { name: 'Guardar ficha', exact: true }).click();
  await expect(page.getByText('Ficha actualizada', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Guardar ficha', exact: true })).toBeEnabled();
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Motivo de consulta', exact: true })).toHaveValue(consultation);
  await page.screenshot({ path: testInfo.outputPath('ficha-sintetica.png'), fullPage: true });
  expect([...new Set(runtimeIssues)], 'Errores estructurales/hidratación; sin publicar logs ni credenciales').toEqual([]);
  await page.getByRole('tab', { name: 'Programación', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Programas de Manejo de Conducta' })).toBeVisible();
  const programTitle = 'QA R5 CONDUCTA LOCAL';
  const programRow = page.getByRole('row').filter({ hasText: programTitle });
  if (await programRow.count() === 0) {
    await page.getByRole('button', { name: 'Nuevo Programa', exact: true }).nth(1).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    for (const [label, value] of [
      ['Nombre del Programa', programTitle], ['Topografía', 'Observación ficticia de conducta para QA local'],
      ['Definición Operacional', 'Registro sintético de una respuesta observable sin datos clínicos reales'],
      ['Dimensión Actual de la Conducta', 'Frecuencia sintética'], ['Conducta de Reemplazo', 'Respuesta sintética alternativa'],
      ['Procedimiento Detallado', 'Procedimiento ficticio exclusivamente para validación local'],
      ['Estrategia de prevención', 'Prevención sintética'], ['Estrategia de respuesta', 'Respuesta sintética'],
      ['Criterio de Logro', 'Criterio sintético de prueba'],
    ]) await page.getByRole('textbox', { name: new RegExp(`^${label}`) }).fill(value);
    await page.getByRole('textbox', { name: /^Funciones de la Conducta/ }).click();
    await page.getByRole('option', { name: /^Atención:/ }).click();
    await page.getByRole('textbox', { name: /^Nombre del Programa/ }).click();
    await page.getByRole('button', { name: 'Guardar y publicar', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await expect(programRow).toHaveCount(1);
  await expect(programRow.getByText('Activo', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('tab', { name: 'Programación', exact: true }).click();
  await expect(programRow.getByText('Activo', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('programa-sintetico.png'), fullPage: true });
  if (process.env.ABA_QA_CAPTURE_UI === '1' && testInfo.project.name === 'desktop') {
    await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
    await expect(page).toHaveURL(/\/session\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { name: 'Programas para la sesión' })).toBeVisible();
    const start = page.getByRole('button', { name: 'Iniciar sesión', exact: true });
    if (await start.count()) {
      await page.getByRole('checkbox', { name: 'Incluir en la sesión', exact: true }).check();
      await start.click();
    }
    await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
    // Reuse any submitted dimensions if a prior failed run left this session active.
    const observed = new Set();
    const submitted = page.getByRole('button', { name: 'Corregir enviado', exact: true });
    const existingCount = await submitted.count();
    for (let index = 0; index < existingCount; index++) {
      await submitted.nth(index).click();
      observed.add(await page.getByRole('textbox', { name: 'Dimensión', exact: true }).inputValue());
      await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
    }
    for (const dimension of ['Porcentaje', 'Frecuencia', 'Intervalos', 'Duración', 'Latencia']) {
      if (observed.has(dimension)) continue;
      await page.getByRole('button', { name: 'Nuevo registro', exact: true }).click();
      const select = page.getByRole('textbox', { name: 'Dimensión', exact: true });
      if (await select.inputValue() !== dimension) {
        page.once('dialog', async dialog => {
          if (dialog.message().startsWith('La dimensión nueva se guardará')) await dialog.accept();
          else await dialog.dismiss();
        });
        await select.click();
        await page.getByRole('option', { name: dimension, exact: true }).click();
      }
      await page.getByRole('textbox', { name: 'Notas originales', exact: true }).fill(`QA UI ${dimension}`);
      if (dimension === 'Porcentaje') {
        // Mantine's segmented inputs are visually hidden; click their visible label.
        const radio = page.getByRole('radio', { name: 'I', exact: true }).first();
        const radioId = await radio.getAttribute('id');
        await page.locator(`label[for="${radioId}"]`).click();
        await expect(page.getByRole('radio', { name: 'I', exact: true }).first()).toBeChecked();
      }
      if (dimension === 'Frecuencia') {
        await page.getByRole('button', { name: 'Iniciar cronómetro', exact: true }).click();
        await page.locator('[role="dialog"] button:has(svg.lucide-plus)').click();
        await page.getByRole('button', { name: 'Pausar cronómetro', exact: true }).click();
      }
      if (dimension === 'Intervalos') {
        const acceptReconfiguration = () => page.once('dialog', async dialog => {
          if (dialog.message() === 'Reconfigurar intervalos reinicia este registro. ¿Continuar?') await dialog.accept();
          else await dialog.dismiss();
        });
        acceptReconfiguration();
        await page.getByRole('textbox', { name: 'Número de intervalos', exact: true }).fill('1');
        acceptReconfiguration();
        await page.getByRole('textbox', { name: 'Duración (segundos)', exact: true }).fill('1');
        const occurred = page.getByRole('radio', { name: 'Ocurrió', exact: true });
        await expect(occurred).toBeEnabled();
        await page.locator(`label[for="${await occurred.getAttribute('id')}"]`).click();
        await expect(occurred).toBeChecked();
      }
      if (dimension === 'Duración') {
        await page.getByRole('button', { name: 'Iniciar episodio', exact: true }).click();
        await page.getByRole('button', { name: 'Cerrar episodio', exact: true }).click();
      }
      if (dimension === 'Latencia') {
        await page.getByRole('textbox', { name: 'Antecedente presentado', exact: true }).fill('Antecedente sintético');
        await page.getByRole('button', { name: 'Presentar', exact: true }).click();
        await page.getByRole('button', { name: 'Registrar respuesta', exact: true }).click();
      }
      const before = await submitted.count();
      await page.getByRole('button', { name: 'Enviar registro', exact: true }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(submitted).toHaveCount(before + 1);
    }
    await expect(submitted).toHaveCount(5);
    await page.reload();
    await expect(submitted).toHaveCount(5);
    await page.getByRole('button', { name: 'Finalizar', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Archivar', exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('sesion-cinco-dimensiones.png'), fullPage: true });
    await page.goto('/students');
  }
  await page.getByRole('button', { name: 'Menú de perfil' }).click();
  await page.getByRole('menuitem', { name: 'Cerrar Sesión' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/students');
  await expect(page).toHaveURL(/\/login/);
});

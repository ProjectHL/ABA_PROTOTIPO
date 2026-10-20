import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { localStatus, state } from '../../scripts/local/write-env.mjs';

test.skip(process.env.ABA_QA_LOCAL_UI !== '1' || process.env.ABA_QA_CONFLICT_UI !== '1', 'QA sintética local explícita');
test.use({ actionTimeout: 15000 });
const notesFor = page => page.locator('div.mantine-Card-root').filter({ has: page.getByText('Notas de sesión', { exact: true }) }).getByRole('textbox');
const receiptsDone = async page => {
  await page.mouse.move(0, 600);
  await expect(page.locator('.mantine-Notification-root')).toHaveCount(0, { timeout: 15000 });
};
test('QA-007/015: dos vistas conservan conflicto y retry exacto tras respuesta perdida', async ({ page, context, request }, testInfo) => {
  test.setTimeout(120000);
  expect(process.cwd().replaceAll('\\', '/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
  expect(localStatus().API_URL).toBe('http://127.0.0.1:54321');
  expect(await (await request.get('/api/health')).json()).toEqual({ status: 'ok', service: 'aba-clinico' });
  const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
  const manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));
  expect(manifest.state).toBe('ready');
  const account = manifest.accounts.find(row => row.label === 'admin-a');
  if (account?.email !== `admin-a.${batchId}@aba.example.test`) throw new Error('Cuenta sintética incorrecta');
  await page.goto('/login');
  try {
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(account.password);
  } catch { throw new Error('Formulario no disponible; valores omitidos'); }
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/students');
  await page.getByText('ID clínico: QA-R5-A-2155E99E', { exact: true }).click();
  await expect(page.getByRole('textbox', { name: /^Nombre completo/ })).toHaveValue('QA SINTETICO LOCAL A');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Programas para la sesión' })).toBeVisible();
  const start = page.getByRole('button', { name: 'Iniciar sesión', exact: true });
  if (await start.count()) {
    await notesFor(page).fill('QA UI CONFLICTO BASE');
    await page.getByRole('checkbox', { name: 'Incluir en la sesión', exact: true }).check();
    await start.click();
  } else expect(await notesFor(page).inputValue()).toMatch(/^QA UI CONFLICTO /);
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
  await receiptsDone(page);
  const sessionUrl = page.url();
  const other = await context.newPage();
  try {
    await other.goto(sessionUrl);
    await expect(other.getByRole('heading', { name: 'Programas para la sesión' })).toBeVisible();
    const baseNotes = await notesFor(page).inputValue();
    await expect(notesFor(other)).toHaveValue(baseNotes);
    await notesFor(other).fill('QA UI CONFLICTO B');
    await notesFor(page).fill('QA UI CONFLICTO A');
    await page.getByRole('button', { name: 'Guardar notas', exact: true }).click();
    await expect(page.getByText('Servidor confirmado', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Guardar notas', exact: true })).toBeEnabled();
    await other.getByRole('button', { name: 'Guardar notas', exact: true }).click();
    await expect(other.getByRole('button', { name: 'Consultar versión vigente', exact: true })).toBeVisible();
    await expect(notesFor(other)).toHaveValue('QA UI CONFLICTO B');
    await expect(other.getByRole('button', { name: 'Guardar notas', exact: true })).toBeDisabled();
    await page.reload(); await expect(notesFor(page)).toHaveValue('QA UI CONFLICTO A');
    await other.getByRole('button', { name: 'Consultar versión vigente', exact: true }).click();
    await expect(other.locator('pre')).toContainText('QA UI CONFLICTO A');
    await other.getByRole('button', { name: 'He revisado: conservar mi borrador sobre esta versión', exact: true }).click();
    await expect(notesFor(other)).toHaveValue('QA UI CONFLICTO B');
    // Reviewing is not a write. First view still reads A until explicit save.
    await page.reload(); await expect(notesFor(page)).toHaveValue('QA UI CONFLICTO A');
    await other.getByRole('button', { name: 'Guardar notas', exact: true }).click();
    await expect(other.getByRole('button', { name: 'Guardar notas', exact: true })).toBeEnabled();
    await page.reload(); await expect(notesFor(page)).toHaveValue('QA UI CONFLICTO B');

    // Execute a genuine Server Action, then lose its response, not its request.
    const commands = [];
    let responseLost = false;
    let transportFailure = false;
    const intercept = async route => {
      const outgoing = route.request();
      if (outgoing.method() !== 'POST' || !outgoing.headers()['next-action']) return route.continue();
      const body = outgoing.postData() ?? '';
      if (!body.includes('QA UI CONFLICTO RESPUESTA PERDIDA') || !body.includes('update-notes')) return route.continue();
      const args = JSON.parse(body);
      const command = args.find(arg => arg?.command?.action === 'update-notes')?.command;
      if (!command) throw new Error('Serialización de comando no reconocida; no simular recibos');
      commands.push(command);
      if (responseLost) return route.continue();
      try {
        const actual = await route.fetch({ timeout: 15000 });
        if (actual.status() !== 200) throw new Error('Server Action no confirmada');
        await actual.body(); // Server response completed before transport loss.
        responseLost = true;
        await route.abort('failed');
      } catch {
        // Never propagate Playwright fetch errors: their call log contains cookies.
        transportFailure = true;
        await route.abort('failed').catch(() => {});
      }
    };
    await page.route(sessionUrl, intercept);
    try {
      await notesFor(page).fill('QA UI CONFLICTO RESPUESTA PERDIDA');
      await page.getByRole('button', { name: 'Guardar notas', exact: true }).click();
      await expect.poll(() => responseLost || transportFailure, { timeout: 20000 }).toBe(true);
      expect(transportFailure, 'Transporte no completado; detalles sensibles omitidos').toBe(false);
      await expect(page.getByRole('button', { name: 'Reintentar misma operación', exact: true })).toBeVisible();
      expect(responseLost).toBe(true); expect(commands).toHaveLength(1);
      await expect(page.getByRole('button', { name: 'Guardar notas', exact: true })).toBeDisabled();
      // Independent UI read proves the first write committed despite lost ACK.
      await other.reload(); await expect(notesFor(other)).toHaveValue('QA UI CONFLICTO RESPUESTA PERDIDA');
      await page.getByRole('button', { name: 'Reintentar misma operación', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Reintentar misma operación', exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Guardar notas', exact: true })).toBeEnabled();
      expect(commands).toHaveLength(2);
      // Identity, payload, timestamp, version and key must all remain identical.
      expect(commands[1]).toEqual(commands[0]);
      await testInfo.attach('retry-summary', { body: JSON.stringify({ sessionId: commands[0].sessionId, expectedTerminalVersion: commands[0].expectedVersion + 2, equalCommands: true }), contentType: 'application/json' });
    } finally { await page.unrouteAll({ behavior: 'wait' }); }
    await page.reload(); await expect(notesFor(page)).toHaveValue('QA UI CONFLICTO RESPUESTA PERDIDA');
    await page.getByRole('button', { name: 'Finalizar', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Finalizar requiere al menos un registro enviado por programa seleccionado y ningún borrador pendiente.');
    await page.getByRole('button', { name: 'Volver', exact: true }).click();
    await page.getByRole('button', { name: 'Cancelar sesión', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Archivar', exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('conflicto-reintento-cancelado.png'), fullPage: true });
  } finally { await other.close(); }
  await page.goto('/students');
  await page.getByRole('button', { name: 'Menú de perfil' }).click();
  await page.getByRole('menuitem', { name: 'Cerrar Sesión' }).click();
  await expect(page).toHaveURL(/\/login$/);
});

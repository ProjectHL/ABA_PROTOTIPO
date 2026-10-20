import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { localStatus, state } from '../../scripts/local/write-env.mjs';

test.skip(process.env.ABA_QA_LOCAL_UI !== '1' || process.env.ABA_QA_SESSION_UI !== '1', 'Caso sintético local explícito');
test.use({ actionTimeout: 15000 });
test('QA-006/007: pausa, borrador, ayudas/NR y corrección persistida por UI', async ({ page, request }, testInfo) => {
  test.setTimeout(120000);
  expect(process.cwd().replaceAll('\\', '/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
  expect(localStatus().API_URL).toBe('http://127.0.0.1:54321');
  await expect.poll(async () => {
    try { return (await request.get('/api/health', { timeout: 3000 })).status(); }
    catch { return 0; }
  }, { timeout: 30000 }).toBe(200);
  expect(await (await request.get('/api/health')).json()).toEqual({ status: 'ok', service: 'aba-clinico' });
  const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
  const manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));
  expect(manifest.state).toBe('ready');
  const account = manifest.accounts.find(row => row.label === 'admin-a');
  if (account?.email !== `admin-a.${batchId}@aba.example.test`) throw new Error('Identidad sintética incorrecta');
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
  // The production session notes currently have no label; scope the textarea
  // to the card identified by its visible heading, without changing the UI.
  const sessionNotes = page.locator('div.mantine-Card-root').filter({ has: page.getByText('Notas de sesión', { exact: true }) }).getByRole('textbox');
  const start = page.getByRole('button', { name: 'Iniciar sesión', exact: true });
  const dismissReceipts = async () => {
    // Hover pauses Mantine auto-close; move outside the receipt before waiting.
    await page.mouse.move(0, 600);
    await expect(page.locator('.mantine-Notification-root')).toHaveCount(0, { timeout: 15000 });
  };
  if (await start.count()) {
    await sessionNotes.fill('QA UI TRANSICIONES');
    await page.getByRole('checkbox', { name: 'Incluir en la sesión', exact: true }).check();
    await start.click();
  } else await expect(sessionNotes).toHaveValue('QA UI TRANSICIONES');
  await expect(page.getByRole('button', { name: /^(Pausar|Reanudar)$/ })).toBeVisible();
  await dismissReceipts();
  if (await page.getByRole('button', { name: 'Reanudar', exact: true }).count()) await page.getByRole('button', { name: 'Reanudar', exact: true }).click();
  await dismissReceipts();
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reanudar', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Reanudar', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nuevo registro', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Reanudar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
  await dismissReceipts();
  const submitted = page.getByRole('button', { name: 'Corregir enviado', exact: true });
  const drafts = page.getByRole('button', { name: /^Continuar borrador/ });
  if (await submitted.count() === 0) {
    if (await drafts.count()) await drafts.first().click();
    else await page.getByRole('button', { name: 'Nuevo registro', exact: true }).click();
    const dimension = page.getByRole('textbox', { name: 'Dimensión', exact: true });
    if (await dimension.inputValue() !== 'Porcentaje') {
      page.once('dialog', async dialog => {
        if (dialog.message().startsWith('La dimensión nueva se guardará')) await dialog.accept();
        else await dialog.dismiss();
      });
      await dimension.click(); await page.getByRole('option', { name: 'Porcentaje', exact: true }).click();
    }
    const chooseResponse = async (name, index) => {
      const radio = page.getByRole('radio', { name, exact: true }).nth(index);
      await page.locator(`label[for="${await radio.getAttribute('id')}"]`).click();
      await expect(radio).toBeChecked();
    };
    await chooseResponse('A', 0);
    await page.getByRole('textbox', { name: 'Ayuda en la respuesta', exact: true }).click();
    await page.getByRole('option', { name: 'model', exact: true }).click();
    await chooseResponse('NR', 1);
    await page.getByRole('textbox', { name: 'Notas originales', exact: true }).fill('QA UI BORRADOR AYUDAS NR');
    await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
    await expect(page.getByText('Registro confirmado', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cerrar', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await page.reload();
    await drafts.first().click();
    await expect(page.getByRole('textbox', { name: 'Notas originales', exact: true })).toHaveValue('QA UI BORRADOR AYUDAS NR');
    await expect(page.getByRole('radio', { name: 'A', exact: true }).first()).toBeChecked();
    await expect(page.getByRole('radio', { name: 'NR', exact: true }).nth(1)).toBeChecked();
    await expect(page.getByRole('textbox', { name: 'Ayuda en la respuesta', exact: true })).toHaveValue('model');
    await page.getByRole('button', { name: 'Enviar registro', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(submitted).toHaveCount(1);
  }
  await submitted.first().click();
  await expect(page.getByRole('button', { name: 'Guardar corrección', exact: true })).toBeDisabled();
  await page.getByRole('textbox', { name: 'Motivo de la corrección', exact: true }).fill('QA corrección explícita sintética');
  await page.getByRole('textbox', { name: 'Notas originales', exact: true }).fill('QA UI CORRECCION AYUDAS NR');
  await page.getByRole('button', { name: 'Guardar corrección', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload(); await submitted.first().click();
  await expect(page.getByRole('textbox', { name: 'Notas originales', exact: true })).toHaveValue('QA UI CORRECCION AYUDAS NR');
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await dismissReceipts();
  await page.getByRole('button', { name: 'Finalizar', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Archivar', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('sesion-transiciones.png'), fullPage: true });
  await page.goto('/students');
  await page.getByRole('button', { name: 'Menú de perfil' }).click();
  await page.getByRole('menuitem', { name: 'Cerrar Sesión' }).click();
  await expect(page).toHaveURL(/\/login$/);
});

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { localStatus, state } from '../../scripts/local/write-env.mjs';

const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
const manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));
test.skip(process.env.ABA_QA_COMMERCIAL_UI !== '1', 'Sólo QA comercial local con datos sintéticos');

async function signIn(page, label) {
  const account = manifest.accounts.find(row => row.label === label);
  if (account?.email !== `${label}.${batchId}@aba.example.test`) throw new Error('Identidad sintética incorrecta');
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL('http://localhost:3000/dashboard');
  const clinic = page.getByRole('textbox', { name: 'Clínica activa' });
  const expected = label.endsWith('-b') ? 'Clínica sintética B' : 'Clínica sintética A';
  const mobileMenu = page.locator('header button').first();
  const mobile = (page.viewportSize()?.width ?? 9999) < 576;
  if (mobile) await mobileMenu.click();
  if (!(await clinic.inputValue()).includes(expected)) {
    await clinic.click();
    await page.getByRole('option', { name: new RegExp(expected) }).click();
  }
  await expect(clinic).toHaveValue(new RegExp(expected));
  if (mobile) await mobileMenu.click();
}

async function signOut(page) {
  await page.getByRole('button', { name: 'Menú de perfil' }).click();
  await page.getByRole('menuitem', { name: 'Cerrar Sesión' }).click();
  await expect(page).toHaveURL(/\/login$/);
}

test('QA-010: plan y plazas internos por UI, sin cobros y sin acceso profesional', async ({ page }) => {
  test.setTimeout(90000);
  expect(process.cwd().replaceAll('\\', '/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
  expect(localStatus().API_URL).toBe('http://127.0.0.1:54321');
  expect(manifest.batchId).toBe(batchId);
  expect(manifest.state).toBe('ready');

  await signIn(page, 'admin-a');
  await page.goto('/plans');
  await expect(page.getByRole('heading', { name: 'Planes y gestión comercial' })).toBeVisible();
  await expect(page.getByText('Gestión interna de demostración. Los importes no generan cobros y los documentos no son tributarios.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Clínica Base' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Clínica Equipo' }).first()).toBeVisible();
  await expect(page.getByText('No se pudo recuperar la gestión comercial autorizada.')).toHaveCount(0);

  const planCard = page.locator('.mantine-Card-root').filter({ has: page.getByRole('heading', { name: 'Clínica Equipo' }) });
  const empty = page.getByText('Todavía no hay un plan interno seleccionado.');
  if (await empty.count()) {
    await planCard.getByRole('button', { name: 'Seleccionar plan' }).click();
    const modal = page.getByRole('dialog', { name: 'Seleccionar plan y plazas' });
    await expect(modal.getByRole('textbox', { name: 'Plan' })).toHaveValue(/Clínica Equipo/);
    await modal.getByRole('checkbox', { name: 'Confirmo esta operación interna de demostración' }).check();
    await modal.getByRole('button', { name: 'Confirmar', exact: true }).click();
    await expect(page.getByText('Cambio interno confirmado.')).toBeVisible();
  }
  await expect(page.getByRole('heading', { name: 'Clínica Equipo' })).toHaveCount(2);
  await expect(page.getByText(/plazas ocupadas de/)).toBeVisible();
  await expect(page.getByText('Vigente', { exact: true })).toBeVisible();

  if (await page.getByText('3 plazas ocupadas de 6', { exact: true }).count() === 0) {
    await planCard.getByRole('button', { name: 'Gestionar plazas' }).click();
    const modal = page.getByRole('dialog', { name: 'Seleccionar plan y plazas' });
    await modal.getByRole('textbox', { name: 'Plazas' }).fill('6');
    await modal.getByRole('textbox', { name: 'Motivo' }).fill('Ajuste sintético de plazas para QA local');
    await modal.getByRole('checkbox', { name: 'Confirmo esta operación interna de demostración' }).check();
    await modal.getByRole('button', { name: 'Confirmar', exact: true }).click();
    await expect(page.getByText('Cambio interno confirmado.')).toBeVisible();
  }
  await expect(page.getByText('3 plazas ocupadas de 6', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('3 plazas ocupadas de 6', { exact: true })).toBeVisible();
  await signOut(page);

  await signIn(page, 'supervisor-a');
  await page.goto('/plans');
  await expect(page.getByText('La gestión comercial está disponible para la administración de la clínica activa.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Seleccionar plan' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Gestionar plazas' })).toHaveCount(0);
  await signOut(page);
});

test('QA-010: documento comercial interno se versiona y archiva sin cobro', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Mutación única del documento sintético');
  test.setTimeout(90000);
  const documentTitle = 'QA R5 RESUMEN INTERNO 2155E99E';
  await signIn(page, 'admin-a');
  await page.goto('/plans');
  await expect(page.getByRole('button', { name: 'Crear documento' })).toBeEnabled();
  await page.getByRole('checkbox', { name: 'Incluir archivados' }).check();
  const card = page.locator('.mantine-Card-root').filter({ hasText: documentTitle });
  if (await card.count() === 0) {
    await page.getByRole('button', { name: 'Crear documento' }).click();
    const modal = page.getByRole('dialog', { name: 'Crear documento interno' });
    await modal.getByRole('textbox', { name: 'Título', exact: true }).fill(documentTitle);
    await modal.getByRole('button', { name: 'Añadir línea' }).click();
    await modal.getByRole('textbox', { name: 'Descripción' }).fill('Resumen sintético inicial');
    await modal.getByRole('textbox', { name: 'Importe en unidades mínimas' }).fill('5000');
    await modal.getByRole('checkbox', { name: 'Confirmo esta operación interna de demostración' }).check();
    await modal.getByRole('button', { name: 'Confirmar', exact: true }).click();
    await expect(page.getByText('Cambio interno confirmado.')).toBeVisible();
  }
  await expect(card).toHaveCount(1);
  await expect(card.getByText('Demostración · sin solicitud de pago')).toBeVisible();
  if (await card.getByText('Archivado', { exact: true }).count() === 0) {
    if (await card.getByText('Versión 1', { exact: true }).count()) {
      await card.getByRole('button', { name: 'Sustituir versión' }).click();
      const modal = page.getByRole('dialog', { name: 'Sustituir documento' });
      await modal.getByRole('textbox', { name: 'Descripción' }).fill('Resumen sintético corregido');
      await modal.getByRole('checkbox', { name: 'Confirmo esta operación interna de demostración' }).check();
      await modal.getByRole('button', { name: 'Confirmar', exact: true }).click();
      await expect(page.getByText('Cambio interno confirmado.')).toBeVisible();
    }
    await expect(card.getByText('Versión 2', { exact: true })).toBeVisible();
    await expect(card.getByText('Resumen sintético corregido', { exact: true })).toBeVisible();
    await card.getByRole('button', { name: 'Archivar', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Archivar documento' });
    await modal.getByRole('checkbox', { name: 'Confirmo esta operación interna de demostración' }).check();
    await modal.getByRole('button', { name: 'Confirmar', exact: true }).click();
    await expect(page.getByText('Cambio interno confirmado.')).toBeVisible();
  }
  await expect(card.getByText('Archivado', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('checkbox', { name: 'Incluir archivados' }).check();
  await expect(card.getByText('Archivado', { exact: true })).toBeVisible();
  await expect(card.getByRole('button', { name: 'Sustituir versión' })).toHaveCount(0);
  await signOut(page);
});

test('QA-010: cancelación demostrativa conserva membresías de clínica sintética B', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Mutación única de clínica B sintética');
  test.setTimeout(90000);
  await signIn(page, 'admin-b');
  await page.goto('/plans');
  await expect(page.getByRole('heading', { name: 'Planes y gestión comercial' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Clínica Equipo' }).first()).toBeVisible();

  if (await page.getByText('Todavía no hay un plan interno seleccionado.').count()) {
    const planCard = page.locator('.mantine-Card-root').filter({ has: page.getByRole('heading', { name: 'Clínica Equipo' }) });
    await planCard.getByRole('button', { name: 'Seleccionar plan' }).click();
    const modal = page.getByRole('dialog', { name: 'Seleccionar plan y plazas' });
    await modal.getByRole('checkbox', { name: 'Confirmo esta operación interna de demostración' }).check();
    await modal.getByRole('button', { name: 'Confirmar', exact: true }).click();
    await expect(page.getByText('Cambio interno confirmado.')).toBeVisible();
  }
  if (await page.getByText('Cancelada', { exact: true }).count() === 0) {
    const cancel = page.getByRole('button', { name: 'Cancelar suscripción interna' });
    await expect(cancel).toBeVisible();
    await cancel.click();
    const modal = page.getByRole('dialog', { name: 'Cancelar suscripción' });
    await modal.getByRole('textbox', { name: 'Motivo' }).fill('Cancelación exclusivamente sintética de QA local');
    await modal.getByRole('checkbox', { name: 'Confirmo esta operación interna de demostración' }).check();
    await modal.getByRole('button', { name: 'Confirmar', exact: true }).click();
    await expect(page.getByText('Cambio interno confirmado.')).toBeVisible();
  }
  await expect(page.getByText('Cancelada', { exact: true })).toBeVisible();
  await expect(page.getByText('La cancelación conserva los datos clínicos y las membresías.')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Cancelada', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Seleccionar plan' }).first()).toBeDisabled();
  await signOut(page);
});

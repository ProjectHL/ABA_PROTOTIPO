import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { localStatus, state } from '../../scripts/local/write-env.mjs';

const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
const ticketTitle = 'QA R5 TICKET LOCAL 2155E99E';
const replyText = 'Respuesta sintética de administración para QA local';
const manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));
test.skip(process.env.ABA_QA_SUPPORT_UI !== '1', 'Sólo QA soporte local sintético');

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

async function selectTicket(page) {
  const listing = page.locator('.mantine-Card-root').filter({ hasText: ticketTitle })
    .filter({ has: page.getByRole('button', { name: 'Ver conversación' }) });
  await expect(listing).toHaveCount(1);
  await listing.getByRole('button', { name: 'Ver conversación' }).click();
  await expect(page.getByRole('heading', { name: ticketTitle })).toBeVisible();
  return listing;
}

test('QA-010: ticket sintético, respuesta, estado y aislamiento por UI', async ({ page }) => {
  test.setTimeout(120000);
  expect(process.cwd().replaceAll('\\', '/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
  expect(localStatus().API_URL).toBe('http://127.0.0.1:54321');
  expect(manifest.batchId).toBe(batchId);
  expect(manifest.state).toBe('ready');

  await signIn(page, 'supervisor-a');
  await page.goto('/support');
  await expect(page.getByRole('heading', { name: 'Soporte' })).toBeVisible();
  await expect(page.getByText('No se pudo recuperar el soporte autorizado.')).toHaveCount(0);
  const createButton = page.getByRole('button', { name: 'Nuevo ticket' });
  try { await expect(createButton).toBeEnabled(); }
  catch {
    const alerts = await page.getByRole('alert').allTextContents();
    const clinic = await page.getByRole('textbox', { name: 'Clínica activa' }).inputValue().catch(() => 'sin selector');
    throw new Error(`Soporte UI no habilitó alta; clínica=${clinic}; avisos=${JSON.stringify(alerts)}`);
  }
  if (await page.getByText(ticketTitle, { exact: true }).count() === 0) {
    await page.getByRole('button', { name: 'Nuevo ticket' }).click();
    const modal = page.getByRole('dialog', { name: 'Nuevo ticket' });
    await modal.getByRole('textbox', { name: 'Título' }).fill(ticketTitle);
    await modal.getByRole('textbox', { name: 'Mensaje' }).fill('Solicitud técnica ficticia sin datos clínicos identificables');
    await modal.getByRole('button', { name: 'Confirmar', exact: true }).click();
    await expect(page.getByText('Solicitud confirmada en soporte.')).toBeVisible();
  }
  await selectTicket(page);
  await expect(page.getByText('Solicitud técnica ficticia sin datos clínicos identificables')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cambiar estado' })).toHaveCount(0);
  await signOut(page);

  await signIn(page, 'admin-a');
  await page.goto('/support');
  const listing = await selectTicket(page);
  if (await page.getByText(replyText, { exact: true }).count() === 0) {
    await page.getByRole('button', { name: 'Responder' }).click();
    const modal = page.getByRole('dialog', { name: 'Responder ticket' });
    await modal.getByRole('textbox', { name: 'Mensaje' }).fill(replyText);
    await modal.getByRole('button', { name: 'Confirmar', exact: true }).click();
    await expect(page.getByText('Solicitud confirmada en soporte.')).toBeVisible();
  }
  await expect(page.getByText(replyText, { exact: true })).toBeVisible();
  if (await listing.getByText('En curso', { exact: true }).count() === 0) {
    await page.getByRole('button', { name: 'Cambiar estado' }).click();
    const modal = page.getByRole('dialog', { name: 'Cambiar estado' });
    await modal.getByRole('textbox', { name: 'Nuevo estado' }).click();
    await page.getByRole('option', { name: 'En curso', exact: true }).click();
    await modal.getByRole('textbox', { name: 'Motivo del cambio' }).fill('Clasificación sintética de QA');
    await modal.getByRole('button', { name: 'Confirmar', exact: true }).click();
    await expect(page.getByText('Solicitud confirmada en soporte.')).toBeVisible();
  }
  await expect(listing.getByText('En curso', { exact: true })).toBeVisible();
  await page.reload();
  await selectTicket(page);
  await expect(page.getByText(replyText, { exact: true })).toBeVisible();
  await signOut(page);

  await signIn(page, 'admin-b');
  await page.goto('/support');
  await expect(page.getByRole('heading', { name: 'Soporte' })).toBeVisible();
  await expect(page.getByText(ticketTitle, { exact: true })).toHaveCount(0);
  await signOut(page);
});

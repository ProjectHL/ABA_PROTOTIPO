import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import { localStatus, state } from '../../scripts/local/write-env.mjs';

test.skip(process.env.ABA_QA_LOCAL_UI !== '1' || process.env.ABA_QA_FAMILY_DOCUMENTS_UI !== '1', 'Publicación familiar sintética local explícita');
test.use({ actionTimeout: 15000 });

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y1Y04wAAAAASUVORK5CYII=', 'base64');

async function signIn(page, account) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

test('QA-008/009: documento familiar publicado se descarga y revocación corta la misma ruta', async ({ page, browser }, testInfo) => {
  test.setTimeout(240000);
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message.slice(0, 300)));
  page.on('console', message => { if (message.type() === 'error') pageErrors.push(message.text().slice(0, 300)); });
  expect(process.cwd().replaceAll('\\', '/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
  const status = localStatus(); expect(status.API_URL).toBe('http://127.0.0.1:54321');
  const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
  const manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));
  expect(manifest.state).toBe('ready');
  const admin = manifest.accounts.find(row => row.label === 'admin-a');
  const family = manifest.accounts.find(row => row.label === 'familia');
  if (admin?.email !== `admin-a.${batchId}@aba.example.test` || family?.email !== `familia.${batchId}@aba.example.test`) throw new Error('Identidades sintéticas incorrectas');
  const client = createClient(status.API_URL, status.ANON_KEY ?? status.PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  let student;
  try {
    const login = await client.auth.signInWithPassword({ email: admin.email, password: admin.password });
    if (login.error || login.data.user?.id !== admin.userId || login.data.user.app_metadata.aba_fixture_batch !== batchId) throw new Error('Admin sintético no verificado');
    const list = await client.rpc('aba_list_students_v2', { p_organization_id: manifest.clinics.A });
    if (list.error) throw new Error('Lectura de fichas no confirmada');
    student = list.data.find(row => row.clinicalId === 'QA-R5-A-2155E99E');
    expect(student).toBeDefined();
  } finally { await client.auth.signOut({ scope: 'local' }); }

  const familyName = 'QA R5 FAMILIAR 2155E99E';
  const documentName = 'qa-r5-publicacion-familiar.png';
  await signIn(page, admin);
  await page.goto(`/students/${student.id}`);
  await expect(page.getByRole('textbox', { name: /^Identificador clínico/ })).toHaveValue('QA-R5-A-2155E99E');
  await page.getByRole('tab', { name: 'Documentación Legal' }).click();
  const documentsPanel = page.getByRole('tabpanel', { name: 'Documentación Legal' });
  await expect(documentsPanel.getByRole('button', { name: 'Actualizar' })).toBeEnabled();
  if (await documentsPanel.getByText(documentName, { exact: true }).count() === 0) {
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Seleccionar archivo' }).click();
    await (await chooser).setFiles({ name: documentName, mimeType: 'image/png', buffer: png });
  }
  await expect(documentsPanel.getByText(documentName, { exact: true }).first()).toBeVisible();
  await page.getByRole('tab', { name: 'Familia y Contacto' }).click();
  await page.waitForLoadState('networkidle');
  if (await page.getByRole('row').filter({ hasText: familyName }).count() === 0) {
    await page.getByRole('button', { name: 'Agregar familiar o contacto' }).click();
    const modal = page.getByRole('dialog', { name: 'Agregar familiar o contacto' });
    await modal.getByRole('textbox', { name: 'Nombre completo' }).fill(familyName);
    await modal.getByRole('textbox', { name: 'Relación' }).fill('Familiar sintético QA');
    await modal.getByRole('textbox', { name: 'Email' }).fill(family.email);
    await modal.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(modal).toBeHidden();
  }
  const consultation = page.waitForResponse(response => response.request().method() === 'POST' && Boolean(response.request().headers()['next-action']));
  await page.getByRole('button', { name: 'Consultar estado vigente' }).click();
  await consultation;
  await expect(page.getByRole('button', { name: 'Consultar estado vigente' })).toBeEnabled();
  const accessCard = page.getByRole('heading', { name: 'Acceso al portal familiar' }).locator('xpath=ancestor::*[contains(@class,"mantine-Card-root")][1]');
  const familyRows = accessCard.getByRole('row').filter({ hasText: familyName });
  await expect(familyRows.first()).toBeVisible();
  let activeRow = familyRows.filter({ hasText: 'active' });
  const needsAccept = await activeRow.count() === 0;
  if (needsAccept) {
    await familyRows.getByRole('button', { name: 'Invitar' }).first().click();
    await expect(familyRows.filter({ hasText: 'pending' })).toHaveCount(1);
  }

  const familyContext = await browser.newContext({ baseURL: process.env.ABA_QA_BASE_URL ?? 'http://localhost:3000' });
  const familyPage = await familyContext.newPage();
  try {
    await signIn(familyPage, family);
    if (needsAccept) {
      await familyPage.goto('/invitations');
      const invitation = familyPage.getByRole('row').filter({ hasText: familyName });
      await expect(invitation).toBeVisible();
      await invitation.getByRole('button', { name: 'Aceptar' }).click();
      await expect(invitation).toHaveCount(0);
    }
    const acceptedConsultation = page.waitForResponse(response => response.request().method() === 'POST' && Boolean(response.request().headers()['next-action']));
  await page.getByRole('button', { name: 'Consultar estado vigente' }).click();
  await acceptedConsultation;
  await expect(page.getByRole('button', { name: 'Consultar estado vigente' })).toBeEnabled();
    activeRow = familyRows.filter({ hasText: 'active' });
    await expect(activeRow).toHaveCount(1);

    const publicationCard = page.getByRole('heading', { name: 'Publicación familiar' }).locator('xpath=ancestor::*[contains(@class,"mantine-Card-root")][1]');
    if (await publicationCard.locator('.mantine-Pill-label').filter({ hasText: familyName }).count() === 0) {
      await publicationCard.locator('.mantine-MultiSelect-input').first().click();
      await page.getByRole('option', { name: familyName, exact: true }).click();
      await page.keyboard.press('Escape');
    }
    if (await publicationCard.locator('.mantine-Pill-label').filter({ hasText: documentName }).count() === 0) {
      const documentFilter = page.getByRole('textbox', { name: 'Versiones de documentos' });
      await documentFilter.focus();
      await documentFilter.fill(documentName);
      await documentFilter.press('ArrowDown');
      await documentFilter.press('Enter');
      await page.keyboard.press('Escape');
    }
    await expect(publicationCard.locator('.mantine-Pill-label').filter({ hasText: familyName })).toBeVisible();
    await expect(publicationCard.locator('.mantine-Pill-label').filter({ hasText: documentName })).toBeVisible();
    await page.getByRole('textbox', { name: 'Introducción' }).fill(`Publicación documental sintética QA R5 · ${testInfo.project.name} · ${Date.now()}`);
    if (await page.getByRole('alert', { name: 'No se pudo cargar esta página' }).isVisible()) throw new Error(`Pantalla familiar cayó en ${new URL(page.url()).pathname}: ${pageErrors.slice(-3).join(' | ') || 'sin excepción capturada'}`);
    const publishButton = page.getByRole('button', { name: /Publicar (para familia|nueva versión)/ });
    if (testInfo.project.name === 'mobile') {
      await publishButton.scrollIntoViewIfNeeded();
      // Mobile has a visual viewport narrower than its horizontally overflowing layout viewport.
      // Tap in visual coordinates; locator.click() uses layout coordinates and hits an earlier field.
      const touchPoint = await publishButton.evaluate(button => {
        const rect = button.getBoundingClientRect();
        const visual = window.visualViewport;
        return {
          x: rect.left + rect.width / 2 - (visual?.offsetLeft ?? 0),
          y: rect.top + rect.height / 2 - (visual?.offsetTop ?? 0),
        };
      });
      await page.touchscreen.tap(touchPoint.x, touchPoint.y);
    } else {
      await publishButton.click();
    }
    await expect(page.getByText(/Versión vigente \d+/)).toBeVisible();

    await familyPage.goto('/family');
    await expect(familyPage.getByRole('heading', { name: 'Portal Familiar' })).toBeVisible();
    const documentCard = familyPage.getByText(documentName, { exact: true }).locator('xpath=ancestor::*[contains(@class,"mantine-Card-root")][1]');
    await expect(documentCard).toBeVisible();
    const responseWait = familyPage.waitForResponse(response => response.url().includes('/family/documents?'));
    const downloadWait = familyPage.waitForEvent('download');
    await documentCard.getByRole('button', { name: 'Descargar documento' }).click();
    const response = await responseWait;
    expect(response.status()).toBe(200);
    expect(readFileSync(await (await downloadWait).path())).toEqual(png);
    const authorizedUrl = response.url();

    page.once('dialog', dialog => dialog.accept());
    await activeRow.getByRole('button', { name: 'Revocar' }).click();
    await expect(familyRows.filter({ hasText: 'active' })).toHaveCount(0);
    await expect(familyRows.filter({ hasText: 'revoked' }).first()).toBeVisible();
    const revokedStatus = await familyPage.evaluate(async url => (await fetch(url, { credentials: 'same-origin', cache: 'no-store' })).status, authorizedUrl);
    expect(revokedStatus).toBe(403);
    await familyPage.getByRole('button', { name: 'Actualizar portal' }).click();
    await expect(familyPage.getByText(documentName, { exact: true })).toHaveCount(0);
  } finally { await familyContext.close(); }
});

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import { localStatus, state } from '../../scripts/local/write-env.mjs';

test.skip(process.env.ABA_QA_LOCAL_UI !== '1' || process.env.ABA_QA_DOCUMENTS_UI !== '1', 'Documentos sintéticos locales explícitos');
test.use({ actionTimeout: 15000 });

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y1Y04wAAAAASUVORK5CYII=', 'base64');

test('QA-009: documento privado valida límites, versiona, descarga, aísla y archiva', async ({ page }) => {
  test.setTimeout(180000);
  expect(process.cwd().replaceAll('\\', '/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
  const status = localStatus(); expect(status.API_URL).toBe('http://127.0.0.1:54321');
  const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
  const manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));
  expect(manifest.state).toBe('ready');
  const account = manifest.accounts.find(row => row.label === 'admin-a');
  if (account?.email !== `admin-a.${batchId}@aba.example.test`) throw new Error('Identidad sintética incorrecta');
  const client = createClient(status.API_URL, status.ANON_KEY ?? status.PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  let student;
  try {
    const login = await client.auth.signInWithPassword({ email: account.email, password: account.password });
    if (login.error || login.data.user?.id !== account.userId || login.data.user.app_metadata.aba_fixture_batch !== batchId) throw new Error('Lectura sintética no autorizada');
    const list = await client.rpc('aba_list_students_v2', { p_organization_id: manifest.clinics.A });
    if (list.error) throw new Error('Lectura de fichas no confirmada');
    student = list.data.find(row => row.clinicalId === 'QA-R5-A-2155E99E');
    expect(student).toBeDefined();
  } finally { await client.auth.signOut({ scope: 'local' }); }
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto(`/students/${student.id}`);
  await page.getByRole('tab', { name: 'Documentación Legal' }).click();
  await expect(page.getByRole('heading', { name: 'Documentos Legales' })).toBeVisible();

  const invalid = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Seleccionar archivo' }).click();
  await (await invalid).setFiles({ name: 'qa-r5-firma-falsa.png', mimeType: 'image/png', buffer: Buffer.from('no es un png') });
  await expect(page.getByRole('alert', { name: 'Operación documental no completada' })).toContainText('Contenido no coincide con el formato declarado');
  await expect(page.getByText('qa-r5-firma-falsa.png', { exact: true })).toHaveCount(0);
  const oversized = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Seleccionar archivo' }).click();
  await (await oversized).setFiles({ name: 'qa-r5-excede-limite.png', mimeType: 'image/png', buffer: Buffer.alloc(20 * 1024 * 1024 + 1) });
  await expect(page.getByRole('alert', { name: 'Operación documental no completada' })).toContainText('hasta 20 MiB');
  await expect(page.getByText('qa-r5-excede-limite.png', { exact: true })).toHaveCount(0);

  const suffix = Date.now().toString(36);
  const firstName = `qa-r5-doc-v1-${suffix}.png`;
  const secondName = `qa-r5-doc-v2-${suffix}.png`;
  const first = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Seleccionar archivo' }).click();
  await (await first).setFiles({ name: firstName, mimeType: 'image/png', buffer: png });
  const firstRow = page.getByText(firstName, { exact: true }).locator('xpath=ancestor::*[contains(@class,"mantine-Paper-root")][1]');
  await expect(firstRow.getByText('Disponible', { exact: true })).toBeVisible();
  await expect(firstRow.getByText('v1', { exact: true })).toBeVisible();
  const firstDownload = page.waitForEvent('download');
  await firstRow.getByRole('button', { name: 'Descargar' }).click();
  expect(readFileSync(await (await firstDownload).path())).toEqual(png);

  const second = page.waitForEvent('filechooser');
  await firstRow.getByRole('button', { name: 'Reemplazar' }).click();
  await (await second).setFiles({ name: secondName, mimeType: 'image/png', buffer: png });
  const secondRow = page.getByText(secondName, { exact: true }).locator('xpath=ancestor::*[contains(@class,"mantine-Paper-root")][1]');
  await expect(secondRow.getByText('Disponible', { exact: true })).toBeVisible();
  await expect(secondRow.getByText('v2', { exact: true })).toBeVisible();
  const authorizedResponse = page.waitForResponse(response => response.url().includes('/attachments/read?'));
  const secondDownload = page.waitForEvent('download');
  await secondRow.getByRole('button', { name: 'Descargar' }).click();
  expect(readFileSync(await (await secondDownload).path())).toEqual(png);
  const readResponse = await authorizedResponse;
  expect(readResponse.status()).toBe(200);
  const authorizedUrl = readResponse.url();
  const anonymous = await fetch(authorizedUrl, { cache: 'no-store', redirect: 'manual' });
  expect([302, 303, 307, 308, 401, 403]).toContain(anonymous.status);

  const resource = { kind: 'student', clinicId: manifest.clinics.A, studentId: student.id };
  let version;
  try {
    const login = await client.auth.signInWithPassword({ email: account.email, password: account.password });
    if (login.error || login.data.user?.id !== account.userId) throw new Error('Lectura propia no autorizada');
    const listing = await client.rpc('aba_attachment_list_v2', { p_organization_id: manifest.clinics.A, p_resource: resource, p_include_archived: false });
    if (listing.error) throw new Error('Lista de adjuntos no disponible');
    version = listing.data.find(item => item.upload.fileName === secondName);
    expect(version).toBeDefined();
    expect(version.version).toBe(2);
    const issued = await client.storage.from(version.bucket).createSignedUrl(version.objectKey, 300);
    expect(issued.error).not.toBeNull();
    expect(issued.data).toBeNull();
  } finally { await client.auth.signOut({ scope: 'local' }); }
  for (const label of ['admin-b', 'externo', 'familia']) {
    const outsider = manifest.accounts.find(row => row.label === label);
    if (outsider?.email !== `${label}.${batchId}@aba.example.test`) throw new Error('Identidad ajena sintética incorrecta');
    const isolated = createClient(status.API_URL, status.ANON_KEY ?? status.PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    try {
      const login = await isolated.auth.signInWithPassword({ email: outsider.email, password: outsider.password });
      if (login.error || login.data.user?.id !== outsider.userId || login.data.user.app_metadata.aba_fixture_batch !== batchId) throw new Error('Identidad ajena no verificada');
      const read = await isolated.rpc('aba_attachment_read_v2', { p_organization_id: manifest.clinics.A, p_resource: resource, p_version_id: version.id });
      expect(read.error).not.toBeNull();
      const signed = await isolated.storage.from(version.bucket).createSignedUrl(version.objectKey, 60);
      expect(signed.error).not.toBeNull();
      expect(signed.data).toBeNull();
    } finally { await isolated.auth.signOut({ scope: 'local' }); }
  }

  page.once('dialog', dialog => dialog.accept());
  await secondRow.getByRole('button', { name: 'Archivar' }).click();
  await expect(page.getByText(secondName, { exact: true })).toHaveCount(0);
  await page.getByText('Ver archivados', { exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Ver archivados' })).toBeChecked();
  const archivedRow = page.getByText(secondName, { exact: true }).locator('xpath=ancestor::*[contains(@class,"mantine-Paper-root")][1]');
  await expect(archivedRow.getByText('Archivado', { exact: true })).toBeVisible();
  await expect(archivedRow.getByRole('button', { name: 'Descargar' })).toBeDisabled();
  expect(await page.evaluate(async url => (await fetch(url, { cache: 'no-store', credentials: 'same-origin' })).status, authorizedUrl)).toBe(403);
  await page.getByRole('button', { name: 'Menú de perfil' }).click();
  await page.getByRole('menuitem', { name: 'Cerrar Sesión' }).click();
  await expect(page).toHaveURL(/\/login$/);
});

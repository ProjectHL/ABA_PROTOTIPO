import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import { localStatus, state } from '../../scripts/local/write-env.mjs';

const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
const title = 'QA R5 RECORDATORIO DOBLE 2155E99E';
const familyTitle = 'QA R5 RECORDATORIO FAMILIAR 2155E99E';
const revokedTitle = 'QA R5 RECORDATORIO REVOCADO 2155E99E';
const familyPersonName = 'QA R5 AGENDA FAMILIAR ESCRITORIO 2155E99E';
const manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));
test.skip(process.env.ABA_QA_REMINDERS_UI !== '1', 'Sólo recordatorios sintéticos locales');
test.use({ actionTimeout: 15000 });

async function signIn(page, account) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL((process.env.ABA_QA_BASE_URL ?? 'http://localhost:3000') + '/dashboard');
}

function localWall(instant) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(instant).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

async function openBell(page) {
  await page.getByRole('button', { name: 'Notificaciones' }).click();
  const dropdown = page.locator('.mantine-Popover-dropdown').filter({ hasText: 'Notificaciones' });
  await expect(dropdown).toBeVisible();
  return dropdown;
}

test('QA-010: recordatorio vencido se entrega una vez a cada profesional autorizado', async ({ page, browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'La mutación sintética única se ejecuta en escritorio');
  test.setTimeout(120000);
  expect(process.cwd().replaceAll('\\', '/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
  const status = localStatus();
  expect(status.API_URL).toBe('http://127.0.0.1:54321');
  expect(manifest.batchId).toBe(batchId);
  expect(manifest.state).toBe('ready');
  const admin = manifest.accounts.find(row => row.label === 'admin-a');
  const technician = manifest.accounts.find(row => row.label === 'tecnico-a');
  const foreign = manifest.accounts.find(row => row.label === 'admin-b');
  for (const [label, account] of [['admin-a', admin], ['tecnico-a', technician], ['admin-b', foreign]]) {
    if (account?.email !== `${label}.${batchId}@aba.example.test`) throw new Error('Identidad sintética incorrecta');
  }

  const client = createClient(status.API_URL, status.ANON_KEY ?? status.PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  let exists = false;
  try {
    const login = await client.auth.signInWithPassword({ email: admin.email, password: admin.password });
    if (login.error || login.data.user?.id !== admin.userId || login.data.user.app_metadata.aba_fixture_batch !== batchId) throw new Error('Admin sintético no verificado');
    const calendar = await client.rpc('aba_calendar_read_v2', { p_organization_id: manifest.clinics.A });
    if (calendar.error) throw new Error('Agenda sintética no verificada');
    exists = calendar.data.appointments.some(row => row.title === title);
  } finally { await client.auth.signOut({ scope: 'local' }); }

  await signIn(page, admin);
  await page.goto('/calendar');
  await expect(page.getByRole('button', { name: 'Nueva cita' })).toBeEnabled();
  await page.getByRole('textbox', { name: 'Vista', exact: true }).click();
  await page.getByRole('option', { name: 'Listado', exact: true }).click();
  if (!exists) {
    await page.getByRole('button', { name: 'Nueva cita' }).click();
    const modal = page.getByRole('dialog', { name: 'Nueva cita' });
    await modal.getByRole('textbox', { name: 'Estudiante', exact: true }).click();
    await page.getByRole('option', { name: 'QA SINTETICO LOCAL A', exact: true }).click();
    await modal.getByRole('textbox', { name: 'Título', exact: true }).fill(title);
    await modal.getByRole('textbox', { name: 'Notas', exact: true }).fill('Recordatorio sólo sintético para QA local');
    await modal.getByRole('textbox', { name: 'Inicio local', exact: true }).fill(localWall(new Date(Date.now() + 120 * 60_000)));
    await modal.getByRole('textbox', { name: 'Fin local', exact: true }).fill(localWall(new Date(Date.now() + 180 * 60_000)));
    await modal.getByRole('textbox', { name: 'Participantes', exact: true }).click();
    await page.getByRole('option', { name: 'Persona sintética admin-a', exact: true }).click();
    await modal.getByRole('textbox', { name: 'Participantes', exact: true }).click();
    await page.getByRole('option', { name: 'Persona sintética tecnico-a', exact: true }).click();
    await modal.getByRole('textbox', { name: 'Participantes', exact: true }).press('Escape');
    await modal.getByRole('textbox', { name: 'Recordatorios: minutos antes, separados por coma' }).fill('180');
    await modal.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(page.getByText('Cambio confirmado en la agenda.')).toBeVisible();
  }
  const card = page.locator('.mantine-Card-root').filter({ hasText: title });
  await expect(card).toHaveCount(1);
  await expect(card.getByText(/Recordatorios: 180 min/)).toBeVisible();

  const adminBell = await openBell(page);
  const adminNotice = adminBell.getByText(title, { exact: false }).locator('xpath=..');
  await expect(adminNotice).toHaveCount(1);
  await adminBell.getByRole('button', { name: 'Consultar' }).click();
  await expect(adminNotice).toHaveCount(1);
  if (await adminNotice.getByRole('button', { name: 'Marcar leída' }).count()) {
    await adminNotice.getByRole('button', { name: 'Marcar leída' }).click();
    await expect(adminNotice.getByRole('button', { name: 'Marcar no leída' })).toBeVisible();
  }

  const technicianContext = await browser.newContext({ baseURL: process.env.ABA_QA_BASE_URL ?? 'http://localhost:3000' });
  const foreignContext = await browser.newContext({ baseURL: process.env.ABA_QA_BASE_URL ?? 'http://localhost:3000' });
  try {
    const technicianPage = await technicianContext.newPage();
    await signIn(technicianPage, technician);
    const technicianBell = await openBell(technicianPage);
    await expect(technicianBell.getByText(title, { exact: false })).toHaveCount(1);
    await technicianBell.getByRole('button', { name: 'Consultar' }).click();
    await expect(technicianBell.getByText(title, { exact: false })).toHaveCount(1);

    const foreignPage = await foreignContext.newPage();
    await signIn(foreignPage, foreign);
    const foreignBell = await openBell(foreignPage);
    await expect(foreignBell.getByText(title, { exact: false })).toHaveCount(0);
  } finally {
    await technicianContext.close();
    await foreignContext.close();
  }
  await page.reload();
  await page.getByRole('textbox', { name: 'Vista', exact: true }).click();
  await page.getByRole('option', { name: 'Listado', exact: true }).click();
  await expect(card.getByText('Recordatorios: 180 min (sent)')).toBeVisible();
});

test('QA-010: campana móvil relee el recordatorio sin duplicar ni cruzar clínica', async ({ page, browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Lectura móvil de la cita sintética ya creada');
  test.setTimeout(90000);
  expect(process.cwd().replaceAll('\\', '/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
  expect(localStatus().API_URL).toBe('http://127.0.0.1:54321');
  expect(manifest.batchId).toBe(batchId);
  const admin = manifest.accounts.find(row => row.label === 'admin-a');
  const technician = manifest.accounts.find(row => row.label === 'tecnico-a');
  const foreign = manifest.accounts.find(row => row.label === 'admin-b');

  await signIn(page, admin);
  let bell = await openBell(page);
  await expect(bell.getByText(title, { exact: false })).toHaveCount(1);
  await bell.getByRole('button', { name: 'Consultar' }).click();
  await expect(bell.getByText(title, { exact: false })).toHaveCount(1);
  await page.reload();
  bell = await openBell(page);
  await expect(bell.getByText(title, { exact: false })).toHaveCount(1);

  const technicianContext = await browser.newContext({ baseURL: process.env.ABA_QA_BASE_URL ?? 'http://localhost:3000', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const foreignContext = await browser.newContext({ baseURL: process.env.ABA_QA_BASE_URL ?? 'http://localhost:3000', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    const technicianPage = await technicianContext.newPage();
    await signIn(technicianPage, technician);
    const technicianBell = await openBell(technicianPage);
    await expect(technicianBell.getByText(title, { exact: false })).toHaveCount(1);

    const foreignPage = await foreignContext.newPage();
    await signIn(foreignPage, foreign);
    const foreignBell = await openBell(foreignPage);
    await expect(foreignBell.getByText(title, { exact: false })).toHaveCount(0);
  } finally {
    await technicianContext.close();
    await foreignContext.close();
  }
});

test('QA-010: recordatorio familiar exige vínculo activo y conserva un solo recibo', async ({ page, browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Mutación única del vínculo y la cita familiar sintética');
  test.setTimeout(150000);
  expect(process.cwd().replaceAll('\\', '/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
  const status = localStatus();
  expect(status.API_URL).toBe('http://127.0.0.1:54321');
  expect(manifest.batchId).toBe(batchId);
  const admin = manifest.accounts.find(row => row.label === 'admin-a');
  const family = manifest.accounts.find(row => row.label === 'familia');
  if (admin?.email !== `admin-a.${batchId}@aba.example.test` || family?.email !== `familia.${batchId}@aba.example.test`) throw new Error('Identidades sintéticas incorrectas');
  const client = createClient(status.API_URL, status.ANON_KEY ?? status.PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  let studentId, familyPersonId, exists;
  try {
    const login = await client.auth.signInWithPassword({ email: admin.email, password: admin.password });
    if (login.error || login.data.user?.id !== admin.userId || login.data.user.app_metadata.aba_fixture_batch !== batchId) throw new Error('Admin sintético no verificado');
    const calendar = await client.rpc('aba_calendar_read_v2', { p_organization_id: manifest.clinics.A });
    if (calendar.error) throw new Error('Agenda sintética no verificada');
    const reference = calendar.data.appointments.find(row => row.title === 'QA R5 CITA FAMILIAR ESCRITORIO 2155E99E');
    if (!reference) throw new Error('Ejecuta primero QA de agenda familiar sintética');
    studentId = reference.studentId;
    familyPersonId = reference.participants.find(row => row.kind === 'family')?.personId;
    if (!familyPersonId) throw new Error('Participante familiar sintético no verificado');
    exists = calendar.data.appointments.some(row => row.title === familyTitle);
  } finally { await client.auth.signOut({ scope: 'local' }); }

  await signIn(page, admin);
  await page.goto(`/students/${studentId}`);
  await page.getByRole('tab', { name: 'Familia y Contacto' }).click();
  await page.getByRole('button', { name: 'Consultar estado vigente' }).click();
  const accessRows = page.getByRole('heading', { name: 'Acceso al portal familiar' }).locator('xpath=ancestor::*[contains(@class,"mantine-Card-root")][1]').getByRole('row').filter({ hasText: familyPersonName });
  if (await accessRows.filter({ hasText: 'active' }).count() === 0 && await accessRows.filter({ hasText: 'pending' }).count() === 0) {
    await accessRows.filter({ hasText: 'revoked' }).first().getByRole('button', { name: 'Invitar' }).click();
    await expect(accessRows.filter({ hasText: 'pending' }).first()).toBeVisible();
  }
  const familyContext = await browser.newContext({ baseURL: process.env.ABA_QA_BASE_URL ?? 'http://localhost:3000' });
  const familyPage = await familyContext.newPage();
  try {
    await signIn(familyPage, family);
    if (await accessRows.filter({ hasText: 'pending' }).count()) {
      await familyPage.goto('/invitations');
      const invitation = familyPage.getByRole('row').filter({ hasText: familyPersonName });
      await expect(invitation).toBeVisible();
      await invitation.getByRole('button', { name: 'Aceptar' }).click();
      await expect(invitation).toHaveCount(0);
    }
    await page.getByRole('button', { name: 'Consultar estado vigente' }).click();
    await expect(accessRows.filter({ hasText: 'active' }).first()).toBeVisible();

    await page.goto('/calendar');
    await expect(page.getByRole('button', { name: 'Nueva cita' })).toBeEnabled();
    await page.getByRole('textbox', { name: 'Vista', exact: true }).click();
    await page.getByRole('option', { name: 'Listado', exact: true }).click();
    if (!exists) {
      await page.getByRole('button', { name: 'Nueva cita' }).click();
      const modal = page.getByRole('dialog', { name: 'Nueva cita' });
      await modal.getByRole('textbox', { name: 'Estudiante', exact: true }).click();
      await page.getByRole('option', { name: 'QA SINTETICO LOCAL A', exact: true }).click();
      await modal.getByRole('textbox', { name: 'Título', exact: true }).fill(familyTitle);
      await modal.getByRole('textbox', { name: 'Notas', exact: true }).fill('Recordatorio familiar exclusivamente sintético');
      await modal.getByRole('textbox', { name: 'Inicio local', exact: true }).fill(localWall(new Date(Date.now() + 120 * 60_000)));
      await modal.getByRole('textbox', { name: 'Fin local', exact: true }).fill(localWall(new Date(Date.now() + 180 * 60_000)));
      await modal.getByRole('textbox', { name: 'Participantes', exact: true }).click();
      await page.getByRole('option', { name: 'Persona sintética admin-a', exact: true }).click();
      await modal.getByRole('textbox', { name: 'Participantes', exact: true }).click();
      await page.locator(`[role="option"][value="f:${familyPersonId}"]`).click();
      await modal.getByRole('textbox', { name: 'Participantes', exact: true }).press('Escape');
      await modal.getByRole('textbox', { name: 'Recordatorios: minutos antes, separados por coma' }).fill('180');
      await modal.getByRole('button', { name: 'Guardar', exact: true }).click();
      await expect(page.getByText('Cambio confirmado en la agenda.')).toBeVisible();
    }
    await expect(page.getByText(familyTitle, { exact: true })).toHaveCount(1);
    const adminBell = await openBell(page);
    await expect(adminBell.getByText(familyTitle, { exact: false })).toHaveCount(1);

    await familyPage.goto('/family');
    await expect(familyPage.getByText(familyTitle, { exact: true })).toBeVisible();
    const familyBell = await openBell(familyPage);
    await expect(familyBell.getByText(familyTitle, { exact: false })).toHaveCount(1);
    await familyBell.getByRole('button', { name: 'Consultar' }).click();
    await expect(familyBell.getByText(familyTitle, { exact: false })).toHaveCount(1);

    await page.reload();
    await page.getByRole('textbox', { name: 'Vista', exact: true }).click();
    await page.getByRole('option', { name: 'Listado', exact: true }).click();
    const card = page.locator('.mantine-Card-root').filter({ hasText: familyTitle });
    await expect(card.getByText('Recordatorios: 180 min (sent)')).toBeVisible();

    await page.goto(`/students/${studentId}`);
    await page.getByRole('tab', { name: 'Familia y Contacto' }).click();
    await page.getByRole('button', { name: 'Consultar estado vigente' }).click();
    const rows = page.getByRole('heading', { name: 'Acceso al portal familiar' }).locator('xpath=ancestor::*[contains(@class,"mantine-Card-root")][1]').getByRole('row').filter({ hasText: familyPersonName });
    page.once('dialog', dialog => dialog.accept());
    await rows.filter({ hasText: 'active' }).first().getByRole('button', { name: 'Revocar' }).click();
    await expect(rows.filter({ hasText: 'active' })).toHaveCount(0);
    await familyPage.getByRole('button', { name: 'Actualizar portal' }).click();
    await expect(familyPage.getByText(familyTitle, { exact: true })).toHaveCount(0);
  } finally { await familyContext.close(); }
});

test('QA-010: campana familiar móvil conserva el aviso sin reabrir acceso revocado', async ({ page, browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Lectura móvil del recordatorio familiar sintético ya despachado');
  test.setTimeout(90000);
  expect(process.cwd().replaceAll('\\', '/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
  expect(localStatus().API_URL).toBe('http://127.0.0.1:54321');
  const family = manifest.accounts.find(row => row.label === 'familia');
  const foreign = manifest.accounts.find(row => row.label === 'admin-b');
  await signIn(page, family);
  const bell = await openBell(page);
  await expect(bell.getByText(familyTitle, { exact: false })).toHaveCount(1);
  await expect(bell.getByText(revokedTitle, { exact: false })).toHaveCount(0);
  await bell.getByRole('button', { name: 'Consultar' }).click();
  await expect(bell.getByText(familyTitle, { exact: false })).toHaveCount(1);
  await expect(bell.getByText(revokedTitle, { exact: false })).toHaveCount(0);
  await page.goto('/family');
  await expect(page.getByText(familyTitle, { exact: true })).toHaveCount(0);
  await expect(page.getByText(revokedTitle, { exact: true })).toHaveCount(0);

  const foreignContext = await browser.newContext({ baseURL: process.env.ABA_QA_BASE_URL ?? 'http://localhost:3000', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    const foreignPage = await foreignContext.newPage();
    await signIn(foreignPage, foreign);
    const foreignBell = await openBell(foreignPage);
    await expect(foreignBell.getByText(familyTitle, { exact: false })).toHaveCount(0);
  } finally { await foreignContext.close(); }
});

test('QA-010: vínculo revocado antes del despacho excluye a la familia', async ({ page, browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Creación única de cita con vínculo familiar sintético ya revocado');
  test.setTimeout(90000);
  expect(process.cwd().replaceAll('\\', '/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
  const status = localStatus();
  expect(status.API_URL).toBe('http://127.0.0.1:54321');
  const admin = manifest.accounts.find(row => row.label === 'admin-a');
  const family = manifest.accounts.find(row => row.label === 'familia');
  const client = createClient(status.API_URL, status.ANON_KEY ?? status.PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  let familyPersonId, exists;
  try {
    const login = await client.auth.signInWithPassword({ email: admin.email, password: admin.password });
    if (login.error || login.data.user?.id !== admin.userId || login.data.user.app_metadata.aba_fixture_batch !== batchId) throw new Error('Admin sintético no verificado');
    const calendar = await client.rpc('aba_calendar_read_v2', { p_organization_id: manifest.clinics.A });
    if (calendar.error) throw new Error('Agenda sintética no verificada');
    const reference = calendar.data.appointments.find(row => row.title === 'QA R5 CITA FAMILIAR ESCRITORIO 2155E99E');
    familyPersonId = reference?.participants.find(row => row.kind === 'family')?.personId;
    if (!familyPersonId) throw new Error('Participante familiar sintético no verificado');
    const access = await client.rpc('aba_family_access_read_v2', { p_organization_id: manifest.clinics.A, p_client_id: reference.studentId });
    if (access.error || access.data.links.some(row => row.familyPersonId === familyPersonId && row.status === 'active')) throw new Error('El vínculo familiar sintético debe estar revocado antes de este caso');
    exists = calendar.data.appointments.some(row => row.title === revokedTitle);
  } finally { await client.auth.signOut({ scope: 'local' }); }

  await signIn(page, admin);
  await page.goto('/calendar');
  await expect(page.getByRole('button', { name: 'Nueva cita' })).toBeEnabled();
  await page.getByRole('textbox', { name: 'Vista', exact: true }).click();
  await page.getByRole('option', { name: 'Listado', exact: true }).click();
  if (!exists) {
    await page.getByRole('button', { name: 'Nueva cita' }).click();
    const modal = page.getByRole('dialog', { name: 'Nueva cita' });
    await modal.getByRole('textbox', { name: 'Estudiante', exact: true }).click();
    await page.getByRole('option', { name: 'QA SINTETICO LOCAL A', exact: true }).click();
    await modal.getByRole('textbox', { name: 'Título', exact: true }).fill(revokedTitle);
    await modal.getByRole('textbox', { name: 'Notas', exact: true }).fill('No debe avisar a vínculo familiar sintético revocado');
    await modal.getByRole('textbox', { name: 'Inicio local', exact: true }).fill(localWall(new Date(Date.now() + 120 * 60_000)));
    await modal.getByRole('textbox', { name: 'Fin local', exact: true }).fill(localWall(new Date(Date.now() + 180 * 60_000)));
    await modal.getByRole('textbox', { name: 'Participantes', exact: true }).click();
    await page.getByRole('option', { name: 'Persona sintética admin-a', exact: true }).click();
    await modal.getByRole('textbox', { name: 'Participantes', exact: true }).click();
    await page.locator(`[role="option"][value="f:${familyPersonId}"]`).click();
    await modal.getByRole('textbox', { name: 'Participantes', exact: true }).press('Escape');
    await modal.getByRole('textbox', { name: 'Recordatorios: minutos antes, separados por coma' }).fill('180');
    await modal.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(page.getByText('Cambio confirmado en la agenda.')).toBeVisible();
  }
  await expect(page.getByText(revokedTitle, { exact: true })).toHaveCount(1);
  const adminBell = await openBell(page);
  await expect(adminBell.getByText(revokedTitle, { exact: false })).toHaveCount(1);

  const familyContext = await browser.newContext({ baseURL: process.env.ABA_QA_BASE_URL ?? 'http://localhost:3000' });
  try {
    const familyPage = await familyContext.newPage();
    await signIn(familyPage, family);
    const familyBell = await openBell(familyPage);
    await expect(familyBell.getByText(revokedTitle, { exact: false })).toHaveCount(0);
    await familyBell.getByRole('button', { name: 'Consultar' }).click();
    await expect(familyBell.getByText(revokedTitle, { exact: false })).toHaveCount(0);
    await familyPage.goto('/family');
    await expect(familyPage.getByText(revokedTitle, { exact: true })).toHaveCount(0);
  } finally { await familyContext.close(); }
  await page.reload();
  await page.getByRole('textbox', { name: 'Vista', exact: true }).click();
  await page.getByRole('option', { name: 'Listado', exact: true }).click();
  await expect(page.locator('.mantine-Card-root').filter({ hasText: revokedTitle }).getByText('Recordatorios: 180 min (sent)')).toBeVisible();
});

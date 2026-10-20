import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import { localStatus, state } from '../../scripts/local/write-env.mjs';

const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
const manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));
const studentClinicalId = 'QA-R5-A-2155E99E';
test.skip(process.env.ABA_QA_FAMILY_CALENDAR_UI !== '1', 'Sólo agenda familiar sintética local');
test.use({ actionTimeout: 15000 });

async function touchOrClick(page, button, mobile) {
  if (!mobile) return button.click();
  await button.scrollIntoViewIfNeeded();
  const point = await button.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const visual = window.visualViewport;
    return { x: rect.left + rect.width / 2 - (visual?.offsetLeft ?? 0), y: rect.top + rect.height / 2 - (visual?.offsetTop ?? 0) };
  });
  await page.touchscreen.tap(point.x, point.y);
}

async function signIn(page, account) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

test('QA-010/013: agenda familiar exige participación y vínculo vigente', async ({ page, browser }, testInfo) => {
  test.setTimeout(180000);
  expect(process.cwd().replaceAll('\\', '/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
  const status = localStatus();
  expect(status.API_URL).toBe('http://127.0.0.1:54321');
  expect(manifest.batchId).toBe(batchId);
  expect(manifest.state).toBe('ready');
  const admin = manifest.accounts.find(row => row.label === 'admin-a');
  const family = manifest.accounts.find(row => row.label === 'familia');
  if (admin?.email !== `admin-a.${batchId}@aba.example.test` || family?.email !== `familia.${batchId}@aba.example.test`) throw new Error('Identidades sintéticas incorrectas');

  const suffix = testInfo.project.name === 'mobile' ? 'MOVIL' : 'ESCRITORIO';
  const personName = `QA R5 AGENDA FAMILIAR ${suffix} 2155E99E`;
  const appointmentTitle = `QA R5 CITA FAMILIAR ${suffix} 2155E99E`;
  const client = createClient(status.API_URL, status.ANON_KEY ?? status.PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  let student;
  let appointmentAlreadyExists = false;
  let personAlreadyExists = false;
  try {
    const login = await client.auth.signInWithPassword({ email: admin.email, password: admin.password });
    if (login.error || login.data.user?.id !== admin.userId || login.data.user.app_metadata.aba_fixture_batch !== batchId) throw new Error('Admin sintético no verificado');
    const list = await client.rpc('aba_list_students_v2', { p_organization_id: manifest.clinics.A });
    if (list.error) throw new Error('Lectura de ficha sintética no confirmada');
    student = list.data.find(row => row.clinicalId === studentClinicalId);
    expect(student).toBeDefined();
    const detail = await client.rpc('aba_student_detail_v2', { p_organization_id: manifest.clinics.A, p_client_id: student.id });
    if (detail.error || !detail.data) throw new Error('Lectura de personas sintéticas no confirmada');
    personAlreadyExists = detail.data.people.some(row => row.fullName === personName);
    const calendar = await client.rpc('aba_calendar_read_v2', { p_organization_id: manifest.clinics.A });
    if (calendar.error) throw new Error('Lectura de agenda sintética no confirmada');
    appointmentAlreadyExists = calendar.data.appointments.some(row => row.title === appointmentTitle);
  } finally { await client.auth.signOut({ scope: 'local' }); }

  await signIn(page, admin);
  await page.goto(`/students/${student.id}`);
  await expect(page.getByRole('textbox', { name: /^Identificador clínico/ })).toHaveValue(studentClinicalId);
  await page.getByRole('tab', { name: 'Familia y Contacto' }).click();
  const personRow = page.getByRole('row').filter({ hasText: personName });
  if (!personAlreadyExists) {
    await page.getByRole('button', { name: 'Agregar familiar o contacto' }).click();
    const modal = page.getByRole('dialog', { name: 'Agregar familiar o contacto' });
    await modal.getByRole('textbox', { name: 'Nombre completo' }).fill(personName);
    await modal.getByRole('textbox', { name: 'Relación' }).fill('Familiar sintético QA agenda');
    await modal.getByRole('textbox', { name: 'Email' }).fill(family.email);
    await touchOrClick(page, modal.getByRole('button', { name: 'Guardar', exact: true }), testInfo.project.name === 'mobile');
    await expect(modal).toBeHidden();
  }
  await expect(personRow.first()).toBeVisible();
  await page.getByRole('button', { name: 'Consultar estado vigente' }).click();
  const accessCard = page.getByRole('heading', { name: 'Acceso al portal familiar' }).locator('xpath=ancestor::*[contains(@class,"mantine-Card-root")][1]');
  const accessRow = accessCard.getByRole('row').filter({ hasText: personName });
  await expect(accessRow.first()).toBeVisible();
  if (await accessRow.filter({ hasText: 'active' }).count() === 0 && await accessRow.filter({ hasText: 'pending' }).count() === 0) {
    const reusable = accessRow.filter({ hasText: 'revoked' });
    await (await reusable.count() ? reusable.first() : accessRow.first()).getByRole('button', { name: 'Invitar' }).click();
    await expect(accessRow.filter({ hasText: 'pending' }).first()).toBeVisible();
  }

  const familyContext = await browser.newContext({ baseURL: process.env.ABA_QA_BASE_URL ?? 'http://localhost:3000', viewport: testInfo.project.use.viewport });
  const familyPage = await familyContext.newPage();
  try {
    await signIn(familyPage, family);
    if (await accessRow.filter({ hasText: 'pending' }).count() > 0) {
      await familyPage.goto('/invitations');
      const invitation = familyPage.getByRole('row').filter({ hasText: personName });
      await expect(invitation).toBeVisible();
      await invitation.getByRole('button', { name: 'Aceptar' }).click();
      await expect(invitation).toHaveCount(0);
    }
    await page.getByRole('button', { name: 'Consultar estado vigente' }).click();
    await expect(accessRow.filter({ hasText: 'active' }).first()).toBeVisible();

    await familyPage.goto('/family');
    await expect(familyPage.getByRole('heading', { name: 'Portal Familiar' })).toBeVisible();
    if (appointmentAlreadyExists) await expect(familyPage.getByText(appointmentTitle, { exact: true })).toBeVisible();
    else await expect(familyPage.getByText(appointmentTitle, { exact: true })).toHaveCount(0);

    await page.goto('/calendar');
    await expect(page.getByRole('button', { name: 'Nueva cita' })).toBeEnabled();
    await page.getByRole('textbox', { name: 'Vista', exact: true }).click();
    await page.getByRole('option', { name: 'Listado', exact: true }).click();
    if (await page.getByText(appointmentTitle, { exact: true }).count() === 0) {
      await page.getByRole('button', { name: 'Nueva cita' }).click();
      const modal = page.getByRole('dialog', { name: 'Nueva cita' });
      await modal.getByRole('textbox', { name: 'Estudiante', exact: true }).click();
      await page.getByRole('option', { name: 'QA SINTETICO LOCAL A', exact: true }).click();
      await modal.getByRole('textbox', { name: 'Título', exact: true }).fill(appointmentTitle);
      await modal.getByRole('textbox', { name: 'Notas', exact: true }).fill('Cita familiar exclusivamente sintética para QA local');
      await modal.getByRole('textbox', { name: 'Inicio local', exact: true }).fill('2026-10-08T10:00');
      await modal.getByRole('textbox', { name: 'Fin local', exact: true }).fill('2026-10-08T11:00');
      await modal.getByRole('textbox', { name: 'Participantes', exact: true }).click();
      await page.getByRole('option', { name: `${personName} (familia)`, exact: true }).click();
      await modal.getByRole('textbox', { name: 'Participantes', exact: true }).press('Escape');
      await modal.getByRole('textbox', { name: 'Recordatorios: minutos antes, separados por coma' }).fill('60');
      await modal.getByRole('button', { name: 'Guardar', exact: true }).click();
      await expect(page.getByText('Cambio confirmado en la agenda.')).toBeVisible();
    }
    await expect(page.getByText(appointmentTitle, { exact: true })).toHaveCount(1);
    await familyPage.getByRole('button', { name: 'Actualizar portal' }).click();
    await expect(familyPage.getByText(appointmentTitle, { exact: true })).toBeVisible();
    await familyPage.reload();
    await expect(familyPage.getByText(appointmentTitle, { exact: true })).toBeVisible();

    await page.goto(`/students/${student.id}`);
    await page.getByRole('tab', { name: 'Familia y Contacto' }).click();
    await page.getByRole('button', { name: 'Consultar estado vigente' }).click();
    const currentRows = page.getByRole('heading', { name: 'Acceso al portal familiar' }).locator('xpath=ancestor::*[contains(@class,"mantine-Card-root")][1]').getByRole('row').filter({ hasText: personName });
    const current = currentRows.filter({ hasText: 'active' }).first();
    page.once('dialog', dialog => dialog.accept());
    await current.getByRole('button', { name: 'Revocar' }).click();
    await expect(currentRows.filter({ hasText: 'active' })).toHaveCount(0);
    await expect(currentRows.filter({ hasText: 'revoked' }).first()).toBeVisible();
    await familyPage.getByRole('button', { name: 'Actualizar portal' }).click();
    await expect(familyPage.getByText(appointmentTitle, { exact: true })).toHaveCount(0);
  } finally { await familyContext.close(); }
});

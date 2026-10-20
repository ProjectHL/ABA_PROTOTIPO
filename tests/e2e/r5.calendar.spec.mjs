import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { localStatus, state } from '../../scripts/local/write-env.mjs';

const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
const title = 'QA R5 CITA LOCAL 2155E99E';
const student = 'QA SINTETICO LOCAL A';
const manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));

test.skip(process.env.ABA_QA_CALENDAR_UI !== '1', 'Sólo QA local sintético autorizado');

async function signIn(page, label) {
  const account = manifest.accounts.find(row => row.label === label);
  if (account?.email !== `${label}.${batchId}@aba.example.test`) throw new Error('Identidad QA no coincide');
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL('http://localhost:3000/dashboard');
}

async function signOut(page) {
  await page.getByRole('button', { name: 'Menú de perfil' }).click();
  await page.getByRole('menuitem', { name: 'Cerrar Sesión' }).click();
  await expect(page).toHaveURL(/\/login$/);
}

async function listView(page) {
  await page.getByRole('textbox', { name: 'Vista', exact: true }).click();
  await page.getByRole('option', { name: 'Listado', exact: true }).click();
}

async function createSyntheticAppointment(page, appointmentTitle, day) {
  await page.getByRole('button', { name: 'Nueva cita' }).click();
  const modal = page.getByRole('dialog', { name: 'Nueva cita' });
  await expect(modal).toBeVisible();
  await modal.getByRole('textbox', { name: 'Estudiante', exact: true }).click();
  await page.getByRole('option', { name: student, exact: true }).click();
  await modal.getByRole('textbox', { name: 'Título', exact: true }).fill(appointmentTitle);
  await modal.getByRole('textbox', { name: 'Notas', exact: true }).fill('Cita exclusivamente sintética para QA local');
  await modal.getByRole('textbox', { name: 'Inicio local', exact: true }).fill(`${day}T10:00`);
  await modal.getByRole('textbox', { name: 'Fin local', exact: true }).fill(`${day}T11:00`);
  await modal.getByRole('textbox', { name: 'Participantes', exact: true }).click();
  await expect(page.getByRole('option').first()).toBeVisible();
  await page.getByRole('option').first().click();
  await modal.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByText('Cambio confirmado en la agenda.')).toBeVisible();
}

test('QA-010/013: cita sintética por Server Action, recarga y aislamiento de clínica', async ({ page }) => {
  expect(process.cwd().replaceAll('\\', '/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
  expect(localStatus().API_URL).toBe('http://127.0.0.1:54321');
  expect(manifest.batchId).toBe(batchId);
  expect(manifest.state).toBe('ready');

  await signIn(page, 'admin-a');
  await page.goto('/calendar');
  await expect(page.getByRole('heading', { name: 'Agenda', exact: true })).toBeVisible();
  await expect(page.getByText('No se pudo recuperar la agenda autorizada.')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Nueva cita' })).toBeEnabled();
  await listView(page);

  if (await page.getByText(title, { exact: true }).count() === 0) {
    await createSyntheticAppointment(page, title, '2026-10-05');
  }
  await expect(page.getByText(title, { exact: true })).toHaveCount(1);
  await page.reload();
  await listView(page);
  await expect(page.getByText(title, { exact: true })).toHaveCount(1);
  await signOut(page);

  await signIn(page, 'admin-b');
  await page.goto('/calendar');
  await expect(page.getByRole('heading', { name: 'Agenda', exact: true })).toBeVisible();
  await listView(page);
  await expect(page.getByText(title, { exact: true })).toHaveCount(0);
  await signOut(page);
});

test('QA-010: edición, reprogramación y cancelación sintéticas con persistencia', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Mutación única; móvil se valida en lectura y aislamiento');
  test.setTimeout(120000);
  const mutationTitle = 'QA R5 CITA MUTACIONES 2155E99E';
  await signIn(page, 'admin-a');
  await page.goto('/calendar');
  await expect(page.getByRole('button', { name: 'Nueva cita' })).toBeEnabled();
  await listView(page);
  await page.getByRole('checkbox', { name: 'Mostrar canceladas' }).check();
  const card = page.locator('.mantine-Card-root').filter({ hasText: mutationTitle });
  if (await card.count() === 0) await createSyntheticAppointment(page, mutationTitle, '2026-10-06');
  await expect(card).toHaveCount(1);

  if (await card.getByText('Programada', { exact: true }).count()) {
    if (await card.getByText('Nota sintética editada por QA', { exact: true }).count() === 0) {
      await card.getByRole('button', { name: 'Editar', exact: true }).click();
      const modal = page.getByRole('dialog', { name: 'Editar cita' });
      await modal.getByRole('textbox', { name: 'Notas', exact: true }).fill('Nota sintética editada por QA');
      await modal.getByRole('button', { name: 'Guardar', exact: true }).click();
      await expect(page.getByText('Cambio confirmado en la agenda.')).toBeVisible();
    }
    await expect(card.getByText('Nota sintética editada por QA', { exact: true })).toBeVisible();
    if (await card.getByText(/2026-10-07 10:00/).count() === 0) {
      await card.getByRole('button', { name: 'Reprogramar', exact: true }).click();
      const modal = page.getByRole('dialog', { name: 'Reprogramar cita' });
      await modal.getByRole('textbox', { name: 'Inicio local', exact: true }).fill('2026-10-07T10:00');
      await modal.getByRole('textbox', { name: 'Fin local', exact: true }).fill('2026-10-07T11:00');
      await modal.getByRole('button', { name: 'Guardar', exact: true }).click();
      await expect(page.getByText('Cambio confirmado en la agenda.')).toBeVisible();
    }
    await expect(card.getByText(/2026-10-07 10:00/)).toBeVisible();
    await card.getByRole('button', { name: 'Cancelar cita', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Cancelar cita' });
    await modal.getByRole('textbox', { name: 'Motivo de cancelación' }).fill('Cancelación sintética de QA');
    await modal.getByRole('checkbox', { name: 'Confirmo la cancelación del alcance seleccionado' }).check();
    await modal.getByRole('button', { name: 'Confirmar cancelación' }).click();
    await expect(page.getByText('Cambio confirmado en la agenda.')).toBeVisible();
  }
  await expect(card.getByText('Cancelada', { exact: true })).toBeVisible();
  await expect(card.getByText('Cancelación sintética de QA', { exact: true })).toBeVisible();
  await page.reload();
  await listView(page);
  await page.getByRole('checkbox', { name: 'Mostrar canceladas' }).check();
  await expect(card.getByText('Cancelada', { exact: true })).toBeVisible();
  await signOut(page);
});

test('QA-010: serie semanal sintética conserva tres ocurrencias tras recarga', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Creación única de serie; no duplicar en móvil');
  test.setTimeout(90000);
  const seriesTitle = 'QA R5 SERIE SEMANAL 2155E99E';
  await signIn(page, 'admin-a');
  await page.goto('/calendar');
  await expect(page.getByRole('button', { name: 'Nueva cita' })).toBeEnabled();
  await listView(page);
  if (await page.getByText(seriesTitle, { exact: true }).count() === 0) {
    await page.getByRole('button', { name: 'Nueva cita' }).click();
    const modal = page.getByRole('dialog', { name: 'Nueva cita' });
    await modal.getByRole('textbox', { name: 'Estudiante', exact: true }).click();
    await page.getByRole('option', { name: student, exact: true }).click();
    await modal.getByRole('textbox', { name: 'Título', exact: true }).fill(seriesTitle);
    await modal.getByRole('textbox', { name: 'Notas', exact: true }).fill('Serie exclusivamente sintética para QA local');
    await modal.getByRole('textbox', { name: 'Inicio local', exact: true }).fill('2026-10-12T10:00');
    await modal.getByRole('textbox', { name: 'Fin local', exact: true }).fill('2026-10-12T11:00');
    await modal.getByRole('textbox', { name: 'Participantes', exact: true }).click();
    await page.getByRole('option').first().click();
    await modal.getByRole('textbox', { name: 'Participantes', exact: true }).press('Escape');
    await modal.getByRole('checkbox', { name: 'Repetir semanalmente' }).check();
    // Mantine uses a readonly inner input; the visible wrapper takes clicks.
    await modal.locator('.mantine-MultiSelect-input').last().click();
    await page.getByRole('option', { name: 'Lunes', exact: true }).click();
    await modal.getByRole('textbox', { name: 'Días', exact: true }).press('Escape');
    await modal.getByRole('textbox', { name: 'Hasta (incluido)' }).fill('2026-10-26');
    await modal.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(page.getByText('Cambio confirmado en la agenda.')).toBeVisible();
  }
  await expect(page.getByText(seriesTitle, { exact: true })).toHaveCount(3);
  await page.reload();
  await listView(page);
  await expect(page.getByText(seriesTitle, { exact: true })).toHaveCount(3);
  await signOut(page);
});

test('QA-010: cita sintética vincula una sesión finalizada autorizada', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Vínculo único; no duplicar en móvil');
  test.setTimeout(90000);
  await signIn(page, 'admin-a');
  await page.goto('/calendar');
  await expect(page.getByRole('button', { name: 'Nueva cita' })).toBeEnabled();
  await listView(page);
  const card = page.locator('.mantine-Card-root').filter({ hasText: title });
  await expect(card).toHaveCount(1);
  if (await card.getByText('Sesión realizada vinculada').count() === 0) {
    await card.getByRole('button', { name: 'Vincular sesión' }).click();
    const modal = page.getByRole('dialog', { name: 'Vincular sesión realizada' });
    await expect(modal.getByRole('textbox', { name: 'Sesión finalizada' })).toBeEnabled();
    await modal.getByRole('textbox', { name: 'Sesión finalizada' }).click();
    await expect(page.getByRole('option').first()).toBeVisible();
    await page.getByRole('option').first().click();
    await modal.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(page.getByText('Cambio confirmado en la agenda.')).toBeVisible();
  }
  await expect(card.getByText('Sesión realizada vinculada')).toBeVisible();
  await page.reload();
  await listView(page);
  await expect(card.getByText('Sesión realizada vinculada')).toBeVisible();
  await signOut(page);
});

test('QA-010: excepción de una ocurrencia sobrevive la edición de la serie', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Mutación única de la serie sintética');
  test.setTimeout(90000);
  const seriesTitle = 'QA R5 SERIE SEMANAL 2155E99E';
  await signIn(page, 'admin-a');
  await page.goto('/calendar');
  await expect(page.getByRole('button', { name: 'Nueva cita' })).toBeEnabled();
  await listView(page);
  const rows = page.locator('.mantine-Card-root').filter({ hasText: seriesTitle });
  await expect(rows).toHaveCount(3);
  const first = rows.filter({ hasText: '2026-10-12 10:00' });
  const second = rows.filter({ hasText: '2026-10-19 10:00' });
  const third = rows.filter({ hasText: '2026-10-26 10:00' });

  if (await second.getByText('Excepción sintética lunes 19', { exact: true }).count() === 0) {
    await second.getByRole('button', { name: 'Editar', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Editar cita' });
    await expect(modal.getByRole('textbox', { name: 'Aplicar a' })).toHaveValue('Solo esta ocurrencia');
    await modal.getByRole('textbox', { name: 'Notas', exact: true }).fill('Excepción sintética lunes 19');
    await modal.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(page.getByText('Cambio confirmado en la agenda.')).toBeVisible();
  }
  await expect(second.getByText('Excepción sintética lunes 19', { exact: true })).toBeVisible();

  if (await first.getByText('Serie base revisada QA', { exact: true }).count() === 0) {
    await first.getByRole('button', { name: 'Editar', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Editar cita' });
    await modal.getByRole('textbox', { name: 'Aplicar a' }).click();
    await page.getByRole('option', { name: 'Toda la serie (conserva excepciones)' }).click();
    await modal.getByRole('textbox', { name: 'Notas', exact: true }).fill('Serie base revisada QA');
    await modal.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(page.getByText('Cambio confirmado en la agenda.')).toBeVisible();
  }
  await expect(rows).toHaveCount(3);
  await expect(first.getByText('Serie base revisada QA', { exact: true })).toBeVisible();
  await expect(third.getByText('Serie base revisada QA', { exact: true })).toBeVisible();
  await expect(second.getByText('Excepción sintética lunes 19', { exact: true })).toBeVisible();
  await page.reload();
  await listView(page);
  await expect(rows).toHaveCount(3);
  await expect(second.getByText('Excepción sintética lunes 19', { exact: true })).toBeVisible();
  await signOut(page);
});

test('QA-010: UI rechaza hora inexistente y exige elegir ocurrencia ambigua', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Creación única de cita DST sintética');
  test.setTimeout(90000);
  const dstTitle = 'QA R5 HORA AMBIGUA 2155E99E';
  await signIn(page, 'admin-a');
  await page.goto('/calendar');
  await expect(page.getByRole('button', { name: 'Nueva cita' })).toBeEnabled();
  await listView(page);
  if (await page.getByText(dstTitle, { exact: true }).count() === 0) {
    await page.getByRole('button', { name: 'Nueva cita' }).click();
    const modal = page.getByRole('dialog', { name: 'Nueva cita' });
    await modal.getByRole('textbox', { name: 'Estudiante', exact: true }).click();
    await page.getByRole('option', { name: student, exact: true }).click();
    await modal.getByRole('textbox', { name: 'Título', exact: true }).fill(dstTitle);
    await modal.getByRole('textbox', { name: 'Inicio local', exact: true }).fill('2026-09-06T00:30');
    await modal.getByRole('textbox', { name: 'Fin local', exact: true }).fill('2026-09-06T01:30');
    await modal.getByRole('textbox', { name: 'Participantes', exact: true }).click();
    await page.getByRole('option').first().click();
    await modal.getByRole('textbox', { name: 'Participantes', exact: true }).press('Escape');
    await modal.getByRole('textbox', { name: 'Recordatorios: minutos antes, separados por coma' }).fill('');
    await modal.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(modal.getByText('Esta hora no existe por el cambio horario. Elige otra hora.')).toBeVisible();

    await modal.getByRole('textbox', { name: 'Inicio local', exact: true }).fill('2026-04-04T23:30');
    await modal.getByRole('textbox', { name: 'Fin local', exact: true }).fill('2026-04-05T00:30');
    await modal.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(modal.getByText('Esta hora ocurre dos veces. Selecciona la primera o la última.')).toBeVisible();

    await modal.getByRole('textbox', { name: 'Si la hora se repite por cambio horario' }).click();
    await page.getByRole('option', { name: 'Primera ocurrencia' }).click();
    await modal.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(page.getByText('Cambio confirmado en la agenda.')).toBeVisible();
  }
  await expect(page.getByText(dstTitle, { exact: true })).toHaveCount(1);
  await page.reload();
  await listView(page);
  await expect(page.getByText(dstTitle, { exact: true })).toHaveCount(1);
  await signOut(page);
});

// Reads use the ordinary authenticated boundary; every mutation remains a real UI action.
async function readSyntheticCalendar() {
  const status = localStatus();
  expect(status.API_URL).toBe('http://127.0.0.1:54321');
  expect(manifest.batchId).toBe(batchId);
  expect(manifest.state).toBe('ready');
  const account = manifest.accounts.find(row => row.label === 'admin-a');
  if (account?.email !== `admin-a.${batchId}@aba.example.test`) throw new Error('Identidad QA no coincide');
  const client = createClient(status.API_URL, status.ANON_KEY ?? status.PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const login = await client.auth.signInWithPassword({ email: account.email, password: account.password });
    if (login.error || login.data.user?.id !== account.userId || login.data.user.app_metadata.aba_fixture_batch !== batchId) {
      throw new Error('Admin sintético no verificado');
    }
    const result = await client.rpc('aba_calendar_read_v2', { p_organization_id: manifest.clinics.A });
    if (result.error || !result.data?.appointments) throw new Error('Lectura de agenda sintética no confirmada');
    return result.data.appointments;
  } finally { await client.auth.signOut({ scope: 'local' }); }
}

async function openSyntheticTimeForm(page, appointmentTitle, startsAt, endsAt) {
  await page.getByRole('button', { name: 'Nueva cita' }).click();
  const modal = page.getByRole('dialog', { name: 'Nueva cita' });
  await expect(modal).toBeVisible();
  await modal.getByRole('textbox', { name: 'Estudiante', exact: true }).click();
  await page.getByRole('option', { name: student, exact: true }).click();
  await modal.getByRole('textbox', { name: 'Título', exact: true }).fill(appointmentTitle);
  await modal.getByRole('textbox', { name: 'Notas', exact: true }).fill('Horario exclusivamente sintético para QA local');
  await modal.getByRole('textbox', { name: 'Inicio local', exact: true }).fill(startsAt);
  await modal.getByRole('textbox', { name: 'Fin local', exact: true }).fill(endsAt);
  await expect(modal.getByRole('textbox', { name: 'Zona horaria', exact: true })).toHaveValue('America/Santiago');
  await modal.getByRole('textbox', { name: 'Participantes', exact: true }).click();
  await page.getByRole('option').first().click();
  await modal.getByRole('textbox', { name: 'Participantes', exact: true }).press('Escape');
  // Historical/time-boundary fixtures must not dispatch notifications.
  await modal.getByRole('textbox', { name: 'Recordatorios: minutos antes, separados por coma' }).fill('');
  return modal;
}

async function expectSyntheticTimePersistence(appointmentTitle, startsAt, endsAt) {
  const matches = (await readSyntheticCalendar()).filter(row => row.title === appointmentTitle);
  expect(matches).toHaveLength(1);
  const [appointment] = matches;
  expect(appointment.clinicId).toBe(manifest.clinics.A);
  expect(appointment.timeZone).toBe('America/Santiago');
  expect(appointment.status).toBe('scheduled');
  expect(appointment.version).toBe(1);
  expect(appointment.recurrence).toBeNull();
  expect(appointment.reminders).toHaveLength(0);
  expect(new Date(appointment.startsAt).toISOString()).toBe(startsAt);
  expect(new Date(appointment.endsAt).toISOString()).toBe(endsAt);
  return appointment;
}

test('QA-010: última ocurrencia DST conserva el instante elegido tras recarga', async ({ page }, testInfo) => {
  test.skip(process.env.ABA_QA_CALENDAR_TIME_UI !== '1', 'Variantes horarias sintéticas explícitas');
  test.setTimeout(120000);
  const laterTitle = 'QA R5 HORA AMBIGUA ULTIMA 2155E99E';
  const existing = (await readSyntheticCalendar()).filter(row => row.title === laterTitle);
  expect(existing.length).toBeLessThanOrEqual(1);
  if (testInfo.project.name === 'mobile') expect(existing).toHaveLength(1);
  await signIn(page, 'admin-a');
  await page.goto('/calendar');
  await expect(page.getByRole('button', { name: 'Nueva cita' })).toBeEnabled();
  await listView(page);
  if (existing.length === 0) {
    const modal = await openSyntheticTimeForm(page, laterTitle, '2026-04-04T23:30', '2026-04-05T00:30');
    await modal.getByRole('textbox', { name: 'Si la hora se repite por cambio horario' }).click();
    await page.getByRole('option', { name: 'Última ocurrencia', exact: true }).click();
    await modal.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(modal).toHaveCount(0);
    await expect(page.getByText('Cambio confirmado en la agenda.')).toBeVisible();
  }
  const card = page.locator('.mantine-Card-root').filter({ hasText: laterTitle });
  await expect(card).toHaveCount(1);
  await expect(card.getByText('2026-04-04 23:30 – 2026-04-05 00:30 · America/Santiago', { exact: true })).toBeVisible();
  const persisted = await expectSyntheticTimePersistence(laterTitle, '2026-04-05T03:30:00.000Z', '2026-04-05T04:30:00.000Z');
  await page.reload();
  await listView(page);
  await expect(card).toHaveCount(1);
  await expect(card.getByText('2026-04-04 23:30 – 2026-04-05 00:30 · America/Santiago', { exact: true })).toBeVisible();
  expect((await expectSyntheticTimePersistence(laterTitle, '2026-04-05T03:30:00.000Z', '2026-04-05T04:30:00.000Z')).id).toBe(persisted.id);
  await signOut(page);
});

test('QA-010: fin igual o anterior al inicio se rechaza sin persistir cita', async ({ page }) => {
  test.skip(process.env.ABA_QA_CALENDAR_TIME_UI !== '1', 'Variantes horarias sintéticas explícitas');
  test.setTimeout(120000);
  const invalidTitle = 'QA R5 FIN INVALIDO 2155E99E';
  expect((await readSyntheticCalendar()).filter(row => row.title === invalidTitle)).toHaveLength(0);
  await signIn(page, 'admin-a');
  await page.goto('/calendar');
  await expect(page.getByRole('button', { name: 'Nueva cita' })).toBeEnabled();
  await listView(page);
  const modal = await openSyntheticTimeForm(page, invalidTitle, '2026-10-08T10:00', '2026-10-08T10:00');
  for (const invalidEnd of ['2026-10-08T10:00', '2026-10-08T09:59']) {
    await modal.getByRole('textbox', { name: 'Fin local', exact: true }).fill(invalidEnd);
    await modal.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(modal.getByText('Fin debe ser posterior al inicio', { exact: false })).toBeVisible();
    await expect(modal).toBeVisible();
    await expect(page.getByText('Cambio confirmado en la agenda.')).toHaveCount(0);
    expect((await readSyntheticCalendar()).filter(row => row.title === invalidTitle)).toHaveLength(0);
  }
  await page.reload();
  await listView(page);
  await expect(page.getByText(invalidTitle, { exact: true })).toHaveCount(0);
  expect((await readSyntheticCalendar()).filter(row => row.title === invalidTitle)).toHaveLength(0);
  await signOut(page);
});

test('QA-010: cruce de medianoche conserva fecha, duración y zona tras recarga', async ({ page }, testInfo) => {
  test.skip(process.env.ABA_QA_CALENDAR_TIME_UI !== '1', 'Variantes horarias sintéticas explícitas');
  test.setTimeout(120000);
  const midnightTitle = 'QA R5 CRUCE MEDIANOCHE 2155E99E';
  const existing = (await readSyntheticCalendar()).filter(row => row.title === midnightTitle);
  expect(existing.length).toBeLessThanOrEqual(1);
  if (testInfo.project.name === 'mobile') expect(existing).toHaveLength(1);
  await signIn(page, 'admin-a');
  await page.goto('/calendar');
  await expect(page.getByRole('button', { name: 'Nueva cita' })).toBeEnabled();
  await listView(page);
  if (existing.length === 0) {
    const modal = await openSyntheticTimeForm(page, midnightTitle, '2026-10-08T23:30', '2026-10-09T00:30');
    await modal.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(modal).toHaveCount(0);
    await expect(page.getByText('Cambio confirmado en la agenda.')).toBeVisible();
  }
  const card = page.locator('.mantine-Card-root').filter({ hasText: midnightTitle });
  await expect(card).toHaveCount(1);
  await expect(card.getByText('2026-10-08 23:30 – 2026-10-09 00:30 · America/Santiago', { exact: true })).toBeVisible();
  const persisted = await expectSyntheticTimePersistence(midnightTitle, '2026-10-09T02:30:00.000Z', '2026-10-09T03:30:00.000Z');
  expect(Date.parse(persisted.endsAt) - Date.parse(persisted.startsAt)).toBe(60 * 60 * 1000);
  await page.reload();
  await listView(page);
  await expect(card.getByText('2026-10-08 23:30 – 2026-10-09 00:30 · America/Santiago', { exact: true })).toBeVisible();
  expect((await expectSyntheticTimePersistence(midnightTitle, '2026-10-09T02:30:00.000Z', '2026-10-09T03:30:00.000Z')).id).toBe(persisted.id);
  await signOut(page);
});
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import { localStatus, state } from '../../scripts/local/write-env.mjs';

test.skip(process.env.ABA_QA_LOCAL_UI !== '1' || process.env.ABA_QA_CALENDAR_PARTICIPANTS_UI !== '1', 'Participantes de agenda sintética local explícitos');
test.use({ actionTimeout: 15000 });
const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
const baseURL = process.env.ABA_QA_BASE_URL ?? 'http://localhost:3001';

async function signIn(page, account) {
  await page.goto('/login');
  try {
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(account.password);
  } catch { throw new Error('Formulario sintético no disponible; valores omitidos'); }
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function listView(page) {
  await page.getByRole('textbox', { name: 'Vista', exact: true }).click();
  await page.getByRole('option', { name: 'Listado', exact: true }).click();
}

async function readCalendar(client, clinicId, actorId) {
  const result = await client.rpc('aba_calendar_read_v2', { p_organization_id: clinicId });
  if (result.error || !result.data) throw new Error('Lectura de agenda autorizada no confirmada');
  expect(result.data.actorId).toBe(actorId);
  expect(result.data.clinicId).toBe(clinicId);
  return result.data;
}

const participantIds = appointment => appointment.participants.map(row => row.kind === 'professional' ? row.userId : 'family:' + row.personId).sort();

test('QA-010/013: supervisor y técnico participan, retiro persiste y clínica B no accede', async ({ page, browser, request }, testInfo) => {
  test.setTimeout(180000);
  expect(process.cwd().replaceAll('\\', '/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
  expect(baseURL).toBe('http://localhost:3001');
  const status = localStatus();
  expect(status.API_URL).toBe('http://127.0.0.1:54321');
  expect((await request.get(`${baseURL}/api/health`)).status()).toBe(200);
  const manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));
  expect(manifest.batchId).toBe(batchId);
  expect(manifest.state).toBe('ready');
  expect(manifest.apiUrl).toBe(status.API_URL);
  const accountFor = label => {
    const account = manifest.accounts.find(row => row.label === label);
    if (account?.email !== `${label}.${batchId}@aba.example.test`) throw new Error('Identidad sintética incorrecta');
    return account;
  };
  const admin = accountFor('admin-a');
  const foreignAdmin = accountFor('admin-b');
  const supervisor = accountFor('supervisor-a');
  const technician = accountFor('tecnico-a');
  const foreignAccounts = ['admin-b', 'supervisor-b', 'tecnico-b'].map(accountFor);
  const clients = [];
  let foreignContext;
  try {
    for (const account of [admin, foreignAdmin]) {
      const client = createClient(status.API_URL, status.ANON_KEY ?? status.PUBLISHABLE_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } });
      clients.push(client);
      const login = await client.auth.signInWithPassword({ email: account.email, password: account.password });
      if (login.error || login.data.user?.id !== account.userId || login.data.user.app_metadata.aba_fixture_batch !== batchId) throw new Error('Actor sintético no verificado');
    }
    const [adminClient, foreignClient] = clients;
    const before = await readCalendar(adminClient, manifest.clinics.A, admin.userId);
    const beforeB = await readCalendar(foreignClient, manifest.clinics.B, foreignAdmin.userId);
    const studentMatches = before.students.filter(row => row.id === 'b347646e-ff29-450b-aedf-9f9c015fb41a' && row.displayName === 'QA SINTETICO LOCAL A');
    expect(studentMatches).toHaveLength(1);
    const student = studentMatches[0];
    const detail = await adminClient.rpc('aba_student_detail_v2', { p_organization_id: manifest.clinics.A, p_client_id: student.id });
    if (detail.error || detail.data?.clinicalId !== 'QA-R5-A-2155E99E') throw new Error('Ficha sintética no confirmada');
    const professionalFor = account => {
      const rows = before.professionals.filter(row => row.userId === account.userId && row.kind === 'professional');
      expect(rows).toHaveLength(1);
      // UI labels are provided by the authorized calendar DTO, never guessed from account names.
      expect(before.professionals.filter(row => row.label === rows[0].label)).toHaveLength(1);
      return rows[0];
    };
    const supervisorOption = professionalFor(supervisor);
    const technicianOption = professionalFor(technician);
    const foreignOptions = foreignAccounts.map(account => {
      const rows = beforeB.professionals.filter(row => row.userId === account.userId);
      expect(rows).toHaveLength(1);
      expect(before.professionals.some(row => row.userId === account.userId)).toBe(false);
      return rows[0];
    });
    const appointmentTitle = `QA R5 PARTICIPANTES ${testInfo.project.name.toUpperCase()} ${Date.now()}`;
    expect(before.appointments.filter(row => row.title === appointmentTitle)).toHaveLength(0);
    const readOwn = async expectedVersion => {
      const data = await readCalendar(adminClient, manifest.clinics.A, admin.userId);
      const rows = data.appointments.filter(row => row.title === appointmentTitle);
      expect(rows).toHaveLength(1);
      const appointment = rows[0];
      expect(appointment.studentId).toBe(student.id);
      expect(appointment.clinicId).toBe(manifest.clinics.A);
      expect(appointment.status).toBe('scheduled');
      expect(appointment.version).toBe(expectedVersion);
      expect(appointment.reminders).toEqual([]);
      expect(appointment.recurrence).toBeNull();
      expect(appointment.linkedSessionId).toBeNull();
      return appointment;
    };
    await signIn(page, admin);
    await page.goto('/calendar');
    await expect(page.getByRole('button', { name: 'Nueva cita', exact: true })).toBeEnabled();
    await listView(page);
    await page.getByRole('button', { name: 'Nueva cita', exact: true }).click();
    const createModal = page.getByRole('dialog', { name: 'Nueva cita', exact: true });
    await createModal.getByRole('textbox', { name: 'Estudiante', exact: true }).click();
    await page.getByRole('option', { name: student.displayName, exact: true }).click();
    await createModal.getByRole('textbox', { name: 'Título', exact: true }).fill(appointmentTitle);
    await createModal.getByRole('textbox', { name: 'Notas', exact: true }).fill('Participantes exclusivamente sintéticos; no enlazar ni modificar sesiones');
    await createModal.getByRole('textbox', { name: 'Inicio local', exact: true }).fill('2026-10-15T10:00');
    await createModal.getByRole('textbox', { name: 'Fin local', exact: true }).fill('2026-10-15T11:00');
    await createModal.getByRole('textbox', { name: 'Recordatorios: minutos antes, separados por coma' }).fill('');
    const participants = createModal.getByRole('textbox', { name: 'Participantes', exact: true });
    await participants.click();
    for (const foreign of foreignOptions) await expect(page.getByRole('option', { name: foreign.label, exact: true })).toHaveCount(0);
    await page.getByRole('option', { name: supervisorOption.label, exact: true }).click();
    await participants.click();
    await page.getByRole('option', { name: technicianOption.label, exact: true }).click();
    await participants.press('Escape');
    await createModal.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(createModal).toHaveCount(0);
    await expect(page.getByText('Cambio confirmado en la agenda.', { exact: true })).toBeVisible();
    const created = await readOwn(1);
    expect(participantIds(created)).toEqual([supervisor.userId, technician.userId].sort());
    await page.reload();
    await expect(page.getByRole('button', { name: 'Nueva cita', exact: true })).toBeEnabled();
    await listView(page);
    const card = page.locator('.mantine-Card-root').filter({ has: page.getByText(appointmentTitle, { exact: true }) });
    await expect(card).toHaveCount(1);
    await expect(card.getByText(created.participants.map(row => row.label).join(', '), { exact: true })).toBeVisible();
    expect((await readOwn(1)).id).toBe(created.id);
    await card.getByRole('button', { name: 'Editar', exact: true }).click();
    const editModal = page.getByRole('dialog', { name: 'Editar cita', exact: true });
    const technicianPill = editModal.locator('.mantine-Pill-root').filter({ hasText: technicianOption.label });
    await expect(technicianPill).toHaveCount(1);
    await technicianPill.locator('button').click();
    await expect(technicianPill).toHaveCount(0);
    await editModal.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(editModal).toHaveCount(0);
    const updated = await readOwn(2);
    expect(updated.id).toBe(created.id);
    expect(participantIds(updated)).toEqual([supervisor.userId]);
    expect(updated.startsAt).toBe(created.startsAt);
    expect(updated.endsAt).toBe(created.endsAt);
    expect(updated.timeZone).toBe(created.timeZone);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Nueva cita', exact: true })).toBeEnabled();
    await listView(page);
    await expect(card).toHaveCount(1);
    await expect(card.getByText(supervisorOption.label, { exact: true })).toBeVisible();
    await expect(card.getByText(technicianOption.label, { exact: true })).toHaveCount(0);
    expect((await readOwn(2)).id).toBe(created.id);

    const forbiddenA = await foreignClient.rpc('aba_calendar_read_v2', { p_organization_id: manifest.clinics.A });
    expect(forbiddenA.error?.code).toBe('42501');
    const forbiddenB = await adminClient.rpc('aba_calendar_read_v2', { p_organization_id: manifest.clinics.B });
    expect(forbiddenB.error?.code).toBe('42501');
    expect((await readCalendar(foreignClient, manifest.clinics.B, foreignAdmin.userId)).appointments.some(row => row.id === created.id)).toBe(false);
    foreignContext = await browser.newContext({ baseURL, viewport: testInfo.project.use.viewport,
      isMobile: testInfo.project.name === 'mobile', hasTouch: testInfo.project.name === 'mobile' });
    const foreignPage = await foreignContext.newPage();
    await signIn(foreignPage, foreignAdmin);
    await foreignPage.goto('/calendar');
    await expect(foreignPage.getByRole('button', { name: 'Nueva cita', exact: true })).toBeEnabled();
    await listView(foreignPage);
    await expect(foreignPage.getByText(appointmentTitle, { exact: true })).toHaveCount(0);
    const after = await readCalendar(adminClient, manifest.clinics.A, admin.userId);
    expect(after.appointments.filter(row => !before.appointments.some(previous => previous.id === row.id)).map(row => row.id)).toEqual([created.id]);
    for (const previous of before.appointments) {
      const current = after.appointments.find(row => row.id === previous.id);
      expect(current).toBeDefined();
      expect(current.version).toBe(previous.version);
      expect(current.status).toBe(previous.status);
      expect(current.participants).toEqual(previous.participants);
      expect(current.startsAt).toBe(previous.startsAt);
      expect(current.endsAt).toBe(previous.endsAt);
    }
    // Family visibility/revocation is covered by r5.family-calendar; this flow creates no
    // family links or people and never reactivates another fixture's revoked access.
  } finally {
    if (foreignContext) await foreignContext.close();
    for (const client of clients) await client.auth.signOut({ scope: 'local' });
  }
});
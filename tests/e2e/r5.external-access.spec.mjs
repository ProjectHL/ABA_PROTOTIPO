import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import { localStatus, state } from '../../scripts/local/write-env.mjs';

test.skip(process.env.ABA_QA_LOCAL_UI !== '1' || process.env.ABA_QA_EXTERNAL_UI !== '1', 'Colaboración externa sintética local explícita');
test.use({ actionTimeout: 15000 });
const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
const clinicalId = 'QA-R5-A-2155E99E';
const baseURL = process.env.ABA_QA_BASE_URL ?? 'http://localhost:3000';

async function signIn(page, account) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function checkedRpc(client, name, args) {
  const result = await client.rpc(name, args);
  if (result.error) throw new Error(`Lectura QA no confirmada: ${name}`);
  return result.data;
}

async function verifyNoMembership(client, account) {
  const result = await client.from('memberships').select('organization_id').eq('user_id', account.userId);
  if (result.error) throw new Error('Lectura de membresías propias no confirmada');
  expect(result.data).toEqual([]);
}

async function invitationRow(page, invitation, status) {
  // Names change from initials to full name after acceptance; identify the immutable message.
  const rows = page.getByRole('row').filter({ hasText: invitation.recipientEmail })
    .filter({ has: page.getByText(status, { exact: true }) });
  await expect.poll(async () => rows.count()).toBeGreaterThan(0);
  const matching = [];
  for (let index = 0; index < await rows.count(); index += 1) {
    const row = rows.nth(index);
    await row.getByRole('button', { name: 'Ver detalle', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Detalle de invitación' });
    await expect(modal).toBeVisible();
    const matchesMessage = await modal.getByText(invitation.message, { exact: true }).count() === 1;
    await modal.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await expect(modal).toHaveCount(0);
    if (matchesMessage) matching.push(index);
  }
  if (matching.length !== 1) throw new Error('Invitación QA no identificada de forma única por mensaje exacto');
  return rows.nth(matching[0]);
}

async function openReceived(page, invitation, status) {
  await page.goto('/shared-access');
  await expect(page.getByRole('heading', { name: 'Accesos compartidos', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: /^Recibidas/ }).click();
  return invitationRow(page, invitation, status);
}

async function assertDetailMessage(page, row, message) {
  await row.getByRole('button', { name: 'Ver detalle', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Detalle de invitación' });
  await expect(modal.getByText(message, { exact: true })).toBeVisible();
  await modal.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await expect(modal).toHaveCount(0);
}

async function assertRouteUnavailable(page, studentId) {
  await page.goto(`/students/${studentId}`);
  await expect(page.getByRole('textbox', { name: 'Nombre completo', exact: true })).toHaveCount(0);
  // After revocation the active clinic can also disappear; both states must deny the detail.
  await expect(page.getByText(/No existe o no tienes acceso vigente a esta carpeta\.|No se pudieron cargar las fichas|Selecciona una clínica/).first()).toBeVisible();
}

test('QA-008/013: externo acepta acceso por ficha, cambia nivel y pierde acceso al revocar; rechazo separado', async ({ page, browser, request }, testInfo) => {
  test.setTimeout(240000);
  expect(process.cwd().replaceAll('\\', '/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
  const status = localStatus();
  expect(status.API_URL).toBe('http://127.0.0.1:54321');
  expect((await request.get('/api/health')).status()).toBe(200);
  const manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));
  expect(manifest.state).toBe('ready');
  expect(manifest.batchId).toBe(batchId);
  expect(manifest.apiUrl).toBe(status.API_URL);
  const admin = manifest.accounts.find(row => row.label === 'admin-a');
  const external = manifest.accounts.find(row => row.label === 'externo');
  if (admin?.email !== `admin-a.${batchId}@aba.example.test` || external?.email !== `externo.${batchId}@aba.example.test`) {
    throw new Error('Identidades sintéticas incorrectas');
  }
  const makeClient = () => createClient(status.API_URL, status.ANON_KEY ?? status.PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } });
  const adminClient = makeClient();
  const externalClient = makeClient();
  const externalContext = await browser.newContext({ baseURL, viewport: testInfo.project.use.viewport,
    isMobile: testInfo.project.name === 'mobile', hasTouch: testInfo.project.name === 'mobile' });
  const externalPage = await externalContext.newPage();
  try {
    for (const [client, account] of [[adminClient, admin], [externalClient, external]]) {
      const login = await client.auth.signInWithPassword({ email: account.email, password: account.password });
      if (login.error || login.data.user?.id !== account.userId || login.data.user.app_metadata.aba_fixture_batch !== batchId) {
        throw new Error('Actor sintético no verificado');
      }
    }
    await verifyNoMembership(externalClient, external);
    const students = await checkedRpc(adminClient, 'aba_list_students_v2', { p_organization_id: manifest.clinics.A });
    const matches = students.filter(row => row.clinicalId === clinicalId);
    expect(matches).toHaveLength(1);
    const student = matches[0];
    expect(student.clinicId).toBe(manifest.clinics.A);
    expect(student.capabilities).toContain('authorization.decide');
    const detailArgs = { p_organization_id: manifest.clinics.A, p_client_id: student.id };
    const readInvitations = async () => {
      const data = await checkedRpc(adminClient, 'aba_student_share_read_v2', { p_organization_id: manifest.clinics.A });
      expect(data.actorId).toBe(admin.userId);
      return data.invitations.filter(row => row.studentId === student.id && row.recipientEmail === external.email);
    };
    // Only the accepted invitation owned by this exact QA project may be resumed.
    // Other pending/active grants remain untouched and block the scenario.
    const unfinished = (await readInvitations()).filter(row => ['pending', 'accepted'].includes(row.status));
    const resumable = unfinished.filter(row => row.status === 'accepted'
      && ((row.level === 'full-read' && row.version === 2) || (row.level === 'clinical-edit' && row.version === 3))
      && row.invitedBy === admin.userId && row.acceptedBy === external.userId
      && row.clinicId === manifest.clinics.A && row.studentId === student.id
      && row.message.startsWith('QA R5 EXTERNO ACEPTAR ' + testInfo.project.name + ' ')
      && /^\d+$/.test(row.message.slice(('QA R5 EXTERNO ACEPTAR ' + testInfo.project.name + ' ').length)));
    const resumed = unfinished.length === 1 && resumable.length === 1 ? resumable[0] : null;
    if (unfinished.length && !resumed) throw new Error('Existe acceso externo ajeno/no reanudable; conservarlo y revisar su propietario');
    if (!resumed) {
      expect(await checkedRpc(externalClient, 'aba_student_detail_v2', detailArgs)).toBeNull();
      const initialIdentity = await checkedRpc(externalClient, 'aba_identity_context', { p_organization_id: null });
      expect(initialIdentity.choices).toEqual([]);
    }
    await signIn(page, admin);
    await signIn(externalPage, external);
    const suffix = resumed ? resumed.message.slice('QA R5 EXTERNO ACEPTAR '.length) : `${testInfo.project.name} ${Date.now()}`;

    const invite = async message => {
      await page.goto('/shared-access');
      await expect(page.getByRole('heading', { name: 'Accesos compartidos', exact: true })).toBeVisible();
      await page.getByRole('tab', { name: /^Compartir/ }).click();
      const studentRow = page.getByRole('row').filter({ hasText: clinicalId });
      await expect(studentRow).toHaveCount(1);
      await studentRow.getByRole('button', { name: 'Compartir', exact: true }).click();
      const modal = page.getByRole('dialog', { name: /^Compartir carpeta de/ });
      await modal.getByRole('textbox', { name: 'Correo del profesional', exact: true }).fill(external.email);
      await modal.getByRole('textbox', { name: 'Nivel de acceso', exact: true }).click();
      await page.getByRole('option', { name: 'Lectura clínica completa', exact: true }).click();
      await modal.getByRole('textbox', { name: 'Mensaje', exact: true }).fill(message);
      await modal.getByRole('button', { name: 'Enviar invitación', exact: true }).click();
      await expect(modal).toHaveCount(0);
      await expect(page.getByText('Invitación confirmada', { exact: true })).toBeVisible();
      const matching = (await readInvitations()).filter(row => row.message === message);
      expect(matching).toHaveLength(1);
      expect(matching[0].status).toBe('pending');
      expect(matching[0].acceptedBy).toBeNull();
      return matching[0];
    };

    const message = resumed?.message ?? `QA R5 EXTERNO ACEPTAR ${suffix}`;
    const invitation = resumed ?? await invite(message);
    const invitedVersion = resumed ? invitation.version - (invitation.level === 'clinical-edit' ? 2 : 1) : invitation.version;
    const resumedAfterLevel = resumed?.level === 'clinical-edit';
    if (!resumed) expect(await checkedRpc(externalClient, 'aba_student_detail_v2', detailArgs)).toBeNull();
    const externalInbox = await checkedRpc(externalClient, 'aba_student_share_read_v2', { p_organization_id: null });
    const receivedInvitation = externalInbox.invitations.find(row => row.id === invitation.id);
    expect(receivedInvitation).toBeDefined();
    expect(receivedInvitation.message).toBe(message);
    let received = await openReceived(externalPage, receivedInvitation, resumed ? 'accepted' : 'pending');
    await assertDetailMessage(externalPage, received, message);
    if (!resumed) {
      await received.getByRole('button', { name: 'Aceptar', exact: true }).click();
      await expect(externalPage.getByText('Invitación aceptada', { exact: true })).toBeVisible();
      // Accepting creates an external clinic choice and remounts the scoped screen.
      received = await openReceived(externalPage, receivedInvitation, 'accepted');
    }
    await received.getByRole('button', { name: 'Abrir ficha', exact: true }).click();
    await expect(externalPage).toHaveURL(new RegExp(`/students/${student.id}$`));
    await expect(externalPage.getByRole('textbox', { name: 'Nombre completo', exact: true })).toHaveValue('QA SINTETICO LOCAL A');
    if (!resumedAfterLevel) {
      await expect(externalPage.getByRole('textbox', { name: 'Nombre completo', exact: true })).toBeDisabled();
      await expect(externalPage.getByRole('button', { name: 'Iniciar sesión', exact: true })).toBeDisabled();
    }
    const readOnly = await checkedRpc(externalClient, 'aba_student_detail_v2', detailArgs);
    expect(readOnly.id).toBe(student.id);
    expect(readOnly.capabilities).toContain('student.view');
    if (resumedAfterLevel) expect(readOnly.capabilities).toContain('student.edit');
    else expect(readOnly.capabilities).not.toContain('student.edit');
    await verifyNoMembership(externalClient, external);
    const identity = await checkedRpc(externalClient, 'aba_identity_context', { p_organization_id: manifest.clinics.A });
    expect(identity.active?.role).toBe('external');
    expect(identity.choices.every(choice => choice.role === 'external')).toBe(true);
    for (const clinic of [manifest.clinics.A, manifest.clinics.B]) {
      const team = await externalClient.rpc('aba_team', { p_organization_id: clinic });
      expect(team.error?.code).toBe('42501');
    }
    const foreignStudents = await checkedRpc(adminClient, 'aba_list_students_v2', { p_organization_id: manifest.clinics.A });
    const unshared = foreignStudents.find(row => row.id !== student.id);
    if (unshared) expect(await checkedRpc(externalClient, 'aba_student_detail_v2', { ...detailArgs, p_client_id: unshared.id })).toBeNull();

    await page.goto('/shared-access');
    await page.getByRole('tab', { name: /^Activas/ }).click();
    const activeRow = await invitationRow(page, invitation, 'accepted');
    await expect(activeRow).toHaveCount(1);
    await assertDetailMessage(page, activeRow, message);
    if (!resumedAfterLevel) {
      await activeRow.getByRole('button', { name: 'Cambiar nivel', exact: true }).click();
      const levelModal = page.getByRole('dialog', { name: 'Cambiar nivel de acceso', exact: true });
      await levelModal.getByRole('textbox').click();
      await page.getByRole('option', { name: 'Edición clínica de esta ficha', exact: true }).click();
      await levelModal.getByRole('button', { name: 'Guardar', exact: true }).click();
      await expect(levelModal).toHaveCount(0);
    }
    await expect(activeRow.getByText('Edición clínica', { exact: true })).toBeVisible();
    const editable = await checkedRpc(externalClient, 'aba_student_detail_v2', detailArgs);
    expect(editable.capabilities).toContain('student.edit');
    expect(editable.capabilities).toContain('record.capture');
    await externalPage.reload();
    await expect(externalPage.getByRole('textbox', { name: 'Nombre completo', exact: true })).toBeEnabled();
    await expect(externalPage.getByRole('button', { name: 'Iniciar sesión', exact: true })).toBeEnabled();
    await verifyNoMembership(externalClient, external);
    const granted = (await readInvitations()).find(row => row.id === invitation.id);
    expect(granted.message).toBe(message);
    expect(granted.status).toBe('accepted');
    expect(granted.level).toBe('clinical-edit');
    expect(granted.version).toBe(invitedVersion + 2);
    // A confirmed receipt followed by a refresh failure must be recovered by consultation,
    // never by resending the change or forcing the disabled revoke control.
    const conflictNotice = page.getByRole('alert', { name: 'Conflicto conocido', exact: true });
    if (!resumedAfterLevel) {
      await expect(conflictNotice).toHaveCount(0);
    } else if (await conflictNotice.count()) {
      await conflictNotice.getByRole('button', { name: 'Consultar versión vigente', exact: true }).click();
      await expect(conflictNotice).toHaveCount(0);
      const afterConsult = (await readInvitations()).find(row => row.id === invitation.id);
      expect(afterConsult.id).toBe(granted.id);
      expect(afterConsult.message).toBe(granted.message);
      expect(afterConsult.version).toBe(granted.version);
      expect(afterConsult.level).toBe(granted.level);
    }
    await expect(activeRow.getByRole('button', { name: 'Revocar', exact: true })).toBeEnabled();
    page.once('dialog', dialog => dialog.message() === '¿Revocar este acceso a la ficha?' ? dialog.accept() : dialog.dismiss());
    await activeRow.getByRole('button', { name: 'Revocar', exact: true }).click();
    await expect(page.getByText('Acceso revocado', { exact: true })).toBeVisible();
    const revoked = (await readInvitations()).find(row => row.id === invitation.id);
    expect(revoked.status).toBe('revoked');
    expect(revoked.acceptedBy).toBe(external.userId);
    expect(revoked.version).toBe(invitedVersion + 3);
    expect(await checkedRpc(externalClient, 'aba_student_detail_v2', detailArgs)).toBeNull();
    expect(await checkedRpc(externalClient, 'get_student_capabilities', { p_client_id: student.id })).toEqual([]);
    await assertRouteUnavailable(externalPage, student.id);
    await verifyNoMembership(externalClient, external);

    const rejectionMessage = `QA R5 EXTERNO RECHAZAR ${suffix}`;
    const rejectedInvitation = await invite(rejectionMessage);
    expect(rejectedInvitation.id).not.toBe(invitation.id);
    const rejectionInbox = await checkedRpc(externalClient, 'aba_student_share_read_v2', { p_organization_id: null });
    const receivedRejection = rejectionInbox.invitations.find(row => row.id === rejectedInvitation.id);
    expect(receivedRejection).toBeDefined();
    const pendingRejection = await openReceived(externalPage, receivedRejection, 'pending');
    await assertDetailMessage(externalPage, pendingRejection, rejectionMessage);
    await pendingRejection.getByRole('button', { name: 'Rechazar', exact: true }).click();
    await expect(externalPage.getByText('Invitación rechazada', { exact: true })).toBeVisible();
    const rejected = (await readInvitations()).find(row => row.id === rejectedInvitation.id);
    expect(rejected.status).toBe('rejected');
    expect(rejected.acceptedBy).toBeNull();
    expect(rejected.version).toBe(rejectedInvitation.version + 1);
    expect(await checkedRpc(externalClient, 'aba_student_detail_v2', detailArgs)).toBeNull();
    await assertRouteUnavailable(externalPage, student.id);
    await verifyNoMembership(externalClient, external);
    expect((await readInvitations()).filter(row => ['pending', 'accepted'].includes(row.status))).toHaveLength(0);
  } finally {
    await externalContext.close();
    for (const client of [adminClient, externalClient]) await client.auth.signOut({ scope: 'local' });
  }
});
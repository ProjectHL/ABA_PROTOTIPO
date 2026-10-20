import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import { localStatus, state } from '../../scripts/local/write-env.mjs';

const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
const baseURL = process.env.ABA_QA_BASE_URL ?? 'http://localhost:3001';
const clinicalId = 'QA-R5-B-V5';
const studentName = 'QA R5 CLINICA B LOCAL V5';
test.skip(process.env.ABA_QA_LOCAL_UI !== '1' || process.env.ABA_QA_CLINIC_B_REQUESTS_V5_UI !== '1', 'Ensayo V5 B local explicitamente autorizado');
test.use({ baseURL, trace: 'off', video: 'off', screenshot: 'off', actionTimeout: 15000 });

function fixture() {
  expect(process.cwd().replaceAll('\\', '/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
  expect(baseURL).toBe('http://localhost:3001');
  const status = localStatus(); expect(status.API_URL).toBe('http://127.0.0.1:54321');
  const manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));
  expect(manifest.batchId).toBe(batchId); expect(manifest.state).toBe('ready'); expect(manifest.accounts).toHaveLength(8);
  expect(manifest.apiUrl).toBe(status.API_URL);
  return { manifest, status };
}
function accountOf(manifest, label) {
  const account = manifest.accounts.find(item => item.label === label);
  if (!account || account.email !== `${label}.${batchId}@aba.example.test`) throw new Error('Identidad sintetica no confirmada; valores omitidos');
  return account;
}
async function loginClient(status, account) {
  const db = createClient(status.API_URL, status.ANON_KEY ?? status.PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const result = await db.auth.signInWithPassword({ email: account.email, password: account.password });
  if (result.error || result.data.user?.id !== account.userId || result.data.user.app_metadata?.aba_fixture_batch !== batchId) throw new Error('Auth sintetico no confirmado; valores omitidos');
  return db;
}
async function loginUI(page, account) {
  await page.goto('/login');
  try {
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(account.password);
  } catch { throw new Error('Formulario local no disponible; valores omitidos'); }
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(`${baseURL}/dashboard`);
}
async function rpc(db, name, args) {
  const response = await db.rpc(name, args);
  if (response.error) throw new Error(`Lectura ordinaria ${name} no confirmada; respuesta omitida`);
  return response.data;
}
const list = (db, clinicId) => rpc(db, 'aba_list_students_v2', { p_organization_id: clinicId });
const detail = (db, clinicId, studentId) => rpc(db, 'aba_student_detail_v2', { p_organization_id: clinicId, p_client_id: studentId });
const caps = (db, studentId) => rpc(db, 'get_student_capabilities', { p_client_id: studentId });
async function inbox(db, clinicId, actorId) {
  const data = await rpc(db, 'aba_student_access_request_read_v2', { p_organization_id: clinicId });
  expect(data.actorId).toBe(actorId); expect(data.clinicId).toBe(clinicId); return data.requests;
}
function originals(rows) { return rows.filter(row => row.clinicalId !== clinicalId).sort((a, b) => a.id.localeCompare(b.id)); }
async function ownStudent(page, db, clinicId, clinicalIdOverride = clinicalId, studentNameOverride = studentName) {
  const clinicalId = clinicalIdOverride, studentName = studentNameOverride;
  const existing = (await list(db, clinicId)).filter(row => row.clinicalId === clinicalId);
  expect(existing.length, 'Identificador propio debe ser unico').toBeLessThanOrEqual(1);
  await page.goto('/students');
  await expect(page.getByRole('heading', { name: 'Carpetas de Estudiantes' })).toBeVisible();
  await expect(page.getByText('Cargando fichas autorizadas…')).toHaveCount(0);
  if (existing.length) await page.getByText(`ID clínico: ${clinicalId}`, { exact: true }).click();
  else {
    await page.locator('button:has(svg.lucide-plus)').click();
    await expect(page.getByRole('dialog', { name: 'Nueva ficha clínica' })).toBeVisible();
    for (const [label, value] of [[/^Nombre completo/, studentName], [/^Iniciales clínicas/, 'Q.B.V.'], [/^Identificador clínico/, clinicalId], [/^Fecha de nacimiento/, '2016-01-01']]) await page.getByRole('textbox', { name: label }).fill(value);
    await page.getByRole('textbox', { name: /^Diagnóstico inicial reportado/ }).click();
    await page.getByRole('option', { name: 'Otro', exact: true }).click();
    await page.getByRole('textbox', { name: /^Especificar diagnóstico/ }).fill('Evaluación sintética QA');
    await page.getByRole('button', { name: 'Crear ficha', exact: true }).click();
  }
  await expect(page).toHaveURL(/\/students\/[0-9a-f-]{36}$/);
  const id = new URL(page.url()).pathname.split('/').at(-1);
  await expect(page.getByRole('textbox', { name: /^Nombre completo/ })).toHaveValue(studentName);
  expect((await list(db, clinicId)).filter(row => row.clinicalId === clinicalId)).toHaveLength(1);
  return id;
}

test('QA-013 V5: ficha propia B positiva, version persistida y aislamiento A', async ({ page, request, browser }, testInfo) => {
  test.setTimeout(120000); test.skip(testInfo.project.name !== 'desktop', 'Root ejecuta una sola vez serial en escritorio');
  const { manifest, status } = fixture(); expect((await request.get('/api/health')).status()).toBe(200);
  const accountB = accountOf(manifest, 'admin-b'), accountA = accountOf(manifest, 'admin-a');
  const dbB = await loginClient(status, accountB), dbA = await loginClient(status, accountA);
  let contextA;
  try {
    const previousB = originals(await list(dbB, manifest.clinics.B));
    const previousA = originals(await list(dbA, manifest.clinics.A));
    await loginUI(page, accountB);
    const studentId = await ownStudent(page, dbB, manifest.clinics.B);
    const before = await detail(dbB, manifest.clinics.B, studentId);
    expect(before).toMatchObject({ id: studentId, clinicId: manifest.clinics.B, clinicalId, fullName: studentName });
    expect(Number.isInteger(before.version)).toBe(true);
    const note = `QA B V5 persistencia version ${before.version + 1}`;
    await page.getByRole('textbox', { name: 'Motivo de consulta', exact: true }).fill(note);
    await page.getByRole('button', { name: 'Guardar ficha', exact: true }).click();
    await expect(page.getByText('Ficha actualizada', { exact: true })).toBeVisible();
    const after = await detail(dbB, manifest.clinics.B, studentId);
    expect(after.version).toBe(before.version + 1); expect(after.consultationReason).toBe(note);
    await page.reload();
    await expect(page.getByRole('textbox', { name: 'Motivo de consulta', exact: true })).toHaveValue(note);
    expect(await detail(dbB, manifest.clinics.B, studentId)).toEqual(after);
    for (const clinic of [manifest.clinics.A, manifest.clinics.B]) {
      const denied = await dbA.rpc('aba_student_detail_v2', { p_organization_id: clinic, p_client_id: studentId });
      expect(denied.error !== null || denied.data === null, 'A no obtiene payload de ficha B').toBe(true);
    }
    expect(await caps(dbA, studentId)).not.toContain('student.view');
    contextA = await browser.newContext({ baseURL }); const pageA = await contextA.newPage();
    await loginUI(pageA, accountA); await pageA.goto(`/students/${studentId}`);
    await expect(pageA.getByRole('button', { name: 'Volver a la lista', exact: true })).toBeVisible();
    await expect(pageA.getByText(/Carpeta no disponible|No se pudieron cargar las fichas/).first()).toBeVisible();
    await expect(pageA.getByRole('textbox', { name: /^Nombre completo/ })).toHaveCount(0);
    expect(originals(await list(dbB, manifest.clinics.B))).toEqual(previousB);
    expect(originals(await list(dbA, manifest.clinics.A))).toEqual(previousA);
    await testInfo.attach('ficha-b-v5.json', { body: Buffer.from(JSON.stringify({ studentId, clinicId: manifest.clinics.B, beforeVersion: before.version, afterVersion: after.version, reloadExact: true, clinicADenied: true, originalStudentsPreserved: true })), contentType: 'application/json' });
  } finally { await contextA?.close(); await dbB.auth.signOut({ scope: 'local' }); await dbA.auth.signOut({ scope: 'local' }); }
});

test('QA-008 COMPARTIR-030/031 V5: solicitudes propias denegar/aprobar segun elegibilidad vigente', async ({ page, browser }, testInfo) => {
  test.setTimeout(150000);
  const reasons = testInfo.project.name === 'mobile' ? { deny: 'QA R5 B V5 solicitud denegacion propia mobile', approve: 'QA R5 B V5 solicitud aprobacion propia mobile' } : { deny: 'QA R5 B V5 solicitud denegacion propia', approve: 'QA R5 B V5 solicitud aprobacion propia' };
  const { manifest, status } = fixture();
  const admin = accountOf(manifest, 'admin-b'); const dbAdmin = await loginClient(status, admin);
  const clients = []; let requesterContext;
  try {
    const own = (await list(dbAdmin, manifest.clinics.B)).filter(row => row.clinicalId === clinicalId);
    expect(own, 'Ejecutar primero QA-013 ficha B positiva').toHaveLength(1); const studentId = own[0].id;
    const eligible = [];
    for (const label of ['supervisor-b', 'tecnico-b']) {
      const account = accountOf(manifest, label); const db = await loginClient(status, account); clients.push(db);
      const capabilities = await caps(db, studentId); const visible = (await list(db, manifest.clinics.B)).some(row => row.id === studentId);
      if (visible && capabilities.includes('authorization.request')) eligible.push({ account, db });
    }
    await testInfo.attach('solicitudes-precondicion-v5.json', { body: Buffer.from(JSON.stringify({ studentId, eligibleActors: eligible.map(item => item.account.label), gap: eligible.length ? null : 'Sin asignacion con authorization.request vigente sobre ficha propia; no crear permisos por inferencia.', revocationGap: 'No hay boton de revocacion de decision interna; COMPARTIR-030/031 son approve/deny.' })), contentType: 'application/json' });
    test.skip(!eligible.length, 'GAP QA-008: ningun actor elegible sobre ficha propia nueva; no alterar asignaciones');
    const { account, db } = eligible[0];
    const baselineEdit = (await caps(db, studentId)).includes('student.edit');
    const prior = await inbox(dbAdmin, manifest.clinics.B, admin.userId);
    const originalRequests = prior.filter(row => row.studentId !== studentId);
    expect(prior.some(row => row.studentId === studentId && row.status === 'pending' && !Object.values(reasons).includes(row.reason)), 'No mezclar solicitudes ajenas').toBe(false);
    await loginUI(page, admin);
    requesterContext = await browser.newContext({ baseURL, viewport: testInfo.project.use.viewport, isMobile: !!testInfo.project.use.isMobile, hasTouch: !!testInfo.project.use.hasTouch }); const requesterPage = await requesterContext.newPage(); await loginUI(requesterPage, account);
    const exact = rows => rows.filter(row => row.studentId === studentId && row.requesterUserId === account.userId);
    for (const action of ['deny', 'approve']) {
      const reason = reasons[action]; let matching = exact(await inbox(db, manifest.clinics.B, account.userId)).filter(row => row.reason === reason);
      expect(matching.length).toBeLessThanOrEqual(1);
      if (!matching.length) {
        expect((await caps(db, studentId)).includes('student.edit')).toBe(baselineEdit);
        await requesterPage.goto('/students/' + studentId);
        if (baselineEdit) await expect(requesterPage.getByRole('textbox', { name: /^Nombre completo/ })).toBeEnabled(); else await expect(requesterPage.getByRole('textbox', { name: /^Nombre completo/ })).toBeDisabled();
        await requesterPage.goto('/shared-access'); await requesterPage.getByRole('tab', { name: /^Solicitudes/ }).click();
        await requesterPage.getByRole('button', { name: 'Nueva solicitud', exact: true }).click();
        const modal = requesterPage.getByRole('dialog', { name: 'Solicitar autorización' });
        await modal.getByRole('textbox', { name: /^Ficha/ }).click();
        await requesterPage.getByRole('option').filter({ hasText: clinicalId }).click();
        await modal.getByRole('textbox', { name: /^Motivo clínico/ }).fill(reason);
        await modal.getByRole('button', { name: 'Enviar solicitud', exact: true }).click();
        await expect(requesterPage.getByText('Solicitud registrada', { exact: true })).toBeVisible();
        matching = exact(await inbox(db, manifest.clinics.B, account.userId)).filter(row => row.reason === reason);
      }
      expect(matching).toHaveLength(1); const current = matching[0];
      expect(current.clinicId).toBe(manifest.clinics.B); expect(current.requestedActions).toEqual(['student.edit']);
      if (current.status === 'pending') {
        expect(current.version).toBe(1); expect((await caps(db, studentId)).includes('student.edit')).toBe(baselineEdit);
        await page.goto('/shared-access'); await page.getByRole('tab', { name: /^Solicitudes/ }).click();
        const row = page.getByRole('row').filter({ hasText: reason }); await expect(row).toHaveCount(1);
        await row.getByRole('button', { name: action === 'approve' ? 'Permitir' : 'Denegar', exact: true }).click();
        const modal = page.getByRole('dialog', { name: action === 'approve' ? 'Aprobar solicitud' : 'Denegar solicitud' });
        await modal.getByRole('textbox', { name: /^Fundamento de la decisión/ }).fill(`QA R5 B V5 ${action} solicitud propia`);
        if (action === 'approve') await modal.getByLabel('Vigencia en días', { exact: true }).fill('1');
        await modal.getByRole('button', { name: 'Confirmar', exact: true }).click();
        await expect(page.getByText(action === 'approve' ? 'Solicitud aprobada' : 'Solicitud denegada', { exact: true })).toBeVisible();
      }
      const decided = exact(await inbox(db, manifest.clinics.B, account.userId)).find(row => row.id === current.id);
      expect(decided.status).toBe(action === 'approve' ? 'approved' : 'denied'); expect(decided.version).toBe(2);
      expect(decided.decision.status).toBe(decided.status);
      if (action === 'approve') { expect(await caps(db, studentId)).toContain('student.edit'); expect(Date.parse(decided.decision.expiresAt)).toBeGreaterThan(Date.now()); }
      else expect((await caps(db, studentId)).includes('student.edit')).toBe(baselineEdit);
      await requesterPage.goto('/students/' + studentId);
      if (action === 'approve') await expect(requesterPage.getByRole('textbox', { name: /^Nombre completo/ })).toBeEnabled();
      else if (baselineEdit) await expect(requesterPage.getByRole('textbox', { name: /^Nombre completo/ })).toBeEnabled(); else await expect(requesterPage.getByRole('textbox', { name: /^Nombre completo/ })).toBeDisabled();
      await requesterPage.reload();
      if (action === 'approve') await expect(requesterPage.getByRole('textbox', { name: /^Nombre completo/ })).toBeEnabled();
      else if (baselineEdit) await expect(requesterPage.getByRole('textbox', { name: /^Nombre completo/ })).toBeEnabled(); else await expect(requesterPage.getByRole('textbox', { name: /^Nombre completo/ })).toBeDisabled();
      expect(exact(await inbox(db, manifest.clinics.B, account.userId)).find(row => row.id === current.id)).toEqual(decided);
      const safe = JSON.stringify({ project: testInfo.project.name, studentId, requestId: decided.id, requesterId: account.userId, status: decided.status, version: decided.version, decisionId: decided.decision.id, expiresAt: decided.decision.expiresAt, revocationExecuted: false, preexistingEdit: baselineEdit, newCapabilityGainProved: !baselineEdit && action === 'approve' }, null, 2);
      writeFileSync(testInfo.outputPath(`solicitud-${action}-v5.json`), safe);
      await testInfo.attach(`solicitud-${action}-v5.json`, { body: Buffer.from(safe), contentType: 'application/json' });
    }
    expect((await inbox(dbAdmin, manifest.clinics.B, admin.userId)).filter(row => row.studentId !== studentId)).toEqual(originalRequests);
    // No existing UI command revokes an internal decision. Keep own one-day approval;
    // never call unrelated external share revoke or mutate original memberships.
  } finally { await requesterContext?.close(); for (const db of clients) await db.auth.signOut({ scope: 'local' }); await dbAdmin.auth.signOut({ scope: 'local' }); }
});

test('QA-008 V5: coordinador limitado, concesion temporal, caducidad y replay autorizado', async ({ page, browser }, testInfo) => {
  test.setTimeout(150000);
  const { manifest, status } = fixture();
  const admin = accountOf(manifest, 'admin-b'), limited = accountOf(manifest, 'tecnico-b'), foreign = accountOf(manifest, 'admin-a');
  const dbAdmin = await loginClient(status, admin), dbLimited = await loginClient(status, limited), dbForeign = await loginClient(status, foreign);
  const clinicId = manifest.clinics.B, marker = `QA-R5-LIMITED-${testInfo.project.name.toUpperCase()}`;
  let context, studentId, active = false;
  const versions = [], checks = [];
  const commandIdentity = () => ({ operationId: randomUUID(), idempotencyKey: randomUUID() });
  const send = (db, name, command) => rpc(db, name, { p_organization_id: clinicId, p_command: command });
  const assignment = async state => {
    const result = await rpc(dbAdmin, 'set_student_assignment', { p_client_id: studentId, p_user_id: limited.userId, p_role: 'coordinator', p_status: state, p_test_run_id: batchId });
    expect(result).toMatchObject({ client_id: studentId, user_id: limited.userId, organization_id: clinicId, role: 'coordinator', status: state });
    active = state === 'active'; return result.id;
  };
  const acknowledge = (result, command, version) => {
    expect(result).toMatchObject({ status: 'acknowledged', operationId: command.operationId, idempotencyKey: command.idempotencyKey, resourceId: command.requestId, serverVersion: version });
    expect(result.receiptId).toMatch(/^[0-9a-f-]{36}$/); return result;
  };
  try {
    const beforeTeam = await rpc(dbAdmin, 'aba_team', { p_organization_id: clinicId });
    const beforeStudents = (await list(dbAdmin, clinicId)).filter(row => row.clinicalId !== marker);
    const beforeAssignments = await dbAdmin.from('student_assignments').select('*').eq('organization_id', clinicId).order('id');
    expect(beforeAssignments.error).toBeNull();
    await loginUI(page, admin);
    studentId = await ownStudent(page, dbAdmin, clinicId, marker, `QA R5 LIMITED ${testInfo.project.name}`);
    // Existing legacy RPC prepares only this new resource. It does not change membership
    // or assert that the public assignment UI offers a coordinator role.
    await assignment('active');
    expect(await caps(dbLimited, studentId)).toContain('authorization.request');
    expect(await caps(dbLimited, studentId)).not.toContain('student.edit');
    context = await browser.newContext({ baseURL, viewport: testInfo.project.use.viewport, isMobile: !!testInfo.project.use.isMobile, hasTouch: !!testInfo.project.use.hasTouch });
    const limitedPage = await context.newPage(); await loginUI(limitedPage, limited);
    await limitedPage.goto(`/students/${studentId}`);
    await expect(limitedPage.getByRole('textbox', { name: /^Nombre completo/ })).toBeDisabled();
    const request = { ...commandIdentity(), requestId: randomUUID(), studentId, expectedVersion: 0, action: 'request', resourceType: 'student', requestedActions: ['student.edit'], reason: `${marker} concesion corta` };
    const receipt = acknowledge(await send(dbLimited, 'aba_student_access_request_command_v2', request), request, 1);
    expect(acknowledge(await send(dbLimited, 'aba_student_access_request_command_v2', request), request, 1)).toMatchObject({ receiptId: receipt.receiptId, replayed: true });
    expect(await send(dbLimited, 'aba_student_access_request_command_v2', { ...request, reason: `${marker} payload cambiado` })).toMatchObject({ status: 'conflict', code: 'idempotency-payload-conflict' });
    const decision = { ...commandIdentity(), requestId: request.requestId, studentId, expectedVersion: 1, action: 'approve', expiresAt: new Date(Date.now() + 20000).toISOString(), reason: `${marker} vigencia real corta`, confirmation: true };
    expect(await send(dbForeign, 'aba_student_access_decision_command_v2', decision)).toMatchObject({ status: 'rejected', code: 'permission-denied' });
    const decisionReceipt = acknowledge(await send(dbAdmin, 'aba_student_access_decision_command_v2', decision), decision, 2);
    expect(await caps(dbLimited, studentId)).toContain('student.edit');
    await limitedPage.reload(); await expect(limitedPage.getByRole('textbox', { name: /^Nombre completo/ })).toBeEnabled();
    expect(await send(dbAdmin, 'aba_student_access_decision_command_v2', { ...decision, ...commandIdentity(), action: 'deny', expiresAt: null })).toMatchObject({ status: 'conflict', code: 'version-conflict' });
    await expect.poll(async () => (await caps(dbLimited, studentId)).includes('student.edit'), { timeout: 45000, intervals: [500, 1000] }).toBe(false);
    await limitedPage.reload(); await expect(limitedPage.getByRole('textbox', { name: /^Nombre completo/ })).toBeDisabled();
    const afterExpiryReplay = acknowledge(await send(dbAdmin, 'aba_student_access_decision_command_v2', decision), decision, 2);
    expect(afterExpiryReplay).toMatchObject({ receiptId: decisionReceipt.receiptId, replayed: true });
    expect(await caps(dbLimited, studentId)).not.toContain('student.edit');
    const expired = (await inbox(dbAdmin, clinicId, admin.userId)).find(row => row.id === request.requestId);
    expect(expired).toMatchObject({ status: 'approved', version: 2 }); expect(Date.parse(expired.decision.expiresAt)).toBe(Date.parse(decision.expiresAt));
    versions.push({ requestId: request.requestId, version: expired.version, receiptId: receipt.receiptId, decisionReceiptId: decisionReceipt.receiptId });
    checks.push('limited-before', 'grant-real', 'ui-enabled', 'expiry-real', 'ui-disabled', 'same-receipts', 'payload-conflict', 'version-conflict', 'foreign-denied');
    const pending = { ...request, ...commandIdentity(), requestId: randomUUID(), reason: `${marker} elegibilidad retirada` };
    acknowledge(await send(dbLimited, 'aba_student_access_request_command_v2', pending), pending, 1);
    await assignment('inactive');
    expect(await caps(dbLimited, studentId)).toEqual([]);
    expect(await send(dbLimited, 'aba_student_access_request_command_v2', pending)).toMatchObject({ status: 'rejected', code: 'permission-denied' });
    const unavailable = { ...decision, ...commandIdentity(), requestId: pending.requestId, expiresAt: new Date(Date.now() + 60000).toISOString() };
    expect(await send(dbAdmin, 'aba_student_access_decision_command_v2', unavailable)).toMatchObject({ status: 'rejected', code: 'permission-denied' });
    const denyPending = { ...unavailable, ...commandIdentity(), action: 'deny', expiresAt: null };
    acknowledge(await send(dbAdmin, 'aba_student_access_decision_command_v2', denyPending), denyPending, 2);
    await limitedPage.reload(); await expect(limitedPage.getByRole('textbox', { name: /^Nombre completo/ })).toHaveCount(0);
    const afterAssignments = await dbAdmin.from('student_assignments').select('*').eq('organization_id', clinicId).order('id'); expect(afterAssignments.error).toBeNull();
    expect(afterAssignments.data.filter(row => row.client_id !== studentId)).toEqual(beforeAssignments.data.filter(row => row.client_id !== studentId));
    expect(await rpc(dbAdmin, 'aba_team', { p_organization_id: clinicId })).toEqual(beforeTeam);
    expect((await list(dbAdmin, clinicId)).filter(row => row.clinicalId !== marker)).toEqual(beforeStudents);
    const safe = { passed: true, project: testInfo.project.name, studentId, requesterId: limited.userId, preparation: 'legacy-RPC-only-on-dedicated-student', membershipUnchanged: true, originalsPreserved: true, finalAssignment: 'inactive', checks: [...checks, 'eligibility-revoked', 'no-replay-after-revocation', 'approval-denied-after-revocation'], versions };
    writeFileSync(testInfo.outputPath('limited-requester-v5.json'), JSON.stringify(safe, null, 2));
    await testInfo.attach('limited-requester-v5.json', { body: Buffer.from(JSON.stringify(safe)), contentType: 'application/json' });
  } finally {
    if (active && studentId) await assignment('inactive');
    await context?.close(); await dbAdmin.auth.signOut({ scope: 'local' }); await dbLimited.auth.signOut({ scope: 'local' }); await dbForeign.auth.signOut({ scope: 'local' });
  }
});

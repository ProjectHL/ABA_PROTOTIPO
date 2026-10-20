import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import { localStatus, state } from '../../scripts/local/write-env.mjs';

const enabled = process.env.ABA_QA_LOCAL_UI === '1' && process.env.ABA_QA_AUTH_MAIL_V5_UI === '1';
const recoverOnly = process.env.ABA_QA_AUTH_MAIL_RECOVER_ONLY === '1';
const baseURL = 'http://localhost:3000';
const mailURL = 'http://127.0.0.1:54324';
const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
const label = 'tecnico-b';
const recoveryDir = path.join(state, 'qa', 'auth-mail-v5');
const recoveryFile = path.join(recoveryDir, 'recovery-tecnico-b.json');
test.skip(!enabled, 'Correo Auth V5 local explícito; cuenta sintética exclusiva y ejecución serial');
test.use({ baseURL, actionTimeout: 15000, trace: 'off', video: 'off', screenshot: 'off' });

function fixture() {
  if (process.cwd().replaceAll('\\', '/') !== 'C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO') throw new Error('Desktop exclusivo requerido');
  if (process.env.ABA_QA_BASE_URL !== baseURL) throw new Error('Callback allowlist exige origen local3000; no afirmar validación candidato3001');
  const status = localStatus();
  if (status.API_URL !== 'http://127.0.0.1:54321') throw new Error('API local exacta requerida');
  const manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));
  const account = manifest.accounts.find(row => row.label === label);
  if (manifest.batchId !== batchId || manifest.state !== 'ready' || manifest.apiUrl !== status.API_URL || account?.email !== `${label}.${batchId}@aba.example.test`) throw new Error('Lote/cuenta sintéticos no verificados; valores omitidos');
  return { status, manifest, account };
}
const makeClient = status => createClient(status.API_URL, status.ANON_KEY ?? status.PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
function atomicPrivate(value) {
  mkdirSync(recoveryDir, { recursive: true });
  const temporary = path.join(recoveryDir, `.recovery-${randomUUID()}.tmp`);
  writeFileSync(temporary, JSON.stringify(value), { encoding: 'utf8', mode: 0o600, flag: 'wx' });
  renameSync(temporary, recoveryFile);
}
async function ordinaryLogin(client, account, password) {
  const result = await client.auth.signInWithPassword({ email: account.email, password });
  if (result.error) return false;
  if (result.data.user?.id !== account.userId || result.data.user.app_metadata?.aba_fixture_batch !== batchId) throw new Error('Auth de identidad inesperada; valores omitidos');
  return true;
}
async function identity(client, account, clinicId) {
  const result = await client.rpc('aba_identity_context', { p_organization_id: clinicId });
  if (result.error || result.data?.userId !== account.userId || result.data.active?.id !== clinicId || result.data.active.role !== 'therapist') throw new Error('Identidad/rol B no confirmados; valores omitidos');
  return { userId: result.data.userId, active: result.data.active, choices: result.data.choices.map(row => ({ id: row.id, role: row.role })).sort((a, b) => a.id.localeCompare(b.id)) };
}
async function restoreOriginal(status, account) {
  if (!existsSync(recoveryFile)) return;
  const saved = JSON.parse(readFileSync(recoveryFile, 'utf8'));
  if (saved.batchId !== batchId || saved.userId !== account.userId || saved.label !== label || saved.apiUrl !== status.API_URL) throw new Error('Archivo de recuperación ajeno; no modificar');
  if (saved.phase === 'restored') return;
  const client = makeClient(status);
  try {
    // A lost reset/change ACK can leave either credential active. Probe only this ordinary QA actor.
    const originalWorks = await ordinaryLogin(client, account, account.password);
    if (!originalWorks) {
      if (!saved.temporaryPassword || !await ordinaryLogin(client, account, saved.temporaryPassword)) throw new Error('Recuperación Auth ordinaria no pudo autenticar; temporal preservada en archivo privado');
      const result = await client.auth.updateUser({ password: account.password });
      if (result.error || result.data.user?.id !== account.userId) throw new Error('Recuperación Auth ordinaria no confirmó contraseña original; temporal preservada');
      if (!await ordinaryLogin(client, account, account.password)) throw new Error('Contraseña original no revalidada; temporal preservada');
    }
    atomicPrivate({ schemaVersion: 1, batchId, label, userId: account.userId, apiUrl: status.API_URL, runId: saved.runId, phase: 'restored', restoredAt: new Date().toISOString() });
  } finally { await client.auth.signOut({ scope: 'local' }); }
}
async function privateFill(page, fields) {
  try { for (const [name, value] of fields) await page.getByRole('textbox', { name, exact: true }).fill(value); }
  catch { throw new Error('Formulario privado no disponible; valores omitidos'); }
}
async function pathname(page, expected) {
  await expect.poll(() => page.evaluate(() => location.pathname)).toBe(expected);
}
async function uiLogin(page, account, password) {
  await page.goto('/login');
  await privateFill(page, [['Email', account.email], ['Contraseña', password]]);
  const responsePromise = page.waitForResponse(response => {
    const url = new URL(response.url()); return url.origin === 'http://127.0.0.1:54321' && url.pathname === '/auth/v1/token' && response.request().method() === 'POST';
  });
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  const response = await responsePromise;
  if (response.status() !== 200) throw new Error('Login UI ordinario no confirmado; valores omitidos');
  const result = await response.json();
  if (result.user?.id !== account.userId || result.user.app_metadata?.aba_fixture_batch !== batchId) throw new Error('Login UI no correlacionado; valores omitidos');
  await pathname(page, '/dashboard');
}
async function mailSearch(request, email) {
  // Schema checked read-only at localhost54324/api/v1/swagger.json; search filter documented by Mailpit.
  const url = `${mailURL}/api/v1/search?query=${encodeURIComponent('to:' + email)}&start=0&limit=1000`;
  let response;
  try { response = await request.get(url); } catch { throw new Error('Mailpit local no accesible; consulta privada omitida'); }
  if (response.status() !== 200) throw new Error('Búsqueda Mailpit no confirmada; valores omitidos');
  const result = await response.json();
  if (!Array.isArray(result.messages)) throw new Error('Contrato Mailpit de mensajes no reconocido');
  return result.messages.filter(row => row.To?.some(to => to.Address === email));
}
const callbackCodes = new Set(['detail_network', 'detail_http', 'detail_json', 'detail_identity_recipient', 'link_contract', 'link_no_unique', 'callback_navigation', 'callback_path', 'callback_heading']);
function callbackFailure(code) { const error = new Error('Callback diagnóstico saneado'); error.qaSafeCode = code; return error; }
function safeUrl(raw, relativeBase) {
  try {
    const url = new URL(raw, relativeBase);
    const origins = new Set([baseURL, 'http://127.0.0.1:54321']);
    const paths = new Set(['/auth/v1/verify', '/auth/confirm', '/reset-password', '/login', '/dashboard']);
    const keys = new Set(['type', 'token', 'token_hash', 'redirect_to', 'next', 'code', 'error', 'error_code', 'error_description']);
    return { origin: origins.has(url.origin) ? url.origin : 'unapproved', path: paths.has(url.pathname) ? url.pathname : 'unrecognized', queryKeys: [...url.searchParams.keys()].map(key => keys.has(key) ? key : 'unrecognized-key').sort(), ...(url.searchParams.has('next') ? { nextPath: ['/reset-password', '/dashboard', '/team'].includes(url.searchParams.get('next')) ? url.searchParams.get('next') : 'unapproved' } : {}) };
  } catch { return { origin: 'unparseable', path: 'unparseable', queryKeys: [] }; }
}
function recoveryLink(message, diagnostic) {
  const raw = `${message.HTML ?? ''}\n${message.Text ?? ''}`.replaceAll('&amp;', '&').replaceAll('&#38;', '&');
  const links = [...raw.matchAll(/https?:\/\/[^\s"'<>]+/g)].map(row => row[0]);
  const accepted = [];
  diagnostic.linkCandidates = [];
  for (const link of links) {
    let url; try { url = new URL(link); } catch { continue; }
    if (url.pathname === '/auth/v1/verify' || url.pathname === '/auth/confirm') {
      if (diagnostic.linkCandidates.length < 8) diagnostic.linkCandidates.push(safeUrl(url.href));
    }
    if (url.origin === 'http://127.0.0.1:54321' && url.pathname === '/auth/v1/verify' && url.searchParams.get('type') === 'recovery') {
      let redirect; try { redirect = new URL(url.searchParams.get('redirect_to') ?? 'http://invalid.local'); } catch { throw callbackFailure('link_contract'); }
      diagnostic.redirect = safeUrl(redirect.href);
      if (redirect.origin !== baseURL || redirect.pathname !== '/auth/confirm' || redirect.searchParams.get('next') !== '/reset-password') throw callbackFailure('link_contract');
      accepted.push(url.href);
    } else if (url.origin === baseURL && url.pathname === '/auth/confirm' && url.searchParams.get('type') === 'recovery') accepted.push(url.href);
  }
  const unique = [...new Set(accepted)];
  diagnostic.uniqueLinkCount = unique.length;
  if (unique.length !== 1) throw callbackFailure('link_no_unique');
  return unique[0];
}

test('QA-002/005 V5: SMTP recibido, PKCE reset, política/mismatch/change y login conservan identidad', async ({ page, request }, testInfo) => {
  test.skip(recoverOnly, 'Modo de recuperación separado no acredita ensayo mail');
  test.setTimeout(240000);
  const { status, manifest, account } = fixture();
  const client = makeClient(status);
  let stage = 'precondiciones', failure, restored = false, beforeIdentity, mailEvidence;
  let userWrites = 0;
  const callbackDiagnostic = { transitions: [] };
  let safeFailureCode = 'unclassified';
  page.on('response', response => {
    if (stage !== 'callback PKCE' || callbackDiagnostic.transitions.length >= 12) return;
    const url = new URL(response.url());
    if (!['/auth/v1/verify', '/auth/confirm'].includes(url.pathname)) return;
    const location = response.headers().location;
    callbackDiagnostic.transitions.push({ ...safeUrl(url.href), status: response.status(), ...(location ? { redirect: safeUrl(location, url.origin) } : {}) });
  });
  page.on('request', request => { const url = new URL(request.url()); if (url.origin === status.API_URL && url.pathname === '/auth/v1/user' && request.method() === 'PUT') userWrites++; });
  try {
    await restoreOriginal(status, account); // Resume only an exact owned interrupted run, never a foreign actor.
    if (!await ordinaryLogin(client, account, account.password)) throw new Error('Contraseña original no confirma cuenta del lote');
    beforeIdentity = await identity(client, account, manifest.clinics.B);
    const schemaResponse = await request.get(`${mailURL}/api/v1/swagger.json`);
    if (schemaResponse.status() !== 200) throw new Error('Esquema Mailpit real no disponible');
    const schema = await schemaResponse.json();
    if (!schema.paths?.['/api/v1/search']?.get || !schema.paths?.['/api/v1/message/{ID}']?.get) throw new Error('Interfaces Mailpit actuales no confirmadas');
    const health = await request.get(`${baseURL}/api/health`); if (health.status() !== 200) throw new Error('Origen web3000 no saludable');
    const existing = new Set((await mailSearch(request, account.email)).map(row => row.ID));
    stage = 'solicitud SMTP';
    await page.goto('/forgot-password');
    await privateFill(page, [['Correo', account.email]]);
    const sentAfter = Date.now();
    await page.getByRole('button', { name: 'Solicitar enlace', exact: true }).click();
    await expect(page.getByText('Si la cuenta está habilitada, recibirá un enlace. En local revisa Mailpit; ábrelo en el mismo navegador.', { exact: true })).toBeVisible();
    let fresh;
    await expect.poll(async () => {
      const found = (await mailSearch(request, account.email)).filter(row => !existing.has(row.ID) && Date.parse(row.Created) >= sentAfter - 2000);
      if (found.length > 1) throw new Error('Entrega SMTP nueva ambigua; no elegir correo ajeno');
      fresh = found[0]; return !!fresh;
    }, { timeout: 60000, intervals: [1000, 2000, 3000] }).toBe(true);
    stage = 'callback PKCE';
    let detailResponse;
    try { detailResponse = await request.get(`${mailURL}/api/v1/message/${encodeURIComponent(fresh.ID)}`); } catch { throw callbackFailure('detail_network'); }
    callbackDiagnostic.detailStatus = detailResponse.status();
    if (detailResponse.status() !== 200) throw callbackFailure('detail_http');
    let message; try { message = await detailResponse.json(); } catch { throw callbackFailure('detail_json'); }
    callbackDiagnostic.idMatched = message.ID === fresh.ID;
    callbackDiagnostic.recipientMatched = !!message.To?.some(to => to.Address === account.email);
    if (!callbackDiagnostic.idMatched || !callbackDiagnostic.recipientMatched) throw callbackFailure('detail_identity_recipient');
    const link = recoveryLink(message, callbackDiagnostic);
    mailEvidence = { messageId: fresh.ID, receivedAt: fresh.Created, recipientVerified: true, callbackOrigin: baseURL, callbackPath: '/auth/confirm' };
    try { const response = await page.goto(link); callbackDiagnostic.navigationStatus = response?.status() ?? null; } catch (error) { const netCode = typeof error?.message === 'string' ? error.message.match(/net::ERR_[A-Z_]+/)?.[0] : undefined; callbackDiagnostic.navigationError = netCode ?? (error?.name === 'TimeoutError' ? 'TimeoutError' : 'unclassified'); callbackDiagnostic.finalLocation = safeUrl(page.url()); throw callbackFailure('callback_navigation'); }
    callbackDiagnostic.finalLocation = safeUrl(page.url());
    try { await pathname(page, '/reset-password'); } catch { callbackDiagnostic.finalLocation = safeUrl(page.url()); throw callbackFailure('callback_path'); }
    try { await expect(page.getByRole('heading', { name: 'Nueva contraseña', exact: true })).toBeVisible(); } catch { throw callbackFailure('callback_heading'); }
    stage = 'validaciones reset';
    const temporaryPassword = 'QaV5!' + randomBytes(24).toString('hex') + 'aA1';
    const policyMessage = 'La contraseña debe coincidir y tener 12 caracteres, minúscula, mayúscula, número y símbolo.';
    await privateFill(page, [['Nueva contraseña', 'short'], ['Confirmar contraseña', 'short']]);
    await page.getByRole('button', { name: 'Cambiar contraseña', exact: true }).click();
    await expect(page.getByText(policyMessage, { exact: true })).toBeVisible(); expect(userWrites).toBe(0);
    await privateFill(page, [['Nueva contraseña', temporaryPassword], ['Confirmar contraseña', temporaryPassword + 'Mismatch']]);
    await page.getByRole('button', { name: 'Cambiar contraseña', exact: true }).click();
    await expect(page.getByText(policyMessage, { exact: true })).toBeVisible(); expect(userWrites).toBe(0);
    if (!await ordinaryLogin(client, account, account.password)) throw new Error('Validación negativa cambió contraseña indebidamente');
    stage = 'reset temporal';
    // Persist before the mutation: process interruption or lost ACK remains recoverable. Original remains only in manifest.
    atomicPrivate({ schemaVersion: 1, batchId, label, userId: account.userId, apiUrl: status.API_URL, runId: randomUUID(), project: testInfo.project.name, phase: 'reset-attempted', temporaryPassword, createdAt: new Date().toISOString() });
    await privateFill(page, [['Nueva contraseña', temporaryPassword], ['Confirmar contraseña', temporaryPassword]]);
    await page.getByRole('button', { name: 'Cambiar contraseña', exact: true }).click(); await pathname(page, '/dashboard');
    expect(userWrites).toBe(1);
    if (!await ordinaryLogin(client, account, temporaryPassword)) throw new Error('Reset temporal no confirmado por Auth ordinario');
    expect(await identity(client, account, manifest.clinics.B)).toEqual(beforeIdentity);
    stage = 'login temporal UI'; await uiLogin(page, account, temporaryPassword);
    stage = 'contraseña actual equivocada';
    await page.goto('/change-password');
    await privateFill(page, [['Contraseña actual', temporaryPassword + 'Wrong'], ['Nueva contraseña', account.password], ['Confirmar contraseña', account.password]]);
    await page.getByRole('button', { name: 'Cambiar contraseña', exact: true }).click();
    await expect(page.getByText('La contraseña actual no pudo verificarse para esta identidad.', { exact: true })).toBeVisible(); expect(userWrites).toBe(1);
    if (!await ordinaryLogin(client, account, temporaryPassword)) throw new Error('Cambio denegado alteró contraseña');
    stage = 'devolver contraseña original UI';
    await privateFill(page, [['Contraseña actual', temporaryPassword], ['Nueva contraseña', account.password], ['Confirmar contraseña', account.password]]);
    await page.getByRole('button', { name: 'Cambiar contraseña', exact: true }).click(); await pathname(page, '/dashboard'); expect(userWrites).toBe(2);
    if (!await ordinaryLogin(client, account, account.password)) throw new Error('Contraseña original no revalidada');
    expect(await identity(client, account, manifest.clinics.B)).toEqual(beforeIdentity);
    await uiLogin(page, account, account.password);
    stage = 'restaurado'; await restoreOriginal(status, account); restored = true;
  } catch (error) { safeFailureCode = callbackCodes.has(error?.qaSafeCode) ? error.qaSafeCode : 'unclassified'; failure = `Ensayo Auth/correo falló en etapa ${stage}, código ${safeFailureCode}; secretos y datos SMTP omitidos`; }
  finally {
    try { await restoreOriginal(status, account); restored = true; } catch { failure = 'Recuperación Auth ordinaria pendiente; temporal exacta conservada en .aba.local/qa/auth-mail-v5/recovery-tecnico-b.json privado; no repetir otras suites de esta cuenta'; }
    await client.auth.signOut({ scope: 'local' });
    // No error-context with recovery URLs, input emails or passwords. Reports contain only sanitized stage.
    try { await page.goto('about:blank'); } catch { /* No sensitive diagnostic output. */ }
  }
  if (failure) { const sanitized = JSON.stringify({ stage, code: safeFailureCode, callback: callbackDiagnostic }, null, 2); writeFileSync(testInfo.outputPath('callback-diagnostic-safe.json'), sanitized, 'utf8'); await testInfo.attach('auth-mail-v5-callback-diagnostic-safe', { body: sanitized, contentType: 'application/json' }); throw new Error(failure); }
  expect(restored).toBe(true);
  const sanitizedSuccess = JSON.stringify({ actorLabel: label, project: testInfo.project.name, sourceOrigin: baseURL, candidate3001Covered: false, mail: mailEvidence, resetConfirmed: true, policyAndMismatchNoWrites: true, wrongCurrentNoWrite: true, originalPasswordRestored: true, identityAndRolesUnchanged: true }, null, 2);
  writeFileSync(testInfo.outputPath('auth-mail-v5-sanitized.json'), sanitizedSuccess, 'utf8');
  await testInfo.attach('auth-mail-v5-sanitized', { body: sanitizedSuccess, contentType: 'application/json' });
});

test('Operación V5: recuperar exclusivamente contraseña original de técnico B desde interrupción propia', async () => {
  test.skip(!recoverOnly, 'Recuperación opt-in separada; no cuenta como gate correo');
  const { status, account } = fixture();
  try { await restoreOriginal(status, account); } catch { throw new Error('Recuperación Auth ordinaria no confirmada; archivo privado preservado, secretos omitidos'); }
});

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import { localStatus, state } from '../../scripts/local/write-env.mjs';

// Read routes only: no command controls are clicked, no invitations or clinical fixtures are created.
const enabled = process.env.ABA_QA_LOCAL_UI === '1' && process.env.ABA_QA_ROUTE_PROFILES_UI === '1';
test.skip(!enabled, 'Matriz de rutas sintéticas local explícita');
test.use({ actionTimeout: 15000 });
const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
const baseURL = process.env.ABA_QA_BASE_URL;
const labels = ['admin-a', 'supervisor-a', 'tecnico-a', 'admin-b', 'supervisor-b', 'tecnico-b', 'externo', 'familia'];
const studentA = 'b347646e-ff29-450b-aedf-9f9c015fb41a';
const routes = ['/dashboard', '/students', '/team', '/calendar', '/plans', '/support', '/shared-access', '/invitations', '/family', '/offline-workspace', '/help', '/change-password', '/reset-password'];

function fixture() {
  expect(process.cwd().replaceAll('\\', '/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
  expect(baseURL).toBe('http://localhost:3001');
  const status = localStatus();
  expect(status.API_URL).toBe('http://127.0.0.1:54321');
  const manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));
  if (manifest.batchId !== batchId || manifest.state !== 'ready' || manifest.apiUrl !== status.API_URL) throw new Error('Lote local sintético no verificado');
  const account = label => {
    const row = manifest.accounts.find(item => item.label === label);
    if (row?.email !== `${label}.${batchId}@aba.example.test` || !row.userId) throw new Error('Cuenta del lote no verificada');
    return row;
  };
  return { status, manifest, account };
}

async function actorClient(status, account) {
  const client = createClient(status.API_URL, status.ANON_KEY ?? status.PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const login = await client.auth.signInWithPassword({ email: account.email, password: account.password });
  if (login.error || login.data.user?.id !== account.userId || login.data.user?.app_metadata?.aba_fixture_batch !== batchId) throw new Error('Auth sintético no confirmado; valores omitidos');
  return client;
}
async function read(client, name, args) {
  const result = await client.rpc(name, args);
  if (result.error) throw new Error(`Lectura autorizada no confirmada: ${name}`);
  return result.data;
}
async function forbidden(client, name, clinicId) {
  const result = await client.rpc(name, { p_organization_id: clinicId });
  expect(result.error?.code, `${name}: límite de clínica/perfil`).toBe('42501');
}
async function loginUi(page, account) {
  await page.goto('/login');
  try {
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(account.password);
  } catch { throw new Error('Formulario sintético no disponible; valores omitidos'); }
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
function monitor(page) {
  let errors = 0, structuralErrors = 0;
  const serverErrors = [];
  page.on('pageerror', () => { errors++; });
  page.on('console', message => {
    if (message.type() === 'error' && /hydration|hydrating|validateDOMNesting|cannot be a descendant|cannot contain a nested|Each child in a list/i.test(message.text())) structuralErrors++;
  });
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.origin === baseURL && response.status() >= 500) serverErrors.push({ path: url.pathname, status: response.status() });
  });
  return async () => {
    expect(errors, 'Sin excepciones JavaScript; mensajes omitidos').toBe(0);
    expect(structuralErrors, 'Sin errores estructurales de hidratación').toBe(0);
    expect(serverErrors, 'Sin errores HTTP 5xx de la aplicación').toEqual([]);
    await expect(page.getByText(/Application error:|Internal Server Error/)).toHaveCount(0);
  };
}
async function heading(page, route, name, healthy) {
  const response = await page.goto(route);
  expect(response?.status(), route).toBe(200);
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await healthy();
}
async function noReadFailure(page) {
  await expect(page.getByText(/Panel no disponible|No se pudieron cargar las fichas|No se pudo cargar el equipo autorizado|No fue posible consultar/)).toHaveCount(0);
}
async function control(page, name, allowed) {
  const button = page.getByRole('button', { name, exact: true });
  if (allowed) await expect(button).toBeEnabled();
  else await expect(button).toBeDisabled();
}

for (const label of labels) test(`QA-001/004/008/013: rutas por perfil ${label}, lectura y denegaciones`, async ({ page, request }, testInfo) => {
  test.setTimeout(240000);
  const { status, manifest, account } = fixture();
  expect((await request.get(`${baseURL}/api/health`)).status()).toBe(200);
  const ownAccount = account(label);
  const internal = !['externo', 'familia'].includes(label);
  const ownClinic = manifest.clinics[label.endsWith('-b') ? 'B' : 'A'];
  const otherClinic = manifest.clinics[label.endsWith('-b') ? 'A' : 'B'];
  const clients = [];
  const coverage = { actor: label, project: testInfo.project.name, routes: [], gaps: ['Sesión/captura y resultados completos pertenecen a las suites focales; no se abren aquí.'] };
  try {
    const client = await actorClient(status, ownAccount); clients.push(client);
    const adminA = label === 'admin-a' ? client : await actorClient(status, account('admin-a'));
    if (adminA !== client) clients.push(adminA);
    const a = await read(adminA, 'aba_student_detail_v2', { p_organization_id: manifest.clinics.A, p_client_id: studentA });
    if (a?.clinicalId !== 'QA-R5-A-2155E99E' || a.fullName !== 'QA SINTETICO LOCAL A') throw new Error('Ficha A sintética no confirmada');
    const identity = await read(client, 'aba_identity_context', { p_organization_id: internal ? ownClinic : null });
    expect(identity.userId).toBe(ownAccount.userId);
    if (internal) {
      expect(identity.active?.id).toBe(ownClinic);
      expect(identity.active.role).toBe(label.startsWith('admin-') ? 'admin' : label.startsWith('supervisor-') ? 'supervisor' : 'therapist');
      await forbidden(client, 'aba_team', otherClinic);
      if (identity.choices.some(choice => choice.id === otherClinic)) {
        const otherCalendar = await read(client, 'aba_calendar_read_v2', { p_organization_id: otherClinic });
        expect(otherCalendar).toMatchObject({ clinicId: otherClinic, actorId: ownAccount.userId });
        expect(otherCalendar.students.some(student => student.id === studentA)).toBe(false);
        coverage.gaps.push('Actor con membresía activa adicional: agenda de esa clínica autorizada; se conserva fixture multiclínica.');
      } else await forbidden(client, 'aba_calendar_read_v2', otherClinic);
      if (identity.active.role !== 'admin') {
        await forbidden(client, 'aba_team', ownClinic);
        await forbidden(client, 'aba_commercial_read_v2', ownClinic);
      }
    } else {
      expect(identity.active).toBeNull(); expect(identity.choices).toEqual([]);
      const memberships = await client.from('memberships').select('organization_id').eq('user_id', ownAccount.userId);
      if (memberships.error) throw new Error('Lectura de membresía propia no confirmada');
      expect(memberships.data).toEqual([]);
      for (const clinicId of [manifest.clinics.A, manifest.clinics.B]) await forbidden(client, 'aba_team', clinicId);
      const portal = await read(client, 'aba_family_portal_read_v2', { p_organization_id: manifest.clinics.A });
      const calendar = await read(client, 'aba_family_calendar_read_v2', { p_organization_id: manifest.clinics.A });
      expect(portal.publications).toEqual([]); expect(calendar.appointments).toEqual([]);
      const caps = await read(client, 'get_student_capabilities', { p_client_id: studentA });
      expect(caps).toEqual([]);
    }
    const healthy = monitor(page);
    await loginUi(page, ownAccount);
    if (internal && identity.choices.length > 1) {
      const clinicInput = page.getByRole('textbox', { name: 'Clínica activa', exact: true });
      let openedNavigation = false;
      if (testInfo.project.name === 'mobile') { await page.locator('button.mantine-Burger-root').click(); openedNavigation = true; }
      await expect(clinicInput).toBeEnabled();
      if (await clinicInput.inputValue() !== identity.active.name) {
        await clinicInput.click();
        await page.getByRole('option', { name: identity.active.name, exact: true }).click();
        await expect(clinicInput).toHaveValue(identity.active.name);
      }
      if (openedNavigation) await page.locator('button.mantine-Burger-root').click();
    }
    await expect(page.getByText('Panel clínico autorizado', { exact: true })).toBeVisible();
    if (internal) await expect(page.getByRole('heading', { name: 'Programas logrados', exact: true })).toBeVisible();
    else await expect(page.getByRole('button', { name: 'Ver carpetas', exact: true })).toBeDisabled();
    if (internal) await noReadFailure(page);
    await healthy(); coverage.routes.push('/dashboard');
    await heading(page, '/students', 'Carpetas de Estudiantes', healthy);
    await expect(page.getByText('Cargando fichas autorizadas…', { exact: true })).toHaveCount(0);
    if (internal) await noReadFailure(page);
    else await expect(page.getByText('Selecciona una clínica autorizada.', { exact: true })).toBeVisible();
    coverage.routes.push('/students');
    const aCapabilities = await read(client, 'get_student_capabilities', { p_client_id: studentA });
    if (internal && !label.endsWith('-b') && aCapabilities.includes('student.view')) {
      const detail = await read(client, 'aba_student_detail_v2', { p_organization_id: ownClinic, p_client_id: studentA });
      expect(detail?.id).toBe(studentA);
      await heading(page, `/students/${studentA}`, detail.fullName, healthy);
      expect([...detail.capabilities].sort()).toEqual([...aCapabilities].sort());
      const editable = detail.capabilities.includes('student.edit');
      const input = page.getByRole('textbox', { name: 'Nombre completo', exact: true });
      if (editable) await expect(input).toBeEnabled(); else await expect(input).toBeDisabled();
      await control(page, 'Guardar ficha', editable);
      await control(page, 'Archivar ficha', editable);
      await control(page, 'Iniciar sesión', detail.status === 'active' && detail.capabilities.includes('record.capture'));
      await page.reload(); await expect(input).toHaveValue(detail.fullName);
      const after = await read(client, 'aba_student_detail_v2', { p_organization_id: ownClinic, p_client_id: studentA });
      expect(after.version).toBe(detail.version); await healthy();
      coverage.routes.push('/students/[A]: UI/capacidades/recarga/version');
      // The cross-clinic RPC selects B explicitly; no user context is switched or persisted.
      expect(await read(client, 'aba_student_detail_v2', { p_organization_id: otherClinic, p_client_id: studentA })).toBeNull();
      coverage.gaps.push('No se usa una ficha B ajena desconocida: la URL extranjera positiva se verifica con actores B y sin clínica sobre la ficha A.');
    } else {
      const denied = await read(client, 'aba_student_detail_v2', { p_organization_id: manifest.clinics.A, p_client_id: studentA });
      expect(denied).toBeNull();
      await page.goto(`/students/${studentA}`);
      await expect(page.getByText(internal ? 'No existe o no tienes acceso vigente a esta carpeta.' : 'Selecciona una clínica autorizada.', { exact: true })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Nombre completo', exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Guardar ficha', exact: true })).toHaveCount(0);
      await healthy(); coverage.routes.push('/students/[A]: acceso denegado');
      if (internal && label.endsWith('-b')) coverage.gaps.push('Ficha B propia detallada no incluida: no se crean ni alteran fixtures.');
      else if (internal) coverage.gaps.push('Este actor A no tiene student.view en la ficha existente: se valida denegación, sin conceder permisos.');
    }
    const admin = identity.active?.role === 'admin';
    await heading(page, '/team', 'Gestión de Equipo Terapéutico', healthy);
    if (admin) { await expect(page.getByRole('button', { name: 'Invitar miembro', exact: true })).toBeEnabled(); await noReadFailure(page); }
    else { await expect(page.getByText('La administración de equipo está limitada a administradores de la clínica activa. Tu perfil se edita desde la cabecera.', { exact: true })).toBeVisible(); await expect(page.getByRole('button', { name: 'Invitar miembro', exact: true })).toHaveCount(0); }
    coverage.routes.push('/team');
    await heading(page, '/plans', 'Planes y gestión comercial', healthy);
    if (admin) await control(page, 'Crear documento', true);
    else { await expect(page.getByText('La gestión comercial está disponible para la administración de la clínica activa.', { exact: true })).toBeVisible(); await expect(page.getByRole('button', { name: 'Crear documento', exact: true })).toHaveCount(0); }
    coverage.routes.push('/plans');
    await heading(page, '/calendar', 'Agenda', healthy);
    await control(page, 'Nueva cita', internal);
    if (!internal) await expect(page.getByText('Selecciona una clínica para consultar su agenda.', { exact: true })).toBeVisible();
    else await noReadFailure(page);
    coverage.routes.push('/calendar');
    await heading(page, '/support', 'Soporte', healthy);
    await control(page, 'Nuevo ticket', internal);
    if (!internal) await expect(page.getByText('Selecciona una clínica para consultar soporte.', { exact: true })).toBeVisible();
    else await noReadFailure(page);
    coverage.routes.push('/support');
    for (const route of ['/shared-access', '/invitations']) {
      await heading(page, route, 'Accesos compartidos', healthy);
      await page.getByRole('tab', { name: /^Recibidas/ }).click();
      await healthy(); coverage.routes.push(route);
    }
    await page.goto('/family');
    await expect(page.getByText('Contexto familiar requerido', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Portal Familiar', exact: true })).toHaveCount(0);
    await healthy(); coverage.routes.push('/family: contexto denegado');
    for (const [route, title] of [['/offline-workspace', 'Trabajo offline'], ['/help', 'Ayuda'], ['/contact', 'Contacto comercial'], ['/change-password', 'Cambiar contraseña'], ['/reset-password', 'Nueva contraseña']]) {
      await heading(page, route, title, healthy); coverage.routes.push(route);
    }
    coverage.gaps.push('Chat y adjuntos de chat diferidos por alcance; no se evalúan.');
    // This evidence contains route/actor labels only, never credentials or clinical payloads.
    writeFileSync(testInfo.outputPath('route-profile-coverage.json'), JSON.stringify(coverage, null, 2));
    await testInfo.attach('route-profile-coverage', { body: JSON.stringify(coverage, null, 2), contentType: 'application/json' });
  } finally {
    for (const client of clients) { const result = await client.auth.signOut({ scope: 'local' }); if (result.error) throw new Error('Cierre de sesión QA no confirmado; valores omitidos'); }
  }
});

test('QA-001/013: anónimo lee páginas públicas y todas las rutas protegidas piden login', async ({ page }) => {
  test.setTimeout(180000); fixture();
  const healthy = monitor(page);
  await page.goto('/'); await expect(page.getByRole('button', { name: 'Ingresar al entorno', exact: true })).toBeVisible(); await healthy();
  for (const [route, title] of [['/login', 'Iniciar sesión'], ['/forgot-password', 'Recuperar acceso'], ['/contact', 'Contacto comercial']]) await heading(page, route, title, healthy);
  for (const route of [...routes, `/students/${studentA}`, `/session/${studentA}`]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login\?redirectTo=/);
    await expect(page.getByRole('heading', { name: 'Iniciar sesión', exact: true })).toBeVisible();
    expect(new URL(page.url()).searchParams.get('redirectTo')).toBe(route);
    await expect(page.getByRole('textbox', { name: 'Nombre completo', exact: true })).toHaveCount(0);
    await healthy();
  }
});



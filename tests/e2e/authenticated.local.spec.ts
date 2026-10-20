import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { expect, test, type Page } from '@playwright/test';

const root = process.cwd();
const organizationA = '10000000-0000-4000-8000-000000000001';
const organizationB = '10000000-0000-4000-8000-000000000002';
const password = `Ab!${randomBytes(18).toString('base64url')}9z`;
const nonce = `${Date.now()}-${randomBytes(4).toString('hex')}`;
type Actor = { email: string; id?: string; db?: SupabaseClient };
const actors: Record<'adminA' | 'adminB' | 'supervisor' | 'technician', Actor> = {
  adminA: { email: `ui-admin-a-${nonce}@example.test` },
  adminB: { email: `ui-admin-b-${nonce}@example.test` },
  supervisor: { email: `ui-supervisor-${nonce}@example.test` },
  technician: { email: `ui-technician-${nonce}@example.test` },
};
let studentA = '';
let studentB = '';

test.skip(process.env.ABA_E2E_LOCAL_AUTH !== '1', 'requires the isolated local Supabase runner');

function localEnvironment() {
  const cli = resolve(root, 'node_modules/supabase/dist/supabase.js');
  const output = execFileSync(process.execPath, [cli, 'status', '-o', 'env'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const values: Record<string, string> = {};
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)="(.*)"$/);
    if (match) values[match[1]] = match[2];
  }
  const url = values.API_URL;
  const anon = values.ANON_KEY ?? values.PUBLISHABLE_KEY;
  const service = values.SERVICE_ROLE_KEY ?? values.SECRET_KEY;
  if (!url || !anon || !service) throw new Error('local_supabase_environment_unavailable');
  return { url, anon, service };
}

function sql(statement: string) {
  execFileSync(
    'docker',
    ['exec', 'supabase_db_aba_prototipo', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', statement],
    { stdio: ['ignore', 'ignore', 'ignore'] },
  );
}

async function login(page: Page, actor: Actor) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(actor.email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30_000 });
  await page.goto('/students');
  await expect(page.getByText(`ID clínico: UI-A-${nonce}`, { exact: true })).toBeVisible();
}

test.beforeAll(async () => {
  const env = localEnvironment();
  const rootClient = createClient(env.url, env.service, { auth: { persistSession: false, autoRefreshToken: false } });
  for (const actor of Object.values(actors)) {
    const created = await rootClient.auth.admin.createUser({ email: actor.email, password, email_confirm: true });
    if (created.error || !created.data.user) throw new Error(`fixture_user:${created.error?.code ?? 'missing'}`);
    actor.id = created.data.user.id;
  }
  sql(`insert into public.memberships(organization_id,user_id,role,status) values
    ('${organizationA}','${actors.adminA.id}','admin','active'),
    ('${organizationB}','${actors.adminB.id}','admin','active'),
    ('${organizationA}','${actors.supervisor.id}','supervisor','active'),
    ('${organizationA}','${actors.technician.id}','therapist','active')`);
  for (const actor of Object.values(actors)) {
    const signed = await rootClient.auth.signInWithPassword({ email: actor.email, password });
    if (signed.error || !signed.data.session) throw new Error(`fixture_session:${signed.error?.code ?? 'missing'}`);
    actor.db = createClient(env.url, env.anon, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${signed.data.session.access_token}` } },
    });
  }
  const payload = { clinical_id: `UI-A-${nonce}`, initials: 'A.A.', birth_date: '2015-01-01', primary_language: 'Español', guardians: [], siblings: [] };
  const createdA = await actors.adminA.db!.rpc('mvp_save_student', { p_organization_id: organizationA, p_client_id: null, p_expected_updated_at: null, p_payload: payload, p_test_run_id: null });
  const createdB = await actors.adminB.db!.rpc('mvp_save_student', { p_organization_id: organizationB, p_client_id: null, p_expected_updated_at: null, p_payload: { ...payload, clinical_id: `UI-B-${nonce}`, initials: 'B.B.' }, p_test_run_id: null });
  if (createdA.error || createdB.error) throw new Error('fixture_student');
  studentA = createdA.data.id;
  studentB = createdB.data.id;
  for (const [actor, role] of [[actors.supervisor, 'supervisor'], [actors.technician, 'therapist']] as const) {
    const assigned = await actors.adminA.db!.rpc('set_student_assignment', { p_client_id: studentA, p_user_id: actor.id!, p_role: role, p_status: 'active', p_test_run_id: null });
    if (assigned.error) throw new Error(`fixture_assignment:${assigned.error.code}`);
  }
});

test('admin operates only inside the active clinic', async ({ page }) => {
  await login(page, actors.adminA);
  await expect(page.getByText(`ID clínico: UI-B-${nonce}`)).toHaveCount(0);
  await page.goto('/team');
  await expect(page.getByRole('button', { name: 'Invitar miembro', exact: true })).toBeVisible();
  await page.goto(`/students/${studentB}`);
  await expect(page.getByText('No existe o no tienes acceso vigente a esta carpeta.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Identificador clínico')).toHaveCount(0);
});

async function expectTeamAdministrationDenied(page: Page) {
  await page.goto('/team');
  await expect(page.getByText('La administración de equipo está limitada a administradores de la clínica activa. Tu perfil se edita desde la cabecera.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Invitar miembro', exact: true })).toHaveCount(0);
}

test('supervisor can edit assigned student without clinic administration', async ({ page }) => {
  await login(page, actors.supervisor);
  await expectTeamAdministrationDenied(page);
  await page.goto(`/students/${studentA}`);
  await expect(page.getByLabel('Identificador clínico')).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Guardar ficha', exact: true })).toBeEnabled();
});

test('technician can open capture but cannot edit the record', async ({ page }) => {
  await login(page, actors.technician);
  await expectTeamAdministrationDenied(page);
  await page.goto(`/students/${studentA}`);
  await expect(page.getByLabel('Identificador clínico')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Guardar ficha', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/session/${studentA}$`));
});

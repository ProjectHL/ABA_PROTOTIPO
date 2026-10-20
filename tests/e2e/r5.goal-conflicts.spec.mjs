import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import { localStatus, state } from '../../scripts/local/write-env.mjs';

test.skip(process.env.ABA_QA_LOCAL_UI !== '1' || process.env.ABA_QA_GOAL_CONFLICT_UI !== '1', 'Conflicto de meta sintética local explícito');
test.use({ actionTimeout: 15000 });

test('QA-012/015: meta conserva borrador, conflicto y retry exacto tras ACK perdido', async ({ page, context }) => {
  test.setTimeout(150000);
  expect(process.cwd().replaceAll('\\', '/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
  const status = localStatus(); expect(status.API_URL).toBe('http://127.0.0.1:54321');
  const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
  const manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));
  expect(manifest.state).toBe('ready');
  const account = manifest.accounts.find(row => row.label === 'admin-a');
  if (account?.email !== `admin-a.${batchId}@aba.example.test`) throw new Error('Identidad sintética incorrecta');
  const client = createClient(status.API_URL, status.ANON_KEY ?? status.PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  let other;
  try {
    const login = await client.auth.signInWithPassword({ email: account.email, password: account.password });
    if (login.error || login.data.user?.id !== account.userId || login.data.user.app_metadata.aba_fixture_batch !== batchId) throw new Error('Lectura sintética no autorizada');
    const list = await client.rpc('aba_list_students_v2', { p_organization_id: manifest.clinics.A });
    if (list.error) throw new Error('Ficha sintética no legible');
    const student = list.data.find(row => row.clinicalId === 'QA-R5-A-2155E99E'); expect(student).toBeDefined();
    const snapshot = await client.rpc('read_program_session_v2', { p_clinic_id: manifest.clinics.A, p_student_id: student.id });
    if (snapshot.error) throw new Error('Programa sintético no legible');
    const programs = snapshot.data.programs.filter(row => row.versions.some(version => version.title === 'QA R5 CONDUCTA LOCAL'));
    expect(programs).toHaveLength(1); const program = programs[0];
    const label = `QA R5 CONFLICT META ${test.info().project.name.toUpperCase()}`;
    const readGoal = async () => {
      const result = await client.from('program_result_goals_v2').select('id,label,version,target_value,archived_at,test_run_id')
        .eq('organization_id', manifest.clinics.A).eq('client_id', student.id).eq('program_id', program.id).eq('label', label)
        .is('archived_at', null);
      if (result.error || (result.data?.length ?? 0) > 1) throw new Error('Meta sintética ambigua o no legible');
      return result.data?.[0] ?? null;
    };
    const existing = await readGoal();
    await page.goto('/login');
    try {
      await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
      await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(account.password);
    } catch { throw new Error('Formulario no disponible; valores omitidos'); }
    await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    const chartUrl = `/students/${student.id}/programs/${program.id}/chart`;
    await page.goto(chartUrl);
    await expect(page.getByRole('heading', { name: 'Metas del gráfico' })).toBeVisible();
    const dimension = page.getByRole('textbox', { name: 'Dimensión', exact: true });
    if (await dimension.inputValue() !== 'Porcentaje') {
      await dimension.click(); await page.getByRole('option', { name: 'Porcentaje', exact: true }).click();
    }
    if (!existing) {
      await page.getByRole('button', { name: 'Nueva meta' }).click();
      const modal = page.getByRole('dialog', { name: 'Nueva meta' });
      await modal.getByRole('textbox', { name: 'Nombre' }).fill(label);
      await modal.getByRole('textbox', { name: 'Valor' }).fill('10');
      await modal.getByRole('button', { name: 'Guardar', exact: true }).click();
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
    const goal = await readGoal(); expect(goal).toBeTruthy(); expect(goal.test_run_id).toBe(null);
    const baseVersion = goal.version;
    other = await context.newPage();
    await other.goto(chartUrl);
    await expect(other.getByText(label, { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Editar', exact: true }).last().click();
    await other.getByRole('button', { name: 'Editar', exact: true }).last().click();
    const ownModal = page.getByRole('dialog', { name: 'Editar meta' });
    const otherModal = other.getByRole('dialog', { name: 'Editar meta' });
    await otherModal.getByRole('textbox', { name: 'Valor' }).fill('40');
    await ownModal.getByRole('textbox', { name: 'Valor' }).fill('30');
    await ownModal.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect.poll(async () => (await readGoal())?.version).toBe(baseVersion + 1);
    expect((await readGoal()).target_value).toBe(30);
    await otherModal.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(otherModal.getByRole('button', { name: 'Consultar versión vigente conservando borrador' })).toBeVisible();
    await expect(otherModal.getByRole('textbox', { name: 'Valor' })).toHaveValue('40');
    await expect(otherModal.getByRole('button', { name: 'Guardar', exact: true })).toBeDisabled();
    expect((await readGoal()).target_value).toBe(30);
    await otherModal.getByRole('button', { name: 'Consultar versión vigente conservando borrador' }).click();
    await expect(otherModal.getByRole('textbox', { name: 'Valor' })).toHaveValue('40');
    expect((await readGoal()).target_value).toBe(30); // Reviewing never writes.
    await otherModal.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect.poll(async () => (await readGoal())?.version).toBe(baseVersion + 2);
    expect((await readGoal()).target_value).toBe(40);
    await expect(otherModal).toHaveCount(0);
    const commands = [];
    let responseLost = false; let transportFailure = false;
    const intercept = async route => {
      const request = route.request();
      if (request.method() !== 'POST' || !request.headers()['next-action']) return route.continue();
      const body = request.postData() ?? '';
      if (!body.includes('"targetValue":60') || !body.includes('"action":"update"')) return route.continue();
      const args = JSON.parse(body);
      const command = args.find(arg => arg?.command?.action === 'update' && arg.command.goalId === goal.id)?.command;
      if (!command) throw new Error('Comando de meta no reconocible; no simular recibos');
      commands.push(command);
      if (responseLost) return route.continue();
      try {
        const actual = await route.fetch({ timeout: 15000 });
        if (actual.status() !== 200) throw new Error('Server Action de meta no confirmada');
        await actual.body();
        responseLost = true;
        await route.abort('failed');
      } catch {
        // route.fetch failures contain cookies in their call logs; never print them.
        transportFailure = true;
        await route.abort('failed').catch(() => {});
      }
    };
    await other.route(chartUrl, intercept);
    try {
      await other.getByRole('button', { name: 'Editar', exact: true }).last().click();
      const retryModal = other.getByRole('dialog', { name: 'Editar meta' });
      await retryModal.getByRole('textbox', { name: 'Valor' }).fill('60');
      await retryModal.getByRole('button', { name: 'Guardar', exact: true }).click();
      await expect.poll(() => responseLost || transportFailure, { timeout: 20000 }).toBe(true);
      expect(transportFailure, 'Transporte no completado; detalles sensibles omitidos').toBe(false);
      await expect(retryModal.getByRole('button', { name: 'Reintentar misma operación' })).toBeVisible();
      await expect.poll(async () => (await readGoal())?.version).toBe(baseVersion + 3);
      expect((await readGoal()).target_value).toBe(60);
      expect(commands).toHaveLength(1);
      await retryModal.getByRole('button', { name: 'Reintentar misma operación' }).click();
      await expect(retryModal).toHaveCount(0);
      expect(commands).toHaveLength(2);
      expect(commands[1]).toEqual(commands[0]);
      expect((await readGoal()).version).toBe(baseVersion + 3);
    } finally { await other.unrouteAll({ behavior: 'wait' }); }
    await other.getByRole('button', { name: 'Editar', exact: true }).last().click();
    other.once('dialog', dialog => dialog.accept());
    await other.getByRole('dialog', { name: 'Editar meta' }).getByRole('button', { name: 'Archivar' }).click();
    await expect(other.getByText(label, { exact: true })).toHaveCount(0);
    const archived = await client.from('program_result_goals_v2').select('version,archived_at').eq('id', goal.id).single();
    if (archived.error) throw new Error('Meta archivada no legible');
    expect(archived.data.version).toBe(baseVersion + 4); expect(archived.data.archived_at).toBeTruthy();
    const history = await client.from('program_result_goal_revisions_v2').select('revision,action').eq('goal_id', goal.id).gte('revision', baseVersion).order('revision', { ascending: true });
    if (history.error) throw new Error('Historial de meta no legible');
    expect(history.data.map(row => [row.revision, row.action])).toEqual([
      [baseVersion, 'updated'], [baseVersion + 1, 'updated'], [baseVersion + 2, 'updated'], [baseVersion + 3, 'archived'],
    ]);
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Menú de perfil' }).click();
    await page.getByRole('menuitem', { name: 'Cerrar Sesión' }).click();
    await expect(page).toHaveURL(/\/login$/);
  } finally {
    if (other) await other.close();
    await client.auth.signOut({ scope: 'local' });
  }
});

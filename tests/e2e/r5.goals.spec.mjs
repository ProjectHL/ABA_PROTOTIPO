import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import { localStatus, state } from '../../scripts/local/write-env.mjs';

test.skip(process.env.ABA_QA_LOCAL_UI !== '1' || process.env.ABA_QA_GOALS_UI !== '1', 'Metas sintéticas locales explícitas');
test.use({ actionTimeout: 15000 });

test('QA-012: meta longitudinal creada, revisada, archivada y aislada', async ({ page }, testInfo) => {
  test.setTimeout(120000);
  expect(process.cwd().replaceAll('\\', '/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
  const status = localStatus(); expect(status.API_URL).toBe('http://127.0.0.1:54321');
  const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
  const manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));
  expect(manifest.state).toBe('ready');
  const account = manifest.accounts.find(row => row.label === 'admin-a');
  const other = manifest.accounts.find(row => row.label === 'admin-b');
  if (account?.email !== `admin-a.${batchId}@aba.example.test` || other?.email !== `admin-b.${batchId}@aba.example.test`) throw new Error('Identidad sintética incorrecta');
  const client = createClient(status.API_URL, status.ANON_KEY ?? status.PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const deniedClient = createClient(status.API_URL, status.ANON_KEY ?? status.PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const login = await client.auth.signInWithPassword({ email: account.email, password: account.password });
    if (login.error || login.data.user?.id !== account.userId || login.data.user.app_metadata.aba_fixture_batch !== batchId) throw new Error('Lectura sintética no autorizada');
    const list = await client.rpc('aba_list_students_v2', { p_organization_id: manifest.clinics.A });
    if (list.error) throw new Error('Lectura de ficha no confirmada');
    const student = list.data.find(row => row.clinicalId === 'QA-R5-A-2155E99E'); expect(student).toBeDefined();
    const read = await client.rpc('read_program_session_v2', { p_clinic_id: manifest.clinics.A, p_student_id: student.id });
    if (read.error) throw new Error('Lectura de programa no confirmada');
    const programs = read.data.programs.filter(program => program.versions.some(version => version.title === 'QA R5 CONDUCTA LOCAL'));
    expect(programs).toHaveLength(1); const program = programs[0];
    const unfinished = await client.from('program_result_goals_v2').select('id,label,version')
      .eq('organization_id', manifest.clinics.A).eq('client_id', student.id).eq('program_id', program.id)
      .is('archived_at', null).like('label', `QA R5 META ${testInfo.project.name.toUpperCase()} %`);
    if (unfinished.error || (unfinished.data?.length ?? 0) > 1) throw new Error('No se pudo identificar de forma única la meta sintética pendiente');
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(account.password);
    await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto(`/students/${student.id}/programs/${program.id}/chart`);
    await expect(page.getByRole('heading', { name: 'Metas del gráfico' })).toBeVisible();
    const dimension = page.getByRole('textbox', { name: 'Dimensión', exact: true });
    if (await dimension.inputValue() !== 'Porcentaje') {
      await dimension.click(); await page.getByRole('option', { name: 'Porcentaje', exact: true }).click();
    }
    const label = unfinished.data?.[0]?.label ?? `QA R5 META ${testInfo.project.name.toUpperCase()} ${Date.now()}`;
    const editedLabel = `${label} REVISADA`;
    if (!unfinished.data?.length) {
      await page.getByRole('button', { name: 'Nueva meta' }).click();
      const modal = page.getByRole('dialog', { name: 'Nueva meta' });
      await modal.getByRole('textbox', { name: 'Nombre' }).fill(label);
      await modal.getByRole('textbox', { name: 'Valor' }).fill('50');
      await modal.getByRole('button', { name: 'Guardar', exact: true }).click();
    }
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    const created = await client.from('program_result_goals_v2').select('id,organization_id,client_id,program_id,dimension,comparator,target_value,label,version,archived_at,test_run_id')
      .eq('organization_id', manifest.clinics.A).eq('client_id', student.id).eq('program_id', program.id).eq('label', label).single();
    if (created.error || !created.data) throw new Error('Meta creada no legible por su actor');
    const goal = created.data;
    // The UI-created synthetic student intentionally has no batch test_run_id.
    // Scope this QA goal through its verified account, clinic, clinical ID and program.
    expect(goal).toMatchObject({ dimension: 'percentage', comparator: 'at-least', target_value: 50, version: 1, archived_at: null, test_run_id: null });
    const firstPdfWait = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar PDF', exact: true }).click();
    const firstPdf = await firstPdfWait; const firstPdfPath = testInfo.outputPath('meta-v1.pdf'); await firstPdf.saveAs(firstPdfPath);
    expect(readFileSync(firstPdfPath).toString('latin1')).toContain(label);
    await page.getByRole('button', { name: 'Editar', exact: true }).last().click();
    const editModal = page.getByRole('dialog', { name: 'Editar meta' });
    await editModal.getByRole('textbox', { name: 'Nombre' }).fill(editedLabel);
    await editModal.getByRole('textbox', { name: 'Criterio' }).click();
    await page.getByRole('option', { name: 'Como máximo', exact: true }).click();
    await editModal.getByRole('textbox', { name: 'Valor' }).fill('40');
    await editModal.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(page.getByText(editedLabel, { exact: true }).first()).toBeVisible();
    const updated = await client.from('program_result_goals_v2').select('version,label,comparator,target_value,archived_at').eq('id', goal.id).single();
    if (updated.error) throw new Error('Meta actualizada no legible');
    expect(updated.data).toMatchObject({ version: 2, label: editedLabel, comparator: 'at-most', target_value: 40, archived_at: null });
    const updatedPdfWait = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar PDF', exact: true }).click();
    const updatedPdf = await updatedPdfWait; const updatedPdfPath = testInfo.outputPath('meta-v2.pdf'); await updatedPdf.saveAs(updatedPdfPath);
    const updatedPdfText = readFileSync(updatedPdfPath).toString('latin1');
    expect(updatedPdfText).toContain(editedLabel); expect(updatedPdfText).not.toContain(`${label}:`);
    await page.getByRole('button', { name: 'Editar', exact: true }).last().click();
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('dialog', { name: 'Editar meta' }).getByRole('button', { name: 'Archivar' }).click();
    await expect(page.getByText(editedLabel, { exact: true })).toHaveCount(0);
    const archived = await client.from('program_result_goals_v2').select('version,archived_at').eq('id', goal.id).single();
    if (archived.error) throw new Error('Meta archivada no legible');
    expect(archived.data.version).toBe(3); expect(archived.data.archived_at).toBeTruthy();
    const revisions = await client.from('program_result_goal_revisions_v2').select('revision,action,prior_value').eq('goal_id', goal.id).order('revision', { ascending: true });
    if (revisions.error) throw new Error('Historial de meta no legible');
    expect(revisions.data).toHaveLength(2);
    expect(revisions.data.map(row => [row.revision, row.action, row.prior_value.version])).toEqual([[1, 'updated', 1], [2, 'archived', 2]]);
    const deniedLogin = await deniedClient.auth.signInWithPassword({ email: other.email, password: other.password });
    if (deniedLogin.error || deniedLogin.data.user?.id !== other.userId || deniedLogin.data.user.app_metadata.aba_fixture_batch !== batchId) throw new Error('Identidad de otra clínica incorrecta');
    const denied = await deniedClient.from('program_result_goals_v2').select('id').eq('id', goal.id);
    if (denied.error) throw new Error('Consulta RLS de otra clínica no confirmada');
    expect(denied.data).toEqual([]);
    await page.getByRole('button', { name: 'Menú de perfil' }).click();
    await page.getByRole('menuitem', { name: 'Cerrar Sesión' }).click();
    await expect(page).toHaveURL(/\/login$/);
  } finally {
    await client.auth.signOut({ scope: 'local' });
    await deniedClient.auth.signOut({ scope: 'local' });
  }
});

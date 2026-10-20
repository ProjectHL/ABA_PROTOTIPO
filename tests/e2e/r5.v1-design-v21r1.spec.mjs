import fs from 'node:fs';
import {readProgramDesign} from '../../src/domain/programs/design-v2.ts';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {test, expect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import {localStatus} from '../../scripts/local/write-env.mjs';

test.skip(process.env.ABA_QA_V1_DESIGN_V21R1 !== '1', 'Read-only existing V1 design opt-in');
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('PROGRAMAS037 existing V1 design history preserves exact original JSON', async ({page}, info) => {
  test.setTimeout(120000);
  expect(process.cwd().replaceAll('\\', '/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
  const buildId = '7AtdY0nw3olpUC5PDvk7o';
  expect(execFileSync('docker', ['exec', 'aba-local-qa-v21', 'node', '-e', "process.stdout.write(require('fs').readFileSync('/workspace/.aba.local/qa/next-build-v21-clinical-header/BUILD_ID','utf8'))"], {encoding:'utf8', windowsHide:true}).trim()).toBe(buildId);
  const prefix = '.aba.local/qa/v1-design-v21r1-' + info.project.name;
  for (const suffix of ['-safe.json', '-journal.json']) expect(fs.existsSync(prefix + suffix)).toBe(false);
  const journal = {status:'pending', stage:'guard', project:info.project.name, attemptedWrites:0};
  fs.writeFileSync(prefix + '-journal.json', JSON.stringify(journal, null, 2) + '\n', {flag:'wx'});
  const save = () => fs.writeFileSync(prefix + '-journal.json', JSON.stringify(journal, null, 2) + '\n');
  const batch = JSON.parse(fs.readFileSync('.aba.local/batches/2155e99e-bda4-4c68-95cf-b74cacd84ecd.json'));
  const actor = batch.accounts.find(account => account.label === 'admin-a');
  const status = localStatus();
  expect(status.API_URL).toBe('http://127.0.0.1:54321');
  const db = createClient(status.API_URL, status.ANON_KEY ?? status.PUBLISHABLE_KEY, {auth:{persistSession:false, autoRefreshToken:false}});
  const studentId = 'b347646e-ff29-450b-aedf-9f9c015fb41a';
  const read = async () => {
    const result = await db.rpc('read_program_session_v2', {p_clinic_id:batch.clinics.A, p_student_id:studentId});
    expect(result.error).toBeNull();
    return result.data;
  };
  try {
    const login = await db.auth.signInWithPassword({email:actor.email, password:actor.password});
    expect(login.error).toBeNull();
    expect(login.data.user.id).toBe(actor.userId);
    const before = await read();
    const targets = before.programs.flatMap((program, programIndex) => program.versions.flatMap((version, versionIndex) => readProgramDesign(version.originalDesign).schemaVersion === 1 ? [{programIndex, versionIndex, program, version}] : []));
    journal.stage = 'discover-existing-v1';
    journal.versions = targets.map(({program, version}) => ({programId:program.id, versionId:version.id, originalDesignSha256:hash(version.originalDesign)}));
    save();
    expect(targets.length, 'No existing V1 accepted by historical contract design found: do not fabricate or convert a fixture').toBeGreaterThan(0);
    await page.route('**/*', route => {
      const request = route.request();
      if (request.method() === 'POST' && request.headers()['next-action'] && /operationId|idempotencyKey/.test(request.postData() ?? '')) {
        journal.attemptedWrites++;
        save();
        return route.abort('failed');
      }
      return route.continue();
    });
    await page.goto('/login');
    await page.getByRole('textbox', {name:'Email', exact:true}).fill(actor.email);
    await page.getByRole('textbox', {name:'Contraseña', exact:true}).fill(actor.password);
    await page.getByRole('button', {name:'Iniciar sesión', exact:true}).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto('/students/' + studentId);
    const verify = async () => {
      await page.getByRole('tab', {name:'Programación', exact:true}).click();
      await expect(page.getByText('Diseños históricos V1', {exact:true})).toBeVisible();
      const history = page.getByText('Historial autorizado de versiones', {exact:true}).locator('..');
      const programs = history.locator(':scope > details');
      await expect(programs).toHaveCount(before.programs.length);
      for (const target of targets) {
        const outer = programs.nth(target.programIndex);
        await outer.locator(':scope > summary').click();
        await expect(outer).toHaveAttribute('open', '');
        const inner = outer.locator('details').nth(target.versionIndex);
        await expect(inner.locator(':scope > summary')).toHaveText(`v${target.version.number} · ${target.version.title || 'Sin título'} · ${target.version.state} · revisión ${target.version.revision}`);
        await inner.locator(':scope > summary').click();
        await expect(inner).toHaveAttribute('open', '');
        const pre = inner.locator(':scope > pre');
        await expect(pre).toBeVisible();
        expect(JSON.parse(await pre.innerText())).toEqual(target.version.originalDesign);
        await expect(inner.getByRole('button')).toHaveCount(0);
        await expect(inner.getByRole('textbox')).toHaveCount(0);
        await inner.locator(':scope > summary').click();
        await expect(inner).not.toHaveAttribute('open', '');
        await outer.locator(':scope > summary').click();
        await expect(outer).not.toHaveAttribute('open', '');
      }
    };
    journal.stage = 'history-ui'; save();
    await verify();
    expect(await read()).toEqual(before);
    journal.stage = 'reload'; save();
    await page.reload();
    await verify();
    expect(await read()).toEqual(before);
    expect(journal.attemptedWrites).toBe(0);
    fs.writeFileSync(prefix + '-safe.json', JSON.stringify({passed:true, buildId, project:info.project.name, studentId, route:'/students/' + studentId, versions:journal.versions, attemptedWrites:journal.attemptedWrites, snapshotSha256:hash(before), checks:['Existing V1 originalDesign discovered in authorized RPC', 'Real parent and version summaries expand and collapse', 'Displayed JSON deep-equals originalDesign without V2 conversion', 'No edit controls inside historical version', 'Reload retains exact complete authorized snapshot'], limits:['No V1 fixtures created', 'Does not test explicit creation of a V2 successor', 'Auth login is performed; zero clinical command attempts']}, null, 2) + '\n', {flag:'wx'});
    journal.status = 'complete'; journal.stage = 'complete'; save();
  } catch (error) {
    journal.status = 'unconfirmed'; journal.errorType = error.name; save();
    throw error;
  } finally {
    await db.auth.signOut({scope:'local'});
  }
});
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import { localStatus, state } from '../../scripts/local/write-env.mjs';

const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
const studentId = 'b347646e-ff29-450b-aedf-9f9c015fb41a';
const familyName = 'QA R5 FAMILIAR 2155E99E';
const baseURL = process.env.ABA_QA_BASE_URL;
test.skip(process.env.ABA_QA_LOCAL_UI !== '1' || process.env.ABA_QA_FAMILY_PUBLICATIONS_V5_UI !== '1', 'Publicación familiar V5 sintética local explícita, serial');
test.use({ actionTimeout: 15000, trace: 'off', screenshot: 'off', video: 'off' });
async function read(client, name, args) { const r = await client.rpc(name, args); if (r.error) throw new Error(`Lectura ordinaria no confirmada: ${name}`); return r.data; }
async function login(page, account) {
  await page.goto('/login');
  try { await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email); await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(account.password); }
  catch { throw new Error('Formulario privado no disponible; valores omitidos'); }
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect.poll(() => page.evaluate(() => location.pathname)).not.toBe('/login');
}
async function selectValue(page, label, option) {
  const field = page.getByRole('textbox', { name: label, exact: true });
  await field.click();
  const row = page.getByRole('option', { name: option, exact: true });
  await expect(row).toHaveCount(1); await row.click(); await page.keyboard.press('Escape');
}
const card = (page, title) => page.getByRole('heading', { name: title, exact: true }).locator('xpath=ancestor::*[contains(@class,"mantine-Card-root")][1]');
const sorted = values => [...values].sort();
const guardCodes = new Set(['actor_fixture', 'student_clinical_id', 'student_full_name', 'family_person_unique', 'family_row_order', 'family_link_open', 'publication_intro_owner', 'publication_recipients_owner', 'program_released_missing', 'revision_v2_missing', 'program_option_ambiguous', 'revision_option_ambiguous', 'pending_link_ambiguous', 'new_link_correlation', 'attachment_unselectable', 'link_ownership_changed', 'membership_read', 'resume_exact_link', 'resume_exact_publication', 'touch_target']);
function guardFailure(code) { if (!guardCodes.has(code)) throw new Error('Código de guarda inválido'); const error = new Error('Guarda sintética no confirmada'); error.qaGuardCode = code; throw error; }

test('QA-008/013 V5: programa y revisión publicados por UI, manifiesto exacto y revocación', async ({ page, browser }, testInfo) => {
  test.setTimeout(240000);
  if (process.cwd().replaceAll('\\', '/') !== 'C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO' || baseURL !== 'http://localhost:3001') throw new Error('Desktop/candidato3001 requeridos');
  const status = localStatus(); if (status.API_URL !== 'http://127.0.0.1:54321') throw new Error('API local requerida');
  const manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));
  if (manifest.batchId !== batchId || manifest.state !== 'ready' || manifest.apiUrl !== status.API_URL) throw new Error('Lote sintético no confirmado');
  const account = label => { const a = manifest.accounts.find(row => row.label === label); if (a?.email !== `${label}.${batchId}@aba.example.test`) throw new Error('Cuenta del lote no confirmada'); return a; };
  const clients = []; let familyContext; let stage = 'preconditions';
  const evidence = { project: testInfo.project.name, studentId, familyPersonId: null, linkId: null, publicationId: null };
  try {
    stage = 'actor-auth';
    for (const label of ['admin-a', 'familia', 'admin-b']) {
      const a = account(label), client = createClient(status.API_URL, status.ANON_KEY ?? status.PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
      const auth = await client.auth.signInWithPassword({ email: a.email, password: a.password });
      if (auth.error || auth.data.user?.id !== a.userId || auth.data.user.app_metadata?.aba_fixture_batch !== batchId) guardFailure('actor_fixture'); clients.push(client);
    }
    const [adminClient, familyClient, foreignClient] = clients;
    const manage = () => read(adminClient, 'aba_family_publication_manage_read_v2', { p_organization_id: manifest.clinics.A, p_client_id: studentId });
    const links = () => read(familyClient, 'aba_family_access_read_v2', { p_organization_id: null, p_client_id: null });
    const portal = () => read(familyClient, 'aba_family_portal_read_v2', { p_organization_id: manifest.clinics.A });
    stage = 'student-read';
    const detail = await read(adminClient, 'aba_student_detail_v2', { p_organization_id: manifest.clinics.A, p_client_id: studentId });
    if (detail?.clinicalId !== 'QA-R5-A-2155E99E') guardFailure('student_clinical_id');
    if (detail.fullName !== 'QA SINTETICO LOCAL A') guardFailure('student_full_name');
    stage = 'publication-manage-read';
    const baseline = await manage(); expect(baseline.actorId).toBe(account('admin-a').userId);
    stage = 'family-person-guard';
    const people = baseline.familyPeople.filter(row => row.label === familyName && row.email === account('familia').email);
    // The old desktop/mobile documentary runs created two legitimate namesakes.
    // Correlate the current publication's exact recipient ID; never choose a first label.
    const recipientIds = baseline.currentPublication?.familyPersonIds ?? [];
    const currentRecipients = people.filter(row => recipientIds.includes(row.id));
    const explicitPersonId = process.env.ABA_QA_FAMILY_PERSON_ID;
    const candidates = currentRecipients.length === 1 ? currentRecipients
      : explicitPersonId ? people.filter(row => row.id === explicitPersonId)
        : people.length === 1 ? people : [];
    if (candidates.length !== 1) guardFailure('family_person_unique');
    const person = candidates[0]; evidence.familyPersonId = person.id;
    const resumeLinkId = process.env.ABA_QA_FAMILY_PUBLICATIONS_RESUME_LINK_ID;
    const resume = Boolean(resumeLinkId); evidence.resumedOwnAcceptedLink = resume;
    if (resume && (testInfo.project.name !== 'mobile' || resumeLinkId !== '2629db76-f2c2-44ba-b8d3-afa48bb2d0e7' || person.id !== '9708633c-4e08-4e28-b744-7be01efb0838' || person.accessLinkId !== resumeLinkId || person.accessStatus !== 'active')) guardFailure('resume_exact_link');
    if (!resume && ['pending', 'active'].includes(person.accessStatus)) guardFailure('family_link_open');
    stage = 'publication-owner-guard';
    if (baseline.currentPublication && !/^Publicación documental sintética QA R5|^QA R5 /.test(baseline.currentPublication.introduction)) guardFailure('publication_intro_owner');
    if (baseline.currentPublication?.familyPersonIds.some(id => id !== person.id)) guardFailure('publication_recipients_owner');
    stage = 'program-revision-guard';
    const programs = baseline.programVersions.filter(row => row.title.startsWith('QA ') && row.state === 'released');
    const revisions = baseline.recordRevisions.filter(row => row.measurement.schemaVersion === 2);
    if (!programs.length) guardFailure('program_released_missing');
    if (!revisions.length) guardFailure('revision_v2_missing');
    const program = programs[0], revision = revisions[0];
    if (baseline.programVersions.filter(row => `${row.title} · v${row.version}` === `${program.title} · v${program.version}`).length !== 1) guardFailure('program_option_ambiguous');
    if (baseline.recordRevisions.filter(row => row.recordId.slice(0, 8) === revision.recordId.slice(0, 8) && row.revision === revision.revision).length !== 1) guardFailure('revision_option_ambiguous');
    stage = 'pending-links-read';
    const receivedBefore = await links();
    if (receivedBefore.links.some(row => row.familyLabel === familyName && row.status === 'pending')) guardFailure('pending_link_ambiguous');
    const oldLinkIds = new Set(receivedBefore.links.map(row => row.id));
    const otherLinks = receivedBefore.links.filter(row => row.familyPersonId !== person.id).map(row => ({ id: row.id, version: row.version, status: row.status }));
    stage = resume ? 'resume-own-read' : 'invite-own'; await login(page, account('admin-a')); await page.goto(`/students/${studentId}?tab=family`);
    const access = card(page, 'Acceso al portal familiar');
    // Management RPC orders by label, person.id; FamilyManagementPanel renders map unchanged.
    // Verify every visible row against that ordered RPC before using the exact ID's index.
    const rowSource = await manage();
    const rowIndex = rowSource.familyPeople.findIndex(row => row.id === person.id);
    if (rowIndex < 0) guardFailure('family_row_order');
    const accessRows = access.locator('tbody tr');
    await expect(accessRows).toHaveCount(rowSource.familyPeople.length);
    const rowMatches = await accessRows.evaluateAll((rows, expected) => rows.every((row, index) => {
      const cells = row.querySelectorAll('td');
      return cells[0]?.textContent?.trim() === expected[index].label
        && cells[1]?.textContent?.trim() === (expected[index].email ?? 'Sin correo');
    }), rowSource.familyPeople.map(row => ({ label: row.label, email: row.email })));
    if (!rowMatches) guardFailure('family_row_order');
    const ownRow = accessRows.nth(rowIndex);
    if (!resume) {
    await expect(ownRow.getByRole('button', { name: 'Invitar', exact: true })).toBeEnabled(); await ownRow.getByRole('button', { name: 'Invitar', exact: true }).click();
    let invited;
    await expect.poll(async () => { const m = await manage(); const p = m.familyPeople.find(row => row.id === person.id); if (p?.accessStatus === 'pending') invited = p; return p?.accessStatus; }).toBe('pending');
    evidence.linkId = invited.accessLinkId; if (!evidence.linkId || oldLinkIds.has(evidence.linkId)) guardFailure('new_link_correlation');
    const received = await links(); const exact = received.links.filter(row => row.id === evidence.linkId && row.studentId === studentId && row.familyPersonId === person.id && row.recipientUserId === account('familia').userId && row.status === 'pending');
    expect(exact).toHaveLength(1);
    } else {
      evidence.linkId = resumeLinkId;
      const received = await links();
      const exact = received.links.filter(row => row.id === resumeLinkId && row.studentId === studentId && row.familyPersonId === person.id && row.recipientUserId === account('familia').userId && row.status === 'active');
      if (exact.length !== 1) guardFailure('resume_exact_link');
    }
    stage = resume ? 'resume-family-login' : 'accept-own'; familyContext = await browser.newContext({ baseURL, viewport: testInfo.project.use.viewport, isMobile: testInfo.project.use.isMobile, hasTouch: testInfo.project.use.hasTouch }); const familyPage = await familyContext.newPage();
    await login(familyPage, account('familia'));
    if (!resume) { await familyPage.goto('/invitations');
    const pending = familyPage.getByRole('row').filter({ has: familyPage.getByText(familyName, { exact: true }) });
    await expect(pending).toHaveCount(1); await pending.getByRole('button', { name: 'Aceptar', exact: true }).click();
    await expect.poll(async () => (await links()).links.find(row => row.id === evidence.linkId)?.status).toBe('active'); }
    await page.goto(`/students/${studentId}?tab=family`); await expect(ownRow.getByRole('button', { name: 'Revocar', exact: true })).toBeEnabled();
    const active = await manage();
    const publication = card(page, 'Publicación familiar');
    const desired = { familyPersonIds: [person.id], programVersionIds: [...new Set([...(active.currentPublication?.programVersionIds ?? []), program.id])], recordRevisionIds: [...new Set([...(active.currentPublication?.recordRevisionIds ?? []), revision.id])], attachmentVersionIds: [...(active.currentPublication?.attachmentVersionIds ?? [])] };
    if (desired.attachmentVersionIds.some(id => !active.attachmentVersions.some(row => row.id === id))) guardFailure('attachment_unselectable');
    stage = 'publish-select-fields';
    if (!active.currentPublication?.familyPersonIds.includes(person.id)) await selectValue(page, 'Destinatarios con acceso activo', person.label);
    if (!active.currentPublication?.programVersionIds.includes(program.id)) await selectValue(page, 'Versiones de programas', `${program.title} · v${program.version}`);
    if (!active.currentPublication?.recordRevisionIds.includes(revision.id)) await selectValue(page, 'Revisiones de resultados', `Registro ${revision.recordId.slice(0, 8)} · revisión ${revision.revision}`);
    const resumeIntroduction = process.env.ABA_QA_FAMILY_PUBLICATIONS_RESUME_INTRODUCTION;
    if (resumeIntroduction && (!resume || !resumeIntroduction.startsWith('QA R5 FAMILIA PROGRAMA RESULTADO V5 mobile ') || active.currentPublication?.introduction !== resumeIntroduction)) guardFailure('resume_exact_publication');
    const introduction = resumeIntroduction ?? `QA R5 FAMILIA PROGRAMA RESULTADO V5 ${testInfo.project.name} ${Date.now()}`;
    evidence.introduction = introduction;
    let current;
    if (resumeIntroduction) {
      stage = 'publish-reconcile-committed'; current = active.currentPublication;
    } else {
      stage = 'publish-introduction'; await page.getByRole('textbox', { name: 'Introducción', exact: true }).fill(introduction);
      stage = 'publish-button-ready'; const publish = publication.getByRole('button', { name: active.currentPublication ? 'Publicar nueva versión' : 'Publicar para familia', exact: true }); await expect(publish).toBeEnabled(); await expect(publish).toBeVisible();
      stage = 'publish-button-click';
      if (testInfo.project.name === 'mobile') {
        await publish.scrollIntoViewIfNeeded();
        const target = await publish.evaluate(button => {
          const rect = button.getBoundingClientRect(), visual = window.visualViewport;
          const x = rect.left + rect.width / 2 - (visual?.offsetLeft ?? 0), y = rect.top + rect.height / 2 - (visual?.offsetTop ?? 0);
          const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
          return { x, y, ownsTarget: hit === button || button.contains(hit) };
        });
        if (!target.ownsTarget || target.x < 0 || target.y < 0) guardFailure('touch_target');
        await page.touchscreen.tap(target.x, target.y);
      } else await publish.click();
      stage = 'publish-rpc-poll'; await expect.poll(async () => { current = (await manage()).currentPublication; return current?.introduction; }).toBe(introduction);
      stage = 'publish-version'; expect(current.version).toBe((active.currentPublication?.version ?? 0) + 1);
    }
    evidence.publicationId = current.id;
    stage = 'publish-exact-resource-ids'; for (const key of Object.keys(desired)) expect(sorted(current[key])).toEqual(sorted(desired[key]));
    stage = 'portal-exact'; await familyPage.goto('/family'); await expect(familyPage.getByRole('heading', { name: 'Portal Familiar', exact: true })).toBeVisible(); await expect(familyPage.getByText(introduction, { exact: true })).toBeVisible();
    const publicRead = await portal(); expect(publicRead.actorId).toBe(account('familia').userId);
    const publications = publicRead.publications.filter(row => row.id === current.id); expect(publications).toHaveLength(1); const visible = publications[0];
    expect(sorted(visible.programs.map(row => row.id))).toEqual(sorted(desired.programVersionIds)); expect(sorted(visible.results.map(row => row.id))).toEqual(sorted(desired.recordRevisionIds)); expect(sorted(visible.documents.map(row => row.id))).toEqual(sorted(desired.attachmentVersionIds));
    const selectedResult = visible.results.find(row => row.id === revision.id); expect(selectedResult.measurement).toEqual(revision.measurement);
    const selectedProgram = visible.programs.find(row => row.id === program.id); expect(selectedProgram.title).toBe(program.title); expect(selectedProgram.version).toBe(program.version);
    await expect(familyPage.getByText(program.title, { exact: true }).first()).toBeVisible(); await expect(familyPage.getByText(`Registro publicado · revisión ${revision.revision}`, { exact: true }).first()).toBeVisible();
    expect(await read(familyClient, 'get_student_capabilities', { p_client_id: studentId })).toEqual([]);
    expect(await read(familyClient, 'aba_student_detail_v2', { p_organization_id: manifest.clinics.A, p_client_id: studentId })).toBeNull();
    const memberships = await familyClient.from('memberships').select('organization_id').eq('user_id', account('familia').userId); if (memberships.error) guardFailure('membership_read'); expect(memberships.data).toEqual([]);
    const foreign = await read(foreignClient, 'aba_family_portal_read_v2', { p_organization_id: manifest.clinics.A }); expect(foreign.publications.some(row => row.id === current.id)).toBe(false);
    stage = 'revoke-own'; const latest = await manage(); const currentPerson = latest.familyPeople.find(row => row.id === person.id); if (currentPerson.accessLinkId !== evidence.linkId || currentPerson.accessStatus !== 'active') guardFailure('link_ownership_changed');
    page.once('dialog', dialog => dialog.accept()); await ownRow.getByRole('button', { name: 'Revocar', exact: true }).click();
    await expect.poll(async () => (await links()).links.find(row => row.id === evidence.linkId)?.status).toBe('revoked');
    await familyPage.goto('/family'); await expect(familyPage.getByText(introduction, { exact: true })).toHaveCount(0);
    expect((await portal()).publications.some(row => row.id === current.id)).toBe(false);
    const after = await manage(); expect(after.currentPublication.id).toBe(current.id); expect(after.currentPublication.version).toBe(current.version);
    const preserved = (await links()).links.filter(row => row.familyPersonId !== person.id).map(row => ({ id: row.id, version: row.version, status: row.status })); expect(preserved).toEqual(otherLinks);
    expect(after.recordRevisions.find(row => row.id === revision.id).measurement).toEqual(revision.measurement);
    const sanitizedSuccess = JSON.stringify({ ...evidence, programVersionId: program.id, revisionId: revision.id, publicationVersion: current.version, exactProjection: true, revoked: true, noClinicalMembership: true }, null, 2);
    writeFileSync(testInfo.outputPath('family-publications-v5-safe.json'), sanitizedSuccess, 'utf8');
    await testInfo.attach('family-publications-v5-safe', { body: sanitizedSuccess, contentType: 'application/json' });
  } catch (error) { const code = guardCodes.has(error?.qaGuardCode) ? error.qaGuardCode : 'stage_failure'; writeFileSync(testInfo.outputPath('family-publications-v5-safe-failure.json'), JSON.stringify({ ...evidence, stage, code }), 'utf8'); throw new Error(`Ensayo familiar falló en ${stage} (${code}); IDs propios en diagnóstico saneado, datos/credenciales omitidos; no cancelar vínculos por inferencia`); }
  finally { if (familyContext) await familyContext.close(); for (const client of clients) await client.auth.signOut({ scope: 'local' }); try { await page.goto('about:blank'); } catch { /* Sanitize failure context. */ } }
});

import { randomUUID, createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import { localStatus, state } from '../../scripts/local/write-env.mjs';
import { readPersistedMeasurement } from '../../src/domain/measurements/measurement-v2.ts';
import { searchResultSchema } from '../../src/modules/search/contracts.ts';

const batch = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
const own = '94d73448-03ec-495c-8add-30c3cfe05eaa';
const fallback = 'b347646e-ff29-450b-aedf-9f9c015fb41a';
const build = 'rFuUzZbqYsCB2mKTHX09X';
const kindLabels = { student: 'Estudiante', program: 'Programa', document: 'Documento' };
const dimensionLabels = { percentage: 'Porcentaje', frequency: 'Frecuencia', interval: 'Intervalos', duration: 'Duración', latency: 'Latencia' };
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
test.skip(process.env.ABA_QA_AUTHORIZED_SEARCH_V13 !== '1', 'Synthetic readonly authorized search opt-in');
function hasCommand(value) {
  if (!value || typeof value !== 'object') return false;
  if (value.operationId && value.idempotencyKey) return true;
  return Object.values(value).some(hasCommand);
}

test('V13 authorized student program document results real navigation and clinic B isolation', async ({ page, browser }, info) => {
  test.setTimeout(240000);
  expect(process.cwd().replaceAll('\\', '/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
  // No Auth, browser navigation, or fixture lookup is allowed before root closes its temporary grants.
  const group = JSON.parse(readFileSync('.aba.local/qa/shared-group-v13-fixture-journal.json', 'utf8'));
  expect(group.status, 'Shared-group cleanup must be terminal before Auth').toBe('complete');
  expect(readFileSync('.aba.local/qa/next-build-v13-shared/BUILD_ID', 'utf8').trim()).toBe(build);
  const jf = path.join(state, 'qa', `authorized-search-v13-${info.project.name}-journal.json`);
  const prior = existsSync(jf) ? JSON.parse(readFileSync(jf)) : null;
  const resume = prior?.status === 'pending' && process.env.ABA_QA_AUTHORIZED_SEARCH_RESUME === prior.runId;
  if (prior?.status === 'pending' && !resume) throw Error('Pending search journal: inspect before another execution');
  if (resume) { expect(prior.stage).toBe('discover-existing-synthetic-resources'); expect(prior.searches).toEqual([]); expect(prior.checks).toEqual([]); expect(prior.attemptedWrites).toBe(0); expect(prior.diagnostic).toBe('No existing authorized synthetic document: no fixture creation permitted'); }
  const j = { runId: resume ? prior.runId : randomUUID(), resumedDiscovery: !!resume, status: 'pending', stage: 'guard', project: info.project.name, buildId: build, groupRunId: group.runId, checks: [], searches: [], attemptedWrites: 0 };
  const save = () => writeFileSync(jf, JSON.stringify(j, null, 2) + '\n');
  const stage = value => { j.stage = value; save(); };
  save();
  const m = JSON.parse(readFileSync(path.join(state, 'batches', batch + '.json'), 'utf8'));
  expect(m.state).toBe('ready');
  const s = localStatus(); expect(s.API_URL).toBe('http://127.0.0.1:54321');
  const clients = [], contexts = [];
  const client = () => { const db = createClient(s.API_URL, s.ANON_KEY ?? s.PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }); clients.push(db); return db; };
  const rpc = async (db, name, args) => { const response = await db.rpc(name, args); if (response.error) throw Error('Ordinary read unavailable: ' + name); return response.data; };
  const detail = (db, id) => rpc(db, 'aba_student_detail_v2', { p_organization_id: m.clinics.A, p_client_id: id });
  const records = (db, id) => rpc(db, 'read_program_session_v2', { p_clinic_id: m.clinics.A, p_student_id: id });
  const documents = (db, id) => rpc(db, 'aba_attachment_list_v2', { p_organization_id: m.clinics.A, p_resource: { kind: 'student', clinicId: m.clinics.A, studentId: id }, p_include_archived: false });
  const signIn = async (db, label) => {
    const account = m.accounts.find(row => row.label === label);
    if (account?.email !== `${label}.${batch}@aba.example.test`) throw Error('Synthetic identity guard failed');
    const auth = await db.auth.signInWithPassword({ email: account.email, password: account.password });
    if (auth.error || auth.data.user?.id !== account.userId || auth.data.user.app_metadata.aba_fixture_batch !== batch) throw Error('Synthetic authentication not confirmed');
    return account;
  };
  const guardWrites = async p => p.route(url => url.origin === 'http://localhost:3001', async route => {
    const request = route.request();
    if (request.method() === 'POST' && request.headers()['next-action']) {
      let body;
      try { body = JSON.parse(request.postData() ?? '[]'); } catch { body = null; }
      if (hasCommand(body)) { j.attemptedWrites++; save(); await route.abort('failed'); return; }
    }
    await route.continue();
  });
  const uiLogin = async (p, account) => {
    try {
      await p.goto('/login');
      await p.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
      await p.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(account.password);
      await p.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
      await expect(p).toHaveURL(/\/dashboard$/);
    } catch { throw Error('Synthetic browser login not confirmed'); }
  };
  const openSearch = async p => {
    await p.getByRole('button', { name: 'Abrir búsqueda autorizada', exact: true }).click();
    const modal = p.getByRole('dialog', { name: 'Búsqueda autorizada', exact: true });
    await expect(modal).toBeVisible(); return modal;
  };
  const search = async (p, db, clinic, query, label) => {
    const expected = (await rpc(db, 'aba_authorized_search_v2', { p_organization_id: clinic, p_query: query, p_limit: 30 })).map(row => searchResultSchema.parse(row));
    const modal = await openSearch(p);
    await modal.getByRole('textbox', { name: 'Estudiante, ID clínico, RUT, programa o documento', exact: true }).fill(query);
    await modal.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(modal.getByRole('button', { name: 'Abrir', exact: true })).toHaveCount(expected.length);
    if (!expected.length) await expect(modal.getByText('No hay coincidencias autorizadas.', { exact: true })).toBeVisible();
    for (const [index, item] of expected.entries()) {
      const row = modal.locator('.mantine-Paper-root').nth(index);
      await expect(row.getByText(item.title, { exact: true })).toBeVisible();
      await expect(row.getByText(kindLabels[item.kind], { exact: true })).toBeVisible();
      await expect(row.getByText(item.subtitle, { exact: true })).toBeVisible();
    }
    j.searches.push({ label, query, clinicId: clinic, results: expected }); save();
    return { modal, expected };
  };
  const openResult = async (p, result, selected) => {
    const index = result.expected.findIndex(row => row.kind === selected.kind && row.id === selected.id);
    expect(index).toBeGreaterThanOrEqual(0);
    await result.modal.locator('.mantine-Paper-root').nth(index).getByRole('button', { name: 'Abrir', exact: true }).click();
    await expect(p).toHaveURL('http://localhost:3001' + selected.path);
    await expect(result.modal).toHaveCount(0);
  };
  try {
    stage('discover-existing-synthetic-resources');
    const a = client(), accountA = await signIn(a, 'admin-a');
    const beforeOwn = await detail(a, own); expect(beforeOwn.clinicalId).toBe('QA-R5-LIFECYCLE-V5');
    const beforePrograms = await records(a, own), ownDocs = await documents(a, own);
    let docStudent = own, docDetail = beforeOwn, docList = ownDocs;
    const syntheticDocs = rows => rows.filter(row => row.state === 'available' && row.upload.purpose === 'student-document' && /^qa[-_ ]/i.test(row.upload.fileName) && (row.testBatchId === batch || (docStudent === fallback && row.testBatchId === null && row.attachmentId === 'b6b17132-72a9-464a-907b-9c1d002b7fb4' && row.id === 'a839a0ff-de63-4652-b1fa-96f0bb387495' && row.upload.fileName === 'qa-r5-doc-v2-mull0so3.png' && row.upload.sha256 === 'bc21a4fa21aaa7c5eb60fbd88394d86813afd10ad287bf7274d0e1c588ea2764' && row.upload.byteLength === 68 && row.version === 2 && row.createdBy === accountA.userId && row.resource.studentId === fallback && row.resource.clinicId === m.clinics.A)));
    if (!syntheticDocs(docList).length) {
      docStudent = fallback; docDetail = await detail(a, fallback);
      expect(docDetail.clinicalId).toBe('QA-R5-A-2155E99E'); docList = await documents(a, fallback);
    }
    const documentCandidates = syntheticDocs(docList).sort((left, right) => right.version - left.version);
    if (!documentCandidates.length) throw Error('No existing authorized synthetic document: no fixture creation permitted');
    let doc, docResult;
    for (const candidate of documentCandidates) {
      const hits = await rpc(a, 'aba_authorized_search_v2', { p_organization_id: m.clinics.A, p_query: candidate.upload.fileName.slice(0, 80), p_limit: 30 });
      const match = hits.find(row => row.kind === 'document' && row.id === candidate.attachmentId && row.title === candidate.upload.fileName && row.studentId === docStudent);
      if (match) { doc = candidate; docResult = searchResultSchema.parse(match); break; }
    }
    if (!doc) throw Error('Available synthetic document has no current authorized search result');
    const candidates = beforePrograms.programs.flatMap(program => {
      const version = program.versions.find(row => row.id === program.currentVersionId);
      return version && /^QA[ -]/i.test(version.title) ? [{ program, version }] : [];
    }).sort((left, right) => Number(right.version.title === 'QA R5 CICLO V5') - Number(left.version.title === 'QA R5 CICLO V5'));
    expect(candidates.length).toBeGreaterThan(0); const selectedProgram = candidates[0];
    j.resources = { studentId: own, studentVersion: beforeOwn.version, programId: selectedProgram.program.id, programRevision: selectedProgram.program.revision, programVersionId: selectedProgram.version.id, programVersionNumber: selectedProgram.version.number, documentStudentId: docStudent, documentAttachmentId: doc.attachmentId, documentVersionId: doc.id, documentVersion: doc.version, documentTestBatchId: doc.testBatchId, documentSha256: doc.upload.sha256, documentByteLength: doc.upload.byteLength, documentCreatorId: doc.createdBy, documentProvenance: doc.testBatchId === batch ? 'fixture-batch-metadata' : 'offline-v5-exact-known-tuple' };
    const beforeFallbackPrograms = docStudent === fallback ? await records(a, fallback) : null;
    j.baselineHashes = { own: hash(beforeOwn), programs: hash(beforePrograms), ownDocs: hash(ownDocs), documentStudent: hash(docDetail), documentList: hash(docList), fallbackPrograms: hash(beforeFallbackPrograms) }; save();
    await guardWrites(page); await uiLogin(page, accountA);
    stage('query-invalid-empty-no-match');
    let modal = await openSearch(page);
    for (const query of ['', 'q']) {
      await modal.getByRole('textbox').fill(query); await modal.getByRole('button', { name: 'Buscar', exact: true }).click();
      await expect(modal.getByRole('alert')).toBeVisible(); await expect(modal.getByRole('button', { name: 'Abrir', exact: true })).toHaveCount(0);
    }
    await page.keyboard.press('Escape'); await expect(modal).toHaveCount(0);
    const noMatch = await search(page, a, m.clinics.A, 'QA-NO-MATCH-V13-' + j.runId, 'A-no-match'); expect(noMatch.expected).toEqual([]);
    await page.keyboard.press('Escape'); await expect(noMatch.modal).toHaveCount(0); j.checks.push('empty-and-one-character-validation-no-results-and-close');
    stage('student-result-navigation');
    let result = await search(page, a, m.clinics.A, beforeOwn.clinicalId, 'A-student');
    const studentResult = result.expected.find(row => row.kind === 'student' && row.id === own);
    expect(studentResult).toBeDefined(); expect(studentResult.path).toBe('/students/' + own);
    await openResult(page, result, studentResult);
    await expect(page.getByRole('textbox', { name: 'Identificador clínico', exact: true })).toHaveValue(beforeOwn.clinicalId);
    await expect(page.getByRole('textbox', { name: 'Nombre completo', exact: true })).toHaveValue(beforeOwn.fullName ?? '');
    await page.reload(); await expect(page.getByRole('textbox', { name: 'Identificador clínico', exact: true })).toHaveValue(beforeOwn.clinicalId);
    j.checks.push('student-dto-result-real-click-route-fields-reload');
    stage('program-result-navigation');
    result = await search(page, a, m.clinics.A, selectedProgram.version.title.slice(0, 80), 'A-program');
    const programResult = result.expected.find(row => row.kind === 'program' && row.id === selectedProgram.program.id);
    expect(programResult?.programId).toBe(selectedProgram.program.id); expect(programResult.title).toBe(selectedProgram.version.title);
    expect(programResult.path).toBe(`/students/${own}/programs/${selectedProgram.program.id}/chart`);
    await openResult(page, result, programResult);
    const checkChart = async () => {
      await expect(page.getByRole('heading', { name: selectedProgram.version.title, exact: true })).toBeVisible();
      const submitted = beforePrograms.records.filter(row => row.programId === selectedProgram.program.id && row.submitted && !row.discarded);
      const valid = submitted.flatMap(row => { try { return [{ row, parsed: readPersistedMeasurement(row.originalMeasurement) }]; } catch { return []; } });
      const dimension = valid[0]?.parsed.schemaVersion === 2 ? valid[0].parsed.measurement.dimension : valid[0]?.parsed.original.dimension;
      if (dimension) await expect(page.getByRole('textbox', { name: 'Dimensión', exact: true })).toHaveValue(dimensionLabels[dimension]);
      const v2 = valid.filter(row => row.parsed.schemaVersion === 2 && row.parsed.measurement.dimension === dimension);
      await expect(page.locator('table tbody tr')).toHaveCount(v2.length);
      const legacy = valid.filter(row => row.parsed.schemaVersion === 1 && row.parsed.original.dimension === dimension);
      if (v2.length || legacy.length) await expect(page.getByRole('button', { name: 'Descargar CSV', exact: true })).toBeEnabled();
      else await expect(page.getByRole('button', { name: 'Descargar CSV', exact: true })).toBeDisabled();
    };
    await checkChart(); await page.reload(); await checkChart(); j.checks.push('program-current-version-route-dimension-persisted-row-count-reload');
    stage('document-result-navigation');
    result = await search(page, a, m.clinics.A, doc.upload.fileName.slice(0, 80), 'A-document');
    expect(result.expected).toContainEqual(docResult); expect(docResult.path).toBe('/students/' + docStudent);
    await openResult(page, result, docResult);
    const checkDocument = async () => {
      await page.getByRole('tab', { name: 'Documentación Legal', exact: true }).click();
      const row = page.getByText(doc.upload.fileName, { exact: true }).locator('xpath=ancestor::*[contains(@class,"mantine-Paper-root")][1]');
      await expect(row.getByText('Disponible', { exact: true })).toBeVisible();
      await expect(row.getByText('v' + doc.version, { exact: true })).toBeVisible();
      await expect(row.getByRole('button', { name: 'Descargar', exact: true })).toBeEnabled();
    };
    await checkDocument(); await page.reload(); await checkDocument(); j.checks.push('document-current-metadata-result-real-click-legal-tab-version-reload');
    stage('clinic-B-no-access');
    const b = client(), accountB = await signIn(b, 'admin-b');
    const context = await browser.newContext({ baseURL: 'http://localhost:3001', viewport: info.project.use.viewport, isMobile: info.project.name === 'mobile', hasTouch: info.project.name === 'mobile' }); contexts.push(context);
    const pageB = await context.newPage(); await guardWrites(pageB); await uiLogin(pageB, accountB);
    for (const [label, query] of [['student', beforeOwn.clinicalId], ['program', selectedProgram.version.title.slice(0, 80)], ['document', doc.upload.fileName.slice(0, 80)]]) {
      const denied = await search(pageB, b, m.clinics.B, query, 'B-' + label);
      expect(denied.expected.some(row => [own, docStudent].includes(row.studentId))).toBe(false);
      expect(denied.expected.some(row => [selectedProgram.program.id, doc.attachmentId].includes(row.id))).toBe(false);
      await pageB.keyboard.press('Escape'); await expect(denied.modal).toHaveCount(0);
    }
    await pageB.goto(programResult.path); await expect(pageB.getByRole('heading', { name: 'Página no encontrada', exact: true })).toBeVisible();
    await expect(pageB.getByRole('button', { name: 'Descargar CSV', exact: true })).toHaveCount(0);
    for (const id of new Set([own, docStudent])) {
      await pageB.goto('/students/' + id);
      await expect(pageB.getByText('No existe o no tienes acceso vigente a esta carpeta.', { exact: true })).toBeVisible();
      await expect(pageB.getByRole('textbox', { name: 'Nombre completo', exact: true })).toHaveCount(0);
      await expect(pageB.getByRole('tab', { name: 'Documentación Legal', exact: true })).toHaveCount(0);
    }
    j.checks.push('clinic-B-search-omits-A-resources-and-direct-student-program-document-routes-denied');
    stage('exact-baseline-preserved');
    expect(await detail(a, own)).toEqual(beforeOwn); expect(await records(a, own)).toEqual(beforePrograms); expect(await documents(a, own)).toEqual(ownDocs);
    expect(await detail(a, docStudent)).toEqual(docDetail); expect(await documents(a, docStudent)).toEqual(docList);
    if (docStudent === fallback) expect(await records(a, fallback)).toEqual(beforeFallbackPrograms);
    expect(j.attemptedWrites).toBe(0); j.checks.push('clinical-program-session-document-metadata-exact-no-command-write');
    j.status = 'complete'; stage('complete');
    writeFileSync(path.join(state, 'qa', `authorized-search-v13-${info.project.name}-safe.json`), JSON.stringify({ passed: true, project: info.project.name, buildId: build, runId: j.runId, groupRunId: j.groupRunId, resources: j.resources, checks: j.checks, searches: j.searches.map(row => ({ label: row.label, count: row.results.length, resultIds: row.results.map(item => item.id) })), baselineHashes: j.baselineHashes, attemptedWrites: j.attemptedWrites, limits: ['admin-a and admin-b synthetic only', 'no document download or writes', 'not acceptance of all QA003 actions'] }, null, 2) + '\n');
  } catch (error) {
    j.errorType = error.name; j.diagnostic = String(error.message ?? '').slice(0, 1800); save();
    throw Error('Authorized search not confirmed at ' + j.stage);
  } finally {
    for (const context of contexts) await context.close();
    for (const db of clients) await db.auth.signOut({ scope: 'local' });
  }
});


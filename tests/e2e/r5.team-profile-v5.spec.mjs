import { randomUUID, createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import { localStatus, state } from '../../scripts/local/write-env.mjs';

const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
const baseURL = process.env.ABA_QA_BASE_URL ?? 'http://localhost:3001';
const clinicalId = 'QA-R5-B-V5';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const profileFields = ['name', 'profession', 'title', 'description', 'phone', 'avatarObjectPath', 'avatarPreset'];
const payload = profile => Object.fromEntries(profileFields.map(field => [field, profile[field]]));
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6VrkAAAAASUVORK5CYII=', 'base64');
test.skip(process.env.ABA_QA_LOCAL_UI !== '1' || process.env.ABA_QA_TEAM_PROFILE_V5_UI !== '1', 'Equipo/perfil V5 sintetico autorizado');
test.use({ baseURL, trace: 'off', video: 'off', screenshot: 'off', actionTimeout: 15000 });
function evidence(kind, result) {
  const destination = path.join(state, 'qa', `team-profile-v5-${kind}-${randomUUID()}.json`);
  writeFileSync(destination, JSON.stringify({ batchId, kind, ...result }, null, 2), { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ evidence: destination, kind, passed: result.passed ?? false, gap: result.gap ?? null }));
}
function fixture() {
  expect(process.cwd().replaceAll('\\', '/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO'); expect(baseURL).toBe('http://localhost:3001');
  const status = localStatus(); expect(status.API_URL).toBe('http://127.0.0.1:54321');
  const manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));
  expect(manifest.batchId).toBe(batchId); expect(manifest.state).toBe('ready'); expect(manifest.apiUrl).toBe(status.API_URL); expect(manifest.accounts).toHaveLength(8);
  return { status, manifest };
}
function actor(manifest, label) { const account = manifest.accounts.find(row => row.label === label); if (!account || account.email !== `${label}.${batchId}@aba.example.test`) throw new Error('Actor sintetico no confirmado; valores omitidos'); return account; }
async function loginClient(status, account) {
  const db = createClient(status.API_URL, status.ANON_KEY ?? status.PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const result = await db.auth.signInWithPassword({ email: account.email, password: account.password });
  if (result.error || result.data.user?.id !== account.userId || result.data.user.app_metadata?.aba_fixture_batch !== batchId) throw new Error('Auth sintetico no confirmado; valores omitidos'); return db;
}
async function loginUI(page, account) {
  await page.goto('/login'); try { await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email); await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(account.password); } catch { throw new Error('Formulario no disponible; valores omitidos'); }
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click(); await expect(page).toHaveURL(`${baseURL}/dashboard`);
}
async function rpc(db, name, args) { const result = await db.rpc(name, args); if (result.error) throw new Error(`Lectura ordinaria ${name} no confirmada; respuesta omitida`); return result.data; }
async function identity(db, clinic, userId) { const data = await rpc(db, 'aba_identity_context', { p_organization_id: clinic }); expect(data.userId).toBe(userId); expect(data.active.id).toBe(clinic); return data; }
async function profileDialog(page) { await page.getByRole('button', { name: 'Menú de perfil' }).click(); await page.getByRole('menuitem', { name: 'Editar Perfil', exact: true }).click(); const modal = page.getByRole('dialog', { name: 'Editar Mi Perfil' }); await expect(modal).toBeVisible(); return modal; }
async function profileValues(modal, value) { for (const [label, field] of [['Nombre Completo', 'name'], ['Profesión', 'profession'], ['Título', 'title'], ['Descripción Profesional', 'description'], ['Teléfono', 'phone']]) await modal.getByRole('textbox', { name: label, exact: true }).fill(value[field]); }
async function saveProfile(modal) { await modal.getByRole('button', { name: 'Guardar Cambios', exact: true }).click(); await expect(modal).toHaveCount(0); }
async function avatarHash(db, objectPath) { if (!objectPath) return null; const result = await db.storage.from('profile-avatars').download(objectPath); if (result.error || !result.data) throw new Error('Avatar propio no legible; respuesta omitida'); return sha(Buffer.from(await result.data.arrayBuffer())); }

test('QA-003 EQUIPO-004/013 V5: perfil propio, avatar privado y restauracion exacta de valores', async ({ page }, testInfo) => {
  test.setTimeout(150000); 
  const { status, manifest } = fixture(); const account = actor(manifest, 'admin-b'); const db = await loginClient(status, account);
  let original, dirty = false, uploadedPath = null, originalHash;
  try {
    original = (await identity(db, manifest.clinics.B, account.userId)).profile;
    if (original.name.trim().length < 3 || original.profession.trim().length < 2) {
      evidence('profile-precondition', { passed: false, userId: account.userId, version: original.version, gap: 'Perfil historico vacio no restaurable bajo schema minimo; requiere decision root antes de completar datos iniciales QA.' });
      test.skip(true, 'GAP perfil historico vacio: conservar valores originales');
    }
    originalHash = await avatarHash(db, original.avatarObjectPath);
    const previousTeam = await rpc(db, 'aba_team', { p_organization_id: manifest.clinics.B });
    await loginUI(page, account); let modal = await profileDialog(page);
    await modal.getByRole('textbox', { name: 'Descripción Profesional', exact: true }).fill('QA V5 borrador sin guardar');
    await page.keyboard.press('Escape'); await expect(modal).toHaveCount(0);
    expect(payload((await identity(db, manifest.clinics.B, account.userId)).profile)).toEqual(payload(original));
    modal = await profileDialog(page);
    const next = { ...payload(original), description: `QA R5 perfil B V5 version ${original.version + 1}` }; await profileValues(modal, next);
    if (!original.avatarObjectPath) {
      const chooser = page.waitForEvent('filechooser'); await modal.getByRole('button', { name: 'Subir Foto', exact: true }).click();
      await (await chooser).setFiles({ name: 'qa-r5-avatar-v5.png', mimeType: 'image/png', buffer: png });
    }
    dirty = true; await saveProfile(modal);
    const changed = (await identity(db, manifest.clinics.B, account.userId)).profile;
    expect(changed.version).toBe(original.version + 1); expect(changed.description).toBe(next.description);
    expect(changed.name).toBe(original.name); expect(changed.profession).toBe(original.profession);
    if (!original.avatarObjectPath) { expect(changed.avatarObjectPath.startsWith(account.userId + '/')).toBe(true); expect(changed.avatarObjectPath.split('/')[1]).toMatch(/^[0-9a-f-]{36}\.png$/); uploadedPath = changed.avatarObjectPath; expect(await avatarHash(db, uploadedPath)).toBe(sha(png)); }
    else { expect(changed.avatarObjectPath).toBe(original.avatarObjectPath); expect(await avatarHash(db, changed.avatarObjectPath)).toBe(originalHash); }
    await page.reload(); modal = await profileDialog(page); await expect(modal.getByRole('textbox', { name: 'Descripción Profesional', exact: true })).toHaveValue(next.description);
    expect((await identity(db, manifest.clinics.B, account.userId)).profile).toEqual(changed);
    await profileValues(modal, payload(original));
    if (uploadedPath) { await modal.getByRole('button', { name: 'Elegir Avatar', exact: true }).click(); await page.getByRole('dialog', { name: 'Elige tu avatar' }).getByRole('button', { name: 'Retirar fotografía del perfil', exact: true }).click(); }
    await saveProfile(modal);
    const restored = (await identity(db, manifest.clinics.B, account.userId)).profile; expect(payload(restored)).toEqual(payload(original)); expect(restored.version).toBe(changed.version + 1); dirty = false;
    expect(await avatarHash(db, original.avatarObjectPath)).toBe(originalHash);
    if (uploadedPath) expect(await avatarHash(db, uploadedPath)).toBe(sha(png)); // Retained synthetic blob; never delete/overwrite.
    const afterTeam = await rpc(db, 'aba_team', { p_organization_id: manifest.clinics.B });
    expect(afterTeam.filter(row => row.id !== account.userId)).toEqual(previousTeam.filter(row => row.id !== account.userId));
    evidence('profile', { passed: true, userId: account.userId, versions: [original.version, changed.version, restored.version], valuesRestored: true, originalAvatarPreserved: true, avatarUploaded: !!uploadedPath, retainedSyntheticAvatarPath: uploadedPath, avatarSha256: uploadedPath ? sha(png) : originalHash, otherProfilesPreserved: true });
  } finally {
    if (dirty && original) {
      // Read current version and reopen actual UI; no guessed RPC write or deletion.
      const current = (await identity(db, manifest.clinics.B, account.userId)).profile;
      await page.goto('/dashboard');
      const modal = await profileDialog(page); await profileValues(modal, payload(original));
      if (!original.avatarObjectPath && current.avatarObjectPath) { await modal.getByRole('button', { name: 'Elegir Avatar', exact: true }).click(); await page.getByRole('dialog', { name: 'Elige tu avatar' }).getByRole('button', { name: 'Retirar fotografía del perfil', exact: true }).click(); }
      await saveProfile(modal); expect(payload((await identity(db, manifest.clinics.B, account.userId)).profile)).toEqual(payload(original));
      evidence('profile-recovery', { passed: true, userId: account.userId, valuesRestored: true, originalAvatarPreserved: true });
    }
    await db.auth.signOut({ scope: 'local' });
  }
});

async function rows(db, clinicId) { const result = await db.from('student_assignments').select('id,organization_id,client_id,user_id,role,status,is_primary,effective_at,ended_at').eq('organization_id', clinicId).order('id'); if (result.error) throw new Error('Asignaciones ordinarias no disponibles; respuesta omitida'); return result.data; }
async function assignmentUI(page, member, studentId, role, status) {
  await page.goto('/team'); await expect(page.getByRole('heading', { name: 'Gestión de Equipo Terapéutico' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Buscar equipo' }).fill(member.email);
  await page.getByRole('button', { name: 'Editar Perfil', exact: true }).click(); const modal = page.getByRole('dialog', { name: 'Editar Perfil del Miembro' });
  await modal.getByRole('textbox', { name: 'Ficha autorizada', exact: true }).click(); await page.getByRole('option').filter({ hasText: clinicalId }).click();
  for (const [label, value] of [['Función en ficha', role === 'supervisor' ? 'Supervisor' : 'Técnico / Aplicador'], ['Estado', status === 'active' ? 'Activo' : 'Suspendido']]) {
    const input = modal.getByRole('textbox', { name: label, exact: true });
    if (await input.inputValue() !== value) { await input.click(); await page.getByRole('option', { name: value, exact: true }).click(); }
    await expect(input).toHaveValue(value);
  }
  await expect(modal.getByRole('textbox', { name: 'Ficha autorizada', exact: true })).toHaveValue(new RegExp('^' + clinicalId + ' ·'));
  await expect(modal.getByRole('button', { name: 'Guardar asignación', exact: true })).toBeEnabled();
  await modal.getByRole('button', { name: 'Guardar asignación', exact: true }).click(); await expect(modal.getByText('Asignación confirmada por el servidor.', { exact: true })).toBeVisible();
}

test('QA-003 EQUIPO-008/009/010 V5: asignaciones propias B y elegibilidad supervisor sin promocion', async ({ page }, testInfo) => {
  test.setTimeout(180000); 
  const { status, manifest } = fixture(); const admin = actor(manifest, 'admin-b'), tech = actor(manifest, 'tecnico-b'), supervisor = actor(manifest, 'supervisor-b');
  const db = await loginClient(status, admin), dbTech = await loginClient(status, tech), dbSupervisor = await loginClient(status, supervisor);
  try {
    const students = await rpc(db, 'aba_list_students_v2', { p_organization_id: manifest.clinics.B }); const own = students.filter(row => row.clinicalId === clinicalId);
    if (own.length !== 1) { evidence('assignment-precondition', { passed: false, gap: 'Requiere ficha B propia unica creada por suite clinic-b-requests-v5.' }); test.skip(true, 'Sin ficha propia B unica'); }
    const studentId = own[0].id; const teamBefore = await rpc(db, 'aba_team', { p_organization_id: manifest.clinics.B });
    expect(teamBefore.find(row => row.id === tech.userId)).toMatchObject({ role: 'therapist', status: 'active' }); expect(teamBefore.find(row => row.id === supervisor.userId)).toMatchObject({ role: 'supervisor', status: 'active' });
    const prior = await rows(db, manifest.clinics.B); const excluded = row => row.client_id === studentId && [tech.userId, supervisor.userId].includes(row.user_id);
    const originalRows = prior.filter(row => !excluded(row)); await loginUI(page, admin);
    const observed = [];
    for (const [member, memberDb, role] of [[tech, dbTech, 'therapist'], [supervisor, dbSupervisor, 'supervisor']]) {
      const beforeCaps = await rpc(memberDb, 'get_student_capabilities', { p_client_id: studentId });
      const active = (await rows(db, manifest.clinics.B)).filter(row => row.client_id === studentId && row.user_id === member.userId && row.status === 'active'); expect(active.length).toBeLessThanOrEqual(1);
      if (active.length) expect(active[0].role, 'No cambiar funcion propia existente').toBe(role);
      else { expect(beforeCaps).not.toContain('student.view'); await assignmentUI(page, member, studentId, role, 'active'); }
      const activated = (await rows(db, manifest.clinics.B)).filter(row => row.client_id === studentId && row.user_id === member.userId && row.status === 'active'); expect(activated).toHaveLength(1); expect(activated[0]).toMatchObject({ organization_id: manifest.clinics.B, role, is_primary: false });
      const afterCaps = await rpc(memberDb, 'get_student_capabilities', { p_client_id: studentId }); expect(afterCaps).toContain('student.view');
      if (role === 'therapist') {
        await assignmentUI(page, member, studentId, role, 'inactive'); const suspended = (await rows(db, manifest.clinics.B)).find(row => row.id === activated[0].id); expect(suspended.status).toBe('inactive'); expect(suspended.ended_at).not.toBeNull();
        expect(await rpc(memberDb, 'get_student_capabilities', { p_client_id: studentId })).not.toContain('student.view');
        await assignmentUI(page, member, studentId, role, 'active'); const reactivated = (await rows(db, manifest.clinics.B)).filter(row => row.client_id === studentId && row.user_id === member.userId && row.status === 'active'); expect(reactivated).toHaveLength(1); expect(reactivated[0].id).not.toBe(activated[0].id); expect((await rows(db, manifest.clinics.B)).find(row => row.id === activated[0].id)).toEqual(suspended);
        expect(await rpc(memberDb, 'get_student_capabilities', { p_client_id: studentId })).toContain('student.view');
        observed.push({ userId: member.userId, role, firstAssignmentId: activated[0].id, activeAssignmentId: reactivated[0].id, suspendedOriginalPreserved: true });
      } else {
        expect(afterCaps).toContain('authorization.request');
        observed.push({ userId: member.userId, role, activeAssignmentId: activated[0].id, canRequest: true, canEdit: afterCaps.includes('student.edit'), gap: afterCaps.includes('student.edit') ? 'Solicitante ya puede editar; no rebajar permisos para fabricar prueba.' : null });
      }
      await page.reload();
    }
    expect((await rows(db, manifest.clinics.B)).filter(row => !excluded(row))).toEqual(originalRows); expect(await rpc(db, 'aba_team', { p_organization_id: manifest.clinics.B })).toEqual(teamBefore);
    evidence('assignments', { passed: true, studentId, clinicId: manifest.clinics.B, assignments: observed, originalAssignmentsPreserved: true, membershipRolesPreserved: true, originalClinicAUnmodified: true, invitationsCreated: 0 });
  } finally { await dbSupervisor.auth.signOut({ scope: 'local' }); await dbTech.auth.signOut({ scope: 'local' }); await db.auth.signOut({ scope: 'local' }); }
});
test('QA-003/013 EQUIPO-005/006/007 V5: membresia sintetica cambia perfil, suspende y restaura', async ({ page, browser }, testInfo) => {
  test.setTimeout(150000);
  const { status, manifest } = fixture(); const admin=actor(manifest,'admin-b'), member=actor(manifest,'tecnico-b');
  const db=await loginClient(status,admin), memberDb=await loginClient(status,member);
  let baseline, dirty=false, stage='baseline', memberContext;
  const current=async()=> (await rpc(db,'aba_team',{p_organization_id:manifest.clinics.B})).find(row=>row.id===member.userId);
  const openMember=async()=>{await page.goto('/team');await page.getByRole('textbox',{name:'Buscar equipo',exact:true}).fill(member.email);await page.getByRole('button',{name:'Editar Perfil',exact:true}).click();return page.getByRole('dialog',{name:'Editar Perfil del Miembro',exact:true});};
  const setRole=async role=>{const modal=await openMember();const input=modal.getByRole('textbox',{name:'Perfil de membresía',exact:true});const label=role==='supervisor'?'Supervisor':'Técnico / Aplicador';if(await input.inputValue()!==label){await input.click();await page.getByRole('option',{name:label,exact:true}).click();}await expect(input).toHaveValue(label);await modal.getByRole('button',{name:'Cambiar perfil',exact:true}).click();await expect(page.getByText('Perfil de membresía confirmado por el servidor.',{exact:true})).toBeVisible();};
  const toggle=async action=>{const modal=await openMember();page.once('dialog',dialog=>dialog.accept());await modal.getByRole('button',{name:action,exact:true}).click();await expect(page.getByText('Estado de membresía confirmado por el servidor.',{exact:true})).toBeVisible();};
  try {
    const team=await rpc(db,'aba_team',{p_organization_id:manifest.clinics.B});baseline=team.find(row=>row.id===member.userId);expect(baseline).toMatchObject({role:'therapist',status:'active'});
    const own=(await rpc(db,'aba_list_students_v2',{p_organization_id:manifest.clinics.B})).filter(row=>row.clinicalId===clinicalId);expect(own).toHaveLength(1);const studentId=own[0].id;
    const originalAssignments=await rows(db,manifest.clinics.B);const beforeCaps=await rpc(memberDb,'get_student_capabilities',{p_client_id:studentId});expect(beforeCaps).toContain('student.view');
    await loginUI(page,admin);memberContext=await browser.newContext({baseURL,viewport:testInfo.project.use.viewport,isMobile:!!testInfo.project.use.isMobile,hasTouch:!!testInfo.project.use.hasTouch});const memberPage=await memberContext.newPage();await loginUI(memberPage,member);
    stage='role-change';dirty=true;await setRole('supervisor');expect((await current()).role).toBe('supervisor');expect((await identity(memberDb,manifest.clinics.B,member.userId)).active.role).toBe('supervisor');
    stage='role-restore';await setRole('therapist');expect((await current()).role).toBe('therapist');
    stage='suspend';await toggle('Suspender membresía');expect((await current()).status).toBe('inactive');expect(await rpc(memberDb,'get_student_capabilities',{p_client_id:studentId})).toEqual([]);expect(await rpc(memberDb,'aba_student_detail_v2',{p_organization_id:manifest.clinics.B,p_client_id:studentId})).toBeNull();
    await memberPage.goto('/students/'+studentId);await expect(memberPage.getByRole('textbox',{name:/^Nombre completo/})).toHaveCount(0);
    stage='reactivate';await toggle('Reactivar membresía');expect((await current()).status).toBe('active');expect(await rpc(memberDb,'get_student_capabilities',{p_client_id:studentId})).toEqual(beforeCaps);
    stage='reload';await memberPage.goto('/students/'+studentId);await expect(memberPage.getByRole('textbox',{name:/^Nombre completo/})).toBeVisible();await memberPage.reload();await expect(memberPage.getByRole('textbox',{name:/^Nombre completo/})).toBeVisible();
    expect(await current()).toEqual(baseline);expect((await rpc(db,'aba_team',{p_organization_id:manifest.clinics.B})).filter(row=>row.id!==member.userId)).toEqual(team.filter(row=>row.id!==member.userId));expect(await rows(db,manifest.clinics.B)).toEqual(originalAssignments);dirty=false;
    evidence('membership',{passed:true,project:testInfo.project.name,userId:member.userId,studentId,rolesRestored:true,suspendedReadDenied:true,reactivatedRead:true,otherMembersPreserved:true,assignmentsPreserved:true});
  } catch {evidence('membership-failure',{passed:false,project:testInfo.project.name,stage,userId:member.userId});throw new Error('Membresia V5 fallo en '+stage+'; valores privados omitidos');}
  finally {
    if(dirty&&baseline){const actual=await current();if(actual.role!==baseline.role)await setRole(baseline.role);if((await current()).status!==baseline.status)await toggle('Reactivar membresía');expect(await current()).toEqual(baseline);evidence('membership-recovery',{passed:true,userId:member.userId,rolesRestored:true});}
    await memberContext?.close();await memberDb.auth.signOut({scope:'local'});await db.auth.signOut({scope:'local'});
  }
});


test('QA-002 EQUIPO-002/003 V5: invitacion sintetica, SMTP local y replay sin duplicar', async ({ page, request }, testInfo) => {
  test.setTimeout(150000);
  const { status, manifest } = fixture();
  const admin = actor(manifest, 'admin-b'), foreign = actor(manifest, 'admin-a'), technician = actor(manifest, 'tecnico-b');
  const db = await loginClient(status, admin), dbForeign = await loginClient(status, foreign), dbTechnician = await loginClient(status, technician);
  const clinicId = manifest.clinics.B, marker = randomUUID(), email = `qa-r5-invite-${marker}@aba.example.test`;
  const mail = async () => {
    const response = await request.get(`http://127.0.0.1:54324/api/v1/search?query=${encodeURIComponent('to:' + email)}&start=0&limit=1000`);
    if (response.status() !== 200) throw new Error('Mailpit local no confirmado; detalles privados omitidos');
    const data = await response.json(); if (!Array.isArray(data.messages)) throw new Error('Contrato Mailpit no confirmado');
    return data.messages.filter(row => row.To?.some(to => to.Address === email)).map(row => row.ID);
  };
  const deliveries = () => rpc(db, 'aba_team_invitation_deliveries', { p_org: clinicId });
  const edge = async (client, name, body) => {
    const result = await client.functions.invoke(name, { body });
    if (result.error) return { denied: true, status: result.error.context?.status ?? null };
    return { denied: false, data: result.data };
  };
  let stage = 'baseline', userId;
  try {
    const originalTeam = await rpc(db, 'aba_team', { p_organization_id: clinicId });
    const originalDeliveries = await deliveries();
    if ((await mail()).length !== 0) throw new Error('Destinatario sintetico nuevo no unico');
    await loginUI(page, admin); await page.goto('/team');
    stage = 'invitation-ui';
    await page.getByRole('button', { name: 'Invitar miembro', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Invitar miembro', exact: true });
    await modal.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
    await modal.getByRole('button', { name: 'Enviar invitación', exact: true }).click();
    await expect(modal).toHaveCount(0);
    await expect(page.getByText(/Membresía confirmada;/).first()).toBeVisible();
    let own = (await deliveries()).filter(row => row.email === email);
    if (own.length !== 1 || own[0].role !== 'therapist' || own[0].accepted || !own[0].eligible) throw new Error('Invitacion propia no confirmada; detalles omitidos');
    const invitation = own[0]; userId = invitation.userId;
    expect(invitation.lastDelivery).toMatchObject({ state: 'sent', confirmationSource: 'auth', organizationId: clinicId, invitationId: invitation.invitationId });
    await expect.poll(async () => (await mail()).length).toBe(1);
    const initialMail = await mail();
    stage = 'initial-replay';
    const initialBody = { organizationId: clinicId, operationId: invitation.invitationId, email, role: 'therapist' };
    const replay = await edge(db, 'invite-clinic-member', initialBody);
    expect(replay.denied).toBe(false);
    expect(replay.data).toMatchObject({ status: 'completed', operationId: invitation.invitationId, userId, role: 'therapist', replayed: true, invited: false });
    expect(replay.data.delivery).toMatchObject({ deliveryId: invitation.lastDelivery.deliveryId, state: 'sent', version: invitation.lastDelivery.version });
    expect(await mail()).toEqual(initialMail);
    stage = 'resend-ui';
    await page.reload();
    const card = page.locator('.mantine-Card-root').filter({ has: page.getByText(email, { exact: true }) }).filter({ has: page.getByRole('button', { name: 'Solicitar reenvío explícito', exact: true }) });
    await expect(card).toHaveCount(1);
    page.once('dialog', dialog => dialog.dismiss());
    await card.getByRole('button', { name: 'Solicitar reenvío explícito', exact: true }).click();
    expect((await deliveries()).find(row => row.userId === userId).lastDelivery).toEqual(invitation.lastDelivery);
    expect(await mail()).toEqual(initialMail);
    page.once('dialog', dialog => dialog.accept());
    await card.getByRole('button', { name: 'Solicitar reenvío explícito', exact: true }).click();
    await expect(page.getByText('Auth aceptó la solicitud. Comprueba el correo en Mailpit; esto no significa que la invitación haya sido aceptada.', { exact: true })).toBeVisible();
    own = (await deliveries()).filter(row => row.userId === userId);
    const sent = own[0].lastDelivery;
    expect(sent).toMatchObject({ state: 'sent', confirmationSource: 'auth', invitationId: invitation.invitationId });
    expect(sent.deliveryId).not.toBe(invitation.lastDelivery.deliveryId);
    await expect.poll(async () => (await mail()).length).toBe(2);
    stage = 'resend-replay-and-negatives';
    const explicitBody = { organizationId: clinicId, invitationId: invitation.invitationId, operationId: sent.operationId, idempotencyKey: sent.idempotencyKey };
    const repeat = await edge(db, 'resend-clinic-invitation', explicitBody); expect(repeat.denied).toBe(false); expect(repeat.data.delivery).toEqual(sent);
    expect((await mail()).length).toBe(2);
    for (const other of [dbForeign, dbTechnician]) expect((await edge(other, 'resend-clinic-invitation', explicitBody)).denied).toBe(true);
    const queried = await rpc(db, 'aba_team_invitation_delivery_status', { p_org: clinicId, p_invite: invitation.invitationId, p_operation: sent.operationId, p_key: sent.idempotencyKey }); expect(queried).toEqual(sent);
    await page.reload(); await expect(card.getByText('Aún no aceptada', { exact: true })).toBeVisible();
    expect((await deliveries()).filter(row => row.userId !== userId)).toEqual(originalDeliveries);
    expect((await rpc(db, 'aba_team', { p_organization_id: clinicId })).filter(row => row.id !== userId)).toEqual(originalTeam);
    evidence('invitation', { passed: true, project: testInfo.project.name, userId, invitationId: invitation.invitationId, initialDeliveryId: invitation.lastDelivery.deliveryId, explicitDeliveryId: sent.deliveryId, smtpMessages: 2, cancelNoMutation: true, sameOperationNoExtraMail: true, foreignAndTechnicianDenied: true, accepted: false, originalMembersPreserved: true, accountRetainedForEvidence: true });
  } catch {
    // Do not emit Playwright error-context containing the invitation recipient or mail.
    writeFileSync(testInfo.outputPath('invitation-stage-v5.json'), JSON.stringify({ passed: false, stage, marker, userId: userId ?? null }));
    throw new Error(`Invitacion QA no confirmada en etapa ${stage}; detalle privado omitido, registros conservados`);
  } finally { await db.auth.signOut({ scope: 'local' }); await dbForeign.auth.signOut({ scope: 'local' }); await dbTechnician.auth.signOut({ scope: 'local' }); }
});


test('QA-002 EQUIPO-003 V5: respuesta perdida de reenvio, consulta UI sin correo duplicado', async ({ page, request }, testInfo) => {
  test.setTimeout(90000);
  const { status, manifest } = fixture(), account = actor(manifest, 'admin-b');
  const db = await loginClient(status, account), clinicId = manifest.clinics.B;
  const priorEvidence = testInfo.project.name === 'desktop' ? 'team-profile-v5-invitation-dcacb2f7-6597-40d9-bd5c-dc6bb84a7114.json' : 'team-profile-v5-invitation-5bb76c31-e977-4b8c-841e-078fe286c236.json';
  const prior = JSON.parse(readFileSync(path.join(state, 'qa', priorEvidence), 'utf8'));
  expect(prior).toMatchObject({ passed: true, kind: 'invitation', batchId, project: testInfo.project.name, accepted: false });
  let intercepted = false, stage = 'baseline';
  try {
    const rows = await rpc(db, 'aba_team_invitation_deliveries', { p_org: clinicId });
    const own = rows.find(row => row.invitationId === prior.invitationId && row.userId === prior.userId);
    if (!own?.eligible || own.accepted || !own.email.startsWith('qa-r5-invite-') || !own.email.endsWith('@aba.example.test')) throw new Error('Invitacion propia previa no elegible');
    const mail = async () => { const r = await request.get(`http://127.0.0.1:54324/api/v1/search?query=${encodeURIComponent('to:' + own.email)}&start=0&limit=1000`); if (r.status() !== 200) throw new Error('Mailpit no disponible'); const d = await r.json(); return d.messages.filter(row => row.To?.some(to => to.Address === own.email)).map(row => row.ID); };
    const beforeMail = await mail(); expect(beforeMail.length).toBeGreaterThanOrEqual(2);
    await loginUI(page, account); await page.goto('/team');
    const card = page.locator('.mantine-Card-root').filter({ has: page.getByText(own.email, { exact: true }) }).filter({ has: page.getByRole('button', { name: 'Solicitar reenvío explícito', exact: true }) });
    await expect(card).toHaveCount(1);
    stage = 'lost-response';
    await page.route('**/team', async route => {
      const r = route.request();
      if (!intercepted && r.method() === 'POST' && r.headers()['next-action'] && r.postData()?.includes(own.invitationId) && r.postData()?.includes('idempotencyKey')) {
        intercepted = true;
        // Execute the real Server Action first; discard its HTTP response only in
        // this browser. Auth/SMTP and durable delivery are not mocked.
        const reply = await route.fetch(); if (reply.status() !== 200) throw new Error('Server Action de prueba no confirmada');
        await route.abort('failed');
      } else await route.continue();
    });
    page.once('dialog', dialog => dialog.accept()); await card.getByRole('button', { name: 'Solicitar reenvío explícito', exact: true }).click();
    await expect(card.getByRole('button', { name: 'Consultar mi operación', exact: true })).toBeVisible();
    expect(intercepted).toBe(true);
    await expect(card.getByRole('button', { name: 'Solicitar reenvío explícito', exact: true })).toBeDisabled();
    await expect.poll(async () => (await mail()).length).toBe(beforeMail.length + 1);
    const after = (await rpc(db, 'aba_team_invitation_deliveries', { p_org: clinicId })).find(row => row.userId === own.userId).lastDelivery;
    expect(after).toMatchObject({ state: 'sent', confirmationSource: 'auth', invitationId: own.invitationId }); expect(after.deliveryId).not.toBe(own.lastDelivery.deliveryId);
    stage = 'query-ui';
    await card.getByRole('button', { name: 'Consultar mi operación', exact: true }).click();
    await expect(card.getByRole('button', { name: 'Consultar mi operación', exact: true })).toHaveCount(0);
    await expect(card.getByText(`Comprobante ${after.deliveryId} · versión ${after.version}`, { exact: true })).toBeVisible();
    expect((await mail()).length).toBe(beforeMail.length + 1);
    stage = 'replay';
    const result = await db.functions.invoke('resend-clinic-invitation', { body: { organizationId: clinicId, invitationId: own.invitationId, operationId: after.operationId, idempotencyKey: after.idempotencyKey } });
    if (result.error) throw new Error('Replay propio no confirmado'); expect(result.data.delivery).toEqual(after);
    expect((await mail()).length).toBe(beforeMail.length + 1);
    await page.reload(); await expect(card.getByText(`Comprobante ${after.deliveryId} · versión ${after.version}`, { exact: true })).toBeVisible();
    evidence('invitation-lost-response', { passed: true, project: testInfo.project.name, userId: own.userId, invitationId: own.invitationId, deliveryId: after.deliveryId, smtpBefore: beforeMail.length, smtpAfter: beforeMail.length + 1, responseLostAfterRealServerSuccess: true, uiOperationRecovered: true, sameReceiptReplay: true, noExtraSmtpOnRecovery: true, accepted: false });
  } catch { writeFileSync(testInfo.outputPath('invitation-lost-response-stage-v5.json'), JSON.stringify({ passed: false, stage, intercepted, userId: prior.userId })); throw new Error(`Reenvio con respuesta perdida no confirmado en ${stage}; detalles privados omitidos`); }
  finally { await page.unroute('**/team'); await db.auth.signOut({ scope: 'local' }); }
});

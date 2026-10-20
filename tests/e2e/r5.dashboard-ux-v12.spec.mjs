import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import { localStatus, state } from '../../scripts/local/write-env.mjs';
import { dashboardSnapshotSchema } from '../../src/modules/dashboard/contracts.ts';

test.skip(process.env.ABA_QA_LOCAL_UI !== '1' || process.env.ABA_QA_DASHBOARD_UI !== '1', 'Dashboard sintético local explícito');

test('QA-012: dashboard real concilia contadores y sesiones con proyección persistida', async ({ page },info) => {
  test.setTimeout(180000);
  expect(process.cwd().replaceAll('\\', '/')).toBe('C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
  expect(readFileSync('.aba.local/qa/next-build-v12-dashboard/BUILD_ID','utf8').trim()).toBe(process.env.ABA_QA_DASHBOARD_BUILD_ID);
  const status = localStatus(); expect(status.API_URL).toBe('http://127.0.0.1:54321');
  const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
  const manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));
  expect(manifest.state).toBe('ready');
  const account = manifest.accounts.find(row => row.label === 'admin-a');
  if (account?.email !== `admin-a.${batchId}@aba.example.test`) throw new Error('Identidad sintética incorrecta');
  const client = createClient(status.API_URL, status.ANON_KEY ?? status.PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  let snapshot;
  try {
    const login = await client.auth.signInWithPassword({ email: account.email, password: account.password });
    if (login.error || login.data.user?.id !== account.userId || login.data.user.app_metadata.aba_fixture_batch !== batchId) throw new Error('Lectura sintética no autorizada');
    const result = await client.rpc('aba_dashboard_read_v2', { p_organization_id: manifest.clinics.A });
    if (result.error) throw new Error('Proyección de dashboard no disponible');
    snapshot = dashboardSnapshotSchema.parse(result.data);
    expect(snapshot.actorId).toBe(account.userId); expect(snapshot.clinicId).toBe(manifest.clinics.A);
  } finally { await client.auth.signOut({ scope: 'local' }); }
  await page.goto('/login');
  try {
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(account.password);
  } catch { throw new Error('Formulario no disponible; valores omitidos'); }
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Panel clínico autorizado', { exact: true })).toBeVisible();
  for (const [label, value] of [
    ['Estudiantes vigentes', snapshot.counts.activeStudents],
    ['Programas activos', snapshot.counts.activePrograms],
    ['Sesiones en curso', snapshot.counts.activeSessions],
    ['Logros explícitos', snapshot.counts.achievements],
  ]) {
    const card = page.getByText(label, { exact: true }).locator('xpath=ancestor::*[contains(@class,"mantine-Card-root")][1]');
    await expect(card.getByText(String(value), { exact: true })).toBeVisible();
  }
  await expect(page.getByRole('heading', { name: 'Sesiones finalizadas' }).locator('..').getByText(`${snapshot.counts.finishedSessions} total`, { exact: true })).toBeVisible();
  await expect(page.getByText('Finalizada', { exact: true })).toHaveCount(snapshot.finishedSessions.length);
  await expect(page.getByRole('heading', { name: 'Programas logrados' })).toBeVisible();

  await page.mouse.move(0,600);await expect(page.locator('.mantine-Notification-root')).toHaveCount(0);
  const cardFor=title=>page.getByRole('heading',{name:title,exact:true}).locator('xpath=ancestor::*[contains(@class,"mantine-Card-root")][1]');
  const welcome=page.getByText('Panel clínico autorizado',{exact:true}).locator('xpath=ancestor::*[contains(@class,"mantine-Card-root")][1]'),metricCard=page.getByText('Estudiantes vigentes',{exact:true}).locator('xpath=ancestor::*[contains(@class,"mantine-Card-root")][1]');
  const rects={welcome:await welcome.boundingBox(),active:await cardFor('Sesiones en curso').boundingBox(),completed:await cardFor('Sesiones finalizadas').boundingBox(),kpi:await metricCard.boundingBox(),sessionsChart:await cardFor('Sesiones realizadas').boundingBox(),achievementsChart:await cardFor('Programas logrados').boundingBox()};for(const r of Object.values(rects))expect(r).not.toBeNull();
  expect(Math.abs(rects.welcome.x-rects.active.x)).toBeLessThan(2);expect(Math.abs(rects.active.x-rects.completed.x)).toBeLessThan(2);expect(rects.completed.y).toBeGreaterThan(rects.active.y+rects.active.height);expect(rects.active.y).toBeGreaterThan(rects.welcome.y+rects.welcome.height);
  if(info.project.name==='desktop'){expect(rects.kpi.x).toBeGreaterThan(rects.active.x+rects.active.width);expect(Math.abs(rects.kpi.x-rects.sessionsChart.x)).toBeLessThan(2);expect(Math.abs(rects.sessionsChart.x-rects.achievementsChart.x)).toBeLessThan(2);expect(rects.active.width/rects.sessionsChart.width).toBeGreaterThan(0.64);expect(rects.active.width/rects.sessionsChart.width).toBeLessThan(0.77);}else{for(const r of Object.values(rects))expect(Math.abs(r.x-rects.welcome.x)).toBeLessThan(2);expect(rects.kpi.y).toBeGreaterThan(rects.completed.y+rects.completed.height);}
  expect(rects.sessionsChart.y).toBeGreaterThan(rects.kpi.y+rects.kpi.height);expect(rects.achievementsChart.y).toBeGreaterThan(rects.sessionsChart.y+rects.sessionsChart.height);
  const geometry=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth}));expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.viewport+1);mkdirSync('.aba.local/qa/ux-current-v12-dashboard',{recursive:true});await page.screenshot({path:'.aba.local/qa/ux-current-v12-dashboard/'+info.project.name+'.png',fullPage:true});
  const anchor = new Date(snapshot.generatedAt);
  const monday = Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate()) - ((anchor.getUTCDay() + 6) % 7) * 86400000;
  const weeklyAchievements = snapshot.achievements.filter(item => Date.parse(item.achievedAt) >= monday && Date.parse(item.achievedAt) <= Date.parse(snapshot.generatedAt)).length;
  await expect(page.getByText(`${weeklyAchievements} logros en el periodo`, { exact: true })).toBeVisible();
  const achievementsCard = page.getByRole('heading', { name: 'Programas logrados' }).locator('xpath=ancestor::*[contains(@class,"mantine-Card-root")][1]');
  await achievementsCard.getByText('Mensual', { exact: true }).click();
  const monthStart = Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1);
  const monthlyAchievements = snapshot.achievements.filter(item => Date.parse(item.achievedAt) >= monthStart && Date.parse(item.achievedAt) <= Date.parse(snapshot.generatedAt)).length;
  await expect(achievementsCard.getByText(`${monthlyAchievements} logros en el periodo`, { exact: true })).toBeVisible();
  const sessionsCard = page.getByRole('heading', { name: 'Sesiones realizadas' }).locator('xpath=ancestor::*[contains(@class,"mantine-Card-root")][1]');
  const visibleStudents = snapshot.students.slice(0, 5);
  expect(snapshot.activityByStudent.some(item => visibleStudents.some(student => student.id === item.studentId) && item.finishedSessions > 0)).toBe(true);
  await expect(sessionsCard.locator('.recharts-line-curve')).toHaveCount(visibleStudents.length);
  for (const student of visibleStudents) await expect(sessionsCard.locator('.recharts-legend-item-text').getByText(student.displayName, { exact: true })).toBeVisible();
  await sessionsCard.getByText('Anual', { exact: true }).click();
  await expect(sessionsCard.getByRole('radio', { name: 'Anual' })).toBeChecked();
  expect(await sessionsCard.locator('.recharts-xAxis .recharts-cartesian-axis-tick').count()).toBeGreaterThan(0);
  const dots = sessionsCard.locator('.recharts-line-dots').first().locator('.recharts-dot');
  await expect(dots).toHaveCount(12);
  for (let month = 0; month < 12; month++) {
    const start = Date.UTC(anchor.getUTCFullYear(), month, 1);
    const end = Date.UTC(anchor.getUTCFullYear(), month + 1, 1);
    await sessionsCard.locator('.recharts-wrapper').evaluate(element=>element.scrollIntoView({block:'center'}));
    const target=await dots.nth(month).boundingBox();expect(target).not.toBeNull();
    const wrapper=sessionsCard.locator('.recharts-wrapper'),plot=await wrapper.boundingBox();expect(plot).not.toBeNull();
    await wrapper.hover({position:{x:target.x+target.width/2-plot.x+(month===11?-2:2),y:plot.height/2}});
    if(month===0){await page.screenshot({path:'.aba.local/qa/dashboard-tooltip-v12-diagnostic-'+info.project.name+'.png'});writeFileSync('.aba.local/qa/dashboard-tooltip-v12-diagnostic-'+info.project.name+'.json',JSON.stringify({target,plot,now:await wrapper.boundingBox(),tooltip:await sessionsCard.locator('.recharts-tooltip-wrapper').getAttribute('style')}));}
    const tooltip = sessionsCard.locator('.recharts-default-tooltip');
    await expect(tooltip.locator('.recharts-tooltip-label')).toHaveText(new Date(start).toLocaleDateString('es-CL', { month: 'short', timeZone: 'UTC' }));
    for (const student of visibleStudents) {
      const expected = snapshot.activityByStudent.filter(item => item.studentId === student.id && Date.parse(`${item.date}T00:00:00Z`) >= start && Date.parse(`${item.date}T00:00:00Z`) < end && Date.parse(`${item.date}T00:00:00Z`) <= Date.parse(snapshot.generatedAt)).reduce((sum, item) => sum + item.finishedSessions, 0);
      await expect(tooltip.locator('.recharts-tooltip-item').filter({ hasText: student.displayName }).locator('.recharts-tooltip-item-value')).toHaveText(String(expected));
    }
  }
  await sessionsCard.getByRole('button', { name: 'Ampliar' }).click();
  const expanded = page.getByRole('dialog', { name: 'Sesiones realizadas por estudiante' });
  await expect(expanded.locator('.recharts-line-curve')).toHaveCount(visibleStudents.length);
  await expect(expanded.getByRole('radio', { name: 'Anual' })).toBeChecked();
  await page.keyboard.press('Escape');
  await expect(expanded).toBeHidden();
  await expect(page.getByText('Volumen operativo; no representa mejoría clínica.', { exact: true })).toBeVisible();
  const activityCard = page.getByRole('heading', { name: 'Actividad persistida' }).locator('xpath=ancestor::*[contains(@class,"mantine-Card-root")][1]');
  await activityCard.getByRole('textbox').click();
  await page.getByRole('option', { name: '7 días' }).click();
  const recentActivity = snapshot.activity.filter(item => Date.parse(`${item.date}T00:00:00Z`) >= Date.parse(snapshot.generatedAt) - 7 * 86400000);
  if (recentActivity.length) await expect(activityCard.locator('.recharts-bar-rectangle').first()).toBeVisible();
  else await expect(activityCard.getByText('No hay actividad en el periodo seleccionado.')).toBeVisible();
  await activityCard.getByRole('button', { name: 'Ampliar' }).click();
  const activityExpanded = page.getByRole('dialog', { name: 'Actividad persistida ampliada' });
  if (recentActivity.length) await expect(activityExpanded.locator('.recharts-bar-rectangle').first()).toBeVisible();
  else await expect(activityExpanded.getByText('No hay actividad en el periodo.')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(activityExpanded).toBeHidden();
  await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
  await expect(page.getByText('Panel clínico autorizado', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Menú de perfil' }).click();
  await page.getByRole('menuitem', { name: 'Cerrar Sesión' }).click();
  await expect(page).toHaveURL(/\/login$/);
  writeFileSync('.aba.local/qa/dashboard-ux-v12-'+info.project.name+'-safe.json',JSON.stringify({passed:true,buildId:process.env.ABA_QA_DASHBOARD_BUILD_ID,project:info.project.name,baselineRef:'dc1b0c4',rects,geometry,counts:snapshot.counts,checks:['base-distribution-5-7','mobile-order','no-horizontal-overflow','counts-projection','monthly-achievements','yearly-twelve-buckets-real-tooltip','expanded-close-preserves-filters','activity-range-expand-close','refresh','sign-out'],clinicalWrites:0},null,2));
});

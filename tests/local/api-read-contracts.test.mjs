import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { localStatus, state } from '../../scripts/local/write-env.mjs';
import { identityDto, teamMember } from '../../src/features/team/identity.types';
import { authorizedStudentSummary, studentDetailDto } from '../../src/modules/students/contracts';
import { dashboardSnapshotSchema } from '../../src/modules/dashboard/contracts';
import { notificationsPage } from '../../src/modules/notifications/contracts';
import { calendarPageDataSchema } from '../../src/modules/calendar/contracts';
import { commercialPageDataSchema } from '../../src/modules/commercial/contracts';
import { supportPageDataSchema } from '../../src/modules/support/contracts';
import { familyAccessPage, familyPortalPage, familyCalendarPage } from '../../src/modules/family/contracts';
import { collaborationPageData } from '../../src/modules/collaboration/contracts';
import { searchResultSchema } from '../../src/modules/search/contracts';
import { programDesignV2Schema } from '../../src/domain/programs/design-v2';
import { measurementV2Schema, measurementV2Metrics } from '../../src/domain/measurements/measurement-v2';
import { sessionV2Schema, sessionV2Timeline } from '../../src/domain/sessions/session-v2';

const enabled = process.env.ABA_QA_LOCAL_READ === '1';
const batchId = '2155e99e-bda4-4c68-95cf-b74cacd84ecd';
const labels = ['admin-a', 'supervisor-a', 'tecnico-a', 'admin-b', 'supervisor-b', 'tecnico-b', 'externo', 'familia'];
const internal = labels.filter(label => !['externo', 'familia'].includes(label));
const actors = new Map();
let status, manifest;
const shareRead = z.object({ clinicId: z.uuid().nullable(), actorId: z.uuid(), invitations: collaborationPageData.shape.invitations }).strict();
async function rpc(label, name, args) {
  const response = await fetch(`${status.API_URL}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: status.ANON_KEY ?? status.PUBLISHABLE_KEY, Authorization: `Bearer ${actors.get(label).token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args), signal: AbortSignal.timeout(10000) });
  return { status: response.status, data: await response.json() };
}
async function checked(label, name, args, schema) {
  const result = await rpc(label, name, args);
  const permission = typeof result.data?.message === 'string' ? result.data.message.match(/^permission denied for (?:function|table|schema|relation) [a-zA-Z0-9_.]+/)?.[0] ?? result.data.code ?? '' : '';
  expect(result.status, `${name}: HTTP ${permission}`).toBe(200);
  const parsed = schema.safeParse(result.data);
  // Report issue paths only, never response data or clinical identifiers.
  expect(parsed.success, `${name}: ${parsed.success ? '' : parsed.error.issues.map(issue => issue.path.join('.')).join(',')}`).toBe(true);
  return result.data;
}
const clinicFor = label => manifest.clinics[label.endsWith('-b') ? 'B' : 'A'];

describe.skipIf(!enabled)('R5 API real: proyecciones y aislamiento, sin comandos clínicos', () => {
  beforeAll(async () => {
    status = localStatus();
    manifest = JSON.parse(readFileSync(path.join(state, 'batches', `${batchId}.json`), 'utf8'));
    expect(manifest.batchId).toBe(batchId); expect(manifest.apiUrl).toBe(status.API_URL); expect(manifest.state).toBe('ready');
    for (const label of labels) {
      const account = manifest.accounts.find(row => row.label === label);
      expect(account.email).toBe(`${label}.${batchId}@aba.example.test`);
      const client = createClient(status.API_URL, status.ANON_KEY ?? status.PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
      const result = await client.auth.signInWithPassword({ email: account.email, password: account.password });
      if (result.error || result.data.user?.id !== account.userId || result.data.user?.app_metadata?.aba_fixture_batch !== batchId) throw new Error(`Auth sintético no confirmado: ${label}`);
      actors.set(label, { client, id: account.userId, token: result.data.session.access_token });
    }
  }, 60000);
  afterAll(async () => {
    for (const [label, actor] of actors) { const result = await actor.client.auth.signOut({ scope: 'local' }); if (result.error) throw new Error(`Sesión QA no revocada: ${label}`); }
  }, 30000);

  for (const label of labels) {
    it(`${label}: identidad correlacionada y contexto autorizado`, async () => {
      const clinicId = internal.includes(label) ? clinicFor(label) : null;
      const data = await checked(label, 'aba_identity_context', { p_organization_id: clinicId }, identityDto);
      expect(data.userId).toBe(actors.get(label).id);
      if (clinicId) expect(data.active?.id).toBe(clinicId);
      else { expect(data.active).toBe(null); expect(data.choices).toEqual([]); }
    });
    it(`${label}: notificaciones pertenecen al actor`, async () => {
      const data = await checked(label, 'aba_notifications_read_v2', { p_limit: 50 }, notificationsPage);
      expect(data.actorId).toBe(actors.get(label).id);
    });
    it(`${label}: bandeja recibida sin contexto no crea membresía`, async () => {
      const data = await checked(label, 'aba_student_share_read_v2', { p_organization_id: null }, shareRead);
      expect(data.actorId).toBe(actors.get(label).id); expect(data.clinicId).toBe(null);
      const family = await checked(label, 'aba_family_access_read_v2', { p_organization_id: null, p_client_id: null }, familyAccessPage);
      expect(family.actorId).toBe(actors.get(label).id); expect(family.clinicId).toBe(null);
    });
  }
  for (const label of internal) {
    const cases = [
      ['aba_list_students_v2', z.array(authorizedStudentSummary)],
      ['aba_dashboard_read_v2', dashboardSnapshotSchema],
      ['aba_calendar_read_v2', calendarPageDataSchema],
      ['aba_support_ticket_read_v2', supportPageDataSchema],
      ['aba_student_share_read_v2', shareRead],
    ];
    for (const [name, schema] of cases) it(`${label}: ${name} satisface contrato actual`, async () => {
      const data = await checked(label, name, { p_organization_id: clinicFor(label) }, schema);
      if (Array.isArray(data)) for (const row of data) expect(row.clinicId).toBe(clinicFor(label));
      else { if ('clinicId' in data) expect(data.clinicId).toBe(clinicFor(label)); if ('actorId' in data) expect(data.actorId).toBe(actors.get(label).id); }
    });
    it(`${label}: búsqueda no entrega objetos Storage`, async () => {
      const data = await checked(label, 'aba_authorized_search_v2', { p_organization_id: clinicFor(label), p_query: 'Programa', p_limit: 30 }, z.array(searchResultSchema));
      for (const row of data) { expect(row.path.startsWith('/students/')).toBe(true); expect(row.path).not.toMatch(/storage|https?:/i); }
    });
  }
  for (const label of ['admin-a', 'admin-b']) it(`${label}: equipo positivo y clínica cruzada rechazada`, async () => {
    const own = clinicFor(label), other = clinicFor(label === 'admin-a' ? 'admin-b' : 'admin-a');
    const data = await checked(label, 'aba_team', { p_organization_id: own }, z.array(teamMember));
    expect(data.length).toBeGreaterThanOrEqual(3);
    const foreign = await rpc(label, 'aba_team', { p_organization_id: other });
    expect(foreign.status).toBe(403);
    const calendar = await rpc(label, 'aba_calendar_read_v2', { p_organization_id: other }); expect(calendar.status).toBe(403);
  });
  for (const label of internal) it(`${label}: gestión comercial limitada a admin`, async () => {
    if (label.startsWith('admin-')) await checked(label, 'aba_commercial_read_v2', { p_organization_id: clinicFor(label) }, commercialPageDataSchema);
    else expect((await rpc(label, 'aba_commercial_read_v2', { p_organization_id: clinicFor(label) })).status).toBe(403);
  });
  for (const label of ['externo', 'familia']) it(`${label}: sin vínculo activo no recibe contenido ni clínica general`, async () => {
    const portal = await checked(label, 'aba_family_portal_read_v2', { p_organization_id: manifest.clinics.A }, familyPortalPage);
    expect(portal.actorId).toBe(actors.get(label).id); expect(portal.publications).toEqual([]);
    const calendar = await checked(label, 'aba_family_calendar_read_v2', { p_organization_id: manifest.clinics.A }, familyCalendarPage);
    expect(calendar.appointments).toEqual([]);
    const team = await rpc(label, 'aba_team', { p_organization_id: manifest.clinics.A }); expect(team.status).toBe(403);
  });
  it('anon no ejecuta RPC clínica protegida', async () => {
    const response = await fetch(`${status.API_URL}/rest/v1/rpc/aba_dashboard_read_v2`, { method: 'POST', headers: { apikey: status.ANON_KEY ?? status.PUBLISHABLE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_organization_id: manifest.clinics.A }) });
    expect([401, 403]).toContain(response.status);
  });
  it('ficha QA positiva: detalle/lista conciliados y otras identidades sin acceso', async () => {
    const rows = await checked('admin-a', 'aba_list_students_v2', { p_organization_id: manifest.clinics.A }, z.array(authorizedStudentSummary));
    const matching = rows.filter(row => row.clinicalId === 'QA-R5-A-2155E99E');
    expect(matching).toHaveLength(1);
    const summary = matching[0];
    const args = { p_organization_id: manifest.clinics.A, p_client_id: summary.id };
    const detail = await checked('admin-a', 'aba_student_detail_v2', args, studentDetailDto);
    expect(detail.fullName).toBe('QA SINTETICO LOCAL A');
    for (const field of ['id', 'clinicId', 'clinicalId', 'hasActiveSession', 'familyAccessEnabled', 'assignedProfessional']) expect(detail[field]).toEqual(summary[field]);
    for (const label of ['admin-b', 'externo', 'familia']) {
      const result = await rpc(label, 'aba_student_detail_v2', args);
      expect(result.status).toBe(200); expect(result.data).toBe(null);
    }
  });
  it.skipIf(process.env.ABA_QA_LOCAL_SESSION_READ !== '1')('sesión UI: pausas, borrador y revisión conservan observaciones previas', async () => {
    const rows = (await rpc('admin-a', 'aba_list_students_v2', { p_organization_id: manifest.clinics.A })).data;
    const student = rows.find(row => row.clinicalId === 'QA-R5-A-2155E99E');
    expect(student).toBeDefined();
    const result = await rpc('admin-a', 'read_program_session_v2', { p_clinic_id: manifest.clinics.A, p_student_id: student.id });
    expect(result.status).toBe(200);
    const sessions = result.data.sessions.filter(row => row.notes === 'QA UI TRANSICIONES');
    expect(sessions).toHaveLength(1);
    const session = sessionV2Schema.parse(sessions[0]);
    expect(sessionV2Timeline(session).status).toBe('finished');
    expect(session.events[0].type).toBe('started'); expect(session.events.at(-1).type).toBe('finished');
    const pauses = session.events.filter(row => row.type === 'paused').length;
    expect(pauses).toBeGreaterThanOrEqual(1);
    expect(session.events.filter(row => row.type === 'resumed')).toHaveLength(pauses);
    const records = result.data.records.filter(row => row.sessionId === session.id && !row.discarded);
    expect(records).toHaveLength(1);
    const record = records[0];
    expect(record.submitted).toBe(true); expect(record.version).toBe(3);
    expect(record.revisions).toHaveLength(1);
    expect(record.revisions[0].reason).toBe('QA corrección explícita sintética');
    const current = measurementV2Schema.parse(record.originalMeasurement);
    const previous = measurementV2Schema.parse(record.revisions[0].originalMeasurement);
    expect(current.notes).toBe('QA UI CORRECCION AYUDAS NR');
    expect(previous.notes).toBe('QA UI BORRADOR AYUDAS NR');
    expect(current.dimension).toBe('percentage');
    expect(current.trials).toEqual(previous.trials);
    expect(current.trials[0].response).toBe('prompted'); expect(current.trials[0].responsePrompt).toBe('model');
    expect(current.trials[1].response).toBe('no-response');
    const metric = measurementV2Metrics(current);
    expect(metric.value).toBe(0); expect(metric.prompted).toBe(1); expect(metric.noResponse).toBe(1);
    expect(metric.errors).toBe(0); expect(metric.unrecorded).toBe(8);
  });
  it.skipIf(process.env.ABA_QA_LOCAL_CONFLICT_READ !== '1')('conflicto UI y retry: versión terminal sin doble actualización', async () => {
    const students = (await rpc('admin-a', 'aba_list_students_v2', { p_organization_id: manifest.clinics.A })).data;
    const student = students.find(row => row.clinicalId === 'QA-R5-A-2155E99E');
    const result = await rpc('admin-a', 'read_program_session_v2', { p_clinic_id: manifest.clinics.A, p_student_id: student.id });
    expect(result.status).toBe(200);
    const sessions = result.data.sessions.filter(row => row.notes === 'QA UI CONFLICTO RESPUESTA PERDIDA');
    expect(sessions).toHaveLength(1);
    const session = sessionV2Schema.parse(sessions[0]);
    expect(session.notes).toBe('QA UI CONFLICTO RESPUESTA PERDIDA');
    expect(sessionV2Timeline(session).status).toBe('cancelled');
    expect(session.events.map(row => row.type)).toEqual(['started', 'cancelled']);
    expect(result.data.records.filter(row => row.sessionId === session.id)).toHaveLength(0);
    // Diagnostic-only privileged read of receipt metadata; never an app grant.
    const sessionId = z.uuid().parse(session.id), clinicId = z.uuid().parse(manifest.clinics.A);
    const actorId = z.uuid().parse(actors.get('admin-a').id);
    const sql = `select json_build_object('versions',coalesce(json_agg(server_version order by server_version),'[]'::json)) from private.command_receipts where organization_id='${clinicId}'::uuid and actor_user_id='${actorId}'::uuid and resource_id='${sessionId}'::uuid and command_type='session-v2'`;
    let receiptMetadata;
    try {
      const docker = 'docker'; // Only authorized Docker command; no external host path.
      receiptMetadata = JSON.parse(execFileSync(docker, ['exec', 'supabase_db_aba-reintegration-local', 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', sql], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
    } catch { throw new Error('Consulta diagnóstica de recibos falló; salida omitida'); }
    expect(receiptMetadata.versions).toEqual(Array.from({ length: session.version }, (_, index) => index + 1));
  });
  it('programa UI publicado: diseño persistido e aislamiento', async () => {
    const rows = (await rpc('admin-a', 'aba_list_students_v2', { p_organization_id: manifest.clinics.A })).data;
    const student = rows.find(row => row.clinicalId === 'QA-R5-A-2155E99E');
    expect(student).toBeDefined();
    const args = { p_clinic_id: manifest.clinics.A, p_student_id: student.id };
    const result = await rpc('admin-a', 'read_program_session_v2', args);
    expect(result.status).toBe(200); expect(result.data.actorId).toBe(actors.get('admin-a').id);
    const programs = result.data.programs.filter(program => program.versions.some(version => version.title === 'QA R5 CONDUCTA LOCAL'));
    expect(programs).toHaveLength(1); expect(programs[0].status).toBe('active');
    const version = programs[0].versions.find(row => row.id === programs[0].currentVersionId);
    expect(version.state).toBe('released'); expect(programDesignV2Schema.safeParse(version.originalDesign).success).toBe(true);
    for (const label of ['admin-b', 'externo', 'familia']) expect((await rpc(label, 'read_program_session_v2', args)).status).toBe(403);
    if (process.env.ABA_QA_LOCAL_CAPTURE_READ === '1') {
      const sessions = result.data.sessions.map(row => sessionV2Schema.parse(row));
      const completed = sessions.find(session => sessionV2Timeline(session).status === 'finished' && result.data.records.filter(record => record.sessionId === session.id && record.originalMeasurement?.notes?.startsWith('QA UI ')).length === 5);
      expect(completed).toBeDefined();
      const records = result.data.records.filter(record => record.sessionId === completed.id && record.originalMeasurement?.notes?.startsWith('QA UI '));
      const measurements = records.map(record => measurementV2Schema.parse(record.originalMeasurement));
      expect(measurements.map(row => row.dimension).sort()).toEqual(['duration', 'frequency', 'interval', 'latency', 'percentage']);
      expect(new Set(records.map(row => row.id)).size).toBe(5);
      for (const record of records) { expect(record.submitted).toBe(true); expect(record.discarded).toBe(false); expect(record.programVersionId).toBe(version.id); }
      for (const measurement of measurements) expect(Number.isFinite(measurementV2Metrics(measurement).value)).toBe(true);
      const byDimension = Object.fromEntries(measurements.map(row => [row.dimension, row]));
      const percentage = measurementV2Metrics(byDimension.percentage);
      expect(percentage.independent).toBe(1); expect(percentage.unrecorded).toBe(9);
      expect(percentage.noResponse).toBe(0); expect(percentage.value).toBe(100);
      const frequency = byDimension.frequency;
      expect(frequency.events).toHaveLength(1); expect(frequency.windows).toHaveLength(1);
      const observedSeconds = (Date.parse(frequency.windows[0].endedAt) - Date.parse(frequency.windows[0].startedAt)) / 1000;
      expect(observedSeconds).toBeGreaterThan(0);
      expect(measurementV2Metrics(frequency).value).toBeCloseTo(60 / observedSeconds, 8);
      const interval = byDimension.interval;
      expect(interval.intervals).toHaveLength(1); expect(interval.intervals[0].occurred).toBe(true);
      expect(Date.parse(interval.intervals[0].observedAt)).toBeGreaterThanOrEqual(Date.parse(interval.intervals[0].endedAt));
      expect(measurementV2Metrics(interval).value).toBe(100);
      const duration = byDimension.duration;
      expect(duration.episodes).toHaveLength(1);
      expect(measurementV2Metrics(duration).value).toBe((Date.parse(duration.episodes[0].endedAt) - Date.parse(duration.episodes[0].startedAt)) / 1000);
      const latency = byDimension.latency;
      expect(latency.trials).toHaveLength(1); expect(latency.trials[0].outcome).toBe('responded');
      expect(measurementV2Metrics(latency).value).toBe((Date.parse(latency.trials[0].responseAt) - Date.parse(latency.trials[0].antecedentAt)) / 1000);
    }
  });
});

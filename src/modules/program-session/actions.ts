'use server';

import { revalidatePath } from 'next/cache';
import type { Json } from '@/lib/supabase/database.types';
import { clinicalContext } from '@/modules/clinical/context';
import { programSessionCommandSchema, programSessionUuid } from './contracts';

export type ProgramSessionActionResult = { error: string | null; data?: Json };
type RpcResult = { data: unknown; error: { code?: string; message: string } | null };
type Rpc = (name: string, args?: Record<string, unknown>) => PromiseLike<RpcResult>;

function messageFor(error: RpcResult['error']): string {
  if (!error) return 'No se guardó el cambio.';
  if (error.code === '42501') return 'No tienes permiso para esta acción.';
  if (error.code === '40001') return 'El registro cambió. Recarga antes de volver a intentar.';
  if (error.code === '23505') return 'Ya existe un registro con ese identificador.';
  return 'No se guardó el cambio. Revisa los campos y el estado del registro.';
}

export async function programSessionCommand(raw: unknown): Promise<ProgramSessionActionResult> {
  const parsed = programSessionCommandSchema.safeParse(raw);
  if (!parsed.success) return { error: `Revisa los campos: ${parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}` };
  const { db, active } = await clinicalContext();
  if (!active) return { error: 'Selecciona una clínica activa.' };
  const command = parsed.data;
  const client = await db.from('clients').select('id').eq('id', command.clientId).eq('organization_id', active.id).maybeSingle();
  if (client.error || !client.data) return { error: 'Carpeta no disponible en esta clínica.' };

  const rpc = db.rpc.bind(db) as unknown as Rpc;
  const configuredTestRun = process.env.ABA_TEST_RUN_ID;
  const testRun = configuredTestRun && programSessionUuid.safeParse(configuredTestRun).success ? configuredTestRun : undefined;
  let result: RpcResult;
  switch (command.op) {
    case 'create-program':
      result = command.predecessorVersionId ? await rpc('create_program_successor', { p_version_id: command.predecessorVersionId, p_title: command.title, p_design: command.design, p_test_run_id: testRun }) : await rpc('create_program_draft', { p_client_id: command.clientId, p_title: command.title, p_program_type: command.design.kind, p_design: command.design, p_test_run_id: testRun });
      break;
    case 'update-program-draft': result = await rpc('mvp_update_program_draft', { p_program_id: command.programId, p_version_id: command.versionId, p_title: command.title, p_design: command.design }); break;
    case 'transition-program': result = await rpc('transition_program', { p_program_id: command.programId, p_version_id: command.versionId, p_next_status: command.status, p_test_run_id: testRun }); break;
    case 'save-record': result = await rpc('mvp_save_record', { p_id: command.id, p_session_id: command.sessionId, p_client_id: command.clientId, p_program_version_id: command.versionId, p_dimension: command.measurement.dimension, p_payload: command.measurement.payload, p_expected_version: command.expectedVersion, p_submit: command.submit }); break;
    case 'discard-record': result = await rpc('mvp_discard_record', { p_id: command.recordId, p_expected_version: command.expectedVersion }); break;
    case 'finish-session': result = await rpc('mvp_finish_session', { p_session_id: command.sessionId }); break;
    case 'archive-session': result = await rpc('mvp_archive_session', { p_session_id: command.sessionId }); break;
  }
  if (result.error) return { error: messageFor(result.error) };
  if (result.data == null) return { error: 'El servidor no confirmó el cambio. Recarga antes de volver a intentar.' };
  revalidatePath('/', 'layout');
  return { error: null, data: result.data as Json };
}

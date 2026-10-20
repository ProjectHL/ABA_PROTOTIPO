import { z } from 'zod';
import type { ProgramDesignV2, ProgramDraftCommandV2 } from '@/domain/programs/design-v2';
import type { CaptureCommandV2, MeasurementV2 } from '@/domain/measurements/measurement-v2';
import type { SessionCommandV2, SessionV2 } from '@/domain/sessions/session-v2';
import type { CommandResult } from '@/domain/commands/result';

export const programLifecycleCommandV2Schema = z.object({
  schemaVersion: z.literal(2), operationId: z.uuid(), idempotencyKey: z.uuid(), studentId: z.uuid(),
  programId: z.uuid(), programVersionId: z.uuid().nullable(), expectedVersion: z.number().int().nonnegative(),
  expectedDraftRevision: z.number().int().nonnegative().max(2147483647).nullable(),
  action: z.enum(['publish', 'pause', 'reactivate', 'achieve', 'discontinue']), terminalConfirmation: z.boolean(),
}).strict().superRefine((value, ctx) => {
  if ((value.action === 'publish') !== (value.expectedDraftRevision !== null))
    ctx.addIssue({ code: 'custom', path: ['expectedDraftRevision'], message: 'Publicar requiere la revisión del borrador; otras transiciones requieren null' });
  if ((value.action === 'achieve' || value.action === 'discontinue') && !value.terminalConfirmation)
    ctx.addIssue({ code: 'custom', path: ['terminalConfirmation'], message: 'Confirma explícitamente el cambio terminal' });
  if (value.action === 'publish' && value.programVersionId === null)
    ctx.addIssue({ code: 'custom', path: ['programVersionId'], message: 'Publicar requiere la versión borrador explícita' });
  if (value.action !== 'publish' && value.programVersionId !== null)
    ctx.addIssue({ code: 'custom', path: ['programVersionId'], message: 'Esta transición opera sobre la versión actual bloqueada; no acepta otra versión' });
});
export type ProgramLifecycleCommandV2 = z.infer<typeof programLifecycleCommandV2Schema>;
export type ProgramVersionDto = { id: string; programId: string; studentId: string; clinicId: string; number: number;
  revision: number; state: 'draft' | 'released' | 'superseded'; title: string; originalDesign: unknown;
  predecessorVersionId: string | null; createdAt: string; publishedAt: string | null };
export type ProgramDto = { id: string; studentId: string; clinicId: string; kind: 'acquisition' | 'behavior';
  status: 'draft' | 'active' | 'paused' | 'achieved' | 'discontinued'; revision: number;
  currentVersionId: string | null; versions: ProgramVersionDto[] };
export type SessionRecordDto = { id: string; sessionId: string; studentId: string; programId: string;
  programVersionId: string; version: number; submitted: boolean; discarded: boolean; originalMeasurement: unknown;
  createdAt: string; actorId: string; revisions: { id: string; number: number; reason: string;
    originalMeasurement: unknown; createdAt: string; actorId: string }[] };
export type ProgramSessionSnapshot = { clinicId: string; studentId: string; actorId: string;
  capabilities: string[]; programs: ProgramDto[]; sessions: SessionV2[]; records: SessionRecordDto[] };
export type ProgramSessionPageData = ProgramSessionSnapshot & { student: { displayName: string; initials: string;
  photoAttachmentId: string | null; status: 'active' | 'archived' } };
export interface ProgramSessionReadPort { load(clinicId: string, studentId: string): Promise<ProgramSessionSnapshot> }
export interface ProgramSessionCommandPort {
  draft(clinicId: string, command: ProgramDraftCommandV2): Promise<CommandResult>;
  lifecycle(clinicId: string, command: ProgramLifecycleCommandV2): Promise<CommandResult>;
  session(clinicId: string, command: SessionCommandV2): Promise<CommandResult>;
  capture(clinicId: string, command: CaptureCommandV2): Promise<CommandResult>;
}
/** A7 persists these exact scoped commands; online and offline share one model. */
export type ScopedCaptureCommand = { clinicId: string; command: CaptureCommandV2 };
export type ScopedSessionCommand = { clinicId: string; command: SessionCommandV2 };
export function emptyProgramDesign(kind: ProgramDesignV2['kind']): ProgramDesignV2 {
  const common = { schemaVersion: 2 as const, measurementDimension: 'percentage' as const, procedure: '', masteryCriteria: '' };
  return kind === 'acquisition'
    ? { ...common, kind, objective: '', antecedent: '', steps: [], sets: [], prompts: '', errorCorrection: '', generalization: '', skillArea: '', teachingProcedure: '', promptLevels: [] }
    : { ...common, kind, measurementDimension: 'frequency', topography: '', operationalDefinition: '', currentDimension: '', precursorBehaviors: '', functions: [], replacementBehavior: '', crisisPlan: '', hypothesizedFunctionNotes: '', preventionStrategy: '', responseStrategy: '' };
}
export type { ProgramDesignV2, ProgramDraftCommandV2, CaptureCommandV2, MeasurementV2, SessionCommandV2, SessionV2, CommandResult };

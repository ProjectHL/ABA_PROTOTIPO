import { z } from 'zod';

const text = (max: number) => z.string().trim().min(1).max(max);
export const programSessionUuid = z.uuid();

export const programDesign = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('acquisition'), goal: text(2000), skillArea: text(200), antecedent: text(2000), steps: z.array(text(1000)).min(1).max(100), teachingProcedure: text(2000), sets: z.array(text(1000)).min(1).max(100), promptLevels: z.array(text(200)).min(1).max(50), errorCorrection: text(2000), masteryCriterion: text(1000) }).strict(),
  z.object({ kind: z.literal('behavior'), topography: text(2000), operationalDefinition: text(2000), hypothesizedFunction: text(1000), replacementBehavior: text(1000), measurementUnit: z.enum(['frequency', 'interval']), preventionStrategy: text(2000), responseStrategy: text(2000), masteryCriterion: text(1000) }).strict(),
]);

export const programMeasurement = z.discriminatedUnion('dimension', [
  z.object({ dimension: z.literal('percentage'), payload: z.object({ trials: z.array(z.boolean()).min(1).max(1000) }).strict() }),
  z.object({ dimension: z.literal('frequency'), payload: z.object({ count: z.number().int().nonnegative().max(1_000_000), duration_seconds: z.number().positive().max(86_400) }).strict() }),
  z.object({ dimension: z.literal('interval'), payload: z.object({ type: z.enum(['whole', 'partial', 'momentary']), duration_seconds: z.number().positive().max(86_400), intervals: z.array(z.boolean().nullable()).min(1).max(1000) }).strict() }),
]);

const client = { clientId: programSessionUuid };
export const programSessionCommandSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('create-program'), ...client, title: text(160), design: programDesign, predecessorVersionId: programSessionUuid.optional() }).strict(),
  z.object({ op: z.literal('update-program-draft'), ...client, programId: programSessionUuid, versionId: programSessionUuid, title: text(160), design: programDesign }).strict(),
  z.object({ op: z.literal('transition-program'), ...client, programId: programSessionUuid, versionId: programSessionUuid.nullable(), status: z.enum(['active', 'paused', 'achieved', 'discontinued']) }).strict(),
  z.object({ op: z.literal('save-record'), ...client, id: programSessionUuid, sessionId: programSessionUuid, versionId: programSessionUuid, expectedVersion: z.number().int().nonnegative(), submit: z.boolean(), measurement: programMeasurement }).strict(),
  z.object({ op: z.literal('discard-record'), ...client, recordId: programSessionUuid, expectedVersion: z.number().int().positive() }).strict(),
  z.object({ op: z.literal('finish-session'), ...client, sessionId: programSessionUuid }).strict(),
  z.object({ op: z.literal('archive-session'), ...client, sessionId: programSessionUuid }).strict(),
]);

export type ProgramDesign = z.infer<typeof programDesign>;
export type ProgramMeasurement = z.infer<typeof programMeasurement>;
export type ProgramSessionCommand = z.input<typeof programSessionCommandSchema>;

export function measurementMetric(value: ProgramMeasurement): { value: number | null; unit: string } {
  if (value.dimension === 'percentage') return { value: 100 * value.payload.trials.filter(Boolean).length / value.payload.trials.length, unit: '% independientes' };
  if (value.dimension === 'frequency') return { value: 60 * value.payload.count / value.payload.duration_seconds, unit: 'eventos/min' };
  const observed = value.payload.intervals.filter((item) => item !== null);
  return { value: observed.length ? 100 * observed.filter(Boolean).length / observed.length : null, unit: '% intervalos observados' };
}

import { z } from 'zod';
import { measurementDimension } from '../measurements/measurement-v2';

const stableId = z.string().trim().min(1).max(100);
const text = z.string().max(10000);
const step = z.object({ id: stableId, order: z.number().int().positive(), description: text }).strict();
const stimulusSet = z.object({ id: stableId, name: z.string().max(200), items: z.array(z.string().max(2000)).max(1000) }).strict();
const common = {
  schemaVersion: z.literal(2), measurementDimension,
  procedure: text, masteryCriteria: text,
};

/** Original designer fields are kept verbatim; extra backend fields have their own section. */
export const programDesignV2Schema = z.discriminatedUnion('kind', [
  z.object({ ...common, kind: z.literal('acquisition'), objective: text, antecedent: text,
    steps: z.array(step).max(100), sets: z.array(stimulusSet).max(100),
    prompts: text, errorCorrection: text, generalization: text,
    skillArea: z.string().max(200), teachingProcedure: text,
    promptLevels: z.array(z.string().max(200)).max(50),
  }).strict(),
  z.object({ ...common, kind: z.literal('behavior'), topography: text, operationalDefinition: text,
    currentDimension: text, precursorBehaviors: text,
    functions: z.array(z.enum(['attention', 'escape', 'sensory', 'tangible'])).max(4),
    replacementBehavior: text, crisisPlan: text,
    hypothesizedFunctionNotes: text, preventionStrategy: text, responseStrategy: text,
  }).strict(),
]).superRefine((design, ctx) => {
  if (design.kind === 'behavior') {
    if (new Set(design.functions).size !== design.functions.length) {
      ctx.addIssue({ code: 'custom', path: ['functions'], message: 'Funciones repetidas' });
    }
    return;
  }
  for (const [key, entries] of [['steps', design.steps], ['sets', design.sets]] as const) {
    if (new Set(entries.map((entry) => entry.id)).size !== entries.length) {
      ctx.addIssue({ code: 'custom', path: [key], message: 'IDs repetidos' });
    }
  }
  if (new Set(design.steps.map((item) => item.order)).size !== design.steps.length) {
    ctx.addIssue({ code: 'custom', path: ['steps'], message: 'Orden de pasos repetido' });
  }
});
export type ProgramDesignV2 = z.infer<typeof programDesignV2Schema>;

export const publishedProgramDesignV2Schema = programDesignV2Schema.superRefine((design, ctx) => {
  const requireText = (field: string, value: string) => {
    if (!value.trim()) ctx.addIssue({ code: 'custom', path: [field], message: 'Completa este campo antes de publicar' });
  };
  requireText('procedure', design.procedure);
  requireText('masteryCriteria', design.masteryCriteria);
  if (design.kind === 'acquisition') {
    requireText('objective', design.objective);
    design.steps.forEach((item, index) => {
      if (!item.description.trim()) ctx.addIssue({ code: 'custom', path: ['steps', index, 'description'], message: 'Paso vacío' });
    });
    design.sets.forEach((item, index) => {
      if (!item.name.trim() || item.items.some((entry) => !entry.trim())) ctx.addIssue({ code: 'custom', path: ['sets', index], message: 'Conjunto incompleto' });
    });
  } else {
    requireText('topography', design.topography);
    requireText('operationalDefinition', design.operationalDefinition);
    if (!design.functions.length) ctx.addIssue({ code: 'custom', path: ['functions'], message: 'Selecciona una función' });
  }
});

/** V1 stays V1: no parsing legacy prose into fabricated structured steps/functions. */
export function readProgramDesign(raw: unknown):
  | { schemaVersion: 2; design: ProgramDesignV2 }
  | { schemaVersion: 1; original: Record<string, unknown>; detailsUnavailable: true } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Diseño inválido');
  const original = raw as Record<string, unknown>;
  if (original.schemaVersion === 2) return { schemaVersion: 2, design: programDesignV2Schema.parse(raw) };
  if (original.schemaVersion !== undefined && original.schemaVersion !== 1) throw new Error('Versión de diseño no soportada');
  if (!['acquisition', 'behavior'].includes(String(original.kind))) throw new Error('Tipo de diseño no soportado');
  return { schemaVersion: 1, original, detailsUnavailable: true };
}

export const programDraftCommandV2Schema = z.object({
  schemaVersion: z.literal(2), operationId: z.uuid(), idempotencyKey: z.uuid(),
  studentId: z.uuid(), programId: z.uuid(), programVersionId: z.uuid(),
  predecessorVersionId: z.uuid().nullable(), expectedVersion: z.number().int().nonnegative(),
  title: z.string().trim().min(1).max(160), design: programDesignV2Schema,
}).strict();
export type ProgramDraftCommandV2 = z.infer<typeof programDraftCommandV2Schema>;

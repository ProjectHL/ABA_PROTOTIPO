import { z } from 'zod';

const id = z.uuid();
const timestamp = z.iso.datetime({ offset: true });
const notes = z.string().max(10000);
export const measurementPhase = z.enum(['baseline', 'treatment', 'generalization', 'maintenance']);
export const measurementDimension = z.enum(['percentage', 'frequency', 'interval', 'duration', 'latency']);
export const responsePrompt = z.enum([
  'full-physical', 'partial-physical', 'gestural', 'shadow', 'model',
  'echoic-full', 'echoic-partial', 'verbal-full', 'verbal-partial', 'unspecified',
]);
export const stimulusPrompt = z.enum([
  'position', 'redundancy', 'movement', 'time-delay-0', 'time-delay-3', 'time-delay-5', 'time-delay-10',
]);

const observationWindow = z.object({
  id, startedAt: timestamp, endedAt: timestamp.nullable(),
}).strict();
const percentageTrial = z.object({
  id, order: z.number().int().positive(),
  response: z.enum(['independent', 'prompted', 'error', 'no-response']).nullable(),
  recordedAt: timestamp.nullable(),
  responsePrompt: responsePrompt.nullable(), stimulusPrompts: z.array(stimulusPrompt).max(20),
  notes,
}).strict();
const event = z.object({ id, occurredAt: timestamp, notes }).strict();
const episode = z.object({ id, startedAt: timestamp, endedAt: timestamp.nullable(), notes }).strict();
const latencyTrial = z.object({
  id, order: z.number().int().positive(), antecedent: z.string().max(2000),
  antecedentAt: timestamp, responseAt: timestamp.nullable(),
  outcome: z.enum(['pending', 'responded', 'no-response']), closedAt: timestamp.nullable(), notes,
}).strict();
const interval = z.object({
  id, order: z.number().int().positive(), startedAt: timestamp, endedAt: timestamp,
  observedAt: timestamp.nullable(), occurred: z.boolean().nullable(), notes,
}).strict();
const common = { schemaVersion: z.literal(2), phase: measurementPhase, capturedAt: timestamp, notes };

export const measurementV2Schema = z.discriminatedUnion('dimension', [
  z.object({ ...common, dimension: z.literal('percentage'), trials: z.array(percentageTrial).min(1).max(1000) }).strict(),
  z.object({ ...common, dimension: z.literal('frequency'), windows: z.array(observationWindow).max(1000), events: z.array(event).max(100000) }).strict(),
  z.object({ ...common, dimension: z.literal('interval'), method: z.enum(['whole', 'partial', 'momentary']), intervals: z.array(interval).min(1).max(1000) }).strict(),
  z.object({ ...common, dimension: z.literal('duration'), episodes: z.array(episode).max(10000) }).strict(),
  z.object({ ...common, dimension: z.literal('latency'), trials: z.array(latencyTrial).max(1000) }).strict(),
]).superRefine((value, ctx) => {
  const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message });
  const captured = Date.parse(value.capturedAt);
  const unique = (items: { id: string; order?: number }[], key: string) => {
    const ids = new Set<string>(); const orders = new Set<number>();
    items.forEach((item, index) => {
      if (ids.has(item.id)) issue([key, index, 'id'], 'ID repetido');
      ids.add(item.id);
      if (item.order !== undefined) {
        if (orders.has(item.order)) issue([key, index, 'order'], 'Orden repetido');
        orders.add(item.order);
      }
    });
  };
  const range = (start: string, end: string | null, path: (string | number)[]) => {
    if (Date.parse(start) > captured) issue([...path, 'startedAt'], 'Inicio posterior a la captura');
    if (end !== null && (Date.parse(end) < Date.parse(start) || Date.parse(end) > captured)) {
      issue(path, 'El cierre debe estar entre el inicio y la captura');
    }
  };
  if (value.dimension === 'percentage') {
    unique(value.trials, 'trials');
    value.trials.forEach((trial, i) => {
      if ((trial.response === null) !== (trial.recordedAt === null)) issue(['trials', i], 'Sin registrar requiere respuesta y fecha nulas');
      if (trial.recordedAt && Date.parse(trial.recordedAt) > captured) issue(['trials', i, 'recordedAt'], 'Registro posterior a la captura');
      if (trial.response !== 'prompted' && trial.responsePrompt !== null) issue(['trials', i, 'responsePrompt'], 'Ayuda de respuesta solo para A');
    });
  } else if (value.dimension === 'frequency') {
    unique(value.windows, 'windows'); unique(value.events, 'events');
    const sorted = [...value.windows].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
    value.windows.forEach((window, i) => range(window.startedAt, window.endedAt, ['windows', i]));
    sorted.forEach((window, i) => {
      const previous = sorted[i - 1];
      if (previous && Date.parse(window.startedAt) < Date.parse(previous.endedAt ?? value.capturedAt)) issue(['windows'], 'Ventanas activas solapadas');
    });
    value.events.forEach((item, i) => {
      const time = Date.parse(item.occurredAt);
      if (!value.windows.some((window) => time >= Date.parse(window.startedAt) && time <= Date.parse(window.endedAt ?? value.capturedAt))) {
        issue(['events', i, 'occurredAt'], 'Evento fuera del tiempo observado activo');
      }
    });
  } else if (value.dimension === 'duration') {
    unique(value.episodes, 'episodes');
    value.episodes.forEach((item, i) => range(item.startedAt, item.endedAt, ['episodes', i]));
  } else if (value.dimension === 'latency') {
    unique(value.trials, 'trials');
    value.trials.forEach((trial, i) => {
      range(trial.antecedentAt, trial.closedAt, ['trials', i]);
      if (trial.outcome === 'pending' && (trial.responseAt !== null || trial.closedAt !== null)) issue(['trials', i], 'Ensayo pendiente no puede estar cerrado');
      if (trial.outcome === 'no-response' && (trial.responseAt !== null || trial.closedAt === null)) issue(['trials', i], 'NR requiere cierre sin respuesta');
      if (trial.outcome === 'responded' && (trial.responseAt === null || trial.closedAt !== trial.responseAt)) issue(['trials', i], 'Respuesta requiere fecha y cierre coincidentes');
      if (trial.responseAt && Date.parse(trial.responseAt) < Date.parse(trial.antecedentAt)) issue(['trials', i], 'Respuesta anterior al antecedente');
    });
  } else {
    unique(value.intervals, 'intervals');
    value.intervals.forEach((item, i) => {
      if (Date.parse(item.endedAt) <= Date.parse(item.startedAt)) issue(['intervals', i], 'Intervalo sin duración positiva');
      if ((item.occurred === null) !== (item.observedAt === null)) issue(['intervals', i], 'Observación y fecha deben existir juntas');
      if (item.observedAt && (Date.parse(item.observedAt) < Date.parse(item.startedAt) || Date.parse(item.observedAt) > captured)) issue(['intervals', i], 'Fecha de observación inválida');
      if (item.occurred !== null && Date.parse(item.endedAt) > captured) issue(['intervals', i], 'No se puede observar un intervalo futuro');
    });
  }
});

export type MeasurementV2 = z.infer<typeof measurementV2Schema>;

/** Preserve legacy aggregates exactly; false cannot reveal E/A/NR or missing prompts. */
export function readPersistedMeasurement(raw: unknown):
  | { schemaVersion: 2; measurement: MeasurementV2 }
  | { schemaVersion: 1; original: Record<string, unknown>; detailsUnavailable: true } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Registro inválido');
  const original = raw as Record<string, unknown>;
  if (original.schemaVersion === 2) return { schemaVersion: 2, measurement: measurementV2Schema.parse(raw) };
  if (original.schemaVersion !== undefined && original.schemaVersion !== 1) throw new Error('Versión de captura no soportada');
  measurementDimension.parse(original.dimension);
  if (!original.payload || typeof original.payload !== 'object' || Array.isArray(original.payload)) throw new Error('Payload V1 inválido');
  return { schemaVersion: 1, original, detailsUnavailable: true };
}

/** All metrics derive from source observations; absent observations never become NR. */
export function measurementV2Metrics(raw: MeasurementV2) {
  const value = measurementV2Schema.parse(raw);
  if (value.dimension === 'percentage') {
    const recorded = value.trials.filter((trial) => trial.response !== null);
    const independent = recorded.filter((trial) => trial.response === 'independent').length;
    return { dimension: value.dimension, unit: '% independientes', value: recorded.length ? 100 * independent / recorded.length : null,
      recorded: recorded.length, planned: value.trials.length, independent,
      prompted: recorded.filter((trial) => trial.response === 'prompted').length,
      errors: recorded.filter((trial) => trial.response === 'error').length,
      noResponse: recorded.filter((trial) => trial.response === 'no-response').length,
      unrecorded: value.trials.length - recorded.length };
  }
  if (value.dimension === 'frequency') {
    const seconds = value.windows.reduce((total, window) => total + (Date.parse(window.endedAt ?? value.capturedAt) - Date.parse(window.startedAt)) / 1000, 0);
    return { dimension: value.dimension, unit: 'eventos/min', value: seconds > 0 ? value.events.length * 60 / seconds : null, count: value.events.length, observedSeconds: seconds };
  }
  if (value.dimension === 'interval') {
    const observed = value.intervals.filter((item) => item.occurred !== null);
    const positive = observed.filter((item) => item.occurred === true).length;
    return { dimension: value.dimension, unit: '% intervalos observados', value: observed.length ? 100 * positive / observed.length : null,
      observed: observed.length, planned: value.intervals.length, positive, coverage: observed.length / value.intervals.length };
  }
  if (value.dimension === 'duration') {
    const closed = value.episodes.filter((episode) => episode.endedAt !== null);
    const seconds = closed.reduce((total, episode) => total + (Date.parse(episode.endedAt!) - Date.parse(episode.startedAt)) / 1000, 0);
    return { dimension: value.dimension, unit: 'segundos', value: closed.length ? seconds : null, totalSeconds: seconds,
      averageSeconds: closed.length ? seconds / closed.length : null, closed: closed.length, open: value.episodes.length - closed.length };
  }
  const responses = value.trials.filter((trial) => trial.outcome === 'responded');
  const seconds = responses.reduce((total, trial) => total + (Date.parse(trial.responseAt!) - Date.parse(trial.antecedentAt)) / 1000, 0);
  return { dimension: value.dimension, unit: 'segundos', value: responses.length ? seconds / responses.length : null,
    responded: responses.length, noResponse: value.trials.filter((trial) => trial.outcome === 'no-response').length,
    pending: value.trials.filter((trial) => trial.outcome === 'pending').length };
}

export const captureCommandV2Schema = z.object({
  schemaVersion: z.literal(2), operationId: id, idempotencyKey: id,
  recordId: id, sessionId: id, studentId: id, programId: id, programVersionId: id,
  expectedVersion: z.number().int().nonnegative(), action: z.enum(['save-draft', 'submit', 'revise', 'discard']),
  measurement: measurementV2Schema, revisionReason: z.string().trim().max(2000).nullable(),
}).strict().superRefine((command, ctx) => {
  if (command.action === 'revise' && (!command.revisionReason || command.expectedVersion === 0)) {
    ctx.addIssue({ code: 'custom', path: ['revisionReason'], message: 'Una revisión requiere motivo y versión existente' });
  }
  if (command.action === 'submit' || command.action === 'revise') {
    const measurement = command.measurement;
    const issue = (message: string) => ctx.addIssue({ code: 'custom', path: ['measurement'], message });
    if (measurement.dimension === 'percentage') {
      if (!measurement.trials.some((trial) => trial.response !== null)) issue('No hay ensayos registrados');
      if (measurement.trials.some((trial) => trial.response === 'prompted' && trial.responsePrompt === null)) issue('Completa la ayuda de los ensayos A');
    } else if (measurement.dimension === 'frequency') {
      if (measurement.windows.some((window) => window.endedAt === null)) issue('Cierra la observación antes de enviar');
      if (!measurement.windows.some((window) => window.endedAt && Date.parse(window.endedAt) > Date.parse(window.startedAt))) issue('No hay tiempo observado');
    } else if (measurement.dimension === 'duration') {
      if (!measurement.episodes.length || measurement.episodes.some((episode) => episode.endedAt === null)) issue('Cierra los episodios antes de enviar; conserva lo abierto como borrador');
    } else if (measurement.dimension === 'latency') {
      if (!measurement.trials.length || measurement.trials.some((trial) => trial.outcome === 'pending')) issue('Cierra los ensayos antes de enviar; no conviertas pendientes en NR');
    } else if (!measurement.intervals.some((interval) => interval.occurred !== null)) {
      issue('No hay intervalos observados');
    }
  }
});
export type CaptureCommandV2 = z.infer<typeof captureCommandV2Schema>;

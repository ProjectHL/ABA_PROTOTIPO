'use client';

import { Alert, Stack, Text } from '@mantine/core';
import { readProgramDesign } from '@/domain/programs/design-v2';
import { measurementV2Metrics, readPersistedMeasurement } from '@/domain/measurements/measurement-v2';

// Read-only: receive only resources already selected by the family publication
// projection. Never load the clinical workspace or fetch additional resources.
const labels: Record<string, string> = {
  kind: 'Tipo', measurementDimension: 'Dimensión', objective: 'Objetivo', goal: 'Objetivo',
  antecedent: 'Antecedente', steps: 'Pasos', order: 'Orden', description: 'Descripción',
  sets: 'Conjuntos', name: 'Nombre', items: 'Ítems', prompts: 'Ayudas',
  errorCorrection: 'Corrección de errores', generalization: 'Generalización',
  skillArea: 'Área de habilidad', teachingProcedure: 'Procedimiento de enseñanza',
  promptLevels: 'Niveles de ayuda', procedure: 'Procedimiento', masteryCriteria: 'Criterio de dominio',
  masteryCriterion: 'Criterio de dominio', topography: 'Topografía', operationalDefinition: 'Definición operacional',
  currentDimension: 'Dimensión actual', precursorBehaviors: 'Precursores', functions: 'Funciones',
  replacementBehavior: 'Conducta alternativa', crisisPlan: 'Plan de crisis',
  hypothesizedFunctionNotes: 'Notas de función hipotetizada', hypothesizedFunction: 'Función hipotetizada',
  preventionStrategy: 'Prevención', responseStrategy: 'Estrategia de respuesta',
  phase: 'Fase', dimension: 'Dimensión', capturedAt: 'Fecha de captura', notes: 'Notas',
  trials: 'Ensayos', response: 'Respuesta', recordedAt: 'Fecha de registro',
  responsePrompt: 'Ayuda de respuesta', stimulusPrompts: 'Ayudas de estímulo',
  windows: 'Ventanas observadas', startedAt: 'Inicio', endedAt: 'Cierre',
  events: 'Eventos', occurredAt: 'Fecha del evento', episodes: 'Episodios',
  antecedentAt: 'Fecha del antecedente', responseAt: 'Fecha de respuesta',
  outcome: 'Resultado del ensayo', closedAt: 'Fecha de cierre', method: 'Método',
  intervals: 'Intervalos', observedAt: 'Fecha de observación', occurred: 'Ocurrió',
  count: 'Eventos', duration_seconds: 'Segundos observados', type: 'Tipo',
  payload: 'Datos originales', unit: 'Unidad', value: 'Métrica', recorded: 'Registrados',
  planned: 'Planificados', independent: 'Independientes', prompted: 'Con ayuda', errors: 'Errores',
  noResponse: 'Sin respuesta', unrecorded: 'Sin registrar', observedSeconds: 'Segundos observados',
  observed: 'Observados', positive: 'Positivos', coverage: 'Cobertura (0–1)',
  totalSeconds: 'Segundos totales', averageSeconds: 'Segundos promedio', closed: 'Cerrados',
  open: 'Abiertos', responded: 'Con respuesta', pending: 'Pendientes',
};
const values: Record<string, string> = {
  acquisition: 'Adquisición', behavior: 'Conducta', percentage: 'Porcentaje', frequency: 'Frecuencia',
  interval: 'Intervalos', duration: 'Duración', latency: 'Latencia', baseline: 'Línea base',
  treatment: 'Intervención', generalization: 'Generalización', maintenance: 'Mantenimiento',
  independent: 'Independiente', prompted: 'Con ayuda', error: 'Error', 'no-response': 'Sin respuesta',
  responded: 'Respondió', pending: 'Pendiente', whole: 'Completo', partial: 'Parcial', momentary: 'Momentáneo',
  attention: 'Atención', escape: 'Escape', sensory: 'Sensorial', tangible: 'Tangible',
};

function PublishedValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <Text size="sm" c="dimmed">No registrado</Text>;
  if (Array.isArray(value)) return value.length
    ? <Stack gap="xs">{value.map((item, index) => <div key={index}><Text size="xs" c="dimmed">{index + 1}.</Text><PublishedValue value={item}/></div>)}</Stack>
    : <Text size="sm" c="dimmed">Sin elementos</Text>;
  if (typeof value === 'object') return <Stack gap="xs">{Object.entries(value).filter(([key]) => !['id', 'schemaVersion'].includes(key)).map(([key, item]) =>
    <div key={key}><Text size="sm" fw={600}>{labels[key] ?? key}</Text><PublishedValue value={item}/></div>)}</Stack>;
  const text = typeof value === 'boolean' ? (value ? 'Sí' : 'No')
    : typeof value === 'number' ? value.toLocaleString('es-CL', { maximumFractionDigits: 2 })
    : values[String(value)] ?? String(value);
  return <Text size="sm" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{text || 'No registrado'}</Text>;
}

function safeProgram(design: Record<string, unknown>) {
  try { return readProgramDesign(design); } catch { return null; }
}
function safeMeasurement(measurement: Record<string, unknown>) {
  try { return readPersistedMeasurement(measurement); } catch { return null; }
}

export function FamilyPublishedProgram({ design }: { design: Record<string, unknown> }) {
    const persisted = safeProgram(design);
    if (!persisted) return <Alert color="yellow">El diseño publicado no tiene un formato compatible. Solicita su revisión al equipo.</Alert>;
    return <details><summary>Consultar diseño publicado</summary><Stack mt="sm">
      {persisted.schemaVersion === 1 && <Alert color="yellow">Diseño histórico V1: se conserva su contenido original, sin inventar estructura V2.</Alert>}
      <PublishedValue value={persisted.schemaVersion === 2 ? persisted.design : persisted.original}/>
    </Stack></details>;
}

export function FamilyPublishedResult({ measurement }: { measurement: Record<string, unknown> }) {
    const persisted = safeMeasurement(measurement);
    if (!persisted) return <Alert color="yellow">La medición publicada no tiene un formato compatible. No se calcularon métricas.</Alert>;
    if (persisted.schemaVersion === 1) return <details><summary>Consultar resultado histórico</summary><Stack mt="sm">
      <Alert color="yellow">Registro V1: los agregados originales no permiten reconstruir ayudas, E/A/NR ni tiempos individuales.</Alert>
      <PublishedValue value={persisted.original}/>
    </Stack></details>;
    const metrics = measurementV2Metrics(persisted.measurement);
    return <Stack mt="sm"><Text fw={600}>{metrics.value === null ? 'Sin observaciones suficientes' : `${metrics.value.toLocaleString('es-CL', { maximumFractionDigits: 2 })} ${metrics.unit}`}</Text>
      <details><summary>Consultar métricas y observaciones publicadas</summary><Stack mt="sm">
        <Text fw={600}>Métricas derivadas</Text><PublishedValue value={metrics}/>
        <Text fw={600}>Observaciones originales</Text><PublishedValue value={persisted.measurement}/>
      </Stack></details>
    </Stack>;
}

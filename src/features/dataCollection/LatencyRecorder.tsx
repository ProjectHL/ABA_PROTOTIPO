import { useEffect, useState } from 'react';
import { Alert, Button, Group, Paper, Stack, Text, TextInput, Textarea } from '@mantine/core';
import type { MeasurementV2 } from '@/domain/measurements/measurement-v2';

type Latency = Extract<MeasurementV2, { dimension: 'latency' }>;
export function LatencyRecorder({ programName, draft, onChange }: { programName: string; draft: Latency; onChange: (value: Latency) => void }) {
  const [antecedent, setAntecedent] = useState(''); const pending = draft.trials.find((item) => item.outcome === 'pending');
  const [clock,setClock]=useState(()=>Date.now());useEffect(()=>{const timer=window.setInterval(()=>setClock(Date.now()),1000);return()=>window.clearInterval(timer);},[]);
  const start = () => { const now = new Date().toISOString(); onChange({ ...draft, capturedAt: now, trials: [...draft.trials, { id: crypto.randomUUID(), order: draft.trials.length + 1, antecedent, antecedentAt: now, responseAt: null, outcome: 'pending', closedAt: null, notes: '' }] }); setAntecedent(''); };
  const close = (outcome: 'responded' | 'no-response') => { if (!pending) return; const now = new Date().toISOString(); onChange({ ...draft, capturedAt: now, trials: draft.trials.map((item) => item.id === pending.id ? { ...item, outcome, responseAt: outcome === 'responded' ? now : null, closedAt: now } : item) }); };
  const elapsed=pending?Math.max(0,Math.floor((clock-Date.parse(pending.antecedentAt))/1000)):0;
  return <Stack><Text fw={600}>{programName} · latencia</Text>{pending && <Alert color="yellow">Ensayo pendiente · {elapsed}s: cerrar el modal no registra NR.</Alert>}
    <Group align="end"><TextInput label="Antecedente presentado" value={antecedent} onChange={(event) => setAntecedent(event.currentTarget.value)} style={{ flex: 1 }}/><Button onClick={start} disabled={Boolean(pending) || !antecedent.trim()}>Presentar</Button></Group>
    {pending && <Group><Button onClick={() => close('responded')}>Registrar respuesta</Button><Button color="gray" variant="light" onClick={() => close('no-response')}>Cerrar como NR</Button></Group>}
    {draft.trials.map((item) => <Paper key={item.id} withBorder p="sm"><Text>#{item.order} · {item.antecedent} · {item.outcome === 'pending' ? 'Pendiente' : item.outcome === 'responded' ? 'Respondió' : 'NR'}</Text><Textarea label="Observación original" value={item.notes} onChange={(event) => onChange({ ...draft, capturedAt: new Date().toISOString(), trials: draft.trials.map((entry) => entry.id === item.id ? { ...entry, notes: event.currentTarget.value } : entry) })}/></Paper>)}
  </Stack>;
}

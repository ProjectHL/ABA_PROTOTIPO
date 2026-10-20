import { useEffect, useState } from 'react';
import { Alert, Button, Group, Paper, Stack, Text, Textarea } from '@mantine/core';
import type { MeasurementV2 } from '@/domain/measurements/measurement-v2';

type Duration = Extract<MeasurementV2, { dimension: 'duration' }>;
export function DurationRecorder({ programName, draft, onChange }: { programName: string; draft: Duration; onChange: (value: Duration) => void }) {
  const openId = draft.episodes.find((item) => item.endedAt === null)?.id ?? null;
  const [clock,setClock]=useState(()=>Date.now());
  useEffect(()=>{const timer=window.setInterval(()=>setClock(Date.now()),1000);return()=>window.clearInterval(timer);},[]);
  const start = () => { const now = new Date().toISOString(); const id = crypto.randomUUID(); onChange({ ...draft, capturedAt: now, episodes: [...draft.episodes, { id, startedAt: now, endedAt: null, notes: '' }] }); };
  const stop = () => { if (!openId) return; const now = new Date().toISOString(); onChange({ ...draft, capturedAt: now, episodes: draft.episodes.map((item) => item.id === openId ? { ...item, endedAt: now } : item) }); };
  const open=draft.episodes.find(item=>item.id===openId);const elapsed=open?Math.max(0,Math.floor((clock-Date.parse(open.startedAt))/1000)):0;
  return <Stack><Text fw={600}>{programName} · duración</Text>{openId && <Alert color="yellow">Hay un episodio abierto ({Math.floor(elapsed/60).toString().padStart(2,'0')}:{(elapsed%60).toString().padStart(2,'0')}). Ciérralo antes de enviar; cerrar el modal no lo completa.</Alert>}
    <Group><Button onClick={start} disabled={Boolean(openId)}>Iniciar episodio</Button><Button color="red" variant="light" onClick={stop} disabled={!openId}>Cerrar episodio</Button></Group>
    {draft.episodes.map((item, index) => <Paper key={item.id} withBorder p="sm"><Text>#{index + 1}: {new Date(item.startedAt).toLocaleTimeString()} — {item.endedAt ? new Date(item.endedAt).toLocaleTimeString() : 'abierto'}</Text><Textarea label="Observación original" value={item.notes} onChange={(event) => onChange({ ...draft, capturedAt: new Date().toISOString(), episodes: draft.episodes.map((entry) => entry.id === item.id ? { ...entry, notes: event.currentTarget.value } : entry) })}/></Paper>)}
  </Stack>;
}

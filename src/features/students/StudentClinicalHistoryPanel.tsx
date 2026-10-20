'use client';

import { useMemo, useState } from 'react';
import { ActionIcon, Badge, Button, Collapse, Group, Paper, Stack, Text, Title, Tooltip } from '@mantine/core';
import { ChevronDown, ChevronRight, Edit, History, Plus, Trash } from 'lucide-react';
import type { ClinicalHistoryDto } from '@/modules/students/contracts';

type Props = {
  entries: ClinicalHistoryDto[];
  canEdit: boolean;
  saving: boolean;
  onAdd: () => void;
  onEdit: (entry: ClinicalHistoryDto) => void;
  onRetire: (entry: ClinicalHistoryDto) => void;
};

const labels: Record<Exclude<ClinicalHistoryDto['kind'], 'medication'>, string> = {
  reported_diagnosis: 'Diagnóstico',
  assessment: 'Evaluación',
  procedure: 'Procedimiento',
};

export function StudentClinicalHistoryPanel({ entries, canEdit, saving, onAdd, onEdit, onRetire }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const groups = useMemo(() => {
    const byHistory = new Map<string, ClinicalHistoryDto[]>();
    for (const entry of entries.filter((item) => item.kind !== 'medication')) {
      const versions = byHistory.get(entry.historyId) ?? [];
      versions.push(entry); byHistory.set(entry.historyId, versions);
    }
    return [...byHistory.values()].map((versions) => [...versions].sort((left, right) =>
      (right.version ?? 0) - (left.version ?? 0) || right.createdAt.localeCompare(left.createdAt),
    )).sort((left, right) => right[0].createdAt.localeCompare(left[0].createdAt));
  }, [entries]);

  return <Paper shadow="xs" p="lg" radius="md" withBorder>
    <Group justify="space-between" mb="md">
      <div><Title order={4}>Historial clínico</Title><Text size="sm" c="dimmed">Diagnósticos, evaluaciones y procedimientos con versiones inmutables.</Text></div>
      <Button variant="light" leftSection={<Plus size={16} />} onClick={onAdd} disabled={!canEdit || saving}>Agregar entrada</Button>
    </Group>
    <Stack gap="sm">
      {groups.map((versions) => {
        const current = versions[0]; const prior = versions.slice(1); const open = !!expanded[current.historyId];
        return <Paper key={current.historyId} p="md" withBorder>
          <Group justify="space-between" align="flex-start">
            <div style={{ flex: 1 }}>
              <Group gap="xs"><Badge variant="light">{labels[current.kind as keyof typeof labels]}</Badge><Text fw={600}>{current.descriptor}</Text><Badge color={current.status === 'entered_in_error' ? 'red' : current.status === 'active' ? 'green' : 'gray'}>{current.status === 'inactive' ? 'Retirada' : current.status}</Badge>{prior.length > 0 && <ActionIcon aria-label="Mostrar versiones anteriores" variant="subtle" size="sm" onClick={() => setExpanded((value) => ({ ...value, [current.historyId]: !open }))}>{open ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}</ActionIcon>}</Group>
              {current.notes && <Text size="sm" mt="xs" style={{ whiteSpace: 'pre-wrap' }}>{current.notes}</Text>}
              <Text size="xs" c="dimmed" mt="xs">Versión {current.version ?? 'V1'} · {new Date(current.createdAt).toLocaleString('es-CL')}</Text>
            </div>
            <Group gap="xs"><Tooltip label="Crear una corrección versionada"><ActionIcon variant="light" onClick={() => onEdit(current)} disabled={!canEdit || saving || current.status === 'inactive'}><Edit size={16}/></ActionIcon></Tooltip><Tooltip label={current.status === 'inactive' ? 'Referencia retirada; evidencia conservada' : 'Retirar referencia conservando evidencia'}><ActionIcon aria-label="Retirar referencia clínica" color="red" variant="light" onClick={() => onRetire(current)} disabled={!canEdit || saving || current.status === 'inactive'}><Trash size={16}/></ActionIcon></Tooltip></Group>
          </Group>
          <Collapse in={open}><Stack gap="xs" mt="md" pl="lg" style={{ borderLeft: '2px solid var(--mantine-color-gray-3)' }}><Group gap={4}><History size={14}/><Text size="xs" fw={700} c="dimmed">VERSIONES ANTERIORES</Text></Group>{prior.map((item) => <div key={item.versionId}><Text size="xs"><strong>v{item.version ?? 'V1'} · {item.descriptor}</strong> · {item.status}</Text>{item.notes && <Text size="xs" c="dimmed" style={{ whiteSpace: 'pre-wrap' }}>{item.notes}</Text>}</div>)}</Stack></Collapse>
        </Paper>;
      })}
      {groups.length === 0 && <Text c="dimmed" fs="italic">No hay entradas clínicas no farmacológicas registradas.</Text>}
    </Stack>
  </Paper>;
}

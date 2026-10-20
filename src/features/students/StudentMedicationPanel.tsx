'use client';

import { useState } from 'react';
import { ActionIcon, Badge, Button, Collapse, Divider, Group, Paper, Stack, Text, Title, Tooltip } from '@mantine/core';
import { Calendar, ChevronDown, ChevronRight, CornerDownRight, Edit, History, Plus, Trash } from 'lucide-react';
import type { MedicationRecord } from './student.types';

type Props = {
  medications: MedicationRecord[];
  canEdit: boolean;
  saving: boolean;
  onAdd: () => void;
  onEdit: (medication: MedicationRecord) => void;
  onToggle: (medication: MedicationRecord) => Promise<void>;
};

const date = (value: string | null) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('es-CL') : 'No informada';

export function StudentMedicationPanel({ medications, canEdit, saving, onAdd, onEdit, onToggle }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const active = medications.filter((item) => item.status === 'active');
  const inactive = medications.filter((item) => item.status === 'inactive');
  const exceptional = medications.filter((item) => !['active', 'inactive'].includes(item.status));

  const card = (medication: MedicationRecord, muted = false) => <Paper key={medication.historyId} p="md" withBorder opacity={muted ? 0.68 : 1}>
    <Group justify="space-between" align="flex-start">
      <div style={{ flex: '1 1 280px', minWidth: 0, overflowWrap: 'anywhere' }}>
        <Group gap="xs"><Text fw={600} maw="100%">{medication.name}</Text><Badge color={medication.status === 'active' ? 'green' : medication.status === 'entered_in_error' ? 'red' : 'gray'}>{medication.status === 'active' ? 'Activa' : medication.status === 'inactive' ? 'Inactiva' : medication.status === 'entered_in_error' ? 'Con error' : 'Superada'}</Badge>{(medication.history?.length ?? 0) > 0 && <ActionIcon variant="subtle" size="sm" onClick={() => setExpanded((value) => ({ ...value, [medication.historyId]: !value[medication.historyId] }))}>{expanded[medication.historyId] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</ActionIcon>}</Group>
        <Group gap="md" mt="xs"><Text size="sm"><strong>Dosis:</strong> {medication.dose || 'No especificada'}</Text><Text size="sm"><strong>Frecuencia:</strong> {medication.frequency || 'No especificada'}</Text></Group>
        <Group gap="xs" mt="xs"><Calendar size={14} /><Text size="xs" c="dimmed">{date(medication.startDate)} – {medication.endDate ? date(medication.endDate) : 'Presente'}{medication.prescribedBy ? ` · Prescrito por ${medication.prescribedBy}` : ''}</Text></Group>
        {medication.notes && <Text size="xs" c="dimmed" mt="xs">{medication.notes}</Text>}
      </div>
      <Group gap="xs"><Tooltip label="Corregir o evolucionar"><ActionIcon variant="light" color="blue" onClick={() => onEdit(medication)} disabled={!canEdit || saving}><Edit size={16} /></ActionIcon></Tooltip>{!['entered_in_error', 'superseded'].includes(medication.status) && <Button size="xs" variant="light" onClick={() => void onToggle(medication)} disabled={!canEdit || saving}>{medication.status === 'active' ? 'Finalizar' : 'Reactivar'}</Button>}<Tooltip label="El historial clínico no se elimina; usa una corrección versionada"><ActionIcon color="red" variant="light" disabled><Trash size={16} /></ActionIcon></Tooltip></Group>
    </Group>
    <Collapse in={!!expanded[medication.historyId]}>
      <Stack gap="xs" mt="md" pl="lg" style={{ borderLeft: '2px solid var(--mantine-color-gray-3)' }}><Group gap={4}><History size={14} /><Text size="xs" fw={700} c="dimmed">HISTORIAL DE VERSIONES</Text></Group>{medication.history?.map((item) => <Group key={item.versionId} gap="xs"><CornerDownRight size={12} color="var(--mantine-color-gray-5)" /><Text size="xs" c="dimmed"><strong>v{item.version ?? 'V1'} · {item.dose || 'sin dosis'} · {item.frequency || 'sin frecuencia'}</strong> · {date(item.startDate)} – {item.endDate ? date(item.endDate) : 'Presente'} · {item.status}</Text></Group>)}</Stack>
    </Collapse>
  </Paper>;

  return <Paper shadow="xs" p="lg" radius="md" withBorder>
    <Group justify="space-between" mb="md"><Title order={4}>Medicación</Title><Button variant="light" leftSection={<Plus size={16} />} onClick={onAdd} disabled={!canEdit || saving}>Agregar medicación</Button></Group>
    <Stack gap="lg"><div><Text fw={600} size="sm" mb="sm" c="green">Medicación Actual</Text><Stack gap="xs">{active.map((item) => card(item))}{active.length === 0 && <Text size="sm" c="dimmed" fs="italic">No hay medicación activa</Text>}</Stack></div><Divider /><div><Text fw={600} size="sm" mb="sm" c="dimmed">Historial de Medicación</Text><Stack gap="xs">{inactive.map((item) => card(item, true))}{inactive.length === 0 && <Text size="sm" c="dimmed" fs="italic">No hay medicación inactiva</Text>}</Stack></div>{exceptional.length > 0 && <><Divider /><div><Text fw={600} size="sm" mb="sm" c="red">Revisiones clínicas</Text><Stack gap="xs">{exceptional.map((item) => card(item, true))}</Stack></div></>}</Stack>
  </Paper>;
}

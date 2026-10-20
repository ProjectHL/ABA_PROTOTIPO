'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ActionIcon, Alert, Badge, Button, Fieldset, Grid, Group, Modal, MultiSelect, Paper, Stack, Switch,
  Table, Text, TextInput, Textarea, Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { Archive, Edit, Mail, Phone, Plus, Users } from 'lucide-react';
import type { StudentPersonDto, StudentSiblingDto } from '@/modules/students/contracts';

type Props = {
  people: StudentPersonDto[];
  siblings: StudentSiblingDto[];
  canEdit: boolean;
  saving: boolean;
  onSave: (people: StudentPersonDto[], siblings: StudentSiblingDto[]) => Promise<boolean>;
  pending: boolean;
  onRetry: () => Promise<boolean>;
  leaveGuard?: { current: (() => boolean) | null };
};

const newId = () => crypto.randomUUID();

export function StudentPeoplePanel({ people: sourcePeople, siblings: sourceSiblings, canEdit, saving, onSave, pending, onRetry, leaveGuard }: Props) {
  const [people, setPeople] = useState(sourcePeople);
  const [siblings, setSiblings] = useState(sourceSiblings);
  const [personOpened, personModal] = useDisclosure(false);
  const [siblingOpened, siblingModal] = useDisclosure(false);
  const [editingPerson, setEditingPerson] = useState<StudentPersonDto | null>(null);
  const [editingSibling, setEditingSibling] = useState<StudentSiblingDto | null>(null);
  const [error, setError] = useState('');
  const busyRef = useRef(false);
  useEffect(() => { setPeople(sourcePeople); setSiblings(sourceSiblings); }, [sourcePeople, sourceSiblings]);

  const personForm = useForm({
    initialValues: { fullName: '', initials: '', birthDate: '', relationship: '', phone: '', email: '', roles: ['family'], isPrimaryContact: false },
  });
  const siblingForm = useForm({ initialValues: { fullName: '', initials: '', birthDate: '', notes: '' } });
  const closePerson = () => { if (!saving && !pending && !busyRef.current && window.confirm('¿Cerrar el formulario sin guardar?')) personModal.close(); };
  const closeSibling = () => { if (!saving && !pending && !busyRef.current && window.confirm('¿Cerrar el formulario sin guardar?')) siblingModal.close(); };
  useEffect(() => {
    const leave = () => {
      if (saving || pending || busyRef.current) { setError('Resuelve primero la operación familiar pendiente.'); return false; }
      return !(personOpened || siblingOpened) || window.confirm('¿Descartar el formulario familiar sin guardar?');
    };
    if (leaveGuard) leaveGuard.current = leave;
    const warn = (event: BeforeUnloadEvent) => {
      if (personOpened || siblingOpened || pending || busyRef.current) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', warn);
    return () => { if (leaveGuard) leaveGuard.current = null; window.removeEventListener('beforeunload', warn); };
  });
  const retry = async () => {
    if (busyRef.current || saving) return;
    busyRef.current = true;
    try { if (await onRetry()) { personModal.close(); siblingModal.close(); } }
    finally { busyRef.current = false; }
  };
  const pendingNotice = pending ? <Alert color="yellow">La operación familiar no tiene resultado confirmado. Los datos enviados se conservan sin cambios.
    <Button mt="sm" loading={saving} onClick={() => void retry()}>Reintentar misma operación</Button></Alert> : null;

  const openPerson = (person?: StudentPersonDto) => {
    if (!canEdit || saving || pending || busyRef.current) return;
    setEditingPerson(person ?? null); setError('');
    personForm.setValues(person ? {
      fullName: person.fullName ?? '', initials: person.initials ?? '', birthDate: person.birthDate ?? '',
      relationship: person.relationship, phone: person.phone ?? '', email: person.email ?? '', roles: [...person.roles],
      isPrimaryContact: person.isPrimaryContact,
    } : { fullName: '', initials: '', birthDate: '', relationship: '', phone: '', email: '', roles: ['family'], isPrimaryContact: false });
    personModal.open();
  };
  const openSibling = (sibling?: StudentSiblingDto) => {
    if (!canEdit || saving || pending || busyRef.current) return;
    setEditingSibling(sibling ?? null); setError('');
    siblingForm.setValues(sibling ? {
      fullName: sibling.fullName ?? '', initials: sibling.initials ?? '', birthDate: sibling.birthDate ?? '', notes: sibling.notes ?? '',
    } : { fullName: '', initials: '', birthDate: '', notes: '' });
    siblingModal.open();
  };

  const persist = async (nextPeople: StudentPersonDto[], nextSiblings: StudentSiblingDto[]) => {
    if (!canEdit || saving || pending || busyRef.current) return false;
    busyRef.current = true;
    setError('');
    try {
      if (!await onSave(nextPeople, nextSiblings)) return false;
      setPeople(nextPeople); setSiblings(nextSiblings); return true;
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible guardar la ficha familiar.'); return false; }
    finally { busyRef.current = false; }
  };

  const savePerson = async () => {
    if (editingPerson && !people.some(item => item.id === editingPerson.id)) return setError('Esta persona ya no está activa en la versión actual. El formulario se conserva, pero no se recreará automáticamente.');
    const values = personForm.values;
    if (!values.fullName.trim() && !values.initials.trim()) return setError('Informa nombre completo o iniciales.');
    if (values.roles.length < 1) return setError('Selecciona al menos un rol.');
    if (values.isPrimaryContact && !values.roles.includes('contact')) return setError('El contacto principal debe incluir el rol Contacto.');
    const person: StudentPersonDto = {
      id: editingPerson?.id ?? newId(), fullName: values.fullName.trim() || null, initials: values.initials.trim() || null,
      birthDate: values.birthDate || null, relationship: values.relationship.trim(), phone: values.phone.trim() || null,
      email: values.email.trim().toLowerCase() || null, roles: values.roles as ('family' | 'contact')[], isPrimaryContact: values.isPrimaryContact,
    };
    const next = people.map((item) => ({ ...item, isPrimaryContact: person.isPrimaryContact ? false : item.isPrimaryContact }));
    const index = next.findIndex((item) => item.id === person.id);
    if (index >= 0) next[index] = person; else next.push(person);
    if (await persist(next, siblings)) personModal.close();
  };
  const archivePerson = async (person: StudentPersonDto) => {
    if (!window.confirm(`¿Archivar a ${person.fullName ?? person.initials}? Su identidad histórica no se eliminará.`)) return;
    await persist(people.filter((item) => item.id !== person.id), siblings);
  };

  const saveSibling = async () => {
    if (editingSibling && !siblings.some(item => item.id === editingSibling.id)) return setError('Este hermano ya no está activo en la versión actual. El formulario se conserva, pero no se recreará automáticamente.');
    const values = siblingForm.values;
    if (!values.fullName.trim() && !values.initials.trim()) return setError('Informa nombre completo o iniciales.');
    const sibling: StudentSiblingDto = {
      id: editingSibling?.id ?? newId(), fullName: values.fullName.trim() || null, initials: values.initials.trim() || null,
      birthDate: values.birthDate || null, notes: values.notes.trim() || null,
    };
    const next = [...siblings]; const index = next.findIndex((item) => item.id === sibling.id);
    if (index >= 0) next[index] = sibling; else next.push(sibling);
    if (await persist(people, next)) siblingModal.close();
  };
  const archiveSibling = async (sibling: StudentSiblingDto) => {
    if (!window.confirm(`¿Archivar a ${sibling.fullName ?? sibling.initials}?`)) return;
    await persist(people, siblings.filter((item) => item.id !== sibling.id));
  };

  return <Stack gap="lg">
    {error && <Paper p="sm" withBorder bg="red.0"><Text size="sm" c="red">{error}</Text></Paper>}
    <Paper shadow="xs" p="lg" radius="md" withBorder>
      <Group justify="space-between" mb="md"><div><Title order={4}>Contactos Familiares</Title><Text size="sm" c="dimmed">Una persona puede ser familiar, contacto o ambos; sólo un contacto puede ser principal.</Text></div><Button variant="light" leftSection={<Plus size={16} />} onClick={() => openPerson()} disabled={!canEdit || saving}>Agregar familiar o contacto</Button></Group>
      <Table.ScrollContainer minWidth={700}>
      <Table highlightOnHover>
        <Table.Thead><Table.Tr><Table.Th>Nombre</Table.Th><Table.Th>Roles</Table.Th><Table.Th>Relación</Table.Th><Table.Th>Teléfono / email</Table.Th><Table.Th>Principal</Table.Th><Table.Th>Acciones</Table.Th></Table.Tr></Table.Thead>
        <Table.Tbody>{people.map((person) => <Table.Tr key={person.id}>
          <Table.Td fw={500}>{person.fullName ?? person.initials}</Table.Td>
          <Table.Td>{person.roles.map((role) => <Badge key={role} size="xs" mr={4}>{role === 'family' ? 'Familiar' : 'Contacto'}</Badge>)}</Table.Td>
          <Table.Td>{person.relationship || 'No informado'}</Table.Td>
          <Table.Td><Stack gap={2}>{person.phone && <Group gap={4}><Phone size={13} /><Text size="xs">{person.phone}</Text></Group>}{person.email && <Group gap={4}><Mail size={13} /><Text size="xs">{person.email}</Text></Group>}{!person.phone && !person.email && <Text size="xs" c="dimmed">No informado</Text>}</Stack></Table.Td>
          <Table.Td>{person.isPrimaryContact ? <Badge color="green">Principal</Badge> : '—'}</Table.Td>
          <Table.Td><Group gap="xs"><ActionIcon variant="light" onClick={() => openPerson(person)} disabled={!canEdit || saving}><Edit size={15} /></ActionIcon><ActionIcon variant="subtle" color="red" onClick={() => void archivePerson(person)} disabled={!canEdit || saving}><Archive size={15} /></ActionIcon></Group></Table.Td>
        </Table.Tr>)}</Table.Tbody>
      </Table>
      </Table.ScrollContainer>
      {people.length === 0 && <Stack align="center" py="xl"><Users size={30} /><Text c="dimmed">No hay familiares ni contactos activos.</Text></Stack>}
    </Paper>

    <Paper shadow="xs" p="lg" radius="md" withBorder>
      <Group justify="space-between" mb="md"><div><Title order={4}>Hermanos</Title><Text size="sm" c="dimmed">Se conservan como identidades separadas y no reciben acceso por ser hermanos.</Text></div><Button variant="light" leftSection={<Plus size={16} />} onClick={() => openSibling()} disabled={!canEdit || saving}>Agregar hermano</Button></Group>
      <Table.ScrollContainer minWidth={700}>
      <Table highlightOnHover><Table.Thead><Table.Tr><Table.Th>Nombre / iniciales</Table.Th><Table.Th>Fecha de nacimiento</Table.Th><Table.Th>Notas</Table.Th><Table.Th>Acciones</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{siblings.map((sibling) => <Table.Tr key={sibling.id}><Table.Td fw={500}>{sibling.fullName ?? sibling.initials}</Table.Td><Table.Td>{sibling.birthDate ?? 'No informada'}</Table.Td><Table.Td>{sibling.notes ?? '—'}</Table.Td><Table.Td><Group gap="xs"><ActionIcon variant="light" onClick={() => openSibling(sibling)} disabled={!canEdit || saving}><Edit size={15} /></ActionIcon><ActionIcon variant="subtle" color="red" onClick={() => void archiveSibling(sibling)} disabled={!canEdit || saving}><Archive size={15} /></ActionIcon></Group></Table.Td></Table.Tr>)}</Table.Tbody></Table>
      </Table.ScrollContainer>
      {siblings.length === 0 && <Text c="dimmed" fs="italic" py="md">No hay hermanos activos registrados.</Text>}
    </Paper>

    <Modal opened={personOpened} onClose={closePerson} closeOnClickOutside={false} closeOnEscape={!saving&&!pending} withCloseButton={!saving&&!pending} title={editingPerson ? 'Editar familiar o contacto' : 'Agregar familiar o contacto'} size="lg">
      <Stack>{pendingNotice}{error && <Alert color="red">{error}</Alert>}<Fieldset disabled={!canEdit || saving || pending}><Stack><Grid><Grid.Col span={8}><TextInput label="Nombre completo" {...personForm.getInputProps('fullName')} /></Grid.Col><Grid.Col span={4}><TextInput label="Iniciales" maxLength={12} {...personForm.getInputProps('initials')} /></Grid.Col></Grid><Grid><Grid.Col span={6}><TextInput label="Fecha de nacimiento (AAAA-MM-DD)" {...personForm.getInputProps('birthDate')} /></Grid.Col><Grid.Col span={6}><TextInput label="Relación" {...personForm.getInputProps('relationship')} /></Grid.Col></Grid><Grid><Grid.Col span={6}><TextInput label="Teléfono" {...personForm.getInputProps('phone')} /></Grid.Col><Grid.Col span={6}><TextInput label="Email" type="email" {...personForm.getInputProps('email')} /></Grid.Col></Grid><MultiSelect label="Roles" required data={[{ value: 'family', label: 'Familiar' }, { value: 'contact', label: 'Contacto' }]} {...personForm.getInputProps('roles')} /><Switch label="Contacto principal" {...personForm.getInputProps('isPrimaryContact', { type: 'checkbox' })} /></Stack></Fieldset><Group justify="flex-end"><Button variant="default" disabled={saving || pending} onClick={closePerson}>Cancelar</Button><Button onClick={() => void savePerson()} loading={saving} disabled={!canEdit || pending}>Guardar</Button></Group></Stack>
    </Modal>
    <Modal opened={siblingOpened} onClose={closeSibling} closeOnClickOutside={false} closeOnEscape={!saving&&!pending} withCloseButton={!saving&&!pending} title={editingSibling ? 'Editar hermano' : 'Agregar hermano'}>
      <Stack>{pendingNotice}{error && <Alert color="red">{error}</Alert>}<Fieldset disabled={!canEdit || saving || pending}><Stack><Grid><Grid.Col span={8}><TextInput label="Nombre completo" {...siblingForm.getInputProps('fullName')} /></Grid.Col><Grid.Col span={4}><TextInput label="Iniciales" maxLength={12} {...siblingForm.getInputProps('initials')} /></Grid.Col></Grid><TextInput label="Fecha de nacimiento (AAAA-MM-DD)" {...siblingForm.getInputProps('birthDate')} /><Textarea label="Notas" {...siblingForm.getInputProps('notes')} /></Stack></Fieldset><Group justify="flex-end"><Button variant="default" disabled={saving || pending} onClick={closeSibling}>Cancelar</Button><Button onClick={() => void saveSibling()} loading={saving} disabled={!canEdit || pending}>Guardar</Button></Group></Stack>
    </Modal>
  </Stack>;
}

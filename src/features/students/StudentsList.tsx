import { useState } from 'react';
import { useNavigate } from '@/lib/navigation';
import {
    ActionIcon, Avatar, Badge, Box, Card, Group, Indicator, Menu,
    SimpleGrid, Stack, Tabs, Text, TextInput, Tooltip,
} from '@mantine/core';
import { Eye, FolderOpen, MoreVertical, Plus, Search } from 'lucide-react';
import { useRole } from '@/hooks/useRole';
import { type StudentProfile } from './student.types';
import ShareButton from './ShareButton';

/** Contrato futuro: la creación está deshabilitada hasta definir el alta clínica. */
interface StudentsListProps { students: StudentProfile[]; onCreate?: () => void; }

export function StudentsList({ students, onCreate }: StudentsListProps) {
    const navigate = useNavigate();
    const { isTherapist } = useRole();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<string | null>('active');
    const filteredStudents = students.filter((student) => {
        const query = searchQuery.toLowerCase();
        return (student.displayName.toLowerCase().includes(query) || student.initials.toLowerCase().includes(query) || student.clinicalId.toLowerCase().includes(query) || student.rut?.toLowerCase().includes(query) || student.diagnosis?.toLowerCase().includes(query))
            && (activeTab === 'all' || student.status === activeTab);
    });

    return (
        <Stack gap="lg">
            <Group justify="space-between" align="flex-end">
                <Stack gap="xs" style={{ flex: 1 }}>
                    <Tabs value={activeTab} onChange={setActiveTab} variant="pills" radius="xl">
                        <Tabs.List>
                            <Tabs.Tab value="active">Vigentes</Tabs.Tab>
                            <Tabs.Tab value="archived">Antiguos</Tabs.Tab>
                            <Tabs.Tab value="all">Todos</Tabs.Tab>
                        </Tabs.List>
                    </Tabs>
                    <TextInput placeholder="Buscar por nombre, diagnóstico, ID clínico o RUT..." leftSection={<Search size={16} />}
                        value={searchQuery} onChange={(event) => setSearchQuery(event.currentTarget.value)} style={{ maxWidth: '500px' }} />
                </Stack>
                {!isTherapist && (
                    <Tooltip label={onCreate ? 'Crear ficha clínica' : 'La carga de ficha aún no está disponible para esta clínica.'}>
                        <ActionIcon size="xl" radius="xl" variant="filled" color="blue" onClick={onCreate} disabled={!onCreate}><Plus size={24} /></ActionIcon>
                    </Tooltip>
                )}
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="lg">
                {filteredStudents.map((student) => (
                    <Card key={student.id} shadow="sm" padding="lg" radius="md" withBorder
                        style={{ cursor: 'pointer', transition: 'all 0.2s ease' }} onClick={() => navigate(`/students/${student.id}`)}>
                        <Card.Section withBorder inheritPadding py="xs">
                            <Group justify="space-between" align="flex-start">
                                <Group gap="xs">
                                    <Badge variant="light" color={student.status === 'active' ? 'green' : 'gray'} size="sm">{student.status === 'active' ? 'Vigente' : 'Antiguo'}</Badge>
                                    {student.hasActiveSession && <Badge color="green" size="xs">Sesión activa</Badge>}
                                    {student.familyAccessEnabled && <Badge variant="outline" color="blue" size="xs">Acceso familiar</Badge>}
                                </Group>
                                <Menu shadow="md" width={200} position="bottom-end" keepMounted>
                                    <Menu.Target><ActionIcon variant="subtle" color="gray" onClick={(event) => event.stopPropagation()}><MoreVertical size={16} /></ActionIcon></Menu.Target>
                                    <Menu.Dropdown>
                                        <Menu.Label>Acciones</Menu.Label>
                                        <Menu.Item leftSection={<Eye size={16} />} onClick={(event) => { event.stopPropagation(); navigate(`/students/${student.id}`); }}>Ver carpeta</Menu.Item>
                                        {student.capabilities.includes('authorization.decide') && <ShareButton studentId={student.id} studentName={student.displayName}/>}
                                        {/* Chat queda fuera del release actual y volverá como upgrade posterior. */}
                                    </Menu.Dropdown>
                                </Menu>
                            </Group>
                        </Card.Section>
                        <Stack gap="md" mt="md" align="center">
                            <Indicator inline size={12} offset={7} position="bottom-end" color={student.hasActiveSession ? 'green' : 'gray'} withBorder>
                                <Avatar src={student.avatar} size={80} radius="md">{student.initials}</Avatar>
                            </Indicator>
                            <Box style={{ textAlign: 'center' }}>
                                <Text fw={600} size="lg">{student.displayName}</Text>
                                {student.dateOfBirth && <Text size="sm" c="dimmed">{student.age} años</Text>}
                                {student.diagnosis && <Badge variant="light" color="blue" mt="xs" size="sm">{student.diagnosis}</Badge>}
                                <Text size="xs" c="dimmed" mt="xs">ID clínico: {student.clinicalId || 'No disponible'}</Text>
                            </Box>
                            <Group gap="xs" justify="center" w="100%"><FolderOpen size={14} color="var(--mantine-color-dimmed)" /><Text size="xs" c="dimmed">{student.assignedProfessional ?? 'Sin profesional asignado visible'}</Text></Group>
                        </Stack>
                    </Card>
                ))}
            </SimpleGrid>
            {filteredStudents.length === 0 && (
                <Box p="xl" style={{ textAlign: 'center', border: '2px dashed var(--mantine-color-gray-3)', borderRadius: 'var(--mantine-radius-md)' }}>
                    <Text c="dimmed" size="lg" fw={500}>No se encontraron estudiantes autorizados</Text>
                    <Text c="dimmed" size="sm" mt="xs">Intenta con otro término de búsqueda.</Text>
                </Box>
            )}
        </Stack>
    );
}

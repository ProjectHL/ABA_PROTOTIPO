import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    SimpleGrid,
    Card,
    Avatar,
    Text,
    Badge,
    Group,
    Stack,
    TextInput,
    ActionIcon,
    Indicator,
    Box,
    Menu,
    Modal,
    Button,
    Select,
    Autocomplete
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { Search, Plus, FolderOpen, MoreVertical, Eye, Share2 } from 'lucide-react';
import ShareStudentModal from './ShareStudentModal';
import { type StudentProfile } from '@/api/mockData';
import { useRole } from '@/hooks/useRole';

interface StudentsListProps {
    students: StudentProfile[];
    onCreateStudent?: (studentData: { fullName: string; identityNumber: string; dateOfBirth: Date; diagnosis: string }) => void;
}

import { Tabs } from '@mantine/core';

// ... (imports existentes)

export function StudentsList({ students, onCreateStudent }: StudentsListProps) {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const { isTherapist } = useRole(); // Actualizado a isTherapist
    const [activeTab, setActiveTab] = useState<string | null>('active');

    // Diagnósticos dinámicos
    const defaultDiagnoses = ['TEA Nivel 1', 'TEA Nivel 2', 'TEA Nivel 3', 'Retraso Global del Desarrollo'];
    const existingDiagnoses = Array.from(new Set(students.map(s => s.diagnosis)));
    const diagnosisOptions = Array.from(new Set([...defaultDiagnoses, ...existingDiagnoses, 'Otro']));

    // Estado creación
    const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false);
    const createForm = useForm({
        initialValues: {
            fullName: '',
            identityNumber: '',
            dateOfBirth: new Date(),
            diagnosis: '',
            customDiagnosis: ''
        },
        validate: {
            fullName: (value) => (value.length < 5 ? 'El nombre debe tener al menos 5 caracteres' : null),
            identityNumber: (value) => (value.length < 8 ? 'RUT inválido' : null),
            diagnosis: (value) => (value.length < 2 ? 'Debe especificar diagnóstico' : null),
            customDiagnosis: (value, values) => (values.diagnosis === 'Otro' && value.length < 2 ? 'Especifique el diagnóstico' : null)
        }
    });

    const handleCreateSubmit = (values: typeof createForm.values) => {
        if (onCreateStudent) {
            const finalDiagnosis = values.diagnosis === 'Otro' ? values.customDiagnosis : values.diagnosis;
            onCreateStudent({
                fullName: values.fullName,
                identityNumber: values.identityNumber,
                dateOfBirth: values.dateOfBirth,
                diagnosis: finalDiagnosis
            });
        }
        createForm.reset();
        closeCreateModal();
    };

    // Estado para compartir
    const [shareModalOpened, { open: openShareModal, close: closeShareModal }] = useDisclosure(false);
    const [studentToShare, setStudentToShare] = useState<StudentProfile | null>(null);

    // Si es terapeuta, solo ve una sublista (simulación: los primeros 3)
    const availableStudents = isTherapist ? students.slice(0, 3) : students;

    const filteredStudents = availableStudents.filter((student) => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = (
            student.fullName.toLowerCase().includes(query) ||
            student.diagnosis.toLowerCase().includes(query) ||
            student.identityNumber.includes(query)
        );

        const studentStatus = student.status || 'active';
        const matchesTab = activeTab === 'all' || studentStatus === activeTab;

        return matchesSearch && matchesTab;
    });

    const handleStudentClick = (studentId: string) => {
        navigate(`/students/${studentId}`);
    };

    const handleShareClick = (student: StudentProfile, e: React.MouseEvent) => {
        e.stopPropagation();
        setStudentToShare(student);
        openShareModal();
    };

    return (
        <Stack gap="lg">
            {/* Search and Tabs */}
            <Group justify="space-between" align="flex-end">
                <Stack gap="xs" style={{ flex: 1 }}>
                    <Tabs value={activeTab} onChange={setActiveTab} variant="pills" radius="xl">
                        <Tabs.List>
                            <Tabs.Tab value="active">Vigentes</Tabs.Tab>
                            <Tabs.Tab value="inactive">Antiguos</Tabs.Tab>
                            <Tabs.Tab value="all">Todos</Tabs.Tab>
                        </Tabs.List>
                    </Tabs>

                    <TextInput
                        placeholder="Buscar por nombre, diagnóstico o RUT..."
                        leftSection={<Search size={16} />}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.currentTarget.value)}
                        style={{ maxWidth: '500px' }}
                    />
                </Stack>

                {!isTherapist && (
                    <ActionIcon
                        size="xl"
                        radius="xl"
                        variant="filled"
                        color="blue"
                        style={{
                            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                        }}
                        onClick={openCreateModal}
                    >
                        <Plus size={24} />
                    </ActionIcon>
                )}
            </Group>

            {/* Students Grid */}
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="lg">
                {filteredStudents.map((student) => (
                    <Card
                        key={student.id}
                        shadow="sm"
                        padding="lg"
                        radius="md"
                        withBorder
                        style={{
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                        }}
                        onClick={() => handleStudentClick(student.id)}
                        className="hover:shadow-lg"
                    >
                        <Card.Section withBorder inheritPadding py="xs">
                            <Group justify="space-between">
                                <Group gap="xs">
                                    <Badge
                                        variant="light"
                                        color={student.hasActiveSession ? 'green' : 'gray'}
                                        size="sm"
                                    >
                                        {student.hasActiveSession ? 'Sesión Activa' : 'Inactivo'}
                                    </Badge>
                                    {student.familyAccessEnabled && (
                                        <Badge variant="outline" color="blue" size="xs">
                                            Acceso Familiar
                                        </Badge>
                                    )}
                                </Group>

                                {/* Menú de Acciones */}
                                <Menu shadow="md" width={200} position="bottom-end">
                                    <Menu.Target>
                                        <ActionIcon variant="subtle" color="gray" onClick={(e) => e.stopPropagation()}>
                                            <MoreVertical size={16} />
                                        </ActionIcon>
                                    </Menu.Target>
                                    <Menu.Dropdown>
                                        <Menu.Label>Acciones</Menu.Label>
                                        <Menu.Item leftSection={<Eye size={16} />} onClick={(e) => { e.stopPropagation(); handleStudentClick(student.id); }}>
                                            Ver Carpeta
                                        </Menu.Item>
                                        {!isTherapist && (
                                            <Menu.Item
                                                leftSection={<Share2 size={16} />}
                                                onClick={(e) => handleShareClick(student, e)}
                                            >
                                                Compartir
                                            </Menu.Item>
                                        )}
                                    </Menu.Dropdown>
                                </Menu>
                            </Group>
                        </Card.Section>

                        <Stack gap="md" mt="md" align="center">
                            <Indicator
                                inline
                                size={12}
                                offset={7}
                                position="bottom-end"
                                color={student.hasActiveSession ? 'green' : 'gray'}
                                withBorder
                            >
                                <Avatar src={student.avatar} size={80} radius="md" />
                            </Indicator>

                            <Box style={{ textAlign: 'center' }}>
                                <Text fw={600} size="lg">
                                    {student.fullName}
                                </Text>
                                <Text size="sm" c="dimmed">
                                    {student.age} años
                                </Text>
                                <Badge variant="light" color="blue" mt="xs" size="sm">
                                    {student.diagnosis}
                                </Badge>
                            </Box>

                            <Group gap="xs" justify="center" w="100%">
                                <FolderOpen size={14} color="var(--mantine-color-dimmed)" />
                                <Text size="xs" c="dimmed">
                                    {student.assignedTherapist || 'Sin asignar'}
                                </Text>
                            </Group>
                        </Stack>
                    </Card>
                ))}
            </SimpleGrid>

            {
                filteredStudents.length === 0 && (
                    <Box
                        p="xl"
                        style={{
                            textAlign: 'center',
                            border: '2px dashed var(--mantine-color-gray-3)',
                            borderRadius: 'var(--mantine-radius-md)',
                        }}
                    >
                        <Text c="dimmed" size="lg" fw={500}>
                            No se encontraron estudiantes
                        </Text>
                        <Text c="dimmed" size="sm" mt="xs">
                            Intenta con otro término de búsqueda
                        </Text>
                    </Box>
                )
            }

            {/* Modal Crear Estudiante */}
            <Modal opened={createModalOpened} onClose={closeCreateModal} title="Nuevo Estudiante">
                <form onSubmit={createForm.onSubmit(handleCreateSubmit)}>
                    <Stack>
                        <TextInput label="Nombre Completo" placeholder="Ej: Juan Pérez" {...createForm.getInputProps('fullName')} />
                        <TextInput label="RUT" placeholder="12.345.678-9" {...createForm.getInputProps('identityNumber')} />
                        <DateInput label="Fecha de Nacimiento" placeholder="Seleccione fecha" {...createForm.getInputProps('dateOfBirth')} />
                        <Select
                            label="Diagnóstico Inicial"
                            placeholder="Seleccione..."
                            data={diagnosisOptions}
                            {...createForm.getInputProps('diagnosis')}
                        />
                        {createForm.values.diagnosis === 'Otro' && (
                            <Autocomplete
                                label="Especificar Diagnóstico"
                                placeholder="Escriba o seleccione..."
                                data={existingDiagnoses}
                                {...createForm.getInputProps('customDiagnosis')}
                            />
                        )}
                        <Button type="submit" mt="md" fullWidth>Crear Carpeta</Button>
                    </Stack>
                </form>
            </Modal>

            {/* Modal de Compartir Global */}
            {studentToShare && (
                <ShareStudentModal
                    opened={shareModalOpened}
                    onClose={closeShareModal}
                    studentId={studentToShare.id}
                    studentName={studentToShare.fullName}
                    onShare={(email, _access, _msg) => {
                        console.log('Compartido desde lista:', email);
                        // Aquí idealmente actualizarías el estado global o notificarías
                    }}
                />
            )}
        </Stack >
    );
}

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Paper,
    Avatar,
    Text,
    Badge,
    Group,
    Stack,
    Tabs,
    Grid,
    TextInput,
    Textarea,
    Table,
    Button,
    ActionIcon,
    Box,
    Divider,
    Title,
    Tooltip,
    Modal,
    Collapse
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import {
    User,
    Users,
    FileText,
    Phone,
    Mail,
    Calendar,
    Pill,
    Plus,
    Trash,
    ClipboardList,
    Share2,
    Edit,
    History,
    ChevronRight,
    CornerDownRight,
    ChevronDown,
    Check,
    PlayCircle
} from 'lucide-react';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { type StudentProfile, type MedicationRecord } from '@/api/mockData';
import { programsData, type Program, type SkillAcquisitionProgram, type BehaviorManagementProgram } from '@/api/programsData';
import { ProgramsDashboard, SkillProgramDesigner, BehaviorProgramDesigner } from '@/features/programs';
import { DataCollectionEngine } from '@/features/dataCollection';
import { useRole } from '@/hooks/useRole';
import ShareStudentModal from './ShareStudentModal';

interface StudentDetailProps {
    student: StudentProfile;
    onUpdate: (data: Partial<StudentProfile>) => Promise<void>;
}

export function StudentDetail({ student }: StudentDetailProps) {
    const [searchParams, setSearchParams] = useSearchParams(); // Hook
    const activeTab = searchParams.get('tab') || 'general'; // Valor actual

    const handleTabChange = (val: string | null) => {
        if (val) setSearchParams({ tab: val });
    };

    const [medications, setMedications] = useState<MedicationRecord[]>(student.medications);
    const { isSupervisor, isTherapist } = useRole();
    const [programs, setPrograms] = useState<Program[]>(
        programsData.filter((p) => p.studentId === student.id)
    );
    const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
    const [skillDesignerOpened, { open: openSkillDesigner, close: closeSkillDesigner }] = useDisclosure(false);
    const [behaviorDesignerOpened, { open: openBehaviorDesigner, close: closeBehaviorDesigner }] = useDisclosure(false);
    const [dataCollectionOpened, { open: openDataCollection, close: closeDataCollection }] = useDisclosure(false);
    const [shareModalOpened, { open: openShareModal, close: closeShareModal }] = useDisclosure(false);

    const [medicationModalOpened, { open: openMedicationModal, close: closeMedicationModal }] = useDisclosure(false);
    const [editingMedicationId, setEditingMedicationId] = useState<string | null>(null);
    const [historyExpanded, setHistoryExpanded] = useState<Record<string, boolean>>({});

    const toggleHistory = (medId: string) => {
        setHistoryExpanded((prev) => ({ ...prev, [medId]: !prev[medId] }));
    };

    const medicationForm = useForm({
        initialValues: {
            name: '',
            dose: '',
            frequency: '',
            startDate: new Date(),
            prescribedBy: '',
            notes: '',
        },
    });

    const generalForm = useForm({
        initialValues: {
            fullName: student.fullName,
            identityNumber: student.identityNumber,
            dateOfBirth: new Date(student.dateOfBirth),
            diagnosis: student.diagnosis,
            consultationReason: student.consultationReason,
        },
    });

    const handleAddMedication = () => {
        setEditingMedicationId(null);
        medicationForm.reset();
        openMedicationModal();
    };

    const handleEditMedication = (med: MedicationRecord) => {
        setEditingMedicationId(med.id);
        medicationForm.setValues({
            name: med.name,
            dose: med.dose,
            frequency: med.frequency,
            startDate: new Date(med.startDate),
            prescribedBy: med.prescribedBy || '',
            notes: med.notes || '',
        });
        openMedicationModal();
    };

    const handleSaveMedication = (mode: 'correction' | 'update' = 'correction') => {
        const values = medicationForm.values;
        if (editingMedicationId) {
            // Editar existente
            setMedications(
                medications.map((med) => {
                    if (med.id !== editingMedicationId) return med;

                    if (mode === 'correction') {
                        // Corrección: Solo actualizar datos
                        notifications.show({
                            title: 'Corrección guardada',
                            message: 'Los datos del medicamento han sido actualizados.',
                            color: 'blue',
                            icon: <Check size={16} />,
                        });
                        return {
                            ...med,
                            name: values.name,
                            dose: values.dose,
                            frequency: values.frequency,
                            startDate: values.startDate.toISOString().split('T')[0],
                            prescribedBy: values.prescribedBy,
                            notes: values.notes,
                        };
                    } else {
                        // Actualización: Guardar historial y evolucionar
                        notifications.show({
                            title: 'Tratamiento Actualizado',
                            message: 'Se ha registrado la evolución del medicamento.',
                            color: 'teal',
                            icon: <History size={16} />,
                        });
                        const { history, ...currentSnapshot } = med;
                        const snapshot: MedicationRecord = {
                            ...currentSnapshot,
                            endDate: new Date().toISOString().split('T')[0],
                            status: 'inactive'
                        };

                        return {
                            ...med,
                            name: values.name,
                            dose: values.dose,
                            frequency: values.frequency,
                            startDate: new Date().toISOString().split('T')[0], // Nueva fecha de inicio
                            prescribedBy: values.prescribedBy,
                            notes: values.notes,
                            history: [snapshot, ...(history || [])]
                        };
                    }
                })
            );
        } else {
            // Crear nuevo
            notifications.show({
                title: 'Medicamento Agregado',
                message: 'El nuevo medicamento ha sido registrado correctamente.',
                color: 'green',
                icon: <Check size={16} />,
            });
            const newMed: MedicationRecord = {
                id: `med-${Date.now()}`,
                name: values.name,
                dose: values.dose,
                frequency: values.frequency,
                status: 'active',
                startDate: values.startDate.toISOString().split('T')[0],
                prescribedBy: values.prescribedBy,
                notes: values.notes,
                history: []
            };
            setMedications([...medications, newMed]);
        }
        closeMedicationModal();
    };

    const handleRemoveMedication = (id: string) => {
        setMedications(medications.filter((med) => med.id !== id));
        notifications.show({
            title: 'Medicamento Eliminado',
            message: 'El registro ha sido eliminado del sistema.',
            color: 'red',
            icon: <Trash size={16} />,
        });
    };

    const handleToggleMedicationStatus = (id: string) => {
        setMedications(
            medications.map((med) => {
                if (med.id === id) {
                    const newStatus = med.status === 'active' ? 'inactive' : 'active';
                    notifications.show({
                        title: newStatus === 'inactive' ? 'Tratamiento Suspendido' : 'Tratamiento Reactivado',
                        message: newStatus === 'inactive' ? 'El medicamento ha pasado a estado inactivo.' : 'El medicamento está activo nuevamente.',
                        color: newStatus === 'inactive' ? 'orange' : 'green',
                    });
                    return {
                        ...med,
                        status: newStatus,
                        endDate: newStatus === 'inactive' ? new Date().toISOString().split('T')[0] : undefined,
                    };
                }
                return med;
            })
        );
    };

    // Programs handlers
    const handleDesignProgram = (programId: string) => {
        const program = programs.find((p) => p.id === programId);
        if (program) {
            setSelectedProgram(program);
            if (program.category === 'skill-acquisition') {
                openSkillDesigner();
            } else {
                openBehaviorDesigner();
            }
        }
    };

    const handleRegisterData = (programId: string) => {
        const program = programs.find((p) => p.id === programId);
        if (program) {
            setSelectedProgram(program);
            openDataCollection();
        }
    };

    const handleViewChart = (programId: string) => {
        const program = programs.find((p) => p.id === programId);
        if (program) {
            setSelectedProgram(program);
            window.open(`/students/${student.id}/programs/${programId}/chart`, '_blank');
        }
    };

    const handleCreateProgram = (category: 'skill-acquisition' | 'behavior-management') => {
        setSelectedProgram(null);
        if (category === 'skill-acquisition') {
            openSkillDesigner();
        } else {
            openBehaviorDesigner();
        }
    };

    const handleSaveSkillProgram = async (data: Partial<SkillAcquisitionProgram>) => {
        // Simular guardado
        if (selectedProgram) {
            setPrograms(prev => prev.map(p => p.id === selectedProgram.id ? { ...p, ...data, lastModified: new Date().toISOString() } as SkillAcquisitionProgram : p));
            notifications.show({
                title: 'Programa Actualizado',
                message: 'Los cambios se han guardado correctamente.',
                color: 'green',
                icon: <Check size={16} />
            });
        } else {
            const newProgram: SkillAcquisitionProgram = {
                id: `prog-${Date.now()}`,
                studentId: student.id,
                category: 'skill-acquisition',
                status: 'active',
                name: data.name || 'Nuevo Programa',
                objective: data.objective || '',
                antecedent: data.antecedent || '',
                steps: data.steps || [],
                procedure: data.procedure || '',
                sets: data.sets || [],
                createdDate: new Date().toISOString().split('T')[0],
                lastModified: new Date().toISOString(),
                createdBy: 'Usuario Actual',
                ...data
            } as SkillAcquisitionProgram;

            setPrograms(prev => [...prev, newProgram]);
            notifications.show({
                title: 'Programa Creado',
                message: 'El programa de adquisición de habilidades ha sido guardado.',
                color: 'green',
                icon: <Check size={16} />
            });
        }
        closeSkillDesigner();
    };

    const handleSaveBehaviorProgram = async (data: Partial<BehaviorManagementProgram>) => {
        if (selectedProgram) {
            setPrograms(prev => prev.map(p => p.id === selectedProgram.id ? { ...p, ...data, lastModified: new Date().toISOString() } as BehaviorManagementProgram : p));
            notifications.show({
                title: 'Programa Actualizado',
                message: 'Los cambios se han guardado correctamente.',
                color: 'green',
                icon: <Check size={16} />
            });
        } else {
            const newProgram: BehaviorManagementProgram = {
                id: `prog-beh-${Date.now()}`,
                studentId: student.id,
                category: 'behavior-management',
                status: 'active',
                name: data.name || 'Nuevo Plan Conductual',
                topography: data.topography || '',
                operationalDefinition: data.operationalDefinition || '',
                functions: data.functions || [],
                procedure: data.procedure || '',
                createdDate: new Date().toISOString().split('T')[0],
                lastModified: new Date().toISOString(),
                createdBy: 'Usuario Actual',
                ...data
            } as BehaviorManagementProgram;

            setPrograms(prev => [...prev, newProgram]);
            notifications.show({
                title: 'Plan Conductual Creado',
                message: 'El plan de manejo conductual ha sido guardado.',
                color: 'green',
                icon: <Check size={16} />
            });
        }
        closeBehaviorDesigner();
    };

    return (
        <Stack gap="lg">
            {/* Header */}
            <Paper shadow="sm" p="xl" radius="md" withBorder>
                <Group justify="space-between">
                    <Group>
                        <Avatar src={student.avatar} size={100} radius="md" />
                        <div style={{ flex: 1 }}>
                            <Title order={2}>{student.fullName}</Title>
                            <Group gap="xs" mt="xs">
                                <Badge variant="light" color="blue" size="lg">
                                    {student.diagnosis}
                                </Badge>
                                {student.hasActiveSession && (
                                    <Badge variant="filled" color="green">
                                        Sesión Activa
                                    </Badge>
                                )}
                                {student.familyAccessEnabled && (
                                    <Badge variant="outline" color="blue">
                                        Acceso Familiar
                                    </Badge>
                                )}
                            </Group>
                            <Text size="sm" c="dimmed" mt="sm">
                                RUT: {student.identityNumber} • {student.age} años
                            </Text>
                        </div>
                    </Group>

                    <Group>
                        {/* Botón Iniciar Sesión */}
                        {(isTherapist || isSupervisor) && (
                            <Button
                                size="md"
                                color="green"
                                leftSection={<PlayCircle size={20} />}
                                onClick={() => window.location.href = `/session/${student.id}`}
                            >
                                Iniciar Sesión
                            </Button>
                        )}

                        {/* Botón de Compartir Directo */}
                        {!(isTherapist || isSupervisor) && (
                            <Tooltip label="Compartir carpeta">
                                <ActionIcon
                                    variant="light"
                                    color="blue"
                                    size="lg"
                                    onClick={openShareModal}
                                >
                                    <Share2 size={20} />
                                </ActionIcon>
                            </Tooltip>
                        )}
                    </Group>
                </Group>
            </Paper>

            {/* Tabs */}
            <Tabs value={activeTab} onChange={handleTabChange}>
                <Tabs.List>
                    <Tabs.Tab value="general" leftSection={<User size={16} />}>
                        Información General
                    </Tabs.Tab>
                    <Tabs.Tab value="family" leftSection={<Users size={16} />}>
                        Familia y Contacto
                    </Tabs.Tab>
                    <Tabs.Tab value="documents" leftSection={<FileText size={16} />}>
                        Documentación Legal
                    </Tabs.Tab>
                    <Tabs.Tab value="medication" leftSection={<Pill size={16} />}>
                        Medicación
                    </Tabs.Tab>
                    <Tabs.Tab value="programs" leftSection={<ClipboardList size={16} />}>
                        Programación
                    </Tabs.Tab>
                </Tabs.List>

                {/* Tab 1: General Information */}
                <Tabs.Panel value="general" pt="lg">
                    <Paper shadow="xs" p="lg" radius="md" withBorder>
                        <form>
                            <Grid>
                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <TextInput
                                        label="Nombre Completo"
                                        placeholder="Nombre del estudiante"
                                        required
                                        {...generalForm.getInputProps('fullName')}
                                    />
                                </Grid.Col>
                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <TextInput
                                        label="RUT/Identidad"
                                        placeholder="12.345.678-9"
                                        required
                                        {...generalForm.getInputProps('identityNumber')}
                                    />
                                </Grid.Col>
                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <DateInput
                                        label="Fecha de Nacimiento"
                                        placeholder="Selecciona una fecha"
                                        required
                                        {...generalForm.getInputProps('dateOfBirth')}
                                    />
                                </Grid.Col>
                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <TextInput
                                        label="Diagnóstico Principal"
                                        placeholder="Ej: TEA Nivel 2"
                                        required
                                        {...generalForm.getInputProps('diagnosis')}
                                    />
                                </Grid.Col>
                                <Grid.Col span={12}>
                                    <Textarea
                                        label="Motivo de Consulta"
                                        placeholder="Descripción del motivo de consulta..."
                                        minRows={3}
                                        {...generalForm.getInputProps('consultationReason')}
                                    />
                                </Grid.Col>
                            </Grid>
                        </form>
                    </Paper>
                </Tabs.Panel>

                {/* Tab 2: Family */}
                <Tabs.Panel value="family" pt="lg">
                    <Paper shadow="xs" p="lg" radius="md" withBorder>
                        <Group justify="space-between" mb="md">
                            <Title order={4}>Contactos Familiares</Title>
                            <Button variant="light" leftSection={<Plus size={16} />}>
                                Agregar Familiar
                            </Button>
                        </Group>

                        <Table highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Nombre</Table.Th>
                                    <Table.Th>Relación</Table.Th>
                                    <Table.Th>Teléfono</Table.Th>
                                    <Table.Th>Email</Table.Th>
                                    <Table.Th>Contacto Principal</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {student.familyMembers.map((member) => (
                                    <Table.Tr key={member.id}>
                                        <Table.Td fw={500}>{member.name}</Table.Td>
                                        <Table.Td>
                                            <Badge variant="light" size="sm">
                                                {member.relationship}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Group gap="xs">
                                                <Phone size={14} />
                                                <Text size="sm">{member.phone}</Text>
                                            </Group>
                                        </Table.Td>
                                        <Table.Td>
                                            {member.email && (
                                                <Group gap="xs">
                                                    <Mail size={14} />
                                                    <Text size="sm">{member.email}</Text>
                                                </Group>
                                            )}
                                        </Table.Td>
                                        <Table.Td>
                                            {member.isPrimaryContact && (
                                                <Badge color="green" variant="filled" size="sm">
                                                    Principal
                                                </Badge>
                                            )}
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Paper>
                </Tabs.Panel>

                {/* Tab 3: Documents */}
                <Tabs.Panel value="documents" pt="lg">
                    <Paper shadow="xs" p="lg" radius="md" withBorder>
                        <Title order={4} mb="md">
                            Documentos Legales
                        </Title>

                        <Stack gap="md">
                            {student.legalDocuments.map((doc) => (
                                <Paper key={doc.id} p="md" withBorder>
                                    <Group justify="space-between">
                                        <Group>
                                            <FileText size={24} color="var(--mantine-color-blue-6)" />
                                            <div>
                                                <Text fw={500}>{doc.name}</Text>
                                                <Group gap="xs">
                                                    <Badge variant="light" size="xs">
                                                        {doc.type}
                                                    </Badge>
                                                    <Text size="xs" c="dimmed">
                                                        {doc.fileSize}
                                                    </Text>
                                                    <Text size="xs" c="dimmed">
                                                        • Subido el {new Date(doc.uploadDate).toLocaleDateString('es-ES')}
                                                    </Text>
                                                </Group>
                                            </div>
                                        </Group>
                                        <Button variant="light" size="sm">
                                            Ver
                                        </Button>
                                    </Group>
                                </Paper>
                            ))}

                            <Box
                                p="xl"
                                style={{
                                    border: '2px dashed var(--mantine-color-gray-4)',
                                    borderRadius: 'var(--mantine-radius-md)',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                }}
                            >
                                <FileText size={48} color="var(--mantine-color-gray-5)" style={{ margin: '0 auto' }} />
                                <Text size="sm" fw={500} mt="md">
                                    Arrastra archivos aquí o haz clic para seleccionar
                                </Text>
                                <Text size="xs" c="dimmed" mt="xs">
                                    PDF, DOC, DOCX (máx. 10MB)
                                </Text>
                            </Box>
                        </Stack>
                    </Paper>
                </Tabs.Panel>

                {/* Tab 4: Medication */}
                <Tabs.Panel value="medication" pt="lg">
                    <Paper shadow="xs" p="lg" radius="md" withBorder>
                        <Group justify="space-between" mb="md">
                            <Title order={4}>Medicación</Title>
                            <Button variant="light" leftSection={<Plus size={16} />} onClick={handleAddMedication}>
                                Agregar Medicación
                            </Button>
                        </Group>

                        <Stack gap="md">
                            {/* Active Medications */}
                            <div>
                                <Text fw={600} size="sm" mb="sm" c="green">
                                    Medicación Actual
                                </Text>
                                {medications.filter((med) => med.status === 'active').length === 0 ? (
                                    <Text size="sm" c="dimmed" fs="italic">
                                        No hay medicación activa
                                    </Text>
                                ) : (
                                    <Stack gap="xs">
                                        {medications
                                            .filter((med) => med.status === 'active')
                                            .map((med) => (
                                                <Paper key={med.id} p="md" withBorder>
                                                    <Group justify="space-between">
                                                        <div style={{ flex: 1 }}>
                                                            <Group gap="xs" mb="xs">
                                                                <Text fw={600}>{med.name || 'Nueva medicación'}</Text>
                                                                <Badge color="green" variant="light" size="sm">
                                                                    Activa
                                                                </Badge>
                                                                {med.history && med.history.length > 0 && (
                                                                    <ActionIcon
                                                                        variant="subtle"
                                                                        size="sm"
                                                                        color="gray"
                                                                        onClick={() => toggleHistory(med.id)}
                                                                    >
                                                                        {historyExpanded[med.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                                    </ActionIcon>
                                                                )}
                                                            </Group>
                                                            <Group gap="md">
                                                                <Text size="sm">
                                                                    <strong>Dosis:</strong> {med.dose || 'No especificada'}
                                                                </Text>
                                                                <Text size="sm">
                                                                    <strong>Frecuencia:</strong> {med.frequency || 'No especificada'}
                                                                </Text>
                                                            </Group>
                                                            <Group gap="xs" mt="xs">
                                                                <Calendar size={14} />
                                                                <Text size="xs" c="dimmed">
                                                                    Desde: {new Date(med.startDate).toLocaleDateString('es-ES')}
                                                                </Text>
                                                                {med.prescribedBy && (
                                                                    <Text size="xs" c="dimmed">
                                                                        • Prescrito por: {med.prescribedBy}
                                                                    </Text>
                                                                )}
                                                            </Group>
                                                            {med.notes && (
                                                                <Text size="xs" c="dimmed" mt="xs">
                                                                    {med.notes}
                                                                </Text>
                                                            )}
                                                        </div>
                                                        <Group gap="xs">
                                                            <ActionIcon variant="light" color="blue" onClick={() => handleEditMedication(med)}>
                                                                <Edit size={16} />
                                                            </ActionIcon>
                                                            <Button size="xs" variant="light" onClick={() => handleToggleMedicationStatus(med.id)}>
                                                                Suspender
                                                            </Button>
                                                            <ActionIcon color="red" variant="light" onClick={() => handleRemoveMedication(med.id)}>
                                                                <Trash size={16} />
                                                            </ActionIcon>
                                                        </Group>
                                                    </Group>

                                                    {/* Historial Colapsable */}
                                                    <Collapse in={historyExpanded[med.id]}>
                                                        <Stack gap="xs" mt="md" pl="lg" style={{ borderLeft: '2px solid var(--mantine-color-gray-3)' }}>
                                                            <Group gap={4}>
                                                                <History size={14} color="var(--mantine-color-dimmed)" />
                                                                <Text size="xs" fw={700} c="dimmed">HISTORIAL DE CAMBIOS</Text>
                                                            </Group>
                                                            {med.history?.map((h, idx) => (
                                                                <div key={idx}>
                                                                    <Group gap="xs">
                                                                        <CornerDownRight size={12} color="var(--mantine-color-gray-5)" />
                                                                        <Text size="xs" c="dimmed">
                                                                            <strong>{h.dose} - {h.frequency}</strong> • {new Date(h.startDate).toLocaleDateString('es-ES')} - {h.endDate ? new Date(h.endDate).toLocaleDateString('es-ES') : ''}
                                                                        </Text>
                                                                    </Group>
                                                                </div>
                                                            ))}
                                                        </Stack>
                                                    </Collapse>
                                                </Paper>
                                            ))}
                                    </Stack>
                                )}
                            </div>

                            <Divider />

                            {/* Inactive Medications */}
                            <div>
                                <Text fw={600} size="sm" mb="sm" c="dimmed">
                                    Historial de Medicación
                                </Text>
                                {medications.filter((med) => med.status === 'inactive').length === 0 ? (
                                    <Text size="sm" c="dimmed" fs="italic">
                                        No hay medicación inactiva
                                    </Text>
                                ) : (
                                    <Stack gap="xs">
                                        {medications
                                            .filter((med) => med.status === 'inactive')
                                            .map((med) => (
                                                <Paper key={med.id} p="md" withBorder style={{ opacity: 0.6 }}>
                                                    <Group justify="space-between">
                                                        <div>
                                                            <Group gap="xs" mb="xs">
                                                                <Text fw={600} c="dimmed">
                                                                    {med.name}
                                                                </Text>
                                                                <Badge color="gray" variant="light" size="sm">
                                                                    Inactiva
                                                                </Badge>
                                                            </Group>
                                                            <Group gap="md">
                                                                <Text size="sm" c="dimmed">
                                                                    <strong>Dosis:</strong> {med.dose}
                                                                </Text>
                                                                <Text size="sm" c="dimmed">
                                                                    <strong>Frecuencia:</strong> {med.frequency}
                                                                </Text>
                                                            </Group>
                                                            <Text size="xs" c="dimmed" mt="xs">
                                                                {new Date(med.startDate).toLocaleDateString('es-ES')} -{' '}
                                                                {med.endDate ? new Date(med.endDate).toLocaleDateString('es-ES') : 'Presente'}
                                                            </Text>
                                                            {med.notes && (
                                                                <Text size="xs" c="dimmed" mt="xs">
                                                                    {med.notes}
                                                                </Text>
                                                            )}
                                                        </div>
                                                        <Button size="xs" variant="light" onClick={() => handleToggleMedicationStatus(med.id)}>
                                                            Reactivar
                                                        </Button>
                                                    </Group>
                                                </Paper>
                                            ))}
                                    </Stack>
                                )}
                            </div>
                        </Stack>
                    </Paper>
                </Tabs.Panel>

                {/* Tab 5: Programs */}
                <Tabs.Panel value="programs" pt="lg">
                    <ProgramsDashboard
                        programs={programs}
                        onDesignProgram={handleDesignProgram}
                        onRegisterData={handleRegisterData}
                        onViewChart={handleViewChart}
                        onCreateProgram={handleCreateProgram}
                    />
                </Tabs.Panel>
            </Tabs>

            {/* Skill Program Designer Modal */}
            <SkillProgramDesigner
                program={selectedProgram?.category === 'skill-acquisition' ? selectedProgram as SkillAcquisitionProgram : undefined}
                opened={skillDesignerOpened}
                onClose={closeSkillDesigner}
                onSave={handleSaveSkillProgram}
            />

            {/* Behavior Program Designer Modal */}
            <BehaviorProgramDesigner
                program={selectedProgram?.category === 'behavior-management' ? selectedProgram as BehaviorManagementProgram : undefined}
                opened={behaviorDesignerOpened}
                onClose={closeBehaviorDesigner}
                onSave={handleSaveBehaviorProgram}
            />

            {/* Data Collection Engine Modal */}
            {
                selectedProgram && (
                    <DataCollectionEngine
                        programId={selectedProgram.id}
                        programName={selectedProgram.name}
                        opened={dataCollectionOpened}
                        onClose={closeDataCollection}
                    />
                )
            }

            {/* Modal de Medicación */}
            <Modal
                opened={medicationModalOpened}
                onClose={closeMedicationModal}
                title={editingMedicationId ? 'Editar Medicación' : 'Agregar Medicación'}
            >
                <form onSubmit={(e) => e.preventDefault()}>
                    <Stack>
                        <TextInput
                            label="Nombre del Medicamento"
                            placeholder="Ej: Metilfenidato"
                            required
                            {...medicationForm.getInputProps('name')}
                        />
                        <Grid>
                            <Grid.Col span={6}>
                                <TextInput
                                    label="Dosis"
                                    placeholder="Ej: 10mg"
                                    required
                                    {...medicationForm.getInputProps('dose')}
                                />
                            </Grid.Col>
                            <Grid.Col span={6}>
                                <TextInput
                                    label="Frecuencia"
                                    placeholder="Ej: Cada 8 horas"
                                    required
                                    {...medicationForm.getInputProps('frequency')}
                                />
                            </Grid.Col>
                        </Grid>
                        <DateInput
                            label="Fecha de Inicio"
                            placeholder="Seleccione fecha"
                            required
                            {...medicationForm.getInputProps('startDate')}
                        />
                        <TextInput
                            label="Prescrito por"
                            placeholder="Nombre del médico"
                            {...medicationForm.getInputProps('prescribedBy')}
                        />
                        <Textarea
                            label="Notas adicionales"
                            placeholder="Observaciones..."
                            {...medicationForm.getInputProps('notes')}
                        />
                        <Group justify="space-between" mt="md">
                            <Button variant="default" onClick={closeMedicationModal}>Cancelar</Button>
                            {editingMedicationId ? (
                                <Group>
                                    <Button variant="light" color="blue" onClick={() => handleSaveMedication('correction')}>
                                        Guardar Corrección
                                    </Button>
                                    <Button variant="filled" color="blue" onClick={() => handleSaveMedication('update')}>
                                        Actualizar Tratamiento
                                    </Button>
                                </Group>
                            ) : (
                                <Button onClick={() => handleSaveMedication('correction')}>Guardar</Button>
                            )}
                        </Group>
                    </Stack>
                </form>
            </Modal>

            {/* Modal de Compartir */}
            <ShareStudentModal
                opened={shareModalOpened}
                onClose={closeShareModal}
                studentId={student.id}
                studentName={student.fullName}
                onShare={(email, _access, _msg) => {
                    notifications.show({
                        title: 'Acceso Compartido',
                        message: `Se ha enviado una invitación a ${email}`,
                        color: 'blue',
                    });
                }}
            />
        </Stack >
    );
}

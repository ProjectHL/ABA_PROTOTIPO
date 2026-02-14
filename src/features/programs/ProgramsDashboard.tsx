import { useState, useEffect } from 'react';
import {
    Stack,
    Group,
    Button,
    SegmentedControl,
    Title,
    Table,
    Badge,
    ActionIcon,
    Menu,
    Text,
    Modal,
    Paper,
    Divider
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
    Settings,
    ClipboardCheck,
    TrendingUp,
    Plus,
    ChevronDown,
    Check,
    AlertCircle
} from 'lucide-react';
import { type Program, type ProgramStatus } from '@/api/programsData';

interface ProgramsDashboardProps {
    programs: Program[];
    onDesignProgram: (programId: string) => void;
    onRegisterData: (programId: string) => void;
    onViewChart: (programId: string) => void;
    onCreateProgram: (category: 'skill-acquisition' | 'behavior-management') => void;
}

export function ProgramsDashboard({
    programs: initialPrograms,
    onDesignProgram,
    onRegisterData,
    onViewChart,
    onCreateProgram,
}: ProgramsDashboardProps) {
    const [programsList, setProgramsList] = useState<Program[]>(initialPrograms);
    const [statusFilter, setStatusFilter] = useState<ProgramStatus | 'all'>('active');

    // Estado para cambio de status
    const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
    const [targetStatus, setTargetStatus] = useState<ProgramStatus | null>(null);
    const [confirmModalOpened, { open: openConfirmModal, close: closeConfirmModal }] = useDisclosure(false);

    // Sincronizar si props cambian (para cuando creemos nuevos programas desde fuera)
    useEffect(() => {
        setProgramsList(initialPrograms);
    }, [initialPrograms]);

    const filteredPrograms = programsList.filter((program) =>
        statusFilter === 'all' ? true : program.status === statusFilter
    );

    const skillPrograms = filteredPrograms.filter((p) => p.category === 'skill-acquisition');
    const behaviorPrograms = filteredPrograms.filter((p) => p.category === 'behavior-management');

    const getStatusColor = (status: ProgramStatus) => {
        switch (status) {
            case 'active': return 'green';
            case 'achieved': return 'blue';
            case 'paused': return 'yellow';
            case 'discontinued': return 'red';
            default: return 'gray';
        }
    };

    const getStatusLabel = (status: ProgramStatus) => {
        switch (status) {
            case 'active': return 'Activo';
            case 'achieved': return 'Logrado';
            case 'paused': return 'En Pausa';
            case 'discontinued': return 'Descontinuado';
            default: return status;
        }
    };

    const handleStatusClick = (program: Program, newStatus: ProgramStatus) => {
        if (program.status === newStatus) return;
        setSelectedProgram(program);
        setTargetStatus(newStatus);
        openConfirmModal();
    };

    const confirmStatusChange = () => {
        if (!selectedProgram || !targetStatus) return;

        // Actualizar estado localmente
        setProgramsList(prev => prev.map(p =>
            p.id === selectedProgram.id ? { ...p, status: targetStatus } : p
        ));

        notifications.show({
            title: 'Estado Actualizado',
            message: `El programa "${selectedProgram.name}" ahora está ${getStatusLabel(targetStatus)}.`,
            color: 'teal',
            icon: <Check size={16} />
        });

        closeConfirmModal();
        setSelectedProgram(null);
        setTargetStatus(null);
    };

    const renderStatusBadge = (program: Program) => (
        <Menu shadow="md" width={200} position="bottom-end">
            <Menu.Target>
                <div style={{ cursor: 'pointer', display: 'inline-block' }}>
                    <Badge
                        variant="filled"
                        color={getStatusColor(program.status)}
                        rightSection={<ChevronDown size={12} style={{ marginLeft: 4 }} />}
                        style={{ paddingRight: 8 }}
                    >
                        {getStatusLabel(program.status)}
                    </Badge>
                </div>
            </Menu.Target>
            <Menu.Dropdown>
                <Menu.Label>Cambiar estado</Menu.Label>
                <Menu.Item
                    leftSection={<div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--mantine-color-green-6)' }} />}
                    onClick={() => handleStatusClick(program, 'active')}
                >
                    Activo
                </Menu.Item>
                <Menu.Item
                    leftSection={<div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--mantine-color-blue-6)' }} />}
                    onClick={() => handleStatusClick(program, 'achieved')}
                >
                    Logrado
                </Menu.Item>
                <Menu.Item
                    leftSection={<div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--mantine-color-yellow-6)' }} />}
                    onClick={() => handleStatusClick(program, 'paused')}
                >
                    Pausar
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                    color="red"
                    leftSection={<div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--mantine-color-red-6)' }} />}
                    onClick={() => handleStatusClick(program, 'discontinued')}
                >
                    Descontinuar
                </Menu.Item>
            </Menu.Dropdown>
        </Menu>
    );

    const getCategoryLabel = (category: 'skill-acquisition' | 'behavior-management') => {
        return category === 'skill-acquisition' ? 'Adquisición' : 'Conducta';
    };

    return (
        <Stack gap="lg">
            {/* Filter and Overview Header */}
            <Group justify="space-between" align="center">
                <Text size="sm" c="dimmed">
                    Gestiona los programas educativos y conductuales del estudiante.
                </Text>
                <SegmentedControl
                    value={statusFilter}
                    onChange={(value) => setStatusFilter(value as ProgramStatus | 'all')}
                    data={[
                        { label: 'Activos', value: 'active' },
                        { label: 'Logrados', value: 'achieved' },
                        { label: 'Pausa', value: 'paused' },
                        { label: 'Descontinuados', value: 'discontinued' },
                        { label: 'Todos', value: 'all' },
                    ]}
                />
            </Group>

            <Divider />

            {/* Skill Acquisition Programs Table */}
            <div>
                <Group justify="space-between" mb="md">
                    <Title order={3}>Programas de Adquisición de Habilidades</Title>
                    <Button
                        variant="light"
                        leftSection={<Plus size={18} />}
                        onClick={() => onCreateProgram('skill-acquisition')}
                    >
                        Nuevo Programa
                    </Button>
                </Group>

                <Table highlightOnHover withTableBorder>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Nombre del Programa</Table.Th>
                            <Table.Th>Tipo</Table.Th>
                            <Table.Th>Estado</Table.Th>
                            <Table.Th>Última Modificación</Table.Th>
                            <Table.Th>Acciones</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {skillPrograms.length === 0 ? (
                            <Table.Tr>
                                <Table.Td colSpan={5}>
                                    <Text ta="center" c="dimmed" py="xl">
                                        No hay programas de adquisición con el filtro seleccionado
                                    </Text>
                                </Table.Td>
                            </Table.Tr>
                        ) : (
                            skillPrograms.map((program) => (
                                <Table.Tr key={program.id}>
                                    <Table.Td fw={500}>{program.name}</Table.Td>
                                    <Table.Td>
                                        <Badge variant="light" color="blue">
                                            {getCategoryLabel(program.category)}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td>
                                        {renderStatusBadge(program)}
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="sm" c="dimmed">
                                            {new Date(program.lastModified).toLocaleDateString('es-ES')}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Group gap="xs">
                                            <ActionIcon
                                                variant="light"
                                                color="blue"
                                                onClick={() => onDesignProgram(program.id)}
                                                title="Diseño"
                                            >
                                                <Settings size={18} />
                                            </ActionIcon>
                                            <ActionIcon
                                                variant="light"
                                                color="green"
                                                onClick={() => onRegisterData(program.id)}
                                                title="Ir a Sesión / Registro"
                                            >
                                                <ClipboardCheck size={18} />
                                            </ActionIcon>
                                            <ActionIcon
                                                variant="light"
                                                color="violet"
                                                onClick={() => onViewChart(program.id)}
                                                title="Gráfico"
                                            >
                                                <TrendingUp size={18} />
                                            </ActionIcon>
                                        </Group>
                                    </Table.Td>
                                </Table.Tr>
                            ))
                        )}
                    </Table.Tbody>
                </Table>
            </div>

            {/* Behavior Management Programs Table */}
            <div>
                <Group justify="space-between" mb="md">
                    <Title order={3}>Programas de Manejo de Conducta</Title>
                    <Button
                        variant="light"
                        leftSection={<Plus size={18} />}
                        onClick={() => onCreateProgram('behavior-management')}
                    >
                        Nuevo Programa
                    </Button>
                </Group>

                <Table highlightOnHover withTableBorder>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Nombre del Programa</Table.Th>
                            <Table.Th>Tipo</Table.Th>
                            <Table.Th>Estado</Table.Th>
                            <Table.Th>Última Modificación</Table.Th>
                            <Table.Th>Acciones</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {behaviorPrograms.length === 0 ? (
                            <Table.Tr>
                                <Table.Td colSpan={5}>
                                    <Text ta="center" c="dimmed" py="xl">
                                        No hay programas de conducta con el filtro seleccionado
                                    </Text>
                                </Table.Td>
                            </Table.Tr>
                        ) : (
                            behaviorPrograms.map((program) => (
                                <Table.Tr key={program.id}>
                                    <Table.Td fw={500}>{program.name}</Table.Td>
                                    <Table.Td>
                                        <Badge variant="light" color="orange">
                                            {getCategoryLabel(program.category)}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td>
                                        {renderStatusBadge(program)}
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="sm" c="dimmed">
                                            {new Date(program.lastModified).toLocaleDateString('es-ES')}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Group gap="xs">
                                            <ActionIcon
                                                variant="light"
                                                color="blue"
                                                onClick={() => onDesignProgram(program.id)}
                                                title="Diseño"
                                            >
                                                <Settings size={18} />
                                            </ActionIcon>
                                            <ActionIcon
                                                variant="light"
                                                color="green"
                                                onClick={() => onRegisterData(program.id)}
                                                title="Ir a Sesión / Registro"
                                            >
                                                <ClipboardCheck size={18} />
                                            </ActionIcon>
                                            <ActionIcon
                                                variant="light"
                                                color="violet"
                                                onClick={() => onViewChart(program.id)}
                                                title="Gráfico"
                                            >
                                                <TrendingUp size={18} />
                                            </ActionIcon>
                                        </Group>
                                    </Table.Td>
                                </Table.Tr>
                            ))
                        )}
                    </Table.Tbody>
                </Table>
            </div>

            {/* Modal de Confirmación de Estado */}
            <Modal
                opened={confirmModalOpened}
                onClose={closeConfirmModal}
                title={<Group gap="xs"><AlertCircle size={20} color="orange" /><Text fw={600}>Confirmar Cambio de Estado</Text></Group>}
                centered
            >
                <Stack>
                    <Text size="sm">
                        ¿Estás seguro de que deseas cambiar el estado del programa
                        <Text span fw={700}> "{selectedProgram?.name}" </Text>
                        a
                        <Text span fw={700} c="blue"> {targetStatus && getStatusLabel(targetStatus)}</Text>?
                    </Text>

                    {targetStatus === 'achieved' && (
                        <Paper withBorder p="xs" bg="blue.0">
                            <Text size="xs" c="blue.9">
                                Marcar como "Logrado" puede detener la recolección de datos activa.
                            </Text>
                        </Paper>
                    )}

                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={closeConfirmModal}>Cancelar</Button>
                        <Button color="blue" onClick={confirmStatusChange}>Confirmar</Button>
                    </Group>
                </Stack>
            </Modal>
        </Stack>
    );
}

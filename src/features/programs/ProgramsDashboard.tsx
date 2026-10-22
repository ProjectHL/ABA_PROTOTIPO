import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
    Stack,
    Group,
    Button,
    SegmentedControl,
    ScrollArea,
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
import {
    Settings,
    ClipboardCheck,
    TrendingUp,
    Plus,
    ChevronDown,
    AlertCircle
} from 'lucide-react';
import { type Program, type ProgramStatus } from '@/api/programsData';

export type DashboardStatus=ProgramStatus|'draft';
export type ProgramDashboardItem=Program extends infer Item ? Item extends Program ? Omit<Item,'status'>&{status:DashboardStatus}:never:never;

interface ProgramsDashboardProps {
    programs: ProgramDashboardItem[];
    onDesignProgram: (programId: string) => void;
    onRegisterData: (programId: string) => void;
    onViewChart: (programId: string) => void;
    onCreateProgram: (category: 'skill-acquisition' | 'behavior-management') => void;
    /** Must resolve true only after a correlated persisted receipt. */
    onChangeStatus?: (program: ProgramDashboardItem, status: ProgramStatus) => Promise<boolean>;
    canManage?: boolean;
    operationNotice?: ReactNode;
}

export function ProgramsDashboard({
    programs: initialPrograms,
    onDesignProgram,
    onRegisterData,
    onViewChart,
    onCreateProgram,
    onChangeStatus,
    canManage=true,
    operationNotice,
}: ProgramsDashboardProps) {
    const [programsList, setProgramsList] = useState<ProgramDashboardItem[]>(initialPrograms);
    const [statusFilter, setStatusFilter] = useState<DashboardStatus | 'all'>('active');
    const [savingStatus, setSavingStatus] = useState(false);
    const savingStatusRef = useRef(false);
    const [statusError, setStatusError] = useState('');

    // Estado para cambio de status
    const [selectedProgram, setSelectedProgram] = useState<ProgramDashboardItem | null>(null);
    const [targetStatus, setTargetStatus] = useState<ProgramStatus | null>(null);
    const [confirmModalOpened, { open: openConfirmModal, close: closeConfirmModal }] = useDisclosure(false);

    useEffect(() => setProgramsList(initialPrograms), [initialPrograms]);
    // A retry can complete from the shared operation banner instead of this modal.
    // Close only after the authoritative list actually exposes the requested state.
    useEffect(()=>{
        if(selectedProgram&&targetStatus&&initialPrograms.some(item=>item.id===selectedProgram.id&&item.status===targetStatus)){
            closeConfirmModal();setSelectedProgram(null);setTargetStatus(null);
        }
    },[initialPrograms,selectedProgram,targetStatus,closeConfirmModal]);

    const filteredPrograms = programsList.filter((program) =>
        statusFilter === 'all' ? true : program.status === statusFilter
    );

    const skillPrograms = filteredPrograms.filter((p) => p.category === 'skill-acquisition');
    const behaviorPrograms = filteredPrograms.filter((p) => p.category === 'behavior-management');

    const getStatusColor = (status: DashboardStatus) => {
        switch (status) {
            case 'active': return 'green';
            case 'achieved': return 'blue';
            case 'paused': return 'yellow';
            case 'discontinued': return 'red';
            default: return 'gray';
        }
    };

    const getStatusLabel = (status: DashboardStatus) => {
        switch (status) {
            case 'active': return 'Activo';
            case 'achieved': return 'Logrado';
            case 'paused': return 'En Pausa';
            case 'discontinued': return 'Descontinuado';
            default: return status;
        }
    };

    const handleStatusClick = (program: ProgramDashboardItem, newStatus: ProgramStatus) => {
        if (program.status === newStatus) return;
        setSelectedProgram(program);
        setTargetStatus(newStatus);
        openConfirmModal();
    };

    const confirmStatusChange = async () => {
        if (!selectedProgram || !targetStatus || savingStatusRef.current) return;
        if (!onChangeStatus || !canManage) { setStatusError(canManage?'La persistencia V2 no está conectada en esta vista; no se cambió el estado.':'No tienes capacidad program.edit para esta ficha.'); return; }
        savingStatusRef.current=true;setSavingStatus(true); setStatusError('');
        try {
            if (!await onChangeStatus(selectedProgram, targetStatus)) return;
            closeConfirmModal(); setSelectedProgram(null); setTargetStatus(null);
        } catch (cause) {
            setStatusError(cause instanceof Error ? cause.message : 'Resultado desconocido; conserva el mismo comando.');
        } finally { savingStatusRef.current=false;setSavingStatus(false); }
    };

    const renderStatusBadge = (program: ProgramDashboardItem) => (
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
                {(!onChangeStatus||!canManage) && <Menu.Label c="orange">{canManage?'Persistencia V2 no conectada':'Sin capacidad program.edit'}</Menu.Label>}
                <Menu.Item
                    disabled={!onChangeStatus||!canManage}
                    leftSection={<div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--mantine-color-green-6)' }} />}
                    onClick={() => handleStatusClick(program, 'active')}
                >
                    Activo
                </Menu.Item>
                <Menu.Item
                    disabled={!onChangeStatus||!canManage}
                    leftSection={<div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--mantine-color-blue-6)' }} />}
                    onClick={() => handleStatusClick(program, 'achieved')}
                >
                    Logrado
                </Menu.Item>
                <Menu.Item
                    disabled={!onChangeStatus||!canManage}
                    leftSection={<div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--mantine-color-yellow-6)' }} />}
                    onClick={() => handleStatusClick(program, 'paused')}
                >
                    Pausar
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                    disabled={!onChangeStatus||!canManage}
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
                <ScrollArea maw="100%" type="auto" offsetScrollbars="x">
                <SegmentedControl
                    w="max-content"
                    value={statusFilter}
                    onChange={(value) => setStatusFilter(value as DashboardStatus | 'all')}
                    data={[
                        { label: 'Activos', value: 'active' },
                        { label: 'Logrados', value: 'achieved' },
                        { label: 'Pausa', value: 'paused' },
                        { label: 'Descontinuados', value: 'discontinued' },
                        { label: 'Borradores', value: 'draft' },
                        { label: 'Todos', value: 'all' },
                    ]}
                />
                </ScrollArea>
            </Group>

            <Divider />

            {/* Skill Acquisition Programs Table */}
            <div>
                <Group justify="space-between" mb="md">
                    <Title order={3}>Programas de Adquisición de Habilidades</Title>
                    <Button
                        variant="light"
                        disabled={!canManage}
                        leftSection={<Plus size={18} />}
                        onClick={() => onCreateProgram('skill-acquisition')}
                    >
                        Nuevo Programa
                    </Button>
                </Group>

                <Table.ScrollContainer minWidth={700}>
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
                                            {new Date(program.lastModified).toLocaleDateString('es-CL')}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Group gap="xs">
                                            <ActionIcon
                                                variant="light"
                                                color="blue"
                                                disabled={!canManage}
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
                </Table.ScrollContainer>
            </div>

            {/* Behavior Management Programs Table */}
            <div>
                <Group justify="space-between" mb="md">
                    <Title order={3}>Programas de Manejo de Conducta</Title>
                    <Button
                        variant="light"
                        disabled={!canManage}
                        leftSection={<Plus size={18} />}
                        onClick={() => onCreateProgram('behavior-management')}
                    >
                        Nuevo Programa
                    </Button>
                </Group>

                <Table.ScrollContainer minWidth={700}>
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
                                            {new Date(program.lastModified).toLocaleDateString('es-CL')}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Group gap="xs">
                                            <ActionIcon
                                                variant="light"
                                                color="blue"
                                                disabled={!canManage}
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
                </Table.ScrollContainer>
            </div>

            {/* Modal de Confirmación de Estado */}
            <Modal
                opened={confirmModalOpened}
                onClose={()=>{if(!savingStatusRef.current)closeConfirmModal();}}
                title={<Group gap="xs"><AlertCircle size={20} color="orange" /><Text fw={600}>Confirmar Cambio de Estado</Text></Group>}
                centered
            >
                <Stack>
                    {operationNotice}
                    {statusError && <Paper withBorder p="xs" bg="red.0"><Text size="xs" c="red.9">{statusError}</Text></Paper>}
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
                        <Button variant="default" disabled={savingStatus} onClick={closeConfirmModal}>Cancelar</Button>
                        <Button color="blue" loading={savingStatus} disabled={!onChangeStatus||!canManage} onClick={()=>void confirmStatusChange()}>Confirmar</Button>
                    </Group>
                </Stack>
            </Modal>
        </Stack>
    );
}

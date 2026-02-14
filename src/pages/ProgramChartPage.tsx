import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container,
    Title,
    Text,
    Button,
    Group,
    Paper,
    Select,
    Stack,
    Badge,
    Table,
    Tooltip,
    Modal,
    NumberInput
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
    ChevronLeft,
    Calendar,
    Download,
    Settings,
    Filter,
    FileText,
    Check
} from 'lucide-react';
import { programsData } from '@/api/programsData';
import { studentsData } from '@/api/mockData';
import { generateMockData, calculateKPIs, type AnalysisMetric } from '@/api/analyticsData';
import { AnalysisChart, KPICards } from '@/features/analytics';

export default function ProgramAnalysisDashboard() {
    const { studentId, programId } = useParams();
    const navigate = useNavigate();

    // Filtros
    const [dateRange, setDateRange] = useState<string>('30d');
    const [therapistFilter, setTherapistFilter] = useState<string | null>(null);

    // Configuración de Meta
    const [goalValue, setGoalValue] = useState<number>(80);
    const [tempGoalValue, setTempGoalValue] = useState<number>(80);
    const [isGoalModalOpen, { open: openGoalModal, close: closeGoalModal }] = useDisclosure(false);

    // Datos Base
    const student = studentsData.find(s => s.id === studentId);
    const program = programsData.find(p => p.id === programId);

    // Generar Datos Mock (Simulación de backend)
    // En producción esto vendría de una API
    const analyticsData = useMemo(() => {
        if (!program) return [];

        const metric: AnalysisMetric = program.category === 'skill-acquisition' ? 'percentage' : 'frequency';
        // Generar 60 días para tener histórico
        return generateMockData(program.id, metric, new Date(new Date().setDate(new Date().getDate() - 60)), 60);
    }, [program]);

    // Filtrar datos según rango seleccionado
    const filteredData = useMemo(() => {
        const now = new Date();
        let days = 30;
        if (dateRange === '7d') days = 7;
        if (dateRange === '90d') days = 90;

        const cutoffDate = new Date();
        cutoffDate.setDate(now.getDate() - days);

        // Aplicar filtro de fecha
        let filtered = analyticsData.filter(d => new Date(d.date) >= cutoffDate);

        // Aplicar filtro de terapeuta (simulado)
        if (therapistFilter && therapistFilter !== 'Todos') {
            // Como el mock data tiene IDs random th-1 / th-2, simulamos mapeo
            const targetId = therapistFilter === 'Juan Pérez' ? 'th-1' : 'th-2';
            filtered = filtered.filter(d => d.therapistId === targetId);
        }

        return filtered;
    }, [analyticsData, dateRange, therapistFilter]);

    // Calcular KPIs
    const kpiStats = useMemo(() => calculateKPIs(filteredData), [filteredData]);

    if (!student || !program) {
        return <Container>Programa no encontrado</Container>;
    }

    const metricLabel = program.category === 'skill-acquisition' ? 'Porcentaje de Logro' : 'Frecuencia de Conducta';
    const metricType: AnalysisMetric = program.category === 'skill-acquisition' ? 'percentage' : 'frequency';
    const isPercentage = metricType === 'percentage';

    const handleOpenGoalModal = () => {
        setTempGoalValue(goalValue);
        openGoalModal();
    };

    const handleSaveGoal = () => {
        setGoalValue(tempGoalValue);
        notifications.show({
            title: 'Meta Actualizada',
            message: `El criterio de éxito se ha establecido en ${tempGoalValue}${isPercentage ? '%' : ''}.`,
            color: 'green',
            icon: <Check size={16} />
        });
        closeGoalModal();
    };

    return (
        <Container size="xl" py="xl">
            {/* Header de Navegación */}
            <Group mb="lg" justify="space-between">
                <Group>
                    <Button
                        variant="subtle"
                        leftSection={<ChevronLeft size={16} />}
                        onClick={() => navigate(`/students/${studentId}?tab=programs`)}
                        color="gray"
                    >
                        Volver al perfil
                    </Button>
                    <div>
                        <Text size="sm" c="dimmed">Análisis de Progreso</Text>
                        <Title order={2}>{program.name}</Title>
                    </div>
                </Group>
                <Badge size="lg" variant="light">
                    {program.category === 'skill-acquisition' ? 'Habilidad' : 'Conducta'}
                </Badge>
            </Group>

            {/* Configuración y Filtros */}
            <Paper p="md" radius="md" mb="xl" withBorder>
                <Group justify="space-between">
                    <Group>
                        <Select
                            leftSection={<Calendar size={16} />}
                            value={dateRange}
                            onChange={(val) => setDateRange(val || '30d')}
                            data={[
                                { value: '7d', label: 'Últimos 7 días' },
                                { value: '30d', label: 'Últimos 30 días' },
                                { value: '90d', label: 'Últimos 3 meses' },
                            ]}
                            allowDeselect={false}
                            style={{ width: 200 }}
                        />
                        <Select
                            leftSection={<Filter size={16} />}
                            placeholder="Filtrar por Terapeuta"
                            data={['Todos', 'Juan Pérez', 'Ana García']}
                            value={therapistFilter}
                            onChange={setTherapistFilter}
                            clearable
                            style={{ width: 200 }}
                        />
                    </Group>
                    <Group>
                        <Button
                            variant="default"
                            leftSection={<Settings size={16} />}
                            onClick={handleOpenGoalModal}
                        >
                            Configurar Meta: {goalValue}{isPercentage ? '%' : ''}
                        </Button>
                        <Tooltip label="Generar reporte PDF detallado">
                            <Button
                                variant="outline"
                                leftSection={<Download size={16} />}
                                onClick={() => notifications.show({ title: 'Exportando PDF', message: 'Generando reporte...', color: 'blue' })}
                            >
                                Exportar
                            </Button>
                        </Tooltip>
                    </Group>
                </Group>
            </Paper>

            <Stack gap="xl">
                {/* KPIs */}
                <KPICards stats={kpiStats} metricType={metricType} />

                {/* Gráfico Principal */}
                <Paper p="xl" radius="md" withBorder shadow="sm">
                    <Title order={4} mb="lg">Evolución: {metricLabel}</Title>
                    <div style={{ height: 400, width: '100%' }}>
                        <AnalysisChart
                            data={filteredData}
                            metric={metricType}
                            height={400}
                            showGoal={true}
                            goalValue={goalValue}
                        />
                    </div>
                </Paper>

                {/* Tabla de Datos Detallada */}
                <Paper p="md" radius="md" withBorder>
                    <Group justify="space-between" mb="md">
                        <Title order={5}>Registro Detallado</Title>
                    </Group>
                    <Table>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Fecha</Table.Th>
                                <Table.Th>Fase</Table.Th>
                                <Table.Th>Valor ({metricType === 'percentage' ? '%' : 'N'})</Table.Th>
                                <Table.Th>Notas</Table.Th>
                                <Table.Th>Acciones</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {filteredData.slice(-10).reverse().map((row) => (
                                <Table.Tr key={row.id}>
                                    <Table.Td>{new Date(row.date).toLocaleDateString()}</Table.Td>
                                    <Table.Td>
                                        <Badge size="sm" variant="dot" color={row.phase === 'baseline' ? 'gray' : 'blue'}>
                                            {row.phase}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td fw={700}>
                                        {row.value}{metricType === 'percentage' ? '%' : ''}
                                    </Table.Td>
                                    <Table.Td>
                                        {row.notes ? (
                                            <Tooltip label={row.notes}>
                                                <Group gap={4} style={{ cursor: 'help' }}>
                                                    <FileText size={14} color="gray" />
                                                    <Text size="sm" c="dimmed" lineClamp={1} style={{ maxWidth: 200 }}>
                                                        {row.notes}
                                                    </Text>
                                                </Group>
                                            </Tooltip>
                                        ) : (
                                            <Text c="dimmed" size="sm">-</Text>
                                        )}
                                    </Table.Td>
                                    <Table.Td>
                                        <Button variant="subtle" size="xs">Editar</Button>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </Paper>
            </Stack>

            {/* Modal de Configuración de Meta */}
            <Modal opened={isGoalModalOpen} onClose={closeGoalModal} title="Configurar Criterio de Éxito">
                <Stack>
                    <Text size="sm" c="dimmed">
                        Define el valor objetivo para considerar que el programa ha sido dominado o que la conducta está bajo control.
                        Este valor se mostrará como una línea de referencia en el gráfico.
                    </Text>

                    <NumberInput
                        label={isPercentage ? "Porcentaje de Logro (%)" : "Frecuencia Máxima Permitida"}
                        value={tempGoalValue}
                        onChange={(val) => setTempGoalValue(Number(val))}
                        min={0}
                        max={isPercentage ? 100 : undefined}
                        suffix={isPercentage ? "%" : undefined}
                    />

                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={closeGoalModal}>Cancelar</Button>
                        <Button onClick={handleSaveGoal}>Guardar Meta</Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    );
}

import { useState, useMemo } from 'react';
import { Card, Text, Title, Stack, Group, SegmentedControl, MultiSelect, ActionIcon, Modal } from '@mantine/core';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Maximize2, Filter } from 'lucide-react';
import { useDisclosure } from '@mantine/hooks';
import { studentsData } from '@/api/mockData';

interface ProgressLineChartProps {
    title: string;
    description?: string;
}

const COLORS = [
    'var(--mantine-color-blue-6)',
    'var(--mantine-color-teal-6)',
    'var(--mantine-color-violet-6)',
    'var(--mantine-color-orange-6)',
    'var(--mantine-color-red-6)',
    'var(--mantine-color-cyan-6)',
    'var(--mantine-color-lime-6)',
];

type TimeFilter = 'weekly' | 'monthly' | 'yearly';

export function ProgressLineChart({ title, description }: ProgressLineChartProps) {
    // Estados
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('weekly');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(
        studentsData.slice(0, 5).map(s => s.id) // Preseleccionar primeros 5
    );
    const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);

    // Opciones para el select
    const studentOptions = studentsData.map(s => ({
        value: s.id,
        label: s.fullName
    }));

    // Generar datos simulados basados en filtros
    const chartData = useMemo(() => {
        let labels: string[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any[] = [];

        if (timeFilter === 'weekly') {
            labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        } else if (timeFilter === 'monthly') {
            labels = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];
        } else {
            labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        }

        // Crear puntos de datos para el eje X
        labels.forEach((label) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const point: any = { name: label };
            // Generar valor aleatorio para cada estudiante seleccionado
            selectedStudentIds.forEach(id => {
                // Simulamos "sesiones realizadas", ej: entre 0 y 5 por día/semana
                const maxVal = timeFilter === 'weekly' ? 4 : timeFilter === 'monthly' ? 10 : 20;
                point[id] = Math.floor(Math.random() * maxVal);
            });
            data.push(point);
        });

        return data;
    }, [timeFilter, selectedStudentIds]);

    // Componente del Gráfico (reutilizable para vista normal y modal)
    const renderChart = (height: number, showLegend: boolean = false) => (
        <ResponsiveContainer width="100%" height={height}>
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--mantine-color-gray-2)" vertical={false} />
                <XAxis
                    dataKey="name"
                    stroke="var(--mantine-color-gray-5)"
                    style={{ fontSize: '12px' }}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                />
                <YAxis
                    stroke="var(--mantine-color-gray-5)"
                    style={{ fontSize: '12px' }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    label={{
                        value: 'N° sesiones',
                        angle: -90,
                        position: 'insideLeft',
                        style: { fill: 'var(--mantine-color-dimmed)', fontSize: '12px' }
                    }}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid var(--mantine-color-gray-3)',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    cursor={{ stroke: 'var(--mantine-color-gray-4)', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                {showLegend && <Legend />}
                {selectedStudentIds.map((studentId, index) => {
                    const student = studentsData.find(s => s.id === studentId);
                    return (
                        <Line
                            key={studentId}
                            type="monotone"
                            dataKey={studentId}
                            name={student?.fullName || 'Desconocido'}
                            stroke={COLORS[index % COLORS.length]}
                            strokeWidth={3}
                            dot={{ fill: COLORS[index % COLORS.length], r: 4, strokeWidth: 0 }}
                            activeDot={{ r: 6, stroke: 'white', strokeWidth: 2 }}
                            animationDuration={1000}
                        />
                    );
                })}
            </LineChart>
        </ResponsiveContainer>
    );

    return (
        <Card padding="lg" radius="md" withBorder>
            <Stack gap="md">
                {/* Header con Título y Botón Modal */}
                <Group justify="space-between" align="flex-start">
                    <div>
                        <Title order={4}>{title}</Title>
                        {description && (
                            <Text size="sm" c="dimmed" mt={4}>
                                {description}
                            </Text>
                        )}
                    </div>
                    <ActionIcon variant="light" color="gray" onClick={openModal} title="Ampliar vista">
                        <Maximize2 size={18} />
                    </ActionIcon>
                </Group>

                {/* Filtros */}
                <Stack gap="xs">
                    <Group justify="space-between" wrap="nowrap">
                        <SegmentedControl
                            size="xs"
                            value={timeFilter}
                            onChange={(value) => setTimeFilter(value as TimeFilter)}
                            data={[
                                { label: 'Semanal', value: 'weekly' },
                                { label: 'Mensual', value: 'monthly' },
                                { label: 'Anual', value: 'yearly' },
                            ]}
                        />
                        {selectedStudentIds.length > 0 && (
                            <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                                {selectedStudentIds.length} estudiantes
                            </Text>
                        )}
                    </Group>

                    <MultiSelect
                        placeholder="Buscar estudiantes..."
                        data={studentOptions}
                        value={selectedStudentIds}
                        onChange={setSelectedStudentIds}
                        searchable
                        clearable
                        maxValues={10}
                        hidePickedOptions
                        size="sm"
                        leftSection={<Filter size={14} />}
                        nothingFoundMessage="No se encontraron estudiantes"
                    />
                </Stack>

                {/* Gráfico previsualización */}
                <div style={{ marginTop: '10px' }}>
                    {selectedStudentIds.length === 0 ? (
                        <Group justify="center" align="center" h={300} bg="gray.0" style={{ borderRadius: '8px' }}>
                            <Text c="dimmed">Selecciona al menos un estudiante para ver datos</Text>
                        </Group>
                    ) : (
                        renderChart(300)
                    )}
                </div>
            </Stack>

            {/* Modal Ampliado */}
            <Modal
                opened={modalOpened}
                onClose={closeModal}
                size="80%"
                title={<Title order={3}>{title}</Title>}
                centered
                styles={{ content: { height: '80vh', display: 'flex', flexDirection: 'column' }, body: { flex: 1, display: 'flex', flexDirection: 'column' } }}
            >
                <Stack gap="lg" style={{ flex: 1 }}>
                    <Group justify="space-between">
                        <SegmentedControl
                            value={timeFilter}
                            onChange={(value) => setTimeFilter(value as TimeFilter)}
                            data={[
                                { label: 'Semanal', value: 'weekly' },
                                { label: 'Mensual', value: 'monthly' },
                                { label: 'Anual', value: 'yearly' },
                            ]}
                        />
                        <MultiSelect
                            placeholder="Buscar estudiantes..."
                            data={studentOptions}
                            value={selectedStudentIds}
                            onChange={setSelectedStudentIds}
                            searchable
                            clearable
                            w={400}
                        />
                    </Group>

                    <div style={{ flex: 1, minHeight: 0 }}>
                        {selectedStudentIds.length === 0 ? (
                            <Group justify="center" align="center" h="100%" bg="gray.0" style={{ borderRadius: '8px' }}>
                                <Text c="dimmed">Selecciona al menos un estudiante</Text>
                            </Group>
                        ) : (
                            renderChart(500, true) // Mostrar leyenda en modal
                        )}
                    </div>
                </Stack>
            </Modal>
        </Card>
    );
}

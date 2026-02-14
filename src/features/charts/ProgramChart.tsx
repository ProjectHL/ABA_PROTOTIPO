import { useState } from 'react';
import {
    Stack,
    Paper,
    Title,
    Group,
    Checkbox,
    NumberInput,
    Button,
    Text,
    Badge,
    Table
} from '@mantine/core';
import { Download } from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ReferenceLine,
    ResponsiveContainer
} from 'recharts';
import { generateMockSessionData, phaseChanges, type SessionDataPoint } from '@/api/chartData';

interface ProgramChartProps {
    programId: string;
    programName: string;
}

export function ProgramChart({ programId, programName }: ProgramChartProps) {
    const [data] = useState<SessionDataPoint[]>(generateMockSessionData(programId));
    const [showIndependent, setShowIndependent] = useState(true);
    const [showPrompted, setShowPrompted] = useState(true);
    const [showError, setShowError] = useState(true);
    const [yAxisMin, setYAxisMin] = useState(0);
    const [yAxisMax, setYAxisMax] = useState(100);

    const handleExportPDF = () => {
        alert('Funcionalidad de exportación PDF en desarrollo');
    };

    const calculateStats = () => {
        const latest = data[data.length - 1];
        const baseline = data.slice(0, 5);
        const current = data.slice(-5);

        const baselineAvg = Math.round(
            baseline.reduce((sum, d) => sum + d.percentage, 0) / baseline.length
        );
        const currentAvg = Math.round(
            current.reduce((sum, d) => sum + d.percentage, 0) / current.length
        );
        const improvement = currentAvg - baselineAvg;

        return {
            latestPercentage: latest.percentage,
            baselineAvg,
            currentAvg,
            improvement,
            totalSessions: data.length,
        };
    };

    const stats = calculateStats();

    return (
        <Stack gap="lg">
            {/* Header with Stats */}
            <Paper p="lg" radius="md" withBorder>
                <Group justify="space-between">
                    <div>
                        <Title order={3}>{programName}</Title>
                        <Text size="sm" c="dimmed">Análisis de Progreso</Text>
                    </div>
                    <Group gap="md">
                        <div style={{ textAlign: 'center' }}>
                            <Text size="xs" c="dimmed">Última Sesión</Text>
                            <Badge size="xl" variant="filled" color="blue">
                                {stats.latestPercentage}%
                            </Badge>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <Text size="xs" c="dimmed">Mejora Total</Text>
                            <Badge size="xl" variant="filled" color={stats.improvement > 0 ? 'green' : 'red'}>
                                {stats.improvement > 0 ? '+' : ''}{stats.improvement}%
                            </Badge>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <Text size="xs" c="dimmed">Sesiones</Text>
                            <Badge size="xl" variant="light">
                                {stats.totalSessions}
                            </Badge>
                        </div>
                    </Group>
                </Group>
            </Paper>

            {/* Controls */}
            <Paper p="md" radius="md" withBorder>
                <Group justify="space-between">
                    <Checkbox.Group
                        label="Series a Mostrar"
                        value={[
                            showIndependent ? 'independent' : '',
                            showPrompted ? 'prompted' : '',
                            showError ? 'error' : '',
                        ].filter(Boolean)}
                    >
                        <Group mt="xs">
                            <Checkbox
                                value="independent"
                                label="Independientes"
                                checked={showIndependent}
                                onChange={(e) => setShowIndependent(e.currentTarget.checked)}
                                color="green"
                            />
                            <Checkbox
                                value="prompted"
                                label="Con Ayuda"
                                checked={showPrompted}
                                onChange={(e) => setShowPrompted(e.currentTarget.checked)}
                                color="yellow"
                            />
                            <Checkbox
                                value="error"
                                label="Errores"
                                checked={showError}
                                onChange={(e) => setShowError(e.currentTarget.checked)}
                                color="red"
                            />
                        </Group>
                    </Checkbox.Group>

                    <Group>
                        <NumberInput
                            label="Eje Y Mín"
                            value={yAxisMin}
                            onChange={(value) => setYAxisMin(Number(value) || 0)}
                            min={0}
                            max={100}
                            w={100}
                        />
                        <NumberInput
                            label="Eje Y Máx"
                            value={yAxisMax}
                            onChange={(value) => setYAxisMax(Number(value) || 100)}
                            min={0}
                            max={100}
                            w={100}
                        />
                        <Button
                            variant="light"
                            leftSection={<Download size={16} />}
                            onClick={handleExportPDF}
                            mt="auto"
                        >
                            Exportar PDF
                        </Button>
                    </Group>
                </Group>
            </Paper>

            {/* Chart */}
            <Paper p="lg" radius="md" withBorder>
                <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="session"
                            label={{ value: 'Sesión', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis
                            domain={[yAxisMin, yAxisMax]}
                            label={{ value: 'Porcentaje (%)', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload as SessionDataPoint;
                                    return (
                                        <Paper p="sm" withBorder shadow="md">
                                            <Text size="sm" fw={600}>Sesión {data.session}</Text>
                                            <Text size="xs" c="dimmed">{new Date(data.date).toLocaleDateString('es-ES')}</Text>
                                            {showIndependent && (
                                                <Text size="xs" c="green">Independientes: {data.independent}%</Text>
                                            )}
                                            {showPrompted && (
                                                <Text size="xs" c="yellow">Con Ayuda: {data.prompted}%</Text>
                                            )}
                                            {showError && (
                                                <Text size="xs" c="red">Errores: {data.error}%</Text>
                                            )}
                                            <Text size="xs" fw={600} mt="xs">Total Correcto: {data.percentage}%</Text>
                                        </Paper>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Legend />

                        {/* Phase Change Lines */}
                        {phaseChanges.map((phase) => (
                            <ReferenceLine
                                key={phase.session}
                                x={phase.session}
                                stroke={phase.color}
                                strokeDasharray="5 5"
                                strokeWidth={2}
                                label={{
                                    value: phase.phaseName,
                                    position: 'top',
                                    fill: phase.color,
                                    fontSize: 12,
                                    fontWeight: 600,
                                }}
                            />
                        ))}

                        {/* Data Lines */}
                        {showIndependent && (
                            <Line
                                type="monotone"
                                dataKey="independent"
                                stroke="#40c057"
                                strokeWidth={3}
                                name="Independientes"
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        )}
                        {showPrompted && (
                            <Line
                                type="monotone"
                                dataKey="prompted"
                                stroke="#fab005"
                                strokeWidth={3}
                                name="Con Ayuda"
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        )}
                        {showError && (
                            <Line
                                type="monotone"
                                dataKey="error"
                                stroke="#fa5252"
                                strokeWidth={3}
                                name="Errores"
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        )}
                    </LineChart>
                </ResponsiveContainer>
            </Paper>

            {/* Summary Table */}
            <Paper p="lg" radius="md" withBorder>
                <Title order={4} mb="md">Resumen por Fase</Title>
                <Table highlightOnHover>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Fase</Table.Th>
                            <Table.Th>Sesiones</Table.Th>
                            <Table.Th>Promedio Independientes</Table.Th>
                            <Table.Th>Promedio Total</Table.Th>
                            <Table.Th>Tendencia</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        <Table.Tr>
                            <Table.Td>
                                <Badge color="gray">Línea Base</Badge>
                            </Table.Td>
                            <Table.Td>1-5</Table.Td>
                            <Table.Td>{Math.round(data.slice(0, 5).reduce((sum, d) => sum + d.independent, 0) / 5)}%</Table.Td>
                            <Table.Td>{stats.baselineAvg}%</Table.Td>
                            <Table.Td>
                                <Badge color="gray" variant="light">Estable</Badge>
                            </Table.Td>
                        </Table.Tr>
                        <Table.Tr>
                            <Table.Td>
                                <Badge color="blue">Intervención</Badge>
                            </Table.Td>
                            <Table.Td>6-15</Table.Td>
                            <Table.Td>{Math.round(data.slice(5, 15).reduce((sum, d) => sum + d.independent, 0) / 10)}%</Table.Td>
                            <Table.Td>{Math.round(data.slice(5, 15).reduce((sum, d) => sum + d.percentage, 0) / 10)}%</Table.Td>
                            <Table.Td>
                                <Badge color="green" variant="light">Ascendente</Badge>
                            </Table.Td>
                        </Table.Tr>
                        <Table.Tr>
                            <Table.Td>
                                <Badge color="green">Mantenimiento</Badge>
                            </Table.Td>
                            <Table.Td>16-20</Table.Td>
                            <Table.Td>{Math.round(data.slice(15).reduce((sum, d) => sum + d.independent, 0) / 5)}%</Table.Td>
                            <Table.Td>{stats.currentAvg}%</Table.Td>
                            <Table.Td>
                                <Badge color="green" variant="filled">Estable Alto</Badge>
                            </Table.Td>
                        </Table.Tr>
                    </Table.Tbody>
                </Table>
            </Paper>
        </Stack>
    );
}

import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Area, AreaChart, Legend } from 'recharts';
import { Paper, Group, Badge, Text } from '@mantine/core';
import type { DataPoint, AnalysisMetric } from '@/api/analyticsData';

// Definición manual de props simplificada para evitar dependencias internas inestables de Recharts
// Usamos 'unknown' en lugar de 'any' para satisfacer al linter donde sea posible, o 'any' controlado si es estructura compleja de librerías externas
interface CustomTooltipProps {
    active?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload?: any[];
    label?: string;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
        const point = payload[0].payload as DataPoint;
        // Detectamos si es porcentaje basado en el nombre de la serie (definido en <Area name="..." />)
        const isPercentage = payload[0].name === "Porcentaje de Logro";

        return (
            <Paper p="xs" shadow="md" withBorder style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
                <Text size="xs" fw={700}>{new Date(point.date).toLocaleDateString()}</Text>
                <Text size="sm" c="blue" fw={500}>
                    Valor: {point.value}{isPercentage ? '%' : ''}
                </Text>
                <Group gap={4} mt={4}>
                    <Badge size="xs" variant="outline" color={point.phase === 'baseline' ? 'gray' : point.phase === 'intervention' ? 'blue' : 'green'}>
                        {point.phase}
                    </Badge>
                    <Text size="xs" c="dimmed">Terapeuta: {point.therapistId}</Text>
                </Group>
                {point.notes && (
                    <Text size="xs" c="dimmed" mt={4} style={{ maxWidth: 200 }}>
                        "{point.notes}"
                    </Text>
                )}
            </Paper>
        );
    }
    return null;
};

interface AnalysisChartProps {
    data: DataPoint[];
    metric: AnalysisMetric;
    height?: number;
    showGoal?: boolean;
    goalValue?: number;
}

export function AnalysisChart({ data, metric, height = 400, showGoal = true, goalValue = 80 }: AnalysisChartProps) {

    // Configuración según métrica
    const isPercentage = metric === 'percentage';
    const yAxisDomain = isPercentage ? [0, 100] : ['auto', 'auto'];

    return (
        <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#228be6" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#228be6" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9ecef" />
                <XAxis
                    dataKey="date"
                    tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
                    style={{ fontSize: 12 }}
                    tick={{ fill: '#868e96' }}
                />
                <YAxis
                    domain={yAxisDomain}
                    style={{ fontSize: 12 }}
                    tick={{ fill: '#868e96' }}
                />

                <Tooltip content={<CustomTooltip />} />
                <Legend />

                {/* Meta / Criterio */}
                {showGoal && (
                    <ReferenceLine y={goalValue} label={{ value: 'Meta', position: 'right', fill: 'green', fontSize: 10 }} stroke="green" strokeDasharray="5 5" />
                )}

                <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#228be6"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#228be6', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6 }}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                    name={isPercentage ? "Porcentaje de Logro" : "Valor Registrado"}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}

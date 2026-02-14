import { useState, useMemo } from 'react';
import { Card, Text, Title, Stack, SegmentedControl, Group, Select } from '@mantine/core';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { studentsData } from '@/api/mockData';

interface ProgramsBarChartProps {
    title?: string;
    description?: string;
}

// Datos base
const BASE_WEEKLY_DATA = [
    { category: 'Lun', value: 2, color: 'blue' },
    { category: 'Mar', value: 5, color: 'blue' },
    { category: 'Mié', value: 3, color: 'blue' },
    { category: 'Jue', value: 8, color: 'blue' },
    { category: 'Vie', value: 6, color: 'blue' },
    { category: 'Sáb', value: 1, color: 'blue' },
    { category: 'Dom', value: 0, color: 'blue' },
];

const BASE_MONTHLY_DATA = [
    { category: 'Sem 1', value: 12, color: 'violet' },
    { category: 'Sem 2', value: 18, color: 'violet' },
    { category: 'Sem 3', value: 15, color: 'violet' },
    { category: 'Sem 4', value: 22, color: 'violet' },
];

export function ProgramsBarChart({
    title = "Programas Logrados",
    description = "Total de programas que alcanzaron el criterio de logro"
}: ProgramsBarChartProps) {
    const [period, setPeriod] = useState<string>('weekly'); // 'weekly' | 'monthly'
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

    // Opciones para el Select de estudiantes
    const studentOptions = useMemo(() => [
        { value: 'all', label: 'Todos los estudiantes' },
        ...studentsData.map(s => ({ value: s.id, label: s.fullName }))
    ], []);

    // Generar datos simulados basados en el estudiante seleccionado y el periodo
    const chartData = useMemo(() => {
        const baseData = period === 'weekly' ? BASE_WEEKLY_DATA : BASE_MONTHLY_DATA;

        if (!selectedStudentId || selectedStudentId === 'all') {
            return baseData;
        }

        // Algoritmo simple para variar los datos según el ID del estudiante (determinista)
        // Esto es solo para el prototipo visual
        const variance = selectedStudentId.charCodeAt(selectedStudentId.length - 1) % 5;

        return baseData.map((item, index) => {
            // Pseudo-random determinista basado en caracteres del ID y posición del item
            const pseudoRandom = ((selectedStudentId.charCodeAt(0) + index) % 5) - 2;
            return {
                ...item,
                value: Math.max(0, item.value + (variance - 2) + pseudoRandom)
            };
        });
    }, [selectedStudentId, period]);

    const totalAchieved = chartData.reduce((acc, curr) => acc + curr.value, 0);

    const getColorValue = (color: string) => {
        const colorMap: Record<string, string> = {
            blue: 'var(--mantine-color-blue-6)',
            green: 'var(--mantine-color-green-6)',
            violet: 'var(--mantine-color-violet-6)',
            orange: 'var(--mantine-color-orange-6)',
            red: 'var(--mantine-color-red-6)',
        };
        return colorMap[color] || 'var(--mantine-color-gray-6)';
    };

    return (
        <Card padding="lg" radius="md" withBorder>
            <Stack gap="lg">
                <Group justify="space-between" align="flex-start">
                    <div>
                        <Title order={4}>{title}</Title>
                        <Text size="sm" c="dimmed" mt={4}>
                            {description}
                        </Text>
                        <Text size="xl" fw={700} c="blue" mt="xs">
                            {totalAchieved} <Text span size="sm" c="dimmed" fw={400}>programas logrados</Text>
                        </Text>
                    </div>

                    <Stack align="flex-end" gap="xs">
                        <Select
                            placeholder="Filtrar por estudiante"
                            data={studentOptions}
                            value={selectedStudentId || 'all'}
                            onChange={(val) => setSelectedStudentId(val === 'all' ? null : val)}
                            size="xs"
                            w={200}
                            searchable
                            clearable={false}
                        />
                        <SegmentedControl
                            size="xs"
                            value={period}
                            onChange={setPeriod}
                            data={[
                                { label: 'Semanal', value: 'weekly' },
                                { label: 'Mensual', value: 'monthly' },
                            ]}
                        />
                    </Stack>
                </Group>

                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--mantine-color-gray-3)" vertical={false} />
                        <XAxis
                            dataKey="category"
                            stroke="var(--mantine-color-gray-6)"
                            style={{ fontSize: '11px' }}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                        />
                        <YAxis
                            stroke="var(--mantine-color-gray-6)"
                            style={{ fontSize: '12px' }}
                            allowDecimals={false}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            cursor={{ fill: 'var(--mantine-color-gray-1)' }}
                            contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid var(--mantine-color-gray-3)',
                                borderRadius: '8px',
                            }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getColorValue(entry.color)} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </Stack>
        </Card>
    );
}

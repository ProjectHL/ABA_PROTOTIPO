import { Paper, Group, Text, ThemeIcon, SimpleGrid } from '@mantine/core';
import { TrendingUp, TrendingDown, Minus, Activity, Target } from 'lucide-react';
import type { KPIStats, AnalysisMetric } from '@/api/analyticsData';

interface KPICardsProps {
    stats: KPIStats;
    metricType: AnalysisMetric;
}

export function KPICards({ stats, metricType }: KPICardsProps) {
    const isPositiveGood = metricType === 'percentage' || metricType === 'rate';

    // Determinar color de tendencia
    const getTrendColor = () => {
        if (stats.trend === 'stable') return 'gray';
        if (stats.trend === 'up') return isPositiveGood ? 'green' : 'red';
        return isPositiveGood ? 'red' : 'green'; // Down trend
    };

    const TrendIcon = stats.trend === 'up' ? TrendingUp : stats.trend === 'down' ? TrendingDown : Minus;

    return (
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            {/* Card 1: Promedio General */}
            <Paper p="md" radius="md" withBorder shadow="sm">
                <Group justify="space-between">
                    <div>
                        <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                            Promedio del Periodo
                        </Text>
                        <Text fw={700} size="xl">
                            {stats.averageValue}
                            {metricType === 'percentage' ? '%' : ''}
                        </Text>
                    </div>
                    <ThemeIcon color="blue" variant="light" size={38} radius="md">
                        <Activity size={24} />
                    </ThemeIcon>
                </Group>
                <Text c="dimmed" size="xs" mt="sm">
                    En {stats.totalSessions} sesiones registradas
                </Text>
            </Paper>

            {/* Card 2: Tendencia */}
            <Paper p="md" radius="md" withBorder shadow="sm">
                <Group justify="space-between">
                    <div>
                        <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                            Tendencia
                        </Text>
                        <Group gap="xs" align="flex-end">
                            <Text fw={700} size="xl" c={getTrendColor()}>
                                {stats.trendPercentage > 0 ? '+' : ''}{stats.trendPercentage}%
                            </Text>
                        </Group>
                    </div>
                    <ThemeIcon color={getTrendColor()} variant="light" size={38} radius="md">
                        <TrendIcon size={24} />
                    </ThemeIcon>
                </Group>
                <Text c="dimmed" size="xs" mt="sm">
                    Comparado con inicio del periodo
                </Text>
            </Paper>

            {/* Card 3: Último Valor */}
            <Paper p="md" radius="md" withBorder shadow="sm">
                <Group justify="space-between">
                    <div>
                        <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                            Última Sesión
                        </Text>
                        <Text fw={700} size="xl">
                            {stats.lastValue}
                            {metricType === 'percentage' ? '%' : ''}
                        </Text>
                    </div>
                    <ThemeIcon color="violet" variant="light" size={38} radius="md">
                        <Target size={24} />
                    </ThemeIcon>
                </Group>
                <Text c="dimmed" size="xs" mt="sm">
                    Valor más reciente registrado
                </Text>
            </Paper>
        </SimpleGrid>
    );
}

import { SimpleGrid, Card, Text, Group, ThemeIcon } from '@mantine/core';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { type DashboardKPI } from '@/api/dashboardData';

interface KPICardsProps {
    kpis: DashboardKPI[];
}

export function KPICards({ kpis }: KPICardsProps) {
    const getTrendIcon = (trend?: 'up' | 'down' | 'neutral') => {
        switch (trend) {
            case 'up':
                return <TrendingUp size={16} />;
            case 'down':
                return <TrendingDown size={16} />;
            default:
                return <Minus size={16} />;
        }
    };

    const getTrendColor = (trend?: 'up' | 'down' | 'neutral') => {
        switch (trend) {
            case 'up':
                return 'green';
            case 'down':
                return 'red';
            default:
                return 'gray';
        }
    };

    return (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
            {kpis.map((kpi, index) => (
                <Card key={index} padding="lg" radius="md" withBorder>
                    <Group justify="space-between" mb="xs">
                        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                            {kpi.label}
                        </Text>
                        {kpi.change !== undefined && (
                            <ThemeIcon
                                size="sm"
                                radius="xl"
                                variant="light"
                                color={getTrendColor(kpi.trend)}
                            >
                                {getTrendIcon(kpi.trend)}
                            </ThemeIcon>
                        )}
                    </Group>

                    <Text size="32px" fw={900} c={kpi.color}>
                        {kpi.value}
                    </Text>

                    {kpi.change !== undefined && (
                        <Text size="xs" c={getTrendColor(kpi.trend)} mt={4}>
                            {kpi.change > 0 ? '+' : ''}
                            {kpi.change}% vs mes anterior
                        </Text>
                    )}
                </Card>
            ))}
        </SimpleGrid>
    );
}

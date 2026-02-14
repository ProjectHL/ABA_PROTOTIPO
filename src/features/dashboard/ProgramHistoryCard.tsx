import { Card, Text, Title, Stack, Group, Badge, ScrollArea, ThemeIcon } from '@mantine/core';
import { Trophy, TrendingUp } from 'lucide-react';
import { type ProgramHistory } from '@/api/dashboardData';

interface ProgramHistoryCardProps {
    programs: ProgramHistory[];
}

export function ProgramHistoryCard({ programs }: ProgramHistoryCardProps) {
    const getCategoryColor = (category: 'skill-acquisition' | 'behavior-management') => {
        return category === 'skill-acquisition' ? 'blue' : 'orange';
    };

    const getCategoryLabel = (category: 'skill-acquisition' | 'behavior-management') => {
        return category === 'skill-acquisition' ? 'Adquisición' : 'Conducta';
    };

    return (
        <Card padding="xl" radius="md" withBorder>
            <Stack gap="lg">
                {/* Header */}
                <Group>
                    <ThemeIcon size="lg" radius="md" variant="light" color="green">
                        <Trophy size={20} />
                    </ThemeIcon>
                    <div>
                        <Title order={4}>Programas Logrados</Title>
                        <Text size="sm" c="dimmed">
                            Últimos {programs.length} programas completados
                        </Text>
                    </div>
                </Group>

                {/* Programs List */}
                <ScrollArea h={300}>
                    <Stack gap="md">
                        {programs.map((program) => (
                            <Card key={program.id} padding="md" radius="md" withBorder bg="gray.0">
                                <Stack gap="xs">
                                    <Group justify="space-between">
                                        <Text fw={600} size="sm">
                                            {program.programName}
                                        </Text>
                                        <Badge
                                            size="sm"
                                            variant="light"
                                            color={getCategoryColor(program.category)}
                                        >
                                            {getCategoryLabel(program.category)}
                                        </Badge>
                                    </Group>

                                    <Text size="xs" c="dimmed">
                                        {program.studentName}
                                    </Text>

                                    <Group justify="space-between" mt="xs">
                                        <Group gap="xs">
                                            <TrendingUp size={14} color="var(--mantine-color-green-6)" />
                                            <Text size="sm" fw={600} c="green">
                                                {program.successRate}% éxito
                                            </Text>
                                        </Group>
                                        <Text size="xs" c="dimmed">
                                            {new Date(program.achievedDate).toLocaleDateString('es-ES', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                        </Text>
                                    </Group>
                                </Stack>
                            </Card>
                        ))}
                    </Stack>
                </ScrollArea>
            </Stack>
        </Card>
    );
}

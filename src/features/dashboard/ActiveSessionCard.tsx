import { useState, useEffect } from 'react';
import { Card, Text, Title, Group, Stack, Progress, Badge, Button, Collapse, ActionIcon } from '@mantine/core';
import { Clock, Calendar, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { type ActiveSession } from '@/api/dashboardData';

interface ActiveSessionCardProps {
    sessions: ActiveSession[];
    onViewProgram?: (programId: string, studentId: string) => void;
}

export function ActiveSessionCard({ sessions, onViewProgram }: ActiveSessionCardProps) {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [openedSessions, setOpenedSessions] = useState<Record<string, boolean>>({});

    // Actualizar el tiempo cada minuto
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000); // Update every minute

        return () => clearInterval(interval);
    }, []);

    const calculateProgress = (session: ActiveSession): { percentage: number; elapsed: number; remaining: number } => {
        const now = currentTime;

        // Parse date and time correctly
        const [year, month, day] = session.startDate.split('-').map(Number);
        const [hours, minutes] = session.startTime.split(':').map(Number);

        // Create session start date with correct timezone
        const sessionStart = new Date(year, month - 1, day, hours, minutes, 0, 0);

        // Calculate elapsed time
        const elapsedMs = now.getTime() - sessionStart.getTime();
        const elapsedMinutes = Math.floor(elapsedMs / 60000);
        const remainingMinutes = Math.max(0, session.duration - elapsedMinutes);
        const percentage = Math.min(100, (elapsedMinutes / session.duration) * 100);

        return {
            percentage: Math.max(0, percentage),
            elapsed: Math.max(0, elapsedMinutes),
            remaining: remainingMinutes,
        };
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const toggleSession = (sessionId: string) => {
        setOpenedSessions((prev) => ({
            ...prev,
            [sessionId]: !prev[sessionId],
        }));
    };

    if (!sessions || sessions.length === 0) {
        return (
            <Card padding="lg" radius="md" withBorder>
                <Stack align="center" gap="md" py="xl">
                    <Clock size={48} color="var(--mantine-color-dimmed)" />
                    <Text c="dimmed" ta="center">
                        No hay sesiones activas en este momento
                    </Text>
                </Stack>
            </Card>
        );
    }

    return (
        <Card padding="lg" radius="md" withBorder>
            <Stack gap="lg">
                {/* Header */}
                <Group justify="space-between">
                    <div>
                        <Title order={4}>Sesiones Activas</Title>
                        <Text size="sm" c="dimmed">
                            {sessions.length} {sessions.length === 1 ? 'sesión' : 'sesiones'} en progreso
                        </Text>
                    </div>
                    <Badge size="lg" variant="dot" color="green">
                        En Curso
                    </Badge>
                </Group>

                {/* Sessions List */}
                <Stack gap="sm">
                    {sessions.map((session) => {
                        const progress = calculateProgress(session);
                        const isOpened = openedSessions[session.id] || false;

                        return (
                            <Card key={session.id} padding="sm" radius="md" withBorder bg="gray.0">
                                <Stack gap="xs">
                                    {/* Collapsed Header - Always Visible */}
                                    <Group justify="space-between" wrap="nowrap">
                                        <Stack gap={4} style={{ flex: 1 }}>
                                            <Group gap="xs" wrap="nowrap">
                                                <Text size="sm" lineClamp={1}>
                                                    <Text span fw={700}>Profesional:</Text> {session.therapistName}
                                                </Text>
                                                <Text size="sm" c="dimmed">
                                                    →
                                                </Text>
                                                <Text size="sm" lineClamp={1}>
                                                    <Text span fw={700}>Estudiante:</Text> {session.studentName}
                                                </Text>
                                            </Group>
                                            <Group gap="md">
                                                <Group gap="xs">
                                                    <Calendar size={12} color="var(--mantine-color-dimmed)" />
                                                    <Text size="xs" c="dimmed">
                                                        {formatDate(session.startDate)}
                                                    </Text>
                                                </Group>
                                                <Group gap="xs">
                                                    <Clock size={12} color="var(--mantine-color-dimmed)" />
                                                    <Text size="xs" c="dimmed">
                                                        {session.startTime}
                                                    </Text>
                                                </Group>
                                            </Group>
                                        </Stack>

                                        <ActionIcon
                                            variant="subtle"
                                            onClick={() => toggleSession(session.id)}
                                            size="sm"
                                        >
                                            {isOpened ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </ActionIcon>
                                    </Group>

                                    {/* Collapsible Content */}
                                    <Collapse in={isOpened}>
                                        <Stack gap="sm" mt="xs">
                                            {/* Progress Bar */}
                                            <div>
                                                <Progress
                                                    value={progress.percentage}
                                                    size="lg"
                                                    radius="md"
                                                    color={
                                                        progress.remaining <= 5
                                                            ? 'red'
                                                            : progress.remaining <= 15
                                                                ? 'orange'
                                                                : 'blue'
                                                    }
                                                    animated={progress.remaining > 0}
                                                />
                                                <Group justify="space-between" mt={4}>
                                                    <Text size="xs" c="dimmed">
                                                        {progress.elapsed} min transcurridos
                                                    </Text>
                                                    <Text size="xs" fw={600} c={progress.remaining <= 5 ? 'red' : 'dimmed'}>
                                                        {progress.remaining} min restantes
                                                    </Text>
                                                </Group>
                                            </div>

                                            {/* Program Name and Button */}
                                            <Group justify="space-between" align="center">
                                                <Text size="sm" fw={700} c="dark">
                                                    {session.programName}
                                                </Text>
                                                <Button
                                                    size="xs"
                                                    variant="light"
                                                    leftSection={<Eye size={14} />}
                                                    onClick={() => onViewProgram?.(session.programId, session.studentId)}
                                                >
                                                    Ver Plan
                                                </Button>
                                            </Group>
                                        </Stack>
                                    </Collapse>
                                </Stack>
                            </Card>
                        );
                    })}
                </Stack>
            </Stack>
        </Card>
    );
}

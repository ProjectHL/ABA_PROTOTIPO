import { useState } from 'react';
import { Card, Text, Title, Group, Stack, Badge, ActionIcon, Collapse, Button, Tooltip, Avatar } from '@mantine/core';
import { Calendar, Clock, CheckCircle, ChevronDown, ChevronUp, BrainCircuit } from 'lucide-react';
import { type CompletedSession } from '@/api/dashboardData';

interface CompletedSessionsCardProps {
    sessions: CompletedSession[];
    onViewProgram?: (programId: string, studentId: string) => void;
}

export function CompletedSessionsCard({ sessions, onViewProgram }: CompletedSessionsCardProps) {
    const [openedSessions, setOpenedSessions] = useState<Record<string, boolean>>({});

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'long',
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
                    <CheckCircle size={48} color="var(--mantine-color-dimmed)" />
                    <Text c="dimmed" ta="center">
                        No hay sesiones finalizadas recientes
                    </Text>
                </Stack>
            </Card>
        );
    }

    return (
        <Card padding="lg" radius="md" withBorder>
            <Stack gap="lg">
                {/* Header Global */}
                <Group justify="space-between">
                    <div>
                        <Title order={4}>Sesiones Concluidas</Title>
                        <Text size="sm" c="dimmed">
                            Historial reciente de sesiones concluidas
                        </Text>
                    </div>
                    <Badge variant="light" color="blue">
                        Últimos 7 días
                    </Badge>
                </Group>

                {/* Lista de Sesiones */}
                <Stack gap="sm">
                    {sessions.map((session) => {
                        const isOpened = openedSessions[session.id] || false;

                        return (
                            <Card
                                key={session.id}
                                padding="sm"
                                radius="md"
                                withBorder
                                style={{ transition: 'all 0.2s', backgroundColor: isOpened ? 'var(--mantine-color-gray-0)' : 'white' }}
                            >
                                <Stack gap={0}>
                                    {/* Cabecera Clickable para abrir/cerrar */}
                                    <Group
                                        justify="space-between"
                                        wrap="nowrap"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => toggleSession(session.id)}
                                    >
                                        <Group gap="sm" style={{ flex: 1, minWidth: 0 }}>
                                            <Avatar color="green" radius="xl" size="sm">
                                                <CheckCircle size={14} />
                                            </Avatar>

                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <Group gap={6} wrap="nowrap" style={{ overflow: 'hidden' }}>
                                                    <Tooltip label={session.therapistName} withArrow>
                                                        <Text size="sm" lineClamp={1}>
                                                            <Text span fw={700}>Profesional:</Text> {session.therapistName.split(' ')[0]}
                                                        </Text>
                                                    </Tooltip>
                                                    <Text size="sm" c="dimmed">→</Text>
                                                    <Tooltip label={session.studentName} withArrow>
                                                        <Text size="sm" lineClamp={1}>
                                                            <Text span fw={700}>Est:</Text> {session.studentName.split(' ')[0]} {/* Mostrar solo primer nombre para ahorrar espacio */}
                                                        </Text>
                                                    </Tooltip>
                                                </Group>
                                                {!isOpened && (
                                                    <Group gap="xs" mt={2}>
                                                        <Text size="xs" c="dimmed">{session.startTime} - {session.endTime}</Text>
                                                        <Text size="xs" c="dimmed">•</Text>
                                                        <Text size="xs" c="dimmed" lineClamp={1}>{session.programName}</Text>
                                                    </Group>
                                                )}
                                            </div>
                                        </Group>

                                        <ActionIcon variant="transparent" color="gray" size="sm">
                                            {isOpened ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </ActionIcon>
                                    </Group>

                                    {/* Contenido Colapsable */}
                                    <Collapse in={isOpened}>
                                        <Stack gap="sm" mt="md" pl={46} pr="xs" pb="xs">

                                            <Group gap="lg">
                                                <Group gap="xs">
                                                    <Tooltip label="Fecha de sesión">
                                                        <Calendar size={14} color="var(--mantine-color-dimmed)" />
                                                    </Tooltip>
                                                    <Text size="sm" c="dimmed">{formatDate(session.startDate)}</Text>
                                                </Group>
                                                <Group gap="xs">
                                                    <Tooltip label="Horario">
                                                        <Clock size={14} color="var(--mantine-color-dimmed)" />
                                                    </Tooltip>
                                                    <Text size="sm" c="dimmed">{session.startTime} - {session.endTime}</Text>
                                                </Group>
                                            </Group>

                                            <Card withBorder padding="xs" radius="sm" bg="white">
                                                <Group wrap="nowrap">
                                                    <BrainCircuit size={16} color="var(--mantine-color-blue-6)" />
                                                    <div>
                                                        <Text size="xs" c="dimmed" fw={700} tt="uppercase">Programa Trabajado</Text>
                                                        <Text size="sm" fw={500} lineClamp={2}>{session.programName}</Text>
                                                    </div>
                                                </Group>
                                            </Card>

                                            <Group justify="flex-end">
                                                <Button
                                                    size="xs"
                                                    variant="light"
                                                    color="blue"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onViewProgram?.(session.programId, session.studentId);
                                                    }}
                                                >
                                                    Ver Detalles
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

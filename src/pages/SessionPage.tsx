import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container,
    Title,
    Text,
    Button,
    Stack,
    Group,
    Avatar,
    Badge,
    Paper,
    Progress,
    ActionIcon,
    SimpleGrid,
    Card,
    ThemeIcon,
    Alert
} from '@mantine/core';
import {
    ChevronLeft,
    Clock,
    CheckCircle2,
    PlayCircle,
    PauseCircle,
    Brain,
    AlertTriangle,
    LogOut
} from 'lucide-react';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { studentsData } from '@/api/mockData';
import { programsData, type Program } from '@/api/programsData';
import { DataCollectionEngine } from '@/features/dataCollection';

export default function SessionPage() {
    const { studentId } = useParams();
    const navigate = useNavigate();

    // Estado local
    const [sessionStatus, setSessionStatus] = useState<'active' | 'paused'>('active');
    const [completedPrograms, setCompletedPrograms] = useState<string[]>([]);
    const [dataCollectionOpen, { open: openDataCollection, close: closeDataCollection }] = useDisclosure(false);
    const [activeProgram, setActiveProgram] = useState<Program | null>(null);

    // Datos derivados
    const student = useMemo(() =>
        studentsData.find(s => s.id === studentId),
        [studentId]
    );

    const sessionPrograms = useMemo(() =>
        programsData.filter(p => p.studentId === studentId && p.status === 'active'),
        [studentId]
    );

    // Si no hay estudiante, volver (o mostrar error)
    if (!student) {
        return (
            <Container py="xl">
                <Alert color="red" title="Estudiante no encontrado">
                    <Button onClick={() => navigate('/students')}>Volver a la lista</Button>
                </Alert>
            </Container>
        );
    }

    const progressValue = (completedPrograms.length / sessionPrograms.length) * 100;

    const handleStartProgram = (program: Program) => {
        setActiveProgram(program);
        openDataCollection();
    };

    const handleFinishSession = () => {
        if (window.confirm('¿Estás seguro de finalizar la sesión? Se guardarán todos los registros.')) {
            notifications.show({
                title: 'Sesión Finalizada',
                message: `Has completado ${completedPrograms.length} programas con ${student.fullName}.`,
                color: 'green'
            });
            navigate(`/students/${studentId}`);
        }
    };

    const handlePauseSession = () => {
        setSessionStatus(prev => prev === 'active' ? 'paused' : 'active');
        notifications.show({
            title: sessionStatus === 'active' ? 'Sesión Pausada' : 'Sesión Reanudada',
            message: sessionStatus === 'active' ? 'El tiempo se ha detenido.' : 'Seguimos registrando tiempo.',
            color: 'blue'
        });
    };

    // Callback cuando se cierra el motor de recolección (al guardar)
    const handleDataCollectionClose = () => {
        if (activeProgram && !completedPrograms.includes(activeProgram.id)) {
            // Marcar como completado si se guardaron datos (simulado aquí, en realidad DataCollectionEngine debería confirmar el guardado)
            // Por ahora asumimos que si cerró el modal después de guardar, se cuenta.
            // Para mejorar esto, DataCollectionEngine podría recibir un prop onComplete.
            setCompletedPrograms(prev => [...prev, activeProgram.id]);
        }
        setActiveProgram(null);
        closeDataCollection();
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--mantine-color-gray-0)' }}>
            {/* Top Bar Minimalista */}
            <Paper p="md" shadow="sm" radius={0} pos="sticky" top={0} style={{ zIndex: 100 }}>
                <Container size="xl">
                    <Group justify="space-between">
                        <Group>
                            <ActionIcon variant="subtle" color="gray" onClick={() => navigate(-1)}>
                                <ChevronLeft />
                            </ActionIcon>
                            <Avatar src={student.avatar} radius="xl" />
                            <div>
                                <Text fw={700} size="lg">{student.fullName}</Text>
                                <Group gap="xs">
                                    <Badge
                                        color={sessionStatus === 'active' ? 'green' : 'yellow'}
                                        variant="dot"
                                        size="xs"
                                    >
                                        {sessionStatus === 'active' ? 'En Curso' : 'Pausada'}
                                    </Badge>
                                    <Text size="xs" c="dimmed">
                                        <Clock size={12} style={{ display: 'inline', marginRight: 4 }} />
                                        00:45:00 {/* Timer simulado */}
                                    </Text>
                                </Group>
                            </div>
                        </Group>
                        <Group>
                            <Button
                                variant="light"
                                color={sessionStatus === 'active' ? 'yellow' : 'green'}
                                leftSection={sessionStatus === 'active' ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
                                onClick={handlePauseSession}
                            >
                                {sessionStatus === 'active' ? 'Pausar' : 'Reanudar'}
                            </Button>
                            <Button
                                color="red"
                                variant="outline"
                                leftSection={<LogOut size={16} />}
                                onClick={handleFinishSession}
                            >
                                Finalizar
                            </Button>
                        </Group>
                    </Group>
                </Container>
            </Paper>

            <Container size="xl" py="xl">
                <Stack gap="xl">
                    {/* Resumen de Progreso */}
                    <Card shadow="sm" radius="md" padding="lg">
                        <Text fw={600} mb="xs">Progreso de la Sesión</Text>
                        <Group justify="space-between" mb="xs">
                            <Text size="sm" c="dimmed">{completedPrograms.length} de {sessionPrograms.length} programas ejecutados</Text>
                            <Text fw={700} c="blue">{Math.round(progressValue)}%</Text>
                        </Group>
                        <Progress value={progressValue} size="xl" radius="xl" striped animated={sessionStatus === 'active'} />
                    </Card>

                    {/* Grid de Programas */}
                    <Title order={3}>Programas para Hoy</Title>
                    {sessionPrograms.length === 0 ? (
                        <Alert icon={<CheckCircle2 />} color="green" title="¡Todo listo!">
                            No hay programas pendientes para esta sesión.
                        </Alert>
                    ) : (
                        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
                            {sessionPrograms.map((program) => {
                                const isCompleted = completedPrograms.includes(program.id);
                                const isBehavior = program.category === 'behavior-management';

                                return (
                                    <Card
                                        key={program.id}
                                        shadow={isCompleted ? 'xs' : 'sm'}
                                        padding="lg"
                                        radius="md"
                                        withBorder
                                        style={{
                                            opacity: isCompleted ? 0.7 : 1,
                                            borderColor: isCompleted ? 'var(--mantine-color-green-3)' : undefined,
                                            backgroundColor: isCompleted ? 'var(--mantine-color-green-0)' : undefined
                                        }}
                                    >
                                        <Group justify="space-between" align="flex-start" mb="md">
                                            <ThemeIcon
                                                size="lg"
                                                variant="light"
                                                color={isBehavior ? 'red' : 'blue'}
                                                radius="md"
                                            >
                                                {isBehavior ? <AlertTriangle size={20} /> : <Brain size={20} />}
                                            </ThemeIcon>
                                            {isCompleted && <CheckCircle2 color="var(--mantine-color-green-6)" />}
                                        </Group>

                                        <Text fw={600} size="lg" lineClamp={2} mb="xs" h={56}>
                                            {program.name}
                                        </Text>

                                        <Group gap="xs" mb="lg">
                                            <Badge variant="outline" color={isBehavior ? 'red' : 'blue'} size="sm">
                                                {isBehavior ? 'Conducta' : 'Habilidad'}
                                            </Badge>
                                            <Badge variant="dot" color="gray" size="sm">
                                                10 Ensayos
                                            </Badge>
                                        </Group>

                                        <Button
                                            fullWidth
                                            variant={isCompleted ? 'outline' : 'filled'}
                                            color={isCompleted ? 'green' : 'blue'}
                                            onClick={() => handleStartProgram(program)}
                                            leftSection={isCompleted ? <CheckCircle2 size={16} /> : <PlayCircle size={16} />}
                                        >
                                            {isCompleted ? 'Repetir Registro' : 'Iniciar'}
                                        </Button>
                                    </Card>
                                );
                            })}
                        </SimpleGrid>
                    )}
                </Stack>
            </Container>

            {/* Modal de Recolección de Datos */}
            {activeProgram && (
                <DataCollectionEngine
                    programId={activeProgram.id}
                    programName={activeProgram.name}
                    opened={dataCollectionOpen}
                    onClose={handleDataCollectionClose}
                // TODO: Pasar defaultDimension según configuración del programa
                />
            )}
        </div>
    );
}

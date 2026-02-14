import { useState, useEffect, useRef } from 'react';
import {
    Stack,
    Group,
    Button,
    Text,
    Paper,
    // Title, // Removed unused
    ActionIcon,
    Badge,
    RingProgress
} from '@mantine/core';
import { Plus, Minus, Play, Square, Check } from 'lucide-react';

interface FrequencyRecorderProps {
    programName: string;
    onSave: (data: { count: number; duration: number; rate: number; events: Array<{ id: string; timestamp: string }> }) => void;
    onCancel: () => void;
}

export function FrequencyRecorder({ programName, onSave, onCancel }: FrequencyRecorderProps) {
    const [count, setCount] = useState(0);
    const [events, setEvents] = useState<Array<{ id: string; timestamp: string }>>([]);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (isTimerRunning) {
            timerRef.current = setInterval(() => {
                setElapsedTime((prev) => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [isTimerRunning]);

    const handleIncrement = () => {
        const newEvent = {
            id: `event-${Date.now()}`,
            timestamp: new Date().toISOString(),
        };
        setCount(count + 1);
        setEvents([...events, newEvent]);
    };

    const handleDecrement = () => {
        if (count > 0) {
            setCount(count - 1);
            setEvents(events.slice(0, -1));
        }
    };

    const toggleTimer = () => {
        setIsTimerRunning(!isTimerRunning);
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const calculateRate = (): number => {
        if (elapsedTime === 0) return 0;
        return Math.round((count / elapsedTime) * 60 * 10) / 10; // events per minute
    };

    const handleSave = () => {
        onSave({
            count,
            duration: elapsedTime,
            rate: calculateRate(),
            events,
        });
    };

    return (
        <Stack gap="lg">
            {/* Header */}
            <Paper p="md" radius="md" withBorder>
                <Group justify="space-between">
                    <div>
                        <Text fw={600} size="lg">{programName}</Text>
                        <Text size="sm" c="dimmed">Registro por Frecuencia</Text>
                    </div>
                    <Group gap="md">
                        <Badge size="lg" variant="filled" color="blue">
                            {count} eventos
                        </Badge>
                        {elapsedTime > 0 && (
                            <Badge size="lg" variant="light" color="violet">
                                Tasa: {calculateRate()}/min
                            </Badge>
                        )}
                    </Group>
                </Group>
            </Paper>

            {/* Instructions */}
            <Paper p="md" radius="md" bg="blue.0">
                <Text size="sm" fw={500}>
                    Instrucciones: Presiona el botón grande cada vez que ocurra la conducta. Opcionalmente, usa el cronómetro para calcular la tasa.
                </Text>
            </Paper>

            {/* Main Counter */}
            <Paper p="xl" radius="md" withBorder style={{ textAlign: 'center' }}>
                <Stack gap="xl" align="center">
                    {/* Ring Progress with Count */}
                    <RingProgress
                        size={280}
                        thickness={24}
                        sections={[{ value: 100, color: 'blue' }]}
                        label={
                            <div style={{ textAlign: 'center' }}>
                                <Text size="80px" fw={900} c="blue">
                                    {count}
                                </Text>
                                <Text size="lg" c="dimmed" mt="-md">
                                    eventos
                                </Text>
                            </div>
                        }
                    />

                    {/* Increment/Decrement Buttons */}
                    <Group gap="xl">
                        <ActionIcon
                            size={80}
                            radius="xl"
                            variant="filled"
                            color="red"
                            onClick={handleDecrement}
                            disabled={count === 0}
                        >
                            <Minus size={40} />
                        </ActionIcon>

                        <Button
                            size="xl"
                            h={120}
                            w={120}
                            radius="xl"
                            variant="filled"
                            color="blue"
                            onClick={handleIncrement}
                            style={{
                                fontSize: '24px',
                                fontWeight: 700,
                                boxShadow: '0 8px 16px rgba(37, 99, 235, 0.3)',
                            }}
                        >
                            <Plus size={48} />
                        </Button>

                        <ActionIcon
                            size={80}
                            radius="xl"
                            variant="filled"
                            color="gray"
                            onClick={handleDecrement}
                            disabled={count === 0}
                            style={{ visibility: 'hidden' }}
                        >
                            <Minus size={40} />
                        </ActionIcon>
                    </Group>
                </Stack>
            </Paper>

            {/* Timer Section */}
            <Paper p="lg" radius="md" withBorder>
                <Stack gap="md">
                    <Group justify="space-between">
                        <Text fw={600}>Cronómetro (Opcional)</Text>
                        <Text size="xl" fw={700} c={isTimerRunning ? 'blue' : 'dimmed'}>
                            {formatTime(elapsedTime)}
                        </Text>
                    </Group>

                    <Group justify="center">
                        <Button
                            size="lg"
                            variant={isTimerRunning ? 'filled' : 'light'}
                            color={isTimerRunning ? 'red' : 'green'}
                            leftSection={isTimerRunning ? <Square size={20} /> : <Play size={20} />}
                            onClick={toggleTimer}
                        >
                            {isTimerRunning ? 'Detener' : 'Iniciar'} Cronómetro
                        </Button>
                    </Group>

                    {elapsedTime > 0 && (
                        <Text size="sm" ta="center" c="dimmed">
                            Tasa calculada: {calculateRate()} eventos por minuto
                        </Text>
                    )}
                </Stack>
            </Paper>

            {/* Action Buttons */}
            <Group justify="flex-end" mt="xl">
                <Button variant="subtle" onClick={onCancel}>
                    Cancelar
                </Button>
                <Button
                    size="lg"
                    leftSection={<Check size={20} />}
                    onClick={handleSave}
                >
                    Finalizar y Guardar
                </Button>
            </Group>
        </Stack>
    );
}

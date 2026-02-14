import { useState, useEffect, useRef } from 'react';
import {
    Stack,
    Group,
    Button,
    Text,
    Paper,
    Title,
    NumberInput,
    Select,
    RingProgress,
    Badge,
    SimpleGrid
} from '@mantine/core';
import { Play, Check, X } from 'lucide-react';
import { type IntervalType, type IntervalData } from '@/api/dataCollectionTypes';

interface IntervalRecorderProps {
    programName: string;
    onSave: (data: { intervals: IntervalData[]; percentageOccurrence: number }) => void;
    onCancel: () => void;
}

export function IntervalRecorder({ programName, onSave, onCancel }: IntervalRecorderProps) {
    const [configured, setConfigured] = useState(false);
    const [intervalType, setIntervalType] = useState<IntervalType>('whole');
    const [numberOfIntervals, setNumberOfIntervals] = useState(10);
    const [intervalDuration, setIntervalDuration] = useState(30);
    const [intervals, setIntervals] = useState<IntervalData[]>([]);
    const [currentInterval, setCurrentInterval] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (isRunning && timeRemaining > 0) {
            timerRef.current = setInterval(() => {
                setTimeRemaining((prev) => {
                    if (prev <= 1) {
                        // Auto-advance to next interval
                        if (currentInterval < numberOfIntervals - 1) {
                            setCurrentInterval(currentInterval + 1);
                            return intervalDuration;
                        } else {
                            setIsRunning(false);
                            return 0;
                        }
                    }
                    return prev - 1;
                });
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
    }, [isRunning, timeRemaining, currentInterval, numberOfIntervals, intervalDuration]);

    const handleConfigure = () => {
        const initialIntervals: IntervalData[] = Array.from({ length: numberOfIntervals }, (_, index) => ({
            intervalNumber: index + 1,
            occurred: null,
            timestamp: new Date().toISOString(),
        }));
        setIntervals(initialIntervals);
        setTimeRemaining(intervalDuration);
        setConfigured(true);
    };

    const handleStart = () => {
        setIsRunning(true);
    };

    const recordOccurrence = (occurred: boolean) => {
        const updatedIntervals = [...intervals];
        updatedIntervals[currentInterval] = {
            ...updatedIntervals[currentInterval],
            occurred,
            timestamp: new Date().toISOString(),
            timeRemaining,
        };
        setIntervals(updatedIntervals);
    };

    const calculatePercentage = (): number => {
        const recorded = intervals.filter((i) => i.occurred !== null).length;
        const occurred = intervals.filter((i) => i.occurred === true).length;
        return recorded > 0 ? Math.round((occurred / recorded) * 100) : 0;
    };



    const handleSave = () => {
        onSave({
            intervals,
            percentageOccurrence: calculatePercentage(),
        });
    };

    if (!configured) {
        return (
            <Paper p="xl" radius="md" withBorder>
                <Stack gap="lg" align="center">
                    <Title order={3}>Configurar Registro por Intervalos</Title>
                    <Text c="dimmed">Programa: {programName}</Text>

                    <Select
                        label="Tipo de Intervalo"
                        description="Selecciona el método de registro"
                        value={intervalType}
                        onChange={(value) => setIntervalType(value as IntervalType)}
                        data={[
                            { value: 'whole', label: 'Intervalo Total (conducta durante todo el intervalo)' },
                            { value: 'partial', label: 'Intervalo Parcial (conducta en cualquier momento)' },
                            { value: 'momentary', label: 'Muestreo Momentáneo (conducta al final del intervalo)' },
                        ]}
                        size="md"
                        style={{ width: '100%', maxWidth: '600px' }}
                    />

                    <Group grow style={{ width: '100%', maxWidth: '600px' }}>
                        <NumberInput
                            label="Número de Intervalos"
                            value={numberOfIntervals}
                            onChange={(value) => setNumberOfIntervals(Number(value) || 10)}
                            min={5}
                            max={30}
                            size="md"
                        />
                        <NumberInput
                            label="Duración por Intervalo (segundos)"
                            value={intervalDuration}
                            onChange={(value) => setIntervalDuration(Number(value) || 30)}
                            min={10}
                            max={120}
                            size="md"
                        />
                    </Group>

                    <Group mt="lg">
                        <Button variant="subtle" onClick={onCancel}>
                            Cancelar
                        </Button>
                        <Button size="lg" onClick={handleConfigure}>
                            Iniciar Registro
                        </Button>
                    </Group>
                </Stack>
            </Paper>
        );
    }

    const percentage = calculatePercentage();

    return (
        <Stack gap="lg">
            {/* Header with Stats */}
            <Paper p="md" radius="md" withBorder>
                <Group justify="space-between">
                    <div>
                        <Text fw={600} size="lg">{programName}</Text>
                        <Text size="sm" c="dimmed">
                            Registro por Intervalos - {intervalType === 'whole' ? 'Total' : intervalType === 'partial' ? 'Parcial' : 'Momentáneo'}
                        </Text>
                    </div>
                    <Group gap="md">
                        <Badge size="lg" variant="filled" color="blue">
                            {percentage}% Ocurrencia
                        </Badge>
                        <Badge size="lg" variant="light">
                            Intervalo {currentInterval + 1}/{numberOfIntervals}
                        </Badge>
                    </Group>
                </Group>
            </Paper>

            {/* Current Interval Timer */}
            <Paper p="xl" radius="md" withBorder style={{ textAlign: 'center' }}>
                <Stack gap="lg" align="center">
                    <Text fw={600} size="xl">
                        Intervalo {currentInterval + 1}
                    </Text>

                    <RingProgress
                        size={220}
                        thickness={20}
                        sections={[
                            {
                                value: (timeRemaining / intervalDuration) * 100,
                                color: isRunning ? 'blue' : 'gray',
                            },
                        ]}
                        label={
                            <div style={{ textAlign: 'center' }}>
                                <Text size="60px" fw={900} c={isRunning ? 'blue' : 'gray'}>
                                    {timeRemaining}
                                </Text>
                                <Text size="md" c="dimmed">
                                    segundos
                                </Text>
                            </div>
                        }
                    />

                    {!isRunning && currentInterval === 0 && (
                        <Button size="xl" leftSection={<Play size={24} />} onClick={handleStart}>
                            Iniciar Cronómetro
                        </Button>
                    )}

                    {isRunning && (
                        <Group gap="xl">
                            <Button
                                size="xl"
                                h={80}
                                w={150}
                                variant="filled"
                                color="green"
                                onClick={() => recordOccurrence(true)}
                                leftSection={<Check size={32} />}
                            >
                                Ocurrió
                            </Button>
                            <Button
                                size="xl"
                                h={80}
                                w={150}
                                variant="filled"
                                color="red"
                                onClick={() => recordOccurrence(false)}
                                leftSection={<X size={32} />}
                            >
                                No Ocurrió
                            </Button>
                        </Group>
                    )}
                </Stack>
            </Paper>

            {/* Intervals Grid */}
            <Paper p="lg" radius="md" withBorder>
                <Text fw={600} mb="md">
                    Registro de Intervalos
                </Text>
                <SimpleGrid cols={{ base: 5, sm: 10 }} spacing="xs">
                    {intervals.map((interval, index) => (
                        <Paper
                            key={index}
                            p="sm"
                            radius="md"
                            withBorder
                            bg={
                                interval.occurred === true
                                    ? 'green.1'
                                    : interval.occurred === false
                                        ? 'red.1'
                                        : index === currentInterval
                                            ? 'blue.1'
                                            : 'gray.0'
                            }
                            style={{
                                textAlign: 'center',
                                border: index === currentInterval ? '2px solid var(--mantine-color-blue-6)' : undefined,
                            }}
                        >
                            <Text size="xs" fw={600}>
                                {interval.intervalNumber}
                            </Text>
                            <Text size="lg" fw={700}>
                                {interval.occurred === true ? '✓' : interval.occurred === false ? '✗' : '-'}
                            </Text>
                        </Paper>
                    ))}
                </SimpleGrid>
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
                    disabled={intervals.some((i) => i.occurred === null)}
                >
                    Finalizar y Guardar
                </Button>
            </Group>
        </Stack>
    );
}

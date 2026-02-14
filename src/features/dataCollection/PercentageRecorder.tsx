import { useState } from 'react';
import {
    Stack,
    Group,
    Button,
    SimpleGrid,
    Text,
    Badge,
    Menu,
    Paper,
    Title,
    NumberInput,
    Select
} from '@mantine/core';
import { Check, ArrowLeft } from 'lucide-react';
import {
    type Trial,
    type TrialResponse,
    type PromptLevel,
    type Phase,
    getResponseLabel,
    getResponseColor,
    getPromptLevelLabel,
    getPhaseLabel,
    getPhaseColor
} from '@/api/dataCollectionTypes';

interface PercentageRecorderProps {
    programName: string;
    onSave: (trials: Trial[]) => void;
    onCancel: () => void;
}

export function PercentageRecorder({ programName, onSave, onCancel }: PercentageRecorderProps) {
    const [numberOfTrials, setNumberOfTrials] = useState(10);
    const [phase, setPhase] = useState<Phase>('treatment');
    const [trials, setTrials] = useState<Trial[]>([]);
    const [configured, setConfigured] = useState(false);

    const handleConfigure = () => {
        const initialTrials: Trial[] = Array.from({ length: numberOfTrials }, (_, index) => ({
            id: `trial-${index + 1}`,
            number: index + 1,
            response: 'no-response',
            timestamp: new Date().toISOString(),
        }));
        setTrials(initialTrials);
        setConfigured(true);
    };

    const cycleResponse = (trialId: string) => {
        const responseOrder: TrialResponse[] = ['no-response', 'independent', 'prompted', 'error'];

        setTrials(
            trials.map((trial) => {
                if (trial.id === trialId) {
                    const currentIndex = responseOrder.indexOf(trial.response);
                    const nextIndex = (currentIndex + 1) % responseOrder.length;
                    const nextResponse = responseOrder[nextIndex];

                    return {
                        ...trial,
                        response: nextResponse,
                        timestamp: new Date().toISOString(),
                        // Clear prompt level if not prompted
                        promptLevel: nextResponse === 'prompted' ? trial.promptLevel : undefined,
                    };
                }
                return trial;
            })
        );
    };

    const setPromptLevel = (trialId: string, level: PromptLevel) => {
        setTrials(
            trials.map((trial) =>
                trial.id === trialId ? { ...trial, promptLevel: level, timestamp: new Date().toISOString() } : trial
            )
        );
    };

    const calculateStats = () => {
        const independent = trials.filter((t) => t.response === 'independent').length;
        const prompted = trials.filter((t) => t.response === 'prompted').length;
        const error = trials.filter((t) => t.response === 'error').length;
        const noResponse = trials.filter((t) => t.response === 'no-response').length;
        const percentageCorrect = trials.length > 0 ? Math.round((independent / trials.length) * 100) : 0;

        return { independent, prompted, error, noResponse, percentageCorrect };
    };

    const handleSave = () => {
        onSave(trials);
    };

    if (!configured) {
        return (
            <Paper p="xl" radius="md" withBorder>
                <Stack gap="lg" align="center">
                    <Title order={3}>Configurar Registro por Porcentaje</Title>
                    <Text c="dimmed">Programa: {programName}</Text>

                    <Select
                        label="Fase del Programa"
                        description="Selecciona la fase actual del programa"
                        value={phase}
                        onChange={(value) => setPhase(value as Phase)}
                        data={[
                            { value: 'baseline', label: getPhaseLabel('baseline') },
                            { value: 'treatment', label: getPhaseLabel('treatment') },
                            { value: 'generalization', label: getPhaseLabel('generalization') },
                            { value: 'maintenance', label: getPhaseLabel('maintenance') },
                        ]}
                        size="lg"
                        style={{ width: '300px' }}
                    />

                    <NumberInput
                        label="Número de Ensayos"
                        description="Entre 3 y 10 ensayos por sesión (recomendado ABA)"
                        value={numberOfTrials}
                        onChange={(value) => setNumberOfTrials(Number(value) || 10)}
                        min={3}
                        max={10}
                        size="lg"
                        style={{ width: '300px' }}
                    />

                    <Group>
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

    const stats = calculateStats();

    return (
        <Stack gap="lg">
            {/* Header with Stats */}
            <Paper p="md" radius="md" withBorder>
                <Group justify="space-between">
                    <div>
                        <Text fw={600} size="lg">{programName}</Text>
                        <Group gap="xs">
                            <Text size="sm" c="dimmed">Registro por Porcentaje - {numberOfTrials} ensayos</Text>
                            <Badge size="sm" color={getPhaseColor(phase)} variant="light">
                                {getPhaseLabel(phase)}
                            </Badge>
                        </Group>
                    </div>
                    <Group gap="md">
                        <Badge size="lg" variant="filled" color="green">
                            {stats.percentageCorrect}% Correcto
                        </Badge>
                        <Badge size="lg" variant="light" color="blue">
                            I: {stats.independent}
                        </Badge>
                        <Badge size="lg" variant="light" color="yellow">
                            A: {stats.prompted}
                        </Badge>
                        <Badge size="lg" variant="light" color="red">
                            E: {stats.error}
                        </Badge>
                        <Badge size="lg" variant="light" color="gray">
                            NR: {stats.noResponse}
                        </Badge>
                    </Group>
                </Group>
            </Paper>

            {/* Instructions */}
            <Paper p="md" radius="md" bg="blue.0">
                <Text size="sm" fw={500}>
                    Instrucciones: Haz clic en cada ensayo para registrar la respuesta. Los botones ciclan entre: NR → I → A → E
                </Text>
                <Text size="xs" c="dimmed" mt="xs">
                    NR = No Responde | I = Independiente | A = Ayuda | E = Error
                </Text>
            </Paper>

            {/* Trials Grid */}
            <SimpleGrid cols={{ base: 3, sm: 4, md: 5, lg: 6 }} spacing="md">
                {trials.map((trial) => (
                    <div key={trial.id}>
                        <Menu shadow="md" width={280} disabled={trial.response !== 'prompted'}>
                            <Menu.Target>
                                <Button
                                    size="xl"
                                    h={80}
                                    variant="filled"
                                    color={getResponseColor(trial.response)}
                                    onClick={() => cycleResponse(trial.id)}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '4px',
                                    }}
                                >
                                    <Text size="xs" fw={400}>
                                        Ensayo {trial.number}
                                    </Text>
                                    <Text size="xl" fw={700}>
                                        {getResponseLabel(trial.response)}
                                    </Text>
                                    {trial.promptLevel && (
                                        <Badge size="xs" variant="white" color="dark">
                                            {trial.promptLevel.toUpperCase()}
                                        </Badge>
                                    )}
                                </Button>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Label>Nivel de Ayuda en la Respuesta</Menu.Label>
                                <Menu.Item onClick={() => setPromptLevel(trial.id, 'full-physical')}>
                                    {getPromptLevelLabel('full-physical')}
                                </Menu.Item>
                                <Menu.Item onClick={() => setPromptLevel(trial.id, 'partial-physical')}>
                                    {getPromptLevelLabel('partial-physical')}
                                </Menu.Item>
                                <Menu.Item onClick={() => setPromptLevel(trial.id, 'gestural')}>
                                    {getPromptLevelLabel('gestural')}
                                </Menu.Item>
                                <Menu.Item onClick={() => setPromptLevel(trial.id, 'shadow')}>
                                    {getPromptLevelLabel('shadow')}
                                </Menu.Item>
                                <Menu.Item onClick={() => setPromptLevel(trial.id, 'model')}>
                                    {getPromptLevelLabel('model')}
                                </Menu.Item>
                                <Menu.Divider />
                                <Menu.Label>Ayudas Verbales/Ecoicas</Menu.Label>
                                <Menu.Item onClick={() => setPromptLevel(trial.id, 'echoic-full')}>
                                    {getPromptLevelLabel('echoic-full')}
                                </Menu.Item>
                                <Menu.Item onClick={() => setPromptLevel(trial.id, 'echoic-partial')}>
                                    {getPromptLevelLabel('echoic-partial')}
                                </Menu.Item>
                                <Menu.Item onClick={() => setPromptLevel(trial.id, 'verbal-full')}>
                                    {getPromptLevelLabel('verbal-full')}
                                </Menu.Item>
                                <Menu.Item onClick={() => setPromptLevel(trial.id, 'verbal-partial')}>
                                    {getPromptLevelLabel('verbal-partial')}
                                </Menu.Item>
                                <Menu.Divider />
                                <Menu.Item onClick={() => setPromptLevel(trial.id, 'unspecified')}>
                                    {getPromptLevelLabel('unspecified')}
                                </Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                        {trial.response === 'prompted' && !trial.promptLevel && (
                            <Text size="xs" c="yellow" ta="center" mt={4}>
                                Selecciona nivel
                            </Text>
                        )}
                    </div>
                ))}
            </SimpleGrid>

            {/* Action Buttons */}
            <Group justify="space-between" mt="xl">
                <Button
                    variant="subtle"
                    leftSection={<ArrowLeft size={18} />}
                    onClick={() => setConfigured(false)}
                >
                    Volver a Configurar
                </Button>
                <Group>
                    <Button
                        variant="outline"
                        onClick={onCancel}
                    >
                        Cancelar
                    </Button>
                    <Button
                        size="lg"
                        color="green"
                        leftSection={<Check size={20} />}
                        onClick={handleSave}
                        disabled={trials.some((t) => t.response === 'prompted' && !t.promptLevel)}
                    >
                        Finalizar y Guardar
                    </Button>
                </Group>
            </Group>
        </Stack>
    );
}

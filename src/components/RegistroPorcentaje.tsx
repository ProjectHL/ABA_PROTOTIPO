import { useState } from "react"
import { Check, X, HelpCircle, MinusCircle, Info } from "lucide-react"
import { Button, Card, Badge, Group, Stack, Text, Progress, ActionIcon } from '@mantine/core'
import { notifications } from '@mantine/notifications'

type Option = 'Independiente' | 'Ayuda' | 'Error' | 'No Responde' | null;

interface RegistroPorcentajeProps {
    numeroEnsayos?: number;
    programaNombre?: string;
    onFinalizar?: (porcentaje: number) => void;
}

export function RegistroPorcentaje({
    numeroEnsayos = 10,
    programaNombre = "Programa de Prueba",
    onFinalizar
}: RegistroPorcentajeProps) {
    const [ensayos, setEnsayos] = useState<Option[]>(new Array(numeroEnsayos).fill(null));

    const handleSelect = (index: number, option: Option) => {
        const newEnsayos = [...ensayos];
        newEnsayos[index] = option;
        setEnsayos(newEnsayos);
    }

    const calcularPorcentaje = () => {
        const completados = ensayos.filter(e => e !== null).length;
        if (completados < numeroEnsayos) {
            notifications.show({
                title: 'Ensayos incompletos',
                message: `Por favor completa todos los ensayos (${completados}/${numeroEnsayos})`,
                color: 'red',
            });
            return null;
        }

        const independientes = ensayos.filter(e => e === 'Independiente').length;
        const porcentaje = (independientes / numeroEnsayos) * 100;
        return porcentaje;
    }

    const finalizar = () => {
        const porcentaje = calcularPorcentaje();
        if (porcentaje !== null) {
            notifications.show({
                title: 'Registro finalizado',
                message: `${porcentaje.toFixed(1)}% de éxito`,
                color: 'green',
            });
            if (onFinalizar) onFinalizar(porcentaje);
        }
    }

    const getOptionColor = (option: Option): string => {
        switch (option) {
            case 'Independiente': return 'green';
            case 'Ayuda': return 'yellow';
            case 'Error': return 'red';
            case 'No Responde': return 'gray';
            default: return 'gray';
        }
    }

    const options: { label: Option; icon: React.ElementType }[] = [
        { label: 'Independiente', icon: Check },
        { label: 'Ayuda', icon: HelpCircle },
        { label: 'Error', icon: X },
        { label: 'No Responde', icon: MinusCircle },
    ];

    const progreso = (ensayos.filter(e => e !== null).length / numeroEnsayos) * 100;

    return (
        <Card shadow="xl" padding="lg" radius="md" withBorder>
            <Card.Section withBorder inheritPadding py="lg" bg="blue.0">
                <Group justify="space-between" wrap="nowrap">
                    <div>
                        <Badge color="blue" variant="light" mb="xs">Registro de Datos</Badge>
                        <Text fw={700} size="xl">{programaNombre}</Text>
                        <Text size="sm" c="dimmed">Selecciona una respuesta para cada ensayo realizado.</Text>
                    </div>
                    <Stack gap={4} align="center">
                        <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Progreso</Text>
                        <Text size="xl" fw={700}>{ensayos.filter(e => e !== null).length} / {numeroEnsayos}</Text>
                        <Progress value={progreso} size="sm" w={80} />
                    </Stack>
                </Group>
            </Card.Section>

            <Stack gap="xs" mt="md">
                {ensayos.map((seleccion, idx) => (
                    <Group key={idx} gap="md" wrap="nowrap" p="sm" style={{ borderRadius: '8px', backgroundColor: 'var(--mantine-color-gray-0)' }}>
                        <ActionIcon
                            size="lg"
                            radius="xl"
                            variant="filled"
                            color="blue"
                        >
                            {idx + 1}
                        </ActionIcon>

                        <Group gap="xs" style={{ flex: 1 }}>
                            {options.map((opt) => {
                                const Icon = opt.icon;
                                const isSelected = seleccion === opt.label;
                                return (
                                    <Button
                                        key={opt.label}
                                        variant={isSelected ? "filled" : "light"}
                                        color={getOptionColor(opt.label)}
                                        size="sm"
                                        leftSection={<Icon size={16} />}
                                        onClick={() => handleSelect(idx, opt.label)}
                                        style={{ flex: 1 }}
                                    >
                                        {opt.label}
                                    </Button>
                                );
                            })}
                        </Group>
                    </Group>
                ))}
            </Stack>

            <Card.Section withBorder inheritPadding py="md" mt="md" bg="gray.0">
                <Group justify="space-between">
                    <Group gap="xs">
                        <Info size={16} color="var(--mantine-color-blue-6)" />
                        <Text size="sm" c="dimmed">Se calcula considerando "Independiente" como éxito.</Text>
                    </Group>
                    <Group gap="sm">
                        <Button variant="subtle" onClick={() => setEnsayos(new Array(numeroEnsayos).fill(null))}>
                            Reiniciar
                        </Button>
                        <Button onClick={finalizar}>
                            Finalizar Registro
                        </Button>
                    </Group>
                </Group>
            </Card.Section>
        </Card>
    );
}

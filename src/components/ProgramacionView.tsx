import { Book, PlayCircle, BarChart3, MoreHorizontal } from "lucide-react"
import { Table, Badge, Avatar, Card, Group, Stack, Text, Tabs, Modal, ActionIcon } from '@mantine/core'
import { useState } from "react"
import { RegistroPorcentaje } from "./RegistroPorcentaje"

interface Program {
    id: string;
    name: string;
    status: 'Activo' | 'Logrado' | 'Pausa';
}

const skillPrograms: Program[] = [
    { id: '1', name: 'Contacto Visual', status: 'Activo' },
    { id: '2', name: 'Imitación Motora', status: 'Activo' },
    { id: '3', name: 'Seguimiento de Instrucciones Simple', status: 'Logrado' },
    { id: '4', name: 'Match a la muestra', status: 'Pausa' },
    { id: '5', name: 'Identificación de Colores', status: 'Activo' },
];

const behaviorPrograms: Program[] = [
    { id: 'b1', name: 'Agresión', status: 'Activo' },
    { id: 'b2', name: 'Auto-lesión', status: 'Activo' },
    { id: 'b3', name: 'Disrupción', status: 'Pausa' },
];

export function ProgramacionView() {
    const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
    const [filter, setFilter] = useState('todos')

    const filteredSkills = skillPrograms.filter(p =>
        filter === 'todos' || p.status.toLowerCase() === filter.toLowerCase()
    )

    const filteredBehaviors = behaviorPrograms.filter(p =>
        filter === 'todos' || p.status.toLowerCase() === filter.toLowerCase()
    )

    const getBadgeColor = (status: string) => {
        switch (status) {
            case 'Activo': return 'blue';
            case 'Logrado': return 'green';
            case 'Pausa': return 'yellow';
            default: return 'gray';
        }
    }

    return (
        <Stack gap="xl">
            {/* Student Header */}
            <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Group justify="space-between" wrap="wrap">
                    <Group>
                        <Avatar
                            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Santiago"
                            size="lg"
                            radius="xl"
                        />
                        <div>
                            <Text fw={700} size="xl">Santiago García</Text>
                            <Group gap="xs" mt={4}>
                                <Badge variant="outline" size="sm">ID: #45829</Badge>
                                <Text size="sm" c="dimmed">• Plan de Intervención 2024</Text>
                            </Group>
                        </div>
                    </Group>

                    <Tabs value={filter} onChange={(value) => setFilter(value || 'todos')}>
                        <Tabs.List>
                            <Tabs.Tab value="activos">Activos</Tabs.Tab>
                            <Tabs.Tab value="logrados">Logrados</Tabs.Tab>
                            <Tabs.Tab value="pausa">Pausa</Tabs.Tab>
                            <Tabs.Tab value="todos">Todos</Tabs.Tab>
                        </Tabs.List>
                    </Tabs>
                </Group>
            </Card>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '1.5rem' }}>
                {/* Skill Acquisition Table */}
                <Card shadow="md" padding={0} radius="md" withBorder>
                    <Card.Section withBorder inheritPadding py="md" bg="blue.0">
                        <Group justify="space-between">
                            <Group gap="sm">
                                <ActionIcon variant="light" color="blue" size="lg" radius="md">
                                    <Book size={18} />
                                </ActionIcon>
                                <Text fw={600} size="lg">Adquisición de Habilidades</Text>
                            </Group>
                            <ActionIcon variant="subtle" color="gray">
                                <MoreHorizontal size={18} />
                            </ActionIcon>
                        </Group>
                    </Card.Section>

                    <Table highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Programa</Table.Th>
                                <Table.Th style={{ textAlign: 'center' }}>Estado</Table.Th>
                                <Table.Th style={{ textAlign: 'right' }}>Acciones</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {filteredSkills.length > 0 ? (
                                filteredSkills.map((program) => (
                                    <Table.Tr key={program.id}>
                                        <Table.Td fw={500}>{program.name}</Table.Td>
                                        <Table.Td style={{ textAlign: 'center' }}>
                                            <Badge color={getBadgeColor(program.status)} variant="light">
                                                {program.status}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Group gap={4} justify="flex-end">
                                                <ActionIcon variant="subtle" color="blue" title="Diseño">
                                                    <Book size={16} />
                                                </ActionIcon>
                                                <ActionIcon
                                                    variant="subtle"
                                                    color="blue"
                                                    title="Registro"
                                                    onClick={() => setSelectedProgram(program)}
                                                >
                                                    <PlayCircle size={16} />
                                                </ActionIcon>
                                                <ActionIcon variant="subtle" color="green" title="Gráfico">
                                                    <BarChart3 size={16} />
                                                </ActionIcon>
                                            </Group>
                                        </Table.Td>
                                    </Table.Tr>
                                ))
                            ) : (
                                <Table.Tr>
                                    <Table.Td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>
                                        <Text c="dimmed" fs="italic">No se encontraron programas con este estado.</Text>
                                    </Table.Td>
                                </Table.Tr>
                            )}
                        </Table.Tbody>
                    </Table>
                </Card>

                {/* Behavior Management Table */}
                <Card shadow="md" padding={0} radius="md" withBorder>
                    <Card.Section withBorder inheritPadding py="md" bg="red.0">
                        <Group justify="space-between">
                            <Group gap="sm">
                                <ActionIcon variant="light" color="red" size="lg" radius="md">
                                    <PlayCircle size={18} />
                                </ActionIcon>
                                <Text fw={600} size="lg">Manejo de Conducta</Text>
                            </Group>
                            <ActionIcon variant="subtle" color="gray">
                                <MoreHorizontal size={18} />
                            </ActionIcon>
                        </Group>
                    </Card.Section>

                    <Table highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Programa</Table.Th>
                                <Table.Th style={{ textAlign: 'center' }}>Estado</Table.Th>
                                <Table.Th style={{ textAlign: 'right' }}>Acciones</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {filteredBehaviors.length > 0 ? (
                                filteredBehaviors.map((program) => (
                                    <Table.Tr key={program.id}>
                                        <Table.Td fw={500}>{program.name}</Table.Td>
                                        <Table.Td style={{ textAlign: 'center' }}>
                                            <Badge
                                                color={program.status === 'Activo' ? 'red' : getBadgeColor(program.status)}
                                                variant="light"
                                            >
                                                {program.status}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Group gap={4} justify="flex-end">
                                                <ActionIcon variant="subtle" color="blue" title="Diseño">
                                                    <Book size={16} />
                                                </ActionIcon>
                                                <ActionIcon
                                                    variant="subtle"
                                                    color="blue"
                                                    title="Registro"
                                                    onClick={() => setSelectedProgram(program)}
                                                >
                                                    <PlayCircle size={16} />
                                                </ActionIcon>
                                                <ActionIcon variant="subtle" color="green" title="Gráfico">
                                                    <BarChart3 size={16} />
                                                </ActionIcon>
                                            </Group>
                                        </Table.Td>
                                    </Table.Tr>
                                ))
                            ) : (
                                <Table.Tr>
                                    <Table.Td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>
                                        <Text c="dimmed" fs="italic">No se encontraron programas de conducta con este estado.</Text>
                                    </Table.Td>
                                </Table.Tr>
                            )}
                        </Table.Tbody>
                    </Table>
                </Card>
            </div>

            <Modal
                opened={!!selectedProgram}
                onClose={() => setSelectedProgram(null)}
                size="xl"
                title="Registro de Datos"
                centered
            >
                {selectedProgram && (
                    <RegistroPorcentaje
                        programaNombre={selectedProgram.name}
                        numeroEnsayos={10}
                        onFinalizar={() => setSelectedProgram(null)}
                    />
                )}
            </Modal>
        </Stack>
    );
}

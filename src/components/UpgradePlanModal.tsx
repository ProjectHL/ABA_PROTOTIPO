import { Modal, Text, Title, Button, Group, Stack, Card, Badge, List, ThemeIcon, Divider, SimpleGrid } from '@mantine/core';
import { Check, Sparkles, Building2, User } from 'lucide-react';

interface UpgradePlanModalProps {
    opened: boolean;
    onClose: () => void;
}

export function UpgradePlanModal({ opened, onClose }: UpgradePlanModalProps) {
    return (
        <Modal
            opened={opened}
            onClose={onClose}
            size="lg"
            padding="xl"
            title={
                <Group gap="xs">
                    <Sparkles size={20} color="#228be6" fill="#228be6" style={{ opacity: 0.2 }} />
                    <Title order={3}>Mejora tu Plan</Title>
                </Group>
            }
            centered
        >
            <Text c="dimmed" size="sm" mb="xl">
                Elige el plan que mejor se adapte a tus necesidades y escala tu práctica clínica.
            </Text>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                {/* Plan Profesional */}
                <Card withBorder padding="lg" radius="md" style={{ borderColor: 'var(--mantine-color-blue-6)', borderWidth: 2 }}>
                    <Stack gap="md" h="100%" justify="space-between">
                        <div>
                            <Group justify="space-between" align="start">
                                <Badge variant="light" color="blue" size="lg">PROFESIONAL</Badge>
                                <User size={20} color="var(--mantine-color-blue-6)" />
                            </Group>

                            <Group align="flex-end" gap={4} mt="md">
                                <Text size="xl" fw={700} style={{ fontSize: '2rem', lineHeight: 1 }}>$29</Text>
                                <Text size="sm" c="dimmed" mb={4}>/mes</Text>
                            </Group>
                            <Text size="xs" c="dimmed">por usuario</Text>

                            <Divider my="md" />

                            <List
                                spacing="xs"
                                size="sm"
                                center
                                icon={
                                    <ThemeIcon color="blue" size={20} radius="xl">
                                        <Check size={12} />
                                    </ThemeIcon>
                                }
                            >
                                <List.Item>Estudiantes ilimitados</List.Item>
                                <List.Item>Programas de adquisición y conducta</List.Item>
                                <List.Item>Recolección de datos en app móvil</List.Item>
                                <List.Item>Repositorio de gráficos básicos</List.Item>
                            </List>
                        </div>

                        <Button fullWidth mt="md">
                            Seleccionar Profesional
                        </Button>
                    </Stack>
                </Card>

                {/* Plan Clínica */}
                <Card withBorder padding="lg" radius="md" style={{ background: 'var(--mantine-color-gray-0)' }}>
                    <Stack gap="md" h="100%" justify="space-between">
                        <div>
                            <Group justify="space-between" align="start">
                                <Badge variant="filled" color="violet" size="lg">CLÍNICA</Badge>
                                <Building2 size={20} color="var(--mantine-color-violet-6)" />
                            </Group>

                            <Group align="flex-end" gap={4} mt="md">
                                <Text size="xl" fw={700} style={{ fontSize: '2rem', lineHeight: 1 }}>$99</Text>
                                <Text size="sm" c="dimmed" mb={4}>/mes</Text>
                            </Group>
                            <Text size="xs" c="dimmed">incluye 5 usuarios</Text>

                            <Divider my="md" />

                            <List
                                spacing="xs"
                                size="sm"
                                center
                                icon={
                                    <ThemeIcon color="violet" size={20} radius="xl">
                                        <Check size={12} />
                                    </ThemeIcon>
                                }
                            >
                                <List.Item>Todo lo de Profesional</List.Item>
                                <List.Item>Panel de Administración y Roles</List.Item>
                                <List.Item>Reportes Avanzados e IA</List.Item>
                                <List.Item>Soporte Prioritario 24/7</List.Item>
                                <List.Item>API para integraciones</List.Item>
                            </List>
                        </div>

                        <Button fullWidth mt="md" variant="outline" color="violet">
                            Contactar Ventas
                        </Button>
                    </Stack>
                </Card>
            </SimpleGrid>

            <Text size="xs" c="dimmed" ta="center" mt="xl">
                ¿Necesitas un plan personalizado para una institución grande? <Text span c="blue" td="underline" style={{ cursor: 'pointer' }}>Contáctanos</Text>
            </Text>
        </Modal>
    );
}

import { Card, Text, Title, Group, ThemeIcon, Stack, Button } from '@mantine/core';
import { Sparkles } from 'lucide-react';
import { type UserProfile } from '@/api/mockData';

interface WelcomeCardProps {
    supervisor: UserProfile;
}

export function WelcomeCard({ supervisor }: WelcomeCardProps) {
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Buenos días';
        if (hour < 19) return 'Buenas tardes';
        return 'Buenas noches';
    };

    return (
        <Card
            padding="lg"
            radius="md"
            withBorder
            style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
            }}
        >
            <Stack gap="md">
                <Group>
                    <ThemeIcon size={60} radius="md" variant="white" color="violet">
                        <Sparkles size={32} />
                    </ThemeIcon>
                    <div>
                        <Text size="sm" opacity={0.9} fw={500}>
                            {getGreeting()},
                        </Text>
                        <Title order={2} c="white">
                            {supervisor.name}
                        </Title>
                    </div>
                </Group>

                <Text size="md" opacity={0.95}>
                    Bienvenido al Sistema de Supervisión Clínica ABA. Aquí podrás monitorear el progreso de tus
                    estudiantes, gestionar programas y supervisar las sesiones activas de tu equipo.
                </Text>

                <Group justify="space-between" align="flex-end">
                    <Group gap="xs">
                        <Text size="sm" opacity={0.9} fw={600}>
                            {supervisor.profession}
                        </Text>
                        <Text size="sm" opacity={0.7}>
                            •
                        </Text>
                        <Text size="sm" opacity={0.9}>
                            {supervisor.title}
                        </Text>
                    </Group>
                    <Button
                        variant="white"
                        color="violet"
                        size="xs"
                        compact
                        onClick={() => alert("Modo Aplicador activado (Simulación)")}
                    >
                        Modo Aplicador
                    </Button>
                </Group>
            </Stack>
        </Card>
    );
}

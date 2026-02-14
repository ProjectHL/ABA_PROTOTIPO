import { Container, Title, Text, Button, Group, Box } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <Container style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center'
        }}>
            <Box style={{
                fontSize: '120px',
                fontWeight: 900,
                color: 'var(--mantine-color-gray-3)',
                lineHeight: 1
            }}>
                404
            </Box>
            <Title order={1} mt="xl">Página no encontrada</Title>
            <Text c="dimmed" size="lg" mt="md" maw={500}>
                Lo sentimos, no pudimos encontrar la página que buscas. Puede que haya sido movida o eliminada.
            </Text>
            <Group mt="xl">
                <Button variant="default" leftSection={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
                    Volver atrás
                </Button>
                <Button leftSection={<Home size={16} />} onClick={() => navigate('/dashboard')}>
                    Ir al Inicio
                </Button>
            </Group>
        </Container>
    );
}

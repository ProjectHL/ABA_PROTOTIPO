import { Anchor, Button, Container, Text, Group, Stack, Badge, Paper } from '@mantine/core'
import { Rocket, Shield, Zap, ArrowRight, Layers } from "lucide-react"
import { useNavigate } from '@/lib/navigation'

export default function LandingPage() {
    const navigate = useNavigate();

    const features = [
        {
            id: 'speed',
            icon: <Zap size={24} color="var(--mantine-color-yellow-6)" />,
            title: "Registro estructurado",
            desc: "Las fichas, programas y sesiones conservan datos originales; un mensaje visual no reemplaza una confirmación persistida."
        },
        {
            id: 'security',
            icon: <Shield size={24} color="var(--mantine-color-blue-6)" />,
            title: "Acceso controlado",
            desc: "La clínica activa y los permisos por recurso delimitan los datos y acciones de cada identidad."
        },
        {
            id: 'design',
            icon: <Layers size={24} color="var(--mantine-color-violet-6)" />,
            title: "Soporte local",
            desc: "Las consultas se gestionan mediante tickets locales. No se ofrece IA ni atención humana 24/7."
        }
    ];

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--mantine-color-gray-0)' }}>
            {/* Background elements */}
            <div style={{
                position: 'fixed',
                inset: 0,
                overflow: 'hidden',
                zIndex: -1,
                pointerEvents: 'none'
            }}>
                <div style={{
                    position: 'absolute',
                    top: '-10%',
                    left: '-10%',
                    width: '40%',
                    height: '40%',
                    borderRadius: '50%',
                    backgroundColor: 'var(--mantine-color-blue-1)',
                    filter: 'blur(120px)',
                    opacity: 0.5
                }} />
                <div style={{
                    position: 'absolute',
                    bottom: '10%',
                    right: '0%',
                    width: '30%',
                    height: '30%',
                    borderRadius: '50%',
                    backgroundColor: 'var(--mantine-color-violet-1)',
                    filter: 'blur(100px)',
                    opacity: 0.3
                }} />
            </div>

            {/* Navigation */}
            <Paper shadow="xs" style={{
                position: 'sticky',
                top: 0,
                zIndex: 50,
                borderBottom: '1px solid var(--mantine-color-gray-2)',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)'
            }}>
                <Container size="xl">
                    <Group justify="space-between" py="md">
                        <Group gap="xs" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '12px',
                                backgroundColor: 'var(--mantine-color-blue-6)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                            }}>
                                <Rocket color="white" size={24} />
                            </div>
                            <Text size="xl" fw={700}>
                                ABA <span style={{ color: 'var(--mantine-color-blue-6)' }}>PROTOTIPO</span>
                            </Text>
                        </Group>
                        <Group gap="xl" visibleFrom="md">
                            <Anchor size="sm" fw={500} href="#caracteristicas">Características</Anchor>
                            <Anchor size="sm" fw={500} href="#entorno-local">Entorno local</Anchor>
                            <Button variant="outline" radius="xl" onClick={() => navigate('/login')}>
                                Ingresar
                            </Button>
                        </Group>
                    </Group>
                </Container>
            </Paper>

            {/* Hero Section */}
            <Container size="xl" py={80}>
                <Stack align="center" gap="xl" style={{ textAlign: 'center', maxWidth: '900px', margin: '0 auto' }}>
                    <Badge
                        variant="light"
                        color="blue"
                        size="lg"
                        leftSection={<span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--mantine-color-blue-6)',
                            display: 'inline-block',
                            marginRight: '8px'
                        }} />}
                    >
                        ENTORNO LOCAL PARA EVALUACIÓN
                    </Badge>

                    <Text
                        size="60px"
                        fw={900}
                        style={{
                            lineHeight: 1.1,
                            background: 'linear-gradient(to bottom right, var(--mantine-color-dark-9), var(--mantine-color-gray-6))',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}
                    >
                        Herramientas ABA para la <br />
                        <span style={{ color: 'var(--mantine-color-blue-6)' }}>práctica clínica organizada</span>
                    </Text>

                    <Text size="xl" c="dimmed" maw={700}>
                        Agenda, fichas, programas y registros en un entorno local con datos sintéticos. Las funciones disponibles se confirman dentro de la aplicación.
                    </Text>

                    <Group gap="md" pt="md">
                        <Button
                            size="lg"
                            radius="xl"
                            rightSection={<ArrowRight size={20} />}
                            onClick={() => navigate('/login')}
                        >
                            Ingresar al entorno
                        </Button>
                        <Button
                            size="lg"
                            radius="xl"
                            variant="default"
                            rightSection={<ArrowRight size={20} />}
                            onClick={() => navigate('/contact')}
                        >
                            Contactar soporte
                        </Button>
                        <Button size="lg" radius="xl" variant="subtle" onClick={() => navigate('/contact')}>
                            Consulta comercial
                        </Button>
                        <Button component="a" href="#caracteristicas" size="lg" radius="xl" variant="subtle">Conocer más</Button>
                    </Group>
                </Stack>

                {/* Features Grid */}
                <div id="caracteristicas" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '2rem',
                    marginTop: '8rem',
                    scrollMarginTop: '100px'
                }}>
                    {features.map((feature) => (
                        <Paper
                            key={feature.id}
                            shadow="sm"
                            p="xl"
                            radius="xl"
                            withBorder
                        >
                            <div style={{
                                padding: '12px',
                                width: 'fit-content',
                                borderRadius: '16px',
                                backgroundColor: 'var(--mantine-color-blue-0)',
                                marginBottom: '1.5rem',
                                border: '1px solid var(--mantine-color-blue-2)'
                            }}>
                                {feature.icon}
                            </div>
                            <Text size="xl" fw={700} mb="sm">{feature.title}</Text>
                            <Text c="dimmed">{feature.desc}</Text>
                        </Paper>
                    ))}
                </div>

                {/* Tech Stack Callout */}
                <Paper
                    id="entorno-local"
                    shadow="xl"
                    p={60}
                    radius="xl"
                    mt={120}
                    style={{
                        backgroundColor: 'var(--mantine-color-dark-9)',
                        scrollMarginTop: '100px',
                        color: 'white',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: '50%',
                        height: '100%',
                        background: 'radial-gradient(circle, rgba(37, 99, 235, 0.2) 0%, transparent 70%)',
                        filter: 'blur(80px)',
                        zIndex: 0
                    }} />
                    <Group justify="space-between" align="center" style={{ position: 'relative', zIndex: 1 }} wrap="wrap">
                        <div style={{ maxWidth: '500px' }}>
                            <Text size="32px" fw={700} mb="md">Entorno local de evaluación ABA.</Text>
                            <Text c="gray.5" fs="italic">
                                "Los tickets locales y las solicitudes comerciales no prometen atención inmediata, IA ni soporte humano 24/7."
                            </Text>
                        </div>
                        <Group gap="md">
                            <Paper p="lg" radius="lg" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <Text size="28px" fw={700} ta="center">19.2</Text>
                                <Text size="xs" c="gray.6" tt="uppercase" ta="center">React Version</Text>
                            </Paper>
                            <Paper p="lg" radius="lg" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <Text size="28px" fw={700} ta="center">v7.15</Text>
                                <Text size="xs" c="gray.6" tt="uppercase" ta="center">Mantine UI</Text>
                            </Paper>
                        </Group>
                    </Group>
                </Paper>
            </Container>

            {/* Footer */}
            <Paper py={40} style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
                <Container size="xl">
                    <Group justify="space-between" wrap="wrap">
                        <Text size="sm" c="dimmed">
                            © 2026 ABA PROTOTIPO. Desarrollado con precisión.
                        </Text>
                        <Text size="xs" c="dimmed">No hay enlaces externos configurados para esta demostración local.</Text>
                    </Group>
                </Container>
            </Paper>
        </div>
    )
}

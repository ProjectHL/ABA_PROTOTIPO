import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, TextInput, Card, Text, Stack, Group, Divider, Anchor, PasswordInput } from '@mantine/core'
import { Github, Facebook, LogIn, Command } from "lucide-react"

export default function LoginPage() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        // Simulate login
        setTimeout(() => {
            setLoading(false)
            navigate('/dashboard')
        }, 1000)
    }

    const quickAccessMvp = () => {
        navigate('/dashboard')
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--mantine-color-gray-0)',
            padding: '1rem'
        }}>
            <Group gap="xs" mb="xl" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
                <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--mantine-color-blue-6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Command color="white" size={20} />
                </div>
                <Text size="xl" fw={700}>ABA Admin</Text>
            </Group>

            <Card shadow="xl" padding="lg" radius="md" withBorder style={{ width: '100%', maxWidth: '400px' }}>
                <Stack gap="xs" mb="md">
                    <Text size="xl" fw={700}>Sign in</Text>
                    <Text size="sm" c="dimmed">
                        Enter your email and password below to log into your account
                    </Text>
                </Stack>

                <form onSubmit={handleLogin}>
                    <Stack gap="md">
                        <TextInput
                            label="Email"
                            type="email"
                            placeholder="name@example.com"
                            required
                        />
                        <div>
                            <Group justify="space-between" mb={5}>
                                <Text component="label" size="sm" fw={500}>Password</Text>
                                <Anchor size="xs" c="dimmed">
                                    Forgot password?
                                </Anchor>
                            </Group>
                            <PasswordInput
                                placeholder="********"
                                required
                            />
                        </div>
                        <Button
                            type="submit"
                            fullWidth
                            loading={loading}
                            leftSection={!loading && <LogIn size={16} />}
                        >
                            {loading ? "Signing in..." : "Sign in"}
                        </Button>
                    </Stack>
                </form>

                <Divider label="Or continue with" labelPosition="center" my="lg" />

                <Group grow mb="md">
                    <Button variant="default" leftSection={<Github size={16} />}>
                        GitHub
                    </Button>
                    <Button variant="default" leftSection={<Facebook size={16} />}>
                        Facebook
                    </Button>
                </Group>

                <Text size="xs" ta="center" c="dimmed" mb="md">
                    By clicking sign in, you agree to our{' '}
                    <Anchor size="xs" href="#">Terms of Service</Anchor> and{' '}
                    <Anchor size="xs" href="#">Privacy Policy</Anchor>.
                </Text>

                <Divider my="sm" />

                <Button
                    variant="light"
                    color="blue"
                    fullWidth
                    onClick={quickAccessMvp}
                >
                    Acceso Rápido (MVP)
                </Button>
            </Card>
        </div>
    )
}

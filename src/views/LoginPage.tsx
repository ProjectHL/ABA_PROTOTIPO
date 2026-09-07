'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useNavigate, useSearchParams } from '@/lib/navigation'
import { Button, TextInput, Card, Text, Stack, Group, PasswordInput, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { createClient } from '@/lib/supabase/client'
import { getSafeRedirect } from '@/lib/security/redirect'
import { LogIn, Command } from "lucide-react"

export default function LoginPage() {
    const navigate = useNavigate()
    const router = useRouter()
    const searchParams = useSearchParams()
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const supabase = createClient()
        const { error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) {
            notifications.show({ title: 'No fue posible iniciar sesión', message: error.message, color: 'red' })
            setLoading(false)
            return
        }

        notifications.show({ title: 'Sesión iniciada', message: 'Bienvenido a ABA Clínico.', color: 'green' })
        setLoading(false)
        const redirectTo = searchParams.get('redirectTo')
        router.replace(getSafeRedirect(redirectTo))
        router.refresh()
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
                    <Title order={1} size="h2">Iniciar sesión</Title>
                    <Text size="sm" c="dimmed">
                        Ingresa tus credenciales para acceder a tu cuenta.
                    </Text>
                </Stack>

                <form onSubmit={handleLogin}>
                    <Stack gap="md">
                        <TextInput
                            label="Email"
                            type="email"
                            placeholder="name@example.com"
                            value={email}
                            onChange={(event) => setEmail(event.currentTarget.value)}
                            required
                        />
                        <div>
                            <Text component="label" size="sm" fw={500} mb={5}>Contraseña</Text>
                            <PasswordInput
                                placeholder="********"
                                value={password}
                                onChange={(event) => setPassword(event.currentTarget.value)}
                                required
                            />
                        </div>
                        <Button
                            type="submit"
                            fullWidth
                            loading={loading}
                            leftSection={!loading && <LogIn size={16} />}
                        >
                            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                        </Button>
                    </Stack>
                </form>

                <Button variant="subtle" component="a" href="/forgot-password">Recuperar contraseña</Button>
                <Text size="xs" ta="center" c="dimmed" mb="md">
                    El acceso está habilitado únicamente para usuarios autorizados.
                </Text>
            </Card>
        </div>
    )
}

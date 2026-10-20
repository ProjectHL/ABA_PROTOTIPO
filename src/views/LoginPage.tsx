'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useNavigate, useSearchParams } from '@/lib/navigation'
import { Alert, Button, TextInput, Card, Text, Stack, Group, PasswordInput, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { signInAction } from '@/modules/auth/actions'
import { getSafeRedirect } from '@/lib/security/redirect'
import { LogIn, Command } from "lucide-react"
import { AccessInformation } from '@/features/team/AccessInformation'

export default function LoginPage() {
    const navigate = useNavigate()
    const router = useRouter()
    const searchParams = useSearchParams()
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [info, setInfo] = useState<'terms'|'privacy'|null>(null)
    const invalidLink = searchParams.get('error') === 'invalid_link'

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const result = await signInAction({ email: email.trim(), password })
            if (!result.ok) {
                notifications.show({ title: 'No fue posible iniciar sesión', message: result.message, color: 'red' })
                setLoading(false)
                return
            }
        } catch {
            notifications.show({ title: 'Conexión no disponible', message: 'No se confirmó el inicio de sesión. Revisa el servicio y vuelve a intentar.', color: 'red' })
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
                        {invalidLink && (
                            <Alert color="red" title="El enlace no pudo validarse">
                                Solicita un enlace nuevo y ábrelo en el mismo navegador donde iniciaste la recuperación.
                            </Alert>
                        )}
                        <TextInput
                            label="Email"
                            type="email"
                            autoComplete="username"
                            placeholder="name@example.com"
                            value={email}
                            onChange={(event) => setEmail(event.currentTarget.value)}
                            required
                        />
                        <PasswordInput
                            label="Contraseña"
                            autoComplete="current-password"
                            placeholder="********"
                            value={password}
                            onChange={(event) => setPassword(event.currentTarget.value)}
                            required
                        />
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
                <Group grow><Button variant="default" disabled>GitHub no disponible en local</Button><Button variant="default" disabled>Facebook no disponible en local</Button></Group>
                <Text size="xs" c="dimmed" ta="center" mt="xs">El acceso rápido simulado fue retirado. Usa las cuentas sintéticas autenticadas del lote local.</Text>
                <Group justify="center" gap="xs"><Button size="xs" variant="subtle" onClick={()=>setInfo('terms')}>Términos</Button><Button size="xs" variant="subtle" onClick={()=>setInfo('privacy')}>Privacidad</Button></Group>
                <Text size="xs" ta="center" c="dimmed" mb="md">
                    El acceso está habilitado únicamente para usuarios autorizados.
                </Text>
            </Card>
            <AccessInformation topic={info} onClose={()=>setInfo(null)}/>
        </div>
    )
}
